import { join } from 'desm'
import * as fs from 'fs/promises'
import Hypercore from 'hypercore'
import ram from 'random-access-memory'
import { HyperGeoJson } from '../index.js'

const pointsFilepath = join(import.meta.url, '..', 'tests', 'data', 'points.json')
const pointsFile = await fs.readFile(pointsFilepath, 'utf-8')
const points = JSON.parse(pointsFile)

const core = new Hypercore(ram)
const geo = new HyperGeoJson(core)
await geo.ready()

for (const feature of points.features) {
	await geo.put(feature)
}

const stream = geo.query({ geojsonType: 'point' })
const results = []

stream.on('data', (data) => {
	results.push(data)
})

stream.on('end', () => {
	console.log('results', results)
})
