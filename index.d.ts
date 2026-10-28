import type { Map as MapLibreMap } from 'maplibre-gl';

export interface CompareOptions {
  /** Slider orientation. Defaults to vertical. */
  orientation?: 'vertical' | 'horizontal' | undefined;
  /** Follow the mouse without dragging. Defaults to false. */
  mousemove?: boolean | undefined;
}

export interface SlideEndEvent {
  /** Slider position in CSS pixels from the left or top edge. */
  currentPosition: number;
}

/** Extend this interface through module augmentation to type custom events. */
export interface CompareEventMap {
  slideend: SlideEndEvent;
}

export type CompareEventListener<T extends keyof CompareEventMap> =
  (event: CompareEventMap[T]) => void;

export default class Compare {
  constructor(
    a: MapLibreMap,
    b: MapLibreMap,
    container: string | HTMLElement,
    options?: CompareOptions | null,
  );

  options: CompareOptions;
  currentPosition: number;

  /** Set the slider position in CSS pixels, clamped to the map bounds. */
  setSlider(x: number): void;

  on<T extends keyof CompareEventMap>(type: T, listener: CompareEventListener<T>): this;
  off<T extends keyof CompareEventMap>(type: T, listener: CompareEventListener<T>): this;
  fire<T extends keyof CompareEventMap>(type: T, data: CompareEventMap[T]): this;

  /** Remove the control and stop synchronization. Safe to call repeatedly. */
  remove(): void;
}
