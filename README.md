# MapLibre GL Compare — ESM fork

**This is an ESM-only fork of [MapLibre GL Compare](https://github.com/maplibre/maplibre-gl-compare), maintained in [Pheodaron/maplibre-gl-compare-esm](https://github.com/Pheodaron/maplibre-gl-compare-esm).** It compares two MapLibre maps with a movable divider and synchronizes their cameras.

**The package is intended for ES module imports.** `npm run build` always produces an ESM bundle; there is no CJS/UMD build or format switch. Import the default `Compare` export in your application, or use `<script type="module">` in a browser. The fork does not register a global `maplibregl.Compare`.

```js
import Compare from "@maplibre/maplibre-gl-compare";
```

Install **this fork from GitHub** using the [installation instructions](#installation). Installing `@maplibre/maplibre-gl-compare` directly from the npm registry selects the upstream package instead. The GitHub fork retains that package name, which is why the import above uses it.

The fork includes [TypeScript declarations](#typescript), [MapLibre v6 integration tests](#maplibre-v6-compatibility-and-camera-behavior), and the fixes listed below. The original plugin was developed for [Mapbox](https://github.com/mapbox/mapbox-gl-compare) and later migrated to MapLibre.

## Fixed bugs

These fixes are included in this fork's current `main` branch:

| Scenario | Corrected behavior |
| --- | --- |
| Resizing with the slider at position `0` | Clipping is recalculated even at the zero position. |
| Scrolling, layout shifts, or CSS scaling | Pointer coordinates use current map bounds and local CSS pixels. Translation and nonuniform axis scaling are supported. |
| Negative or invalid `setSlider()` arguments | Finite positions are clamped to the map bounds; non-number and non-finite arguments throw a `TypeError`. |
| Removing Compare during a drag | Mouse, touch, and focus handlers are released; later movement cannot reapply clipping to the maps. |
| Cancelled touch gestures or focus loss | The active drag is cancelled and its document/window handlers are removed. |
| Additional fingers or mixed mouse/touch input | Only the initiating finger controls and ends a touch drag. Hover tracking also preserves touch access to the handle. |
| Horizontal handle alignment | The handle is centered on the horizontal divider. |
| Invalid constructor arguments or initialization failure | Maps, options, and the wrapper are validated; failed initialization removes the control, restores clipping, and releases subscriptions. |
| Multiple Compare instances sharing a map | A conflicting instance is rejected; maps can be reused after the active instance is removed. |
| Calling `map.remove()` before `compare.remove()` | Removing either map automatically disposes Compare. Repeated removal is safe. |
| Pre-existing inline clipping styles | Removal restores the original clipping values instead of clearing them unconditionally. |
| Mutation of the original options object | Construction copies the settings, so later mutations cannot disagree with installed handlers. |
| Different initial cameras | Map B adopts map A's camera when Compare is created. |
| Incomplete camera synchronization on MapLibre v6 | Roll, center elevation, vertical field of view, and padding are synchronized alongside center, zoom, bearing, and pitch, when supported. |
| Camera changes inside user callbacks | Independent changes are reconciled; a non-converging callback loop raises a clear error after 16 synchronization passes. |
| ESM imports and MapLibre v6 examples | Importing Compare does not require a global `window`; examples use MapLibre's named exports and Compare's default export instead of the removed global constructor. |

See [Lifecycle and input validation](#lifecycle-and-input-validation) for the usage contract and [Tests](#tests) for the regression and stress coverage.

## Code example

### Examples

For these HTML examples, copy `dist/maplibre-gl-compare.js` and `dist/maplibre-gl-compare.css` from this fork into the same directory as the HTML file. Serve that directory over HTTP(S). See [Installation](#installation) below.

#### Full Example without the need of a token

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Swipe between maps</title>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <link
      href="https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
      }

      #map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
  </head>

  <body>
    <style>
      body {
        overflow: hidden;
      }

      body * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      #comparison-container {
        position: relative;
        height: 100vh;
      }

      .map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
    <link rel="stylesheet" href="maplibre-gl-compare.css" type="text/css" />
    <div id="comparison-container">
      <div id="before" class="map"></div>
      <div id="after" class="map"></div>
    </div>
    <script type="module">
      import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
      import Compare from "./maplibre-gl-compare.js";
      var beforeMap = new maplibregl.Map({
        container: "before",
        style: "https://demotiles.maplibre.org/style.json",
        center: [7.221275, 50.326111],
        zoom: 5,
      });

      var afterMap = new maplibregl.Map({
        container: "after",
        style:
          "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
        center: [7.221275, 50.326111],
        zoom: 5,
      });

      // A selector or reference to HTML element
      var container = "#comparison-container";

      var map = new Compare(beforeMap, afterMap, container, {
        // Set this to enable comparing two maps by mouse movement:
        // mousemove: true
      });
    </script>
  </body>
</html>
```

#### Full Example with the need of a token

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Swipe between maps</title>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <link
      href="https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
      }

      #map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
  </head>

  <body>
    <style>
      body {
        overflow: hidden;
      }

      body * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      #comparison-container {
        position: relative;
        height: 100vh;
      }

      .map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
    <link rel="stylesheet" href="maplibre-gl-compare.css" type="text/css" />
    <div id="comparison-container">
      <div id="before" class="map"></div>
      <div id="after" class="map"></div>
    </div>
    <script type="module">
      import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
      import Compare from "./maplibre-gl-compare.js";
      var beforeMap = new maplibregl.Map({
        container: "before",
        style:
          "https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
        center: [7.221275, 50.326111],
        zoom: 15,
      });

      var afterMap = new maplibregl.Map({
        container: "after",
        style:
          "https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
        center: [7.221275, 50.326111],
        zoom: 15,
      });

      // A selector or reference to HTML element
      var container = "#comparison-container";

      var map = new Compare(beforeMap, afterMap, container, {
        // Set this to enable comparing two maps by mouse movement:
        // mousemove: true
      });
    </script>
  </body>
</html>
```

### Usage

With a bundler that supports CSS imports (for example, Vite):

```js
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Compare from "@maplibre/maplibre-gl-compare";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";

var beforeMap = new maplibregl.Map({
container: "before",
style: "https://demotiles.maplibre.org/style.json",
center: [7.221275, 50.326111],
zoom: 5,
});

var afterMap = new maplibregl.Map({
container: "after",
style:
    "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
center: [7.221275, 50.326111],
zoom: 5,
});

// A selector or reference to HTML element
var container = '#comparison-container';

var map = new Compare(beforeMap, afterMap, container, {
  mousemove: true, // Optional. Set to true to enable swiping during cursor movement.
  orientation: 'vertical' // Optional. Sets the orientation of swiper to horizontal or vertical, defaults to vertical
});
```

### Methods

```js
const compare = new Compare(beforeMap, afterMap, container, {
  mousemove: true, // Optional. Set to true to enable swiping during cursor movement.
  orientation: 'vertical' // Optional. Sets the orientation of swiper to horizontal or vertical, defaults to vertical
});

// Get Current position - this will return the slider's current position, in pixels
compare.currentPosition;

// Set Position - this will set the slider at the specified (x) number of pixels from the left-edge or top-edge of viewport based on swiper orientation
compare.setSlider(x);

//Listen to slider movement - and return current position on each slideend
compare.on('slideend', (e) => {
  console.log(e.currentPosition);
});

//Remove - this will remove the compare control from the DOM and stop synchronizing the two maps.
compare.remove();
```

## Live examples

[Compare hybrid with streets](https://rawcdn.githack.com/astridx/astridx.github.io/a9d7297a4fe1e3a4d7ebeb1e4e662fd1339ef3b5/maplibreexamples/plugins/maplibre-gl-compare-swipe-between-maps.html)

[Compare swisstopo with demotiles](https://rawcdn.githack.com/astridx/astridx.github.io/a9d7297a4fe1e3a4d7ebeb1e4e662fd1339ef3b5/maplibreexamples/plugins/maplibre-gl-compare-swipe-between-maps_.html)

## Installation

### npm (from this GitHub fork)

Install the ESM fork directly from GitHub, together with its MapLibre GL peer dependency:

```sh
npm install git+https://github.com/Pheodaron/maplibre-gl-compare-esm.git#main maplibre-gl@^6
```

`npm install @maplibre/maplibre-gl-compare` installs the upstream npm release, not this fork. This fork retains the original package name in `package.json`, so after installing from GitHub the imports are:

```js
import * as maplibregl from "maplibre-gl";
import Compare from "@maplibre/maplibre-gl-compare";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";
```

The CSS imports above require a bundler with CSS support. `#main` selects the current main branch when npm resolves the dependency; replace it with a commit SHA to select a specific revision. Commit your application's lockfile to keep installations reproducible.

The package exports `Compare` as the default ES module export. Import it directly; it does not attach to `maplibregl`. There is no CommonJS build.

### Direct browser use

Copy `dist/maplibre-gl-compare.js` and `dist/maplibre-gl-compare.css` from this repository (or from `node_modules/@maplibre/maplibre-gl-compare/dist/` after installation) into the same directory as your HTML file. Serve the files over HTTP(S), then load the JavaScript using a module script:

```html
<!-- MapLibre GL -->
<link href="https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css" rel="stylesheet" />
<link href="./maplibre-gl-compare.css" rel="stylesheet" />

<script type="module">
  import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
  import Compare from "./maplibre-gl-compare.js";
  // After creating beforeMap and afterMap:
  // const compare = new Compare(beforeMap, afterMap, "#comparison-container");
</script>
```

Adjust the paths if you place the distribution files in a different directory. The compare bundle includes its runtime dependencies; MapLibre GL is loaded separately.


## Build

To build from source (Node.js 22 is used in CI):

```sh
git clone https://github.com/Pheodaron/maplibre-gl-compare-esm.git
cd maplibre-gl-compare-esm
npm ci
npm run build
```

The build produces **ESM only**: `dist/maplibre-gl-compare.js` is a minified, self-contained ES module with a default `Compare` export. The stylesheet is copied to `dist/maplibre-gl-compare.css`.

ESM is the only package build format; there is no CJS/UMD output or format switch. The package uses `"type": "module"`, and its `main`, `module`, and `exports` entries point to the ESM bundle. For direct browser use, load it from a `<script type="module">` and import `Compare` explicitly. It does not register `maplibregl.Compare` globally.

`npm pack` and `npm publish` rebuild the distribution automatically through `prepack`.

## TypeScript

TypeScript declarations are included in this package, including the CSS entry points. No separate `@types` package or manual `declare module` is needed.

```ts
import Compare, { type CompareOptions } from "@maplibre/maplibre-gl-compare";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";

const options: CompareOptions = { orientation: "vertical", mousemove: true };
const compare = new Compare(beforeMap, afterMap, "#comparison-container", options);
compare.on("slideend", (event) => {
  console.log(event.currentPosition); // number
});
```

The declarations cover the constructor, options, public methods, slider position, and event payloads. They support modern `bundler`/`NodeNext`/`Node16` resolution and legacy `node` resolution. `CompareOptions`, `SlideEndEvent`, `CompareEventMap`, and `CompareEventListener` are exported types. `CompareEventMap` can be augmented to type custom events.

With `NodeNext`/`Node16` and full dependency declaration checking, current MapLibre dependencies `@maplibre/geojson-vt` and `@maplibre/vt-pbf` have a separate upstream TS2834 issue (extensionless imports). Compare's type tests report these upstream diagnostics separately; they do not suppress errors in this package or application examples.

## MapLibre v6 compatibility and camera behavior

Browser integration tests cover MapLibre GL JS 6.0.0, 6.8.0, and 6.16.0 using real WebGL2 maps and a GeoJSON source. MapLibre v6 provides named exports, so use `import * as maplibregl from "maplibre-gl"` or `import { Map } from "maplibre-gl"`; it has no default export. Its browser entry is `dist/maplibre-gl.mjs`, not the older global `maplibre-gl.js` script.

At construction, map B adopts map A's camera. Subsequent movement is synchronized in both directions: center, zoom, bearing, pitch, padding, and, when supported by both maps, roll, center elevation, and vertical field of view. Configure both maps with matching dimensions, projection, terrain, and camera constraints; compare does not copy map styles, terrain configuration, or projection settings.

`setSlider(x)` accepts a finite number of pixels and clamps it to the map bounds. Invalid values throw a `TypeError`. Resize preserves the pixel position and clamps it if needed. `slideend` fires once when a mouse or touch drag completes. Cancellation, removal, programmatic positioning, and hover movement do not emit `slideend`. `remove()` also cancels active gestures and is safe to call more than once.

## Lifecycle and input validation

Use two distinct, live MapLibre maps whose containers are wrapped by the compare container. The maps and wrapper must belong to the same document. Pass a container element directly when using Shadow DOM; selectors are resolved in the maps' document. A map can belong to only one active Compare instance. Call `remove()` before reusing it in another instance.

Invalid maps, containers, orientation values, and non-boolean `mousemove` values are rejected before the component changes the page. A failed initialization removes its control, restores the original clipping styles, and releases subscriptions. Options are copied at construction; changing the original options object does not reconfigure an existing component.

Removing either map automatically disposes Compare. Explicit removal cancels active gestures, restores the original inline clipping styles, and releases DOM and map handlers. After removal, `setSlider`, `on`, `off`, and `fire` have no effect. Calls to `remove()` remain safe to repeat.

A touch drag follows the initiating finger; additional fingers cannot take over or end it. Mouse and touch gestures are kept separate. Coordinates are converted to local CSS pixels for translated or axis-scaled containers, including nonuniform scaling; arbitrary CSS rotation and skew are not supported.

Camera changes made by a user callback during synchronization are reconciled after the current update. A callback that continually changes the camera is stopped with a clear error after 16 synchronization passes, instead of creating an unbounded feedback loop. Remove or correct that callback before continuing. Different camera constraints can still prevent matching views; configure compatible constraints on both maps.

## Tests

```sh
npm ci
npx playwright install chromium
npm test
```

The suite runs lint, ESM import checks, regression tests, 80,000 seeded state-machine operations, 10,000 camera updates, 2,000 create/remove cycles, TypeScript consumer checks, and Chromium integration tests with local map data; it does not require a map token or remote tiles. For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path. CI runs the browser tests against the three MapLibre v6 versions listed above.

The browser stress suite also checks 20,000 slider updates, 200 component lifecycles, multiple touches, CSS scaling, iframe and Shadow DOM containers, retina rendering, competing animations, and map removal during a drag. These checks verify the specified invariants and subscriptions; they do not prove every possible browser or usage scenario is error-free.

## Motivation

This project makes it possible to easily compare two maps.

## API Reference

[API Reference](API.md)

## Bug Reports & Feature Requests

Please use the [issue tracker](https://github.com/maplibre/maplibre-gl-compare/issues) to report any bugs or file feature requests.

## Licence
ISC © [MapLibre](https://github.com/maplibre) © [Mapbox](https://github.com/mapbox)
