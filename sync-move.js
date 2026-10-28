// Copy camera state without allowing the resulting move events to recurse.
export default function syncMove(a, b) {
  var syncing = false;
  var removed = false;

  function sync(master, clone) {
    if (syncing || removed) return;
    syncing = true;
    try {
      var camera = {
        center: master.getCenter(),
        zoom: master.getZoom(),
        bearing: master.getBearing(),
        pitch: master.getPitch(),
      };
      // Keep compatibility with MapLibre versions without these camera APIs.
      if (master.getRoll && clone.getRoll) camera.roll = master.getRoll();
      if (master.getPadding && clone.getPadding) camera.padding = master.getPadding();
      if (master.getCenterElevation && clone.getCenterElevation) {
        camera.elevation = master.getCenterElevation();
      }
      if (master.getVerticalFieldOfView && clone.getVerticalFieldOfView &&
          clone.setVerticalFieldOfView) {
        var fov = master.getVerticalFieldOfView();
        if (clone.getVerticalFieldOfView() !== fov) clone.setVerticalFieldOfView(fov);
      }
      if (!removed) clone.jumpTo(camera);
    } finally {
      syncing = false;
    }
  }

  function fromA() { sync(a, b); }
  function fromB() { sync(b, a); }

  // The first map is authoritative when their initial cameras differ.
  fromA();
  a.on("move", fromA);
  b.on("move", fromB);
  return function () {
    if (removed) return;
    removed = true;
    a.off("move", fromA);
    b.off("move", fromB);
  };
}
