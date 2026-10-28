import type { Map } from 'maplibre-gl';
import Compare from '@maplibre/maplibre-gl-compare';
// @ts-expect-error The JavaScript module has only a default constructor export.
import { Compare as NamedCompare } from '@maplibre/maplibre-gl-compare';
// @ts-expect-error A stylesheet has no default JavaScript export.
import stylesheet from '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css';

declare const before: Map;
declare const after: Map;
declare const container: HTMLElement;
const compare = new Compare(before, after, container);
// @ts-expect-error A map is required, not an arbitrary object.
new Compare({}, after, container);
// @ts-expect-error A map is required as the second argument too.
new Compare(before, {}, container);
// @ts-expect-error Container must be an element or selector.
new Compare(before, after, 123);
// @ts-expect-error Container cannot be null.
new Compare(before, after, null);
// @ts-expect-error The constructor requires two maps and a container.
new Compare(before);
// @ts-expect-error Compare is constructed with new.
Compare(before, after, container);
// @ts-expect-error Orientation is a literal union.
new Compare(before, after, container, { orientation: 'diagonal' });
// @ts-expect-error Mouse tracking is boolean.
new Compare(before, after, container, { mousemove: 'true' });
// @ts-expect-error A number is required.
compare.setSlider('123');
// @ts-expect-error A position is required.
compare.setSlider();
// @ts-expect-error Position is numeric.
compare.currentPosition = '123';
// @ts-expect-error Misspelled events must be caught.
compare.on('slideEnd', () => {});
// @ts-expect-error A callback is required.
compare.on('slideend', 123);
// @ts-expect-error The payload is not a DOM MouseEvent.
compare.on('slideend', (event: MouseEvent) => {});
compare.on('slideend', event => {
  // @ts-expect-error Event position is a number.
  const position: string = event.currentPosition;
  // @ts-expect-error The runtime does not add a DOM target to this payload.
  event.target;
});
// @ts-expect-error Payload must contain a numeric currentPosition.
compare.fire('slideend', { currentPosition: '123' });
// @ts-expect-error A slideend payload is required.
compare.fire('slideend');
// @ts-expect-error off takes the same listener type as on.
compare.off('slideend', (event: { currentPosition: string }) => {});
