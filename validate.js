// Validate before touching map styles, camera state, or subscriptions.
export default function validate(a, b, container, options) {
  var methods = ["getContainer", "getCenter", "getZoom", "getBearing", "getPitch", "jumpTo", "on", "off"];
  [a, b].forEach(function (map) {
    if (!map || methods.some(function (method) { return typeof map[method] !== "function"; })) {
      throw new TypeError("Compare requires two MapLibre map instances.");
    }
    if (map._removed === true) throw new Error("Cannot compare a removed map.");
  });
  if (a === b) throw new TypeError("Compare requires two distinct maps.");
  if (options == null) options = {};
  if (typeof options !== "object" || Object.prototype.toString.call(options) !== "[object Object]") {
    throw new TypeError("Compare options must be an object.");
  }
  if (options.orientation !== undefined && options.orientation !== "vertical" && options.orientation !== "horizontal") {
    throw new TypeError("Compare orientation must be vertical or horizontal.");
  }
  if (options.mousemove !== undefined && typeof options.mousemove !== "boolean") {
    throw new TypeError("Compare mousemove must be a boolean.");
  }
  var aContainer = a.getContainer();
  var bContainer = b.getContainer();
  function isElement(element) {
    return element && element.nodeType === 1 && element.style &&
      typeof element.appendChild === "function" && typeof element.getBoundingClientRect === "function";
  }
  if (!isElement(aContainer) || !isElement(bContainer)) {
    throw new TypeError("Map containers must be HTML elements.");
  }
  if (aContainer === bContainer) throw new TypeError("Maps must have distinct containers.");
  var doc = aContainer.ownerDocument;
  if (!doc || !doc.createElement || doc !== bContainer.ownerDocument) {
    throw new TypeError("Map containers must belong to the same document.");
  }
  if (typeof container === "string") {
    try { container = doc.querySelector(container); }
    catch { throw new TypeError("Invalid compare container selector."); }
    if (!container) throw new Error("Cannot find element with specified container selector.");
  }
  if (!isElement(container) || container.ownerDocument !== doc) {
    throw new TypeError("Compare container must be an HTML element in the maps' document.");
  }
  if (container === aContainer || container === bContainer ||
      !container.contains(aContainer) || !container.contains(bContainer)) {
    throw new TypeError("Compare container must wrap both map containers.");
  }
  return {
    aContainer: aContainer, bContainer: bContainer, document: doc, target: container,
    options: { orientation: options.orientation || "vertical", mousemove: options.mousemove || false },
  };
}
