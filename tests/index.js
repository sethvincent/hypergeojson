import * as fs from 'fs/promises'
import { join } from 'desm'

import { test } from 'uvu'
import * as assert from 'uvu/assert'

import ram from 'random-access-memory'
import Hypercore from 'hypercore'

import { HyperGeoJson } from '../index.js'

const pointsFilepath = join(import.meta.url, 'data', 'points.json')
const pointsFile = await fs.readFile(pointsFilepath, 'utf-8')
const points = JSON.parse(pointsFile)

const core = new Hypercore(ram)

const geo = new HyperGeoJson(core)

await geo.ready()

test('create points', async () => {
  for (const feature of points.features) {
    await geo.put(feature)
  }
})

test('get a point', async () => {
  const point = await geo.get('0')
  assert.is(point.value.id, '0')
})

test('query points with quadkey', async () => {
  const stream = geo.query({ quadkey: '02' })
  const results = []

  stream.on('data', (data) => {
    results.push(data)
  })

  stream.on('end', () => {
    assert.is(results.length, 1)
    const [lng, lat] = results[0].value.geometry.coordinates
    assert.is(lng, points.features[0].geometry.coordinates[0])
    assert.is(lat, points.features[0].geometry.coordinates[1])
  })
})

test('query point with exact quadkey', async () => {
  const stream = geo.query({ quadkey: '021230023223323011200000' })

  const results = []

  stream.on('data', (data) => {
    results.push(data)
  })

  stream.on('end', () => {
    assert.is(results.length, 1)
    const [lng, lat] = results[0].value.geometry.coordinates
    assert.is(lng, points.features[0].geometry.coordinates[0])
    assert.is(lat, points.features[0].geometry.coordinates[1])
  })
})

test('query points with bbox', async () => {
  const bbox = [-130.781250,43.068888,-110.390625,55.578345]

	// this starts to get really slow at maxZoom above 12
  const stream = geo.query({ bbox }, {
		zoomLimits: {
			minZoom: 11,
			maxZoom: 12
		}
	})

  const results = []

  stream.on('data', (data) => {
    results.push(data)
  })

  stream.on('end', () => {
    assert.is(results.length, 1)
    const [lng, lat] = results[0].value.geometry.coordinates
    assert.is(lng, points.features[0].geometry.coordinates[0])
    assert.is(lat, points.features[0].geometry.coordinates[1])
  })
})

test.run()
