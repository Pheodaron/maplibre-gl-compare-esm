import syncMove from "./sync-move.js";
import { EventEmitter } from "events";
import validate from "./validate.js";

var activeMaps = new WeakMap();

/**
 * @param {Object} a The first MapLibre GL Map
 * @param {Object} b The second MapLibre GL Map
 * @param {string|HTMLElement} container An HTML Element, or an element selector string for the compare container. It should be a wrapper around the two map Elements.
 * @param {Object} options
 * @param {string} [options.orientation=vertical] The orientation of the compare slider. `vertical` creates a vertical slider bar to compare one map on the left (map A) with another map on the right (map B). `horizontal` creates a horizontal slider bar to compare one map on the top (map A) and another map on the bottom (map B).
 * @param {boolean} [options.mousemove=false] If `true` the compare slider will move with the cursor, otherwise the slider will need to be dragged to move.
 * @example
 * var compare = new Compare(beforeMap, afterMap, '#wrapper', {
 *   orientation: 'vertical',
 *   mousemove: true
 * });
 * @see [Swipe between maps](https://maplibre.org/maplibre-gl-js-docs/plugins/)
 */
function Compare(a, b, container, options) {
  if (!new.target) throw new TypeError("Compare must be called with new.");
  var args = validate(a, b, container, options);
  if (activeMaps.has(a) || activeMaps.has(b)) throw new Error("A map already belongs to an active Compare.");
  this.options = args.options;
  this._mousemove = args.options.mousemove;
  this._horizontal = args.options.orientation === "horizontal";
  this._mapA = a;
  this._mapB = b;
  this._aContainer = args.aContainer;
  this._bContainer = args.bContainer;
  this._document = args.document;
  this._originalClipA = this._aContainer.style.clip;
  this._originalClipB = this._bContainer.style.clip;
  this._removed = false;
  this._dragging = false;
  this._clearSync = function () {};
  this._onDown = this._onDown.bind(this);
  this._onMove = this._onMove.bind(this);
  this._onMouseUp = this._onMouseUp.bind(this);
  this._onTouchEnd = this._onTouchEnd.bind(this);
  this._onTouchCancel = this._onTouchCancel.bind(this);
  this._onMapRemove = this.remove.bind(this);
  this._onResize = function () {
    if (this._removed) return;
    this._updateBounds();
    this._setPosition(this.currentPosition);
  }.bind(this);
  this._ev = new EventEmitter();
  this._swiper = this._document.createElement("div");
  this._swiper.className = this._horizontal ? "compare-swiper-horizontal" : "compare-swiper-vertical";
  this._controlContainer = this._document.createElement("div");
  this._controlContainer.className = this._horizontal
    ? "maplibregl-compare maplibregl-compare-horizontal" : "maplibregl-compare";
  this._controlContainer.appendChild(this._swiper);
  activeMaps.set(a, this);
  activeMaps.set(b, this);
  try {
    this._updateBounds();
    args.target.appendChild(this._controlContainer);
    this._setPosition((this._horizontal ? this._bounds.height : this._bounds.width) / 2);
    a.on("remove", this._onMapRemove);
    b.on("remove", this._onMapRemove);
    this._clearSync = syncMove(a, b);
    if (this._removed) {
      this._clearSync();
      throw new Error("A map was removed during Compare initialization.");
    }
    a.on("resize", this._onResize);
    b.on("resize", this._onResize);
    if (this._mousemove) {
      this._aContainer.addEventListener("mousemove", this._onMove);
      this._bContainer.addEventListener("mousemove", this._onMove);
      this._controlContainer.addEventListener("mousemove", this._onMove);
    }
    this._swiper.addEventListener("mousedown", this._onDown);
    this._swiper.addEventListener("touchstart", this._onDown, { passive: false });
  } catch (error) {
    this.remove();
    throw error;
  }
}

Compare.prototype = {
  _updateBounds: function () {
    var rect = this._bContainer.getBoundingClientRect();
    var width = this._bContainer.offsetWidth;
    var height = this._bContainer.offsetHeight;
    if (width === undefined) width = rect.width;
    if (height === undefined) height = rect.height;
    if (![width, height, rect.width, rect.height, rect.left, rect.top].every(Number.isFinite) ||
        width < 0 || height < 0 || rect.width < 0 || rect.height < 0) {
      throw new TypeError("Map container bounds must be finite and non-negative in size.");
    }
    this._bounds = {
      width: width, height: height, left: rect.left, top: rect.top,
      scaleX: rect.width ? width / rect.width : 1,
      scaleY: rect.height ? height / rect.height : 1,
    };
  },

  _onDown: function (e) {
    if (this._removed || this._dragging) return;
    if (e.touches && e.touches.length !== 1) return;
    if (!e.touches && e.button !== undefined && e.button !== 0) return;
    this._updateBounds();
    this._dragging = true;
    this._dragType = e.touches ? "touch" : "mouse";
    this._touchId = e.touches ? e.touches[0].identifier : undefined;
    if (e.cancelable) e.preventDefault();
    if (e.touches) {
      this._document.addEventListener("touchmove", this._onMove, { passive: false });
      this._document.addEventListener("touchend", this._onTouchEnd);
      this._document.addEventListener("touchcancel", this._onTouchCancel);
    } else {
      this._document.addEventListener("mousemove", this._onMove);
      this._document.addEventListener("mouseup", this._onMouseUp);
    }
    if (this._document.defaultView) {
      this._document.defaultView.addEventListener("blur", this._onTouchCancel);
    }
  },

  _setPosition: function (x) {
    if (!Number.isFinite(x)) throw new TypeError("Slider position must be a finite number.");
    x = Math.max(0, Math.min(
      x,
      this._horizontal ? this._bounds.height : this._bounds.width
    ));
    var pos = this._horizontal
      ? "translate(0, " + x + "px)"
      : "translate(" + x + "px, 0)";
    this._controlContainer.style.transform = pos;
    this._controlContainer.style.WebkitTransform = pos;
    var clipA = this._horizontal
      ? "rect(0, " + this._bounds.width + "px, " + x + "px, 0)"
      : "rect(0, " + x + "px, " + this._bounds.height + "px, 0)";
    var clipB = this._horizontal
      ? "rect(" + x + "px, " + this._bounds.width + "px, " + this._bounds.height + "px,0)"
      : "rect(0, " + this._bounds.width + "px, " + this._bounds.height + "px," + x + "px)";

    this._aContainer.style.clip = clipA;
    this._bContainer.style.clip = clipB;
    this.currentPosition = x;
  },

  _onMove: function (e) {
    if (this._removed) return;
    if (this._dragging && (e.touches ? "touch" : "mouse") !== this._dragType) return;
    var point = e;
    if (e.touches) {
      point = null;
      for (var i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this._touchId) { point = e.touches[i]; break; }
      }
    }
    var coordinate = point && (this._horizontal ? point.clientY : point.clientX);
    if (!Number.isFinite(coordinate)) return;
    this._updateBounds();
    if (this._dragging && e.touches && e.cancelable) e.preventDefault();
    var offset = this._horizontal ? this._bounds.top : this._bounds.left;
    var scale = this._horizontal ? this._bounds.scaleY : this._bounds.scaleX;
    this._setPosition((coordinate - offset) * scale);
  },

  _stopDrag: function () {
    var wasDragging = this._dragging;
    this._dragging = false;
    this._dragType = null;
    this._touchId = undefined;
    this._document.removeEventListener("mousemove", this._onMove);
    this._document.removeEventListener("mouseup", this._onMouseUp);
    this._document.removeEventListener("touchmove", this._onMove);
    this._document.removeEventListener("touchend", this._onTouchEnd);
    this._document.removeEventListener("touchcancel", this._onTouchCancel);
    if (this._document.defaultView) {
      this._document.defaultView.removeEventListener("blur", this._onTouchCancel);
    }
    return wasDragging;
  },

  _onMouseUp: function () {
    if (this._dragType === "mouse" && this._stopDrag()) {
      this.fire("slideend", { currentPosition: this.currentPosition });
    }
  },

  _endsTouch: function (e) {
    if (this._dragType !== "touch") return false;
    if (!e || !e.changedTouches || !e.changedTouches.length) return true;
    for (var i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this._touchId) return true;
    }
    return false;
  },

  _onTouchEnd: function (e) {
    if (this._endsTouch(e) && this._stopDrag()) {
      this.fire("slideend", { currentPosition: this.currentPosition });
    }
  },

  _onTouchCancel: function (e) {
    if (!e || e.type === "blur" || this._endsTouch(e)) this._stopDrag();
  },

  /**
   * Set the position of the slider, clamped to the map bounds.
   * Non-finite values and non-number arguments throw a TypeError.
   *
   * @param {number} x Slider position in pixels from left/top.
   */
  setSlider: function (x) {
    if (this._removed) return;
    this._updateBounds();
    this._setPosition(x);
  },

  /**
   * Adds a listener for events of a specified type.
   *
   * @param {string} type The event type to listen for; one of `slideend`.
   * @param {Function} fn The function to be called when the event is fired.
   * @returns {Compare} `this`
   */
  on: function (type, fn) {
    if (this._removed) return this;
    this._ev.on(type, fn);
    return this;
  },

  /**
   * Fire an event of a specified type.
   *
   * @param {string} type The event type to fire; one of `slideend`.
   * @param {Object} data Data passed to the event listener.
   * @returns {Compare} `this`
   */
  fire: function (type, data) {
    if (this._removed) return this;
    this._ev.emit(type, data);
    return this;
  },

  /**
   * Removes an event listener previously added with `Compare#on`.
   *
   * @param {string} type The event type previously used to install the listener.
   * @param {Function} fn The function previously installed as a listener.
   * @returns {Compare} `this`
   */
  off: function (type, fn) {
    if (this._removed) return this;
    this._ev.removeListener(type, fn);
    return this;
  },

  remove: function () {
    if (this._removed) return;
    this._removed = true;
    this._stopDrag();
    this._clearSync();
    this._mapA.off("resize", this._onResize);
    this._mapB.off("resize", this._onResize);
    this._mapA.off("remove", this._onMapRemove);
    this._mapB.off("remove", this._onMapRemove);
    activeMaps.delete(this._mapA);
    activeMaps.delete(this._mapB);
    this._aContainer.style.clip = this._originalClipA;
    this._bContainer.style.clip = this._originalClipB;
    this._aContainer.removeEventListener("mousemove", this._onMove);
    this._bContainer.removeEventListener("mousemove", this._onMove);
    this._controlContainer.removeEventListener("mousemove", this._onMove);
    this._swiper.removeEventListener("mousedown", this._onDown);
    this._swiper.removeEventListener("touchstart", this._onDown);
    this._controlContainer.remove();
    this._ev.removeAllListeners();
  },
};

export default Compare;
