import { EventEmitter } from 'events'
import net from 'net'

import NoiseSecretStream from '@hyperswarm/secret-stream'
import Hyperswarm from 'hyperswarm'
import { MdnsDiscovery } from 'mdns-sd-discovery'
import z32 from 'z32'

export class Discovery extends EventEmitter {
	#connections = new Set()

	constructor (options) {
		super()

		const { server, client, bootstrap, name } = options

		this.name = name
		this.server = server
		this.client = client
		this.swarm = new Hyperswarm({ server, client, bootstrap })
		this.mdns = new MdnsDiscovery()
		this.tcp = net.createServer()
		this.socket = undefined

		this.tcp.listen(() => {
			this.address = this.tcp.address()
		})

		this.swarm.on('connection', (connection, info) => {
			this.emit('peer', connection, info)
		})

		this.mdns.on('service', (service) => {
			if (service.txt.name === this.name) {
				return
			}

			const socket = net.connect({
				host: service.host,
				port: service.port,
				allowHalfOpen: true
			})

			const connection = new NoiseSecretStream(true, socket)
			connection.on('connect', () => {
				this.emit('peer', connection)
			})

			connection.on('error', (error) => {
				console.error(error)
				connection.end()
			})

			connection.on('close', () => {
				connection.end()
			})

			this.#connections.add(connection)
		})

		this.tcp.on('connection', (socket) => {
			const connection = new NoiseSecretStream(false, socket)

			connection.on('error', (error) => {
				console.error(error)
				connection.end()
			})

			connection.on('close', () => {
				connection.end()
			})

			this.emit('peer', connection)
			this.#connections.add(connection)
		})
	}

	async join (topic, options = {}) {
		this.dht = this.swarm.join(Buffer.from(topic, 'hex'), {
			server: this.server,
			client: this.client
		})

		await this.swarm.flush()
		await this.dht.flushed()

		if (this.server) {
			await this.dht.flushed()
			const { port } = this.address
			this.mdns.announce({
				name: '_hypergeo',
				protocol: '_tcp',
				subtypes: [z32.encode(topic)]
			}, { port, txt: { topic, name: this.name } })
		} else {
			await this.swarm.flush()
			this.mdns.lookup({
				name: '_hypergeo',
				protocol: '_tcp',
				subtypes: [z32.encode(topic)]
			})
		}
	}

	async leave (topic) {
		await this.swarm.leave(topic)
		this.mdns.unannounce()
		this.mdns.stopLookup()
	}

	async destroy () {
		this.removeAllListeners('peer')
		await this.dht.destroy()
		await this.swarm.destroy()
		this.mdns.stopLookup()
		this.mdns.unannounce(true)
		this.mdns.destroy()

		for (const connection of this.#connections.values()) {
			connection.end()
		}

		this.tcp.close()
	}
}
