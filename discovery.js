import { EventEmitter } from 'events'
import net from 'net'

import Hyperswarm from 'hyperswarm'
import { MdnsDiscovery } from 'mdns-sd-discovery'

export class Discovery extends EventEmitter {
  constructor (options) {
    super()

    const { topic, server, client } = options

    this.topic = topic
    this.server = server
    this.client = client
    this.swarm = new Hyperswarm({ server, client })
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
      const socket = net.connect({
        host: service.host,
        port: service.port,
        allowHalfOpen: true
      })

      this.emit('peer', socket)
      this.socket = socket
    })

    this.tcp.on('connection', (socket) => {
      this.emit('peer', socket)
    })
  }

  async join (topic, options = {}) {
    this.dht = this.swarm.join(Buffer.from(topic, 'hex'), {
      server: this.server,
      client: this.client
    })

    if (this.server) {
      await this.dht.flushed()
      const { port } = this.address
      this.mdns.announce('hypergeojson', { port, txt: { topic } })
    } else {
      await this.swarm.flush()
    }

    this.mdns.lookup('hypergeojson')
  }

  async leave (topic) {
    await this.swarm.leave(topic)
    this.mdns.unannounce()
    this.mdns.stopLookup()
  }

  destroy () {
    this.removeAllListeners('peer')
    this.dht.destroy()
    this.swarm.destroy()
    this.mdns.destroy()
  }
}
