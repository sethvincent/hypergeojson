import * as fs from 'fs/promises'
import * as path from 'path'

import mri from 'mri'

import { Discovery } from '../discovery.js'
import { HyperGeoJson } from '../index.js'

const argv = process.argv.slice(2)

const flags = mri(argv, {
	alias: {
		key: ['k'],
		filepath: ['f']
	},
	boolean: [],
	default: {
		filepath: path.join(process.cwd(), '.hypergeojson')
	}
})

const args = flags._
const cmd = args.shift()
const key = flags.key
const server = !key
const client = !!key

const geo = new HyperGeoJson(flags.filepath, { key })
await geo.ready()

const publicKey = geo.core.key.toString('hex')

const discovery = new Discovery({
	server,
	client
})

discovery.on('peer', (connection) => {
	connection.pipe(geo.replicate(!server)).pipe(connection)
})

async function sync () {
	console.log('key', publicKey)
	console.log(`node bin/index.js sync --key ${publicKey}`)
	await discovery.join(publicKey)
}

async function put () {
	if (!server) {
		return console.error('not writable, must be owner of project to write data')
	}

	const featuresFilepath = args[0]
	const data = await fs.readFile(featuresFilepath)
	const geojson = JSON.parse(data)

	for (const feature of geojson.features) {
		await geo.put(feature)
	}

	process.exit()
}

async function list () {
	if (!server) {
		await discovery.join(publicKey)
	}

	await geo.core.update()
	for await (const data of geo.createReadStream({ live: true })) {
		console.log(data)
	}
}

if (cmd === 'sync') {
	await sync()
} else if (cmd === 'put') {
	await put()
} else if (cmd === 'list') {
	await list()
}
