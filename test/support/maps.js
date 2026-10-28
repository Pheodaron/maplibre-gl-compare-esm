import { EventEmitter } from 'node:events';

class TrackedTarget extends EventTarget {
  constructor() { super(); this.listeners = new Map(); }
  addEventListener(type, fn, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    super.addEventListener(type, fn, options);
  }
  removeEventListener(type, fn) {
    this.listeners.get(type)?.delete(fn);
    super.removeEventListener(type, fn);
  }
  count(type) { return this.listeners.get(type)?.size || 0; }
}

export class MockElement extends TrackedTarget {
  constructor(ownerDocument) {
    super();
    this.ownerDocument = ownerDocument;
    this.nodeType = 1;
    this.style = { clip: "" };
    this.children = [];
    this.bounds = { left: 100, top: 50, width: 400, height: 200 };
  }
  appendChild(child) { child.remove(); this.children.push(child); child.parent = this; }
  contains(element) { return this === element || this.children.some(child => child.contains(element)); }
  getBoundingClientRect() { return { ...this.bounds }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null; }
}

export class MockDocument extends TrackedTarget {
  constructor() {
    super();
    this.defaultView = new TrackedTarget();
    this.body = new MockElement(this);
    this.selectors = new Map();
  }
  createElement() { return new MockElement(this); }
  querySelector(selector) { return this.selectors.get(selector) || null; }
}

export class MockMap extends EventEmitter {
  constructor(document, camera = {}) {
    super();
    this.container = new MockElement(document);
    this.camera = {
      center: { lng: 0, lat: 0 }, zoom: 1, bearing: 0, pitch: 0,
      roll: 0, elevation: 0, fov: 36.87,
      padding: { left: 0, right: 0, top: 0, bottom: 0 },
      ...camera,
    };
  }
  getContainer() { return this.container; }
  getCenter() { return this.camera.center; }
  getZoom() { return this.camera.zoom; }
  getBearing() { return this.camera.bearing; }
  getPitch() { return this.camera.pitch; }
  getRoll() { return this.camera.roll; }
  getPadding() { return this.camera.padding; }
  getCenterElevation() { return this.camera.elevation; }
  getVerticalFieldOfView() { return this.camera.fov; }
  setVerticalFieldOfView(fov, eventData) { this.camera.fov = fov; this.emit('move', { ...eventData, type: 'move', target: this }); }
  jumpTo(camera, eventData) { Object.assign(this.camera, camera); this.emit('move', { ...eventData, type: 'move', target: this }); }
  remove() { this._removed = true; this.emit('remove', { type: 'remove', target: this }); }
}
