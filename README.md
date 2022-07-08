# HyperGeoJSON

> Share GeoJSON using [Hypercore](https://github.com/hypercore-protocol), using simple geospatial indexing with [quadkeys via @mapbox/tilebelt](https://github.com/mapbox/tilebelt)

## ⚠️ Warning!

This is a prototype so will have breaking changes, unimplemented methods/functions, etc.

Install and use at your own risk of wasted time!

## 👋 Welcome!

If you're interested in collaborating on this geospatial hypercore project, feel free to clone this repo & jump into the issues queue.

## Install

**Prerequisites:**

- HyperGeoJson requires a recent [node.js](https://nodejs.org) version and lowest version tested so far is v14.19.0.
- This package is released as [ESM, which may require configuration in your project](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c)

**Install with npm:**

```
npm i hypergeojson
```

## Usage

```js
// Import the HyperGeoJson class
import { HyperGeoJson } from 'hypergeojson'

// Create an instance of the class
const geo = new HyperGeoJson()

// Put a feature in the database
await geo.put({
	'type': 'Feature',
	'id': '1',
	'properties': {},
	'geometry': {
		'type': 'Point',
		'coordinates': [
			-122.89993286132812,
			47.04720076526227
		]
	}
})

// Get a feature by its id
const point = await geo.get('1')
```

### Querying the data

Query features with a quadkey

```js
const stream = geo.query({ quadkey: '02123' })
```

Query features with a bbox

```js
const bbox = [-130.781250, 43.068888, -110.390625, 55.578345]

const stream = geo.query({ bbox }, {
	zoomLimits: {
		minZoom: 11,
		maxZoom: 12
	}
})
```

## Contributing

Contributions are welcome! Please read the [contributing guidelines](CONTRIBUTING.md) first.

## Conduct

It's important that this project contributes to a friendly, safe, and welcoming environment for all. Read this project's [code of conduct](CODE_OF_CONDUCT.md)

## Changelog

Read about the changes to this project in [CHANGELOG.md](CHANGELOG.md). The format is based on [Keep a Changelog](http://keepachangelog.com/) and this project adheres to [Semantic Versioning](http://semver.org/).

## Contact

- [issues](https://github.com/sethvincent/hypergeojson/issues)
- [email](hi@sethvincent.com)

## License

[ISC](LICENSE.md)
