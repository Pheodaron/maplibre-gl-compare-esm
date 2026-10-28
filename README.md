## MapLibre GL Compare

Swipe and sync between two MapLibre maps. This plugin was originally developed for Mapbox (https://github.com/mapbox/mapbox-gl-compare) and was migrated to MapLibre after Mapbox changed its license.

This fork builds and distributes ES modules only. Install it from GitHub as described in [Installation](#installation).

## Code example

### Examples

For these HTML examples, copy `dist/maplibre-gl-compare.js` and `dist/maplibre-gl-compare.css` from this fork into the same directory as the HTML file. Serve that directory over HTTP(S). See [Installation](#installation) below.

#### Full Example without the need of a token

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Swipe between maps</title>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <link
      href="https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
      }

      #map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
  </head>

  <body>
    <style>
      body {
        overflow: hidden;
      }

      body * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      #comparison-container {
        position: relative;
        height: 100vh;
      }

      .map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
    <link rel="stylesheet" href="maplibre-gl-compare.css" type="text/css" />
    <div id="comparison-container">
      <div id="before" class="map"></div>
      <div id="after" class="map"></div>
    </div>
    <script type="module">
      import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
      import Compare from "./maplibre-gl-compare.js";
      var beforeMap = new maplibregl.Map({
        container: "before",
        style: "https://demotiles.maplibre.org/style.json",
        center: [7.221275, 50.326111],
        zoom: 5,
      });

      var afterMap = new maplibregl.Map({
        container: "after",
        style:
          "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
        center: [7.221275, 50.326111],
        zoom: 5,
      });

      // A selector or reference to HTML element
      var container = "#comparison-container";

      var map = new Compare(beforeMap, afterMap, container, {
        // Set this to enable comparing two maps by mouse movement:
        // mousemove: true
      });
    </script>
  </body>
</html>
```

#### Full Example with the need of a token

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Swipe between maps</title>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <link
      href="https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css"
      rel="stylesheet"
    />
    <style>
      body {
        margin: 0;
        padding: 0;
      }

      #map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
  </head>

  <body>
    <style>
      body {
        overflow: hidden;
      }

      body * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }

      #comparison-container {
        position: relative;
        height: 100vh;
      }

      .map {
        position: absolute;
        top: 0;
        bottom: 0;
        width: 100%;
      }
    </style>
    <link rel="stylesheet" href="maplibre-gl-compare.css" type="text/css" />
    <div id="comparison-container">
      <div id="before" class="map"></div>
      <div id="after" class="map"></div>
    </div>
    <script type="module">
      import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
      import Compare from "./maplibre-gl-compare.js";
      var beforeMap = new maplibregl.Map({
        container: "before",
        style:
          "https://api.maptiler.com/maps/hybrid/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
        center: [7.221275, 50.326111],
        zoom: 15,
      });

      var afterMap = new maplibregl.Map({
        container: "after",
        style:
          "https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL",
        center: [7.221275, 50.326111],
        zoom: 15,
      });

      // A selector or reference to HTML element
      var container = "#comparison-container";

      var map = new Compare(beforeMap, afterMap, container, {
        // Set this to enable comparing two maps by mouse movement:
        // mousemove: true
      });
    </script>
  </body>
</html>
```

### Usage

With a bundler that supports CSS imports (for example, Vite):

```js
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import Compare from "@maplibre/maplibre-gl-compare";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";

var beforeMap = new maplibregl.Map({
container: "before",
style: "https://demotiles.maplibre.org/style.json",
center: [7.221275, 50.326111],
zoom: 5,
});

var afterMap = new maplibregl.Map({
container: "after",
style:
    "https://vectortiles.geo.admin.ch/styles/ch.swisstopo.leichte-basiskarte.vt/style.json",
center: [7.221275, 50.326111],
zoom: 5,
});

// A selector or reference to HTML element
var container = '#comparison-container';

var map = new Compare(beforeMap, afterMap, container, {
  mousemove: true, // Optional. Set to true to enable swiping during cursor movement.
  orientation: 'vertical' // Optional. Sets the orientation of swiper to horizontal or vertical, defaults to vertical
});
```

### Methods

```js
const compare = new Compare(beforeMap, afterMap, container, {
  mousemove: true, // Optional. Set to true to enable swiping during cursor movement.
  orientation: 'vertical' // Optional. Sets the orientation of swiper to horizontal or vertical, defaults to vertical
});

// Get Current position - this will return the slider's current position, in pixels
compare.currentPosition;

// Set Position - this will set the slider at the specified (x) number of pixels from the left-edge or top-edge of viewport based on swiper orientation
compare.setSlider(x);

//Listen to slider movement - and return current position on each slideend
compare.on('slideend', (e) => {
  console.log(e.currentPosition);
});

//Remove - this will remove the compare control from the DOM and stop synchronizing the two maps.
compare.remove();
```

## Live examples

[Compare hybrid with streets](https://rawcdn.githack.com/astridx/astridx.github.io/a9d7297a4fe1e3a4d7ebeb1e4e662fd1339ef3b5/maplibreexamples/plugins/maplibre-gl-compare-swipe-between-maps.html)

[Compare swisstopo with demotiles](https://rawcdn.githack.com/astridx/astridx.github.io/a9d7297a4fe1e3a4d7ebeb1e4e662fd1339ef3b5/maplibreexamples/plugins/maplibre-gl-compare-swipe-between-maps_.html)

## Installation

### npm (from this GitHub fork)

Install the ESM fork directly from GitHub, together with its MapLibre GL peer dependency:

```sh
npm install git+https://github.com/Pheodaron/maplibre-gl-compare-esm.git#main maplibre-gl@^6
```

`npm install @maplibre/maplibre-gl-compare` installs the upstream npm release, not this fork. This fork retains the original package name in `package.json`, so after installing from GitHub the imports are:

```js
import * as maplibregl from "maplibre-gl";
import Compare from "@maplibre/maplibre-gl-compare";
import "maplibre-gl/dist/maplibre-gl.css";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";
```

The CSS imports above require a bundler with CSS support. `#main` selects the current main branch when npm resolves the dependency; replace it with a commit SHA to select a specific revision. Commit your application's lockfile to keep installations reproducible.

The package exports `Compare` as the default ES module export. Import it directly; it does not attach to `maplibregl`. There is no CommonJS build.

### Direct browser use

Copy `dist/maplibre-gl-compare.js` and `dist/maplibre-gl-compare.css` from this repository (or from `node_modules/@maplibre/maplibre-gl-compare/dist/` after installation) into the same directory as your HTML file. Serve the files over HTTP(S), then load the JavaScript using a module script:

```html
<!-- MapLibre GL -->
<link href="https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.css" rel="stylesheet" />
<link href="./maplibre-gl-compare.css" rel="stylesheet" />

<script type="module">
  import * as maplibregl from "https://unpkg.com/maplibre-gl@6.16.0/dist/maplibre-gl.mjs";
  import Compare from "./maplibre-gl-compare.js";
  // After creating beforeMap and afterMap:
  // const compare = new Compare(beforeMap, afterMap, "#comparison-container");
</script>
```

Adjust the paths if you place the distribution files in a different directory. The compare bundle includes its runtime dependencies; MapLibre GL is loaded separately.


## Build

To build from source (Node.js 22 is used in CI):

```sh
git clone https://github.com/Pheodaron/maplibre-gl-compare-esm.git
cd maplibre-gl-compare-esm
npm ci
npm run build
```

The build produces **ESM only**: `dist/maplibre-gl-compare.js` is a minified, self-contained ES module with a default `Compare` export. The stylesheet is copied to `dist/maplibre-gl-compare.css`.

ESM is the only package build format; there is no CJS/UMD output or format switch. The package uses `"type": "module"`, and its `main`, `module`, and `exports` entries point to the ESM bundle. For direct browser use, load it from a `<script type="module">` and import `Compare` explicitly. It does not register `maplibregl.Compare` globally.

`npm pack` and `npm publish` rebuild the distribution automatically through `prepack`.

## TypeScript

TypeScript declarations are included in this package, including the CSS entry points. No separate `@types` package or manual `declare module` is needed.

```ts
import Compare, { type CompareOptions } from "@maplibre/maplibre-gl-compare";
import "@maplibre/maplibre-gl-compare/dist/maplibre-gl-compare.css";

const options: CompareOptions = { orientation: "vertical", mousemove: true };
const compare = new Compare(beforeMap, afterMap, "#comparison-container", options);
compare.on("slideend", (event) => {
  console.log(event.currentPosition); // number
});
```

The declarations cover the constructor, options, public methods, slider position, and event payloads. They support modern `bundler`/`NodeNext`/`Node16` resolution and legacy `node` resolution. `CompareOptions`, `SlideEndEvent`, `CompareEventMap`, and `CompareEventListener` are exported types. `CompareEventMap` can be augmented to type custom events.

With `NodeNext`/`Node16` and full dependency declaration checking, current MapLibre dependencies `@maplibre/geojson-vt` and `@maplibre/vt-pbf` have a separate upstream TS2834 issue (extensionless imports). Compare's type tests report these upstream diagnostics separately; they do not suppress errors in this package or application examples.

## MapLibre v6 compatibility and camera behavior

Browser integration tests cover MapLibre GL JS 6.0.0, 6.8.0, and 6.16.0 using real WebGL2 maps and a GeoJSON source. MapLibre v6 provides named exports, so use `import * as maplibregl from "maplibre-gl"` or `import { Map } from "maplibre-gl"`; it has no default export. Its browser entry is `dist/maplibre-gl.mjs`, not the older global `maplibre-gl.js` script.

At construction, map B adopts map A's camera. Subsequent movement is synchronized in both directions: center, zoom, bearing, pitch, padding, and, when supported by both maps, roll, center elevation, and vertical field of view. Configure both maps with matching dimensions, projection, terrain, and camera constraints; compare does not copy map styles, terrain configuration, or projection settings.

`setSlider(x)` accepts a finite number of pixels and clamps it to the map bounds. Invalid values throw a `TypeError`. Resize preserves the pixel position and clamps it if needed. `slideend` fires once when a mouse or touch drag completes. Cancellation, removal, programmatic positioning, and hover movement do not emit `slideend`. `remove()` also cancels active gestures and is safe to call more than once.

## Tests

```sh
npm ci
npx playwright install chromium
npm test
```

The suite runs lint, ESM import checks, regression tests, TypeScript consumer checks, and Chromium integration tests with local map data; it does not require a map token or remote tiles. For an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path. CI runs the browser tests against the three MapLibre v6 versions listed above.

## Motivation

This project makes it possible to easily compare two maps.

## API Reference

[API Reference](API.md)

## Bug Reports & Feature Requests

Please use the [issue tracker](https://github.com/maplibre/maplibre-gl-compare/issues) to report any bugs or file feature requests.

## Licence
ISC © [MapLibre](https://github.com/maplibre) © [Mapbox](https://github.com/mapbox)
