// Tag our own events, but reconcile independent camera changes made by callbacks.
export default function syncMove(a, b) {
  var syncing = false;
  var removed = false;
  var pending = null;
  var token = {};
  var eventData = { __compareSync: token };

  function stop() {
    if (removed) return;
    removed = true;
    pending = null;
    a.off("move", fromA);
    b.off("move", fromB);
    a.off("remove", stop);
    b.off("remove", stop);
  }

  function copy(master, clone) {
    if (master._removed === true || clone._removed === true) { stop(); return; }
    var camera = {
      center: master.getCenter(), zoom: master.getZoom(),
      bearing: master.getBearing(), pitch: master.getPitch(),
    };
    function supports(method) {
      return typeof master[method] === "function" && typeof clone[method] === "function";
    }
    if (supports("getRoll")) camera.roll = master.getRoll();
    if (supports("getPadding")) camera.padding = master.getPadding();
    if (supports("getCenterElevation")) camera.elevation = master.getCenterElevation();
    if (supports("getVerticalFieldOfView") && typeof clone.setVerticalFieldOfView === "function") {
      var fov = master.getVerticalFieldOfView();
      if (Math.abs(clone.getVerticalFieldOfView() - fov) > 1e-10) clone.setVerticalFieldOfView(fov, eventData);
    }
    if (!removed) clone.jumpTo(camera, eventData);
  }

  function sync(master, event) {
    if (removed || (event && event.__compareSync === token)) return;
    pending = master;
    if (syncing) return;
    syncing = true;
    try {
      var attempts = 0;
      while (pending && !removed) {
        // A callback that continually changes a camera cannot converge.
        if (++attempts > 16) throw new Error("Compare camera callbacks did not converge after 16 updates.");
        var source = pending;
        pending = null;
        copy(source, source === a ? b : a);
      }
    } finally {
      pending = null;
      syncing = false;
    }
  }
  function fromA(event) { sync(a, event); }
  function fromB(event) { sync(b, event); }

  try {
    a.on("move", fromA);
    b.on("move", fromB);
    a.on("remove", stop);
    b.on("remove", stop);
    fromA();
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}
