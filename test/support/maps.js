import { EventEmitter } from 'node:events';

export class MockElement extends EventTarget {
  constructor(ownerDocument) {
    super();
    this.ownerDocument = ownerDocument;
    this.style = {};
    this.children = [];
    this.bounds = { left: 100, top: 50, width: 400, height: 200 };
  }
  appendChild(child) { this.children.push(child); child.parent = this; }
  getBoundingClientRect() { return { ...this.bounds }; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this); }
}

export class MockDocument extends EventTarget {
  constructor() {
    super();
    this.defaultView = new EventTarget();
    this.body = new MockElement(this);
    this.listeners = new Map();
  }
  createElement() { return new MockElement(this); }
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
  setVerticalFieldOfView(fov) { this.camera.fov = fov; this.emit('move'); }
  jumpTo(camera) { Object.assign(this.camera, camera); this.emit('move'); }
}
