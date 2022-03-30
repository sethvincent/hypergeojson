import * as fs from 'fs/promises'
import { join } from 'desm'

import { test } from 'uvu'
import * as assert from 'uvu/assert'

import { HyperGeoJson } from '../index.js'

const pointsFilepath = join(import.meta.url, 'data', 'points.json')
const pointsFile = await fs.readFile(pointsFilepath, 'utf-8')
const points = JSON.parse(pointsFile)

const geo = new HyperGeoJson()

test('create points', async () => {
	for (const feature of points.features) {
		await geo.put(feature)
	}
})

test('get a point', async () => {
	const point = await geo.get('1')
	assert.is(point.value.id, '1')})

test('query points with quadkey', async () => {
  // Get Lima point using high-level quadkey query
	const stream = geo.quadkeyQuery('2')
	const results = []
	
	stream.on('data', (data) => {
		results.push(data)
	})

	stream.on('end', () => {
		assert.is(results.length, 1)
		const [lng, lat] = results[0].value.geometry.coordinates
		assert.is(lng, points.features[2].geometry.coordinates[0])
		assert.is(lat, points.features[2].geometry.coordinates[1])
	})	
})

test.run()
