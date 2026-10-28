import { Map } from 'maplibre-gl';
import Compare, {
  type CompareOptions,
  type SlideEndEvent,
  type CompareEventListener,
} from '@maplibre/maplibre-gl-compare';
import '@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css';
import '@maplibre/maplibre-gl-compare/style.css';

// Compile-only consumer examples: no DOM or WebGL is created by the test runner.
declare const before: Map;
declare const after: Map;
declare const container: HTMLElement;
const options: CompareOptions = { orientation: 'horizontal', mousemove: true };
const compare = new Compare(before, after, container, options);
new Compare(before, after, '#wrapper');
new Compare(before, after, container, null);
new Compare(before, after, container, { orientation: undefined, mousemove: undefined });
const listener: CompareEventListener<'slideend'> = event => {
  const position: number = event.currentPosition;
  compare.setSlider(position);
};
const event: SlideEndEvent = { currentPosition: 123 };
compare.on('slideend', listener).fire('slideend', event).off('slideend', listener);
compare.on('slideend', event => {
  const position: number = event.currentPosition;
  compare.setSlider(position);
});
const position: number = compare.currentPosition;
const orientation: CompareOptions['orientation'] = compare.options.orientation;
compare.setSlider(position);
compare.remove();
export { options, orientation };
