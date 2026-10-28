## MapLibre GL Compare

Swipe and sync between two MapLibre maps. This plugin was originally developed for Mapbox (https://github.com/mapbox/mapbox-gl-compare) and was migrated to MapLibre after Mapbox changed its license.

## Code example

### Examples

#### Full Example without the need of a token

```js
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Swipe between maps</title>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <script src="../.env"></script>
    <script src="https://unpkg.com/maplibre-gl@2.1.6/dist/maplibre-gl.js"></script>
    <link
      href="https://unpkg.com/maplibre-gl@2.1.6/dist/maplibre-gl.css"
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
        // m ousemove: true
      });
    </script>
  </body>
</html>
```

#### Full Example with the need of a token

```js
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Swipe between maps</title>
    <meta
      name="viewport"
      content="initial-scale=1,maximum-scale=1,user-scalable=no"
    />
    <script src="../.env"></script>
    <script src="https://unpkg.com/maplibre-gl@2.1.6/dist/maplibre-gl.js"></script>
    <link
      href="https://unpkg.com/maplibre-gl@2.1.6/dist/maplibre-gl.css"
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
        // m ousemove: true
      });
    </script>
  </body>
</html>
```

### Usage

```js
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
compare = new Compare(beforeMap, afterMap, container, {
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

### Native

Add tags referencing `maplibre-gl-compare` after adding `maplibre-gl` to your website:

```html
<!-- MapLibre GL -->
<link href="https://unpkg.com/maplibre-gl@2.1.6/dist/maplibre-gl.css" rel='stylesheet' />
<link href="maplibre-gl-compare.css" rel='stylesheet' />

<script src="https://unpkg.com/maplibre-gl@2.1.6/dist/maplibre-gl.js"></script>
<script type="module">
  import Compare from "./maplibre-gl-compare.js";
  // const compare = new Compare(beforeMap, afterMap, "#comparison-container");
</script>
```

### npm (ES modules)

```sh
npm install @maplibre/maplibre-gl-compare
```

The package exports `Compare` as the default ES module export. Import it directly; it does not attach to `maplibregl`. CommonJS `require()` is no longer supported.


## Build

```sh
npm ci
npm run build
```

The build produces **ESM only**: `dist/maplibre-gl-compare.js` is a minified, self-contained ES module with a default `Compare` export. The stylesheet is copied to `dist/maplibre-gl-compare.css`.

ESM is the only package build format; there is no CJS/UMD output or format switch. The package uses `"type": "module"`, and its `main`, `module`, and `exports` entries point to the ESM bundle. For direct browser use, load it from a `<script type="module">` and import `Compare` explicitly. It does not register `maplibregl.Compare` globally.

`npm pack` and `npm publish` rebuild the distribution automatically through `prepack`. Browserify and the temporary CJS bundle are used only by the browser test runner; they do not change the package output format.

## Motivation

This project makes it possible to easily compare two maps.

## API Reference

[API Reference](API.md)

## Bug Reports & Feature Requests

Please use the [issue tracker](https://github.com/maplibre/maplibre-gl-compare/issues) to report any bugs or file feature requests.

## Licence
ISC © [MapLibre](https://github.com/maplibre) © [Mapbox](https://github.com/mapbox)
