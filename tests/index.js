import { join } from 'desm'
import * as fs from 'fs/promises'

import { test } from 'brittle'

import createTestnet from '@hyperswarm/testnet'
import Hypercore from 'hypercore'
import ram from 'random-access-memory'

import { Discovery } from '../discovery.js'
import { HyperGeoJson } from '../index.js'

const pointsFilepath = join(import.meta.url, 'data', 'points.json')
const pointsFile = await fs.readFile(pointsFilepath, 'utf-8')
const points = JSON.parse(pointsFile)

const core = new Hypercore(ram)

const geo = new HyperGeoJson(core)

await geo.ready()

test('create points', async (t) => {
	t.plan(1)
	const count = points.features.length

	for (const feature of points.features) {
		await geo.put(feature)
	}

	const stream = geo.createReadStream({ gte: 'features/', lt: 'features/~' })
	const results = []

	stream.on('data', (data) => {
		results.push(data)
	})

	stream.on('end', () => {
		t.ok(results.length === count)
	})
})

test('get a point', async (t) => {
	const point = await geo.get('0')
	t.ok(point.value.id === '0')
	t.end()
})

test('query points with quadkey', async (t) => {
	t.plan(3)
	const stream = geo.query({ quadkey: '02' })
	const results = []

	stream.on('data', (data) => {
		results.push(data)
	})

	stream.on('end', () => {
		t.ok(results.length === 1)
		const [lng, lat] = results[0].value.geometry.coordinates
		t.ok(lng === points.features[0].geometry.coordinates[0])
		t.ok(lat === points.features[0].geometry.coordinates[1])
	})
})

test('query point with exact quadkey', (t) => {
	t.plan(3)
	const stream = geo.query({ quadkey: '021230023223323011200000' })

	const results = []

	stream.on('data', (data) => {
		results.push(data)
	})

	stream.on('end', () => {
		t.ok(results.length === 1)
		const [lng, lat] = results[0].value.geometry.coordinates
		t.ok(lng === points.features[0].geometry.coordinates[0])
		t.ok(lat === points.features[0].geometry.coordinates[1])
	})
})

test('query points with bbox', async (t) => {
	t.plan(3)

	const bbox = [-130.781250, 43.068888, -110.390625, 55.578345]

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
		t.ok(results.length === 1)
		const [lng, lat] = results[0].value.geometry.coordinates
		t.ok(lng === points.features[0].geometry.coordinates[0])
		t.ok(lat === points.features[0].geometry.coordinates[1])
	})
})

test('query all points', async (t) => {
	t.plan(1)
	const stream = geo.query({ geojsonType: 'point' })
	const results = []

	stream.on('data', (data) => {
		results.push(data)
	})

	stream.on('end', () => {
		t.ok(results.length === points.features.length)
	})
})

test('discovery', async (t) => {
	t.plan(1)
	const testnet = await createTestnet(10)
	const bootstrap = testnet.bootstrap

	const core2 = new Hypercore(ram, core.key)
	const geo2 = new HyperGeoJson(core2)
	await geo2.ready()

	const key = core.discoveryKey

	const discovery1 = new Discovery({
		server: true,
		client: false,
		bootstrap,
		name: 'discovery1'
	})

	const discovery2 = new Discovery({
		server: false,
		client: true,
		bootstrap,
		name: 'discovery2'
	})

	discovery1.on('peer', (connection) => {
		geo.replicate(connection)
	})

	const results = []
	discovery2.on('peer', async (connection) => {
		geo2.replicate(connection)
		const stream = geo2.createReadStream({ gte: 'features/', lt: 'features/~' })

		stream.on('data', (data) => {
			results.push(data)
		})

		stream.on('end', async () => {
			t.ok(results.length === points.features.length)
			await discovery1.destroy()
			await discovery2.destroy()
			await testnet.destroy()
		})
	})

	discovery1.join(key)
	discovery2.join(key)
})
