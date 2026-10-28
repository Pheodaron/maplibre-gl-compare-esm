import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('published TypeScript declarations', async t => {
  const consumer = await mkdtemp(join(tmpdir(), 'compare-types-'));
  t.after(() => rm(consumer, { recursive: true, force: true }));
  const pack = spawnSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts', '--cache', join(consumer, 'cache')],
    { cwd: root, encoding: 'utf8' });
  assert.ifError(pack.error);
  assert.equal(pack.status, 0, pack.stderr);
  const files = JSON.parse(pack.stdout)[0].files.map(file => file.path);
  for (const file of ['index.d.ts', 'style.css.d.ts', 'dist/maplibre-gl-compare.css.d.ts']) {
    assert.ok(files.includes(file), `${file} must be included in the npm package`);
  }
  const installed = join(consumer, 'node_modules/@maplibre/maplibre-gl-compare');
  for (const file of files) {
    await mkdir(dirname(join(installed, file)), { recursive: true });
    await cp(join(root, file), join(installed, file));
  }
  await symlink(join(root, 'node_modules/maplibre-gl'), join(consumer, 'node_modules/maplibre-gl'), 'junction');
  await mkdir(join(consumer, 'node_modules/@types'), { recursive: true });
  await symlink(join(root, 'node_modules/@types/geojson'), join(consumer, 'node_modules/@types/geojson'), 'junction');
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ type: 'module' }));
  const entries = ['usage.mts', 'invalid.mts', 'custom-events.mts'];
  for (const entry of entries) await cp(join(root, 'test/types', entry), join(consumer, entry));
  const manifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
  assert.equal(manifest.types, './index.d.ts');
  assert.equal(manifest.exports['.'].types, './index.d.ts');

  for (const [name, module, moduleResolution] of [
    ['NodeNext', ts.ModuleKind.NodeNext, ts.ModuleResolutionKind.NodeNext],
    ['Node16', ts.ModuleKind.Node16, ts.ModuleResolutionKind.Node16],
    ['bundler', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Bundler],
    ['legacy node', ts.ModuleKind.ESNext, ts.ModuleResolutionKind.Node10],
  ]) {
    await t.test(name, () => {
      const program = ts.createProgram(entries.map(entry => join(consumer, entry)), {
        noEmit: true, strict: true, exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true, noUncheckedSideEffectImports: true,
        verbatimModuleSyntax: true, skipLibCheck: false, esModuleInterop: true,
        types: ['geojson'], target: ts.ScriptTarget.ES2022,
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
        module, moduleResolution,
      });
      const diagnostics = ts.getPreEmitDiagnostics(program);
      // These two MapLibre dependencies ship extensionless ESM imports in their
      // declarations. Report their known TS2834 diagnostics without hiding any
      // errors in Compare, its consumer fixtures, or other third-party types.
      const upstream = diagnostics.filter(diagnostic =>
        diagnostic.code === 2834 &&
        /node_modules[/\\]@maplibre[/\\](geojson-vt|vt-pbf)[/\\]dist[/\\]/.test(diagnostic.file?.fileName || ''));
      if (upstream.length) t.diagnostic(`${name}: ${upstream.length} upstream MapLibre TS2834 diagnostics (extensionless ESM imports)`);
      const failures = diagnostics.filter(diagnostic => !upstream.includes(diagnostic));
      const formatted = failures.map(diagnostic => {
        const file = diagnostic.file?.fileName || '';
        return `${file}: TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
      }).join('\n');
      assert.equal(failures.length, 0, formatted);
    });
  }
});
