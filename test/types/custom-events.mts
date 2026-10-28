import type { Map } from 'maplibre-gl';
import Compare from '@maplibre/maplibre-gl-compare';

declare module '@maplibre/maplibre-gl-compare' {
  interface CompareEventMap {
    custom: { value: string };
  }
}
declare const before: Map;
declare const after: Map;
const compare = new Compare(before, after, '#wrapper');
compare.on('custom', event => {
  const value: string = event.value;
  console.log(value);
});
compare.fire('custom', { value: 'typed custom event' });
// @ts-expect-error Augmented custom events still check their payload.
compare.fire('custom', { value: 123 });
