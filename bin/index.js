import * as fs from 'fs/promises'
import mri from 'mri'
import pump from 'pump'
import Hyperswarm from 'hyperswarm'
import Protocol from 'hypercore-protocol'
import Replicator from '@hyperswarm/replicator'

import { HyperGeoJson } from '../index.js'

const argv = process.argv.slice(2)

const flags = mri(argv, {
	alias: {},
	boolean: [],
	default: {}
})

const args = flags._
console.log('args', args)
console.log('flags', flags)

const cmd = args.shift()

if (cmd === 'sync') {
	const key = args[0]

	const geo = new HyperGeoJson({ key })
	const replicator = new Replicator()
	replicator.on('discovery-key', console.log)
	await geo.ready()

	await replicator.add(geo.db.feed, {
		announce: key ? false : true,
		lookup: true
	})

	console.log('key', geo.db.feed.key.toString('hex'))

	geo.db.feed.on('peer-open', () => {
		console.log('got a peer')
	})

	if (key) {
		geo.db.feed.once('peer-open', () => {
			console.log('got a peer')
		})
		console.log('has key')
		const feature = await geo.get('1')
		console.log('feature', feature)
		const stream = geo.createReadStream()
		stream.on('data', console.log)
	}
} else if (cmd === 'put') {
	const dataFilepath = args[0]
	const data = await fs.readFile(dataFilepath)
	const geojson = JSON.parse(data)

	for (const feature of geojson.features) {
		await geo.put(feature)
	}

	process.exit()
}
