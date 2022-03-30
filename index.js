import HyperBee from 'hyperbee'
import Hypercore from 'hypercore'
import { pointToTile, tileToQuadkey } from '@mapbox/tilebelt'

/**
 * 
 */
export class HyperGeoJson {
  constructor (core, options = {}) {
    this.core = core || new Hypercore('./hypergeojson')
    this.options = options

    this.db = new HyperBee(this.core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    })
  }

  async put (feature) {
		if (!feature.id) {
			throw new Error ('feature must have an id')
		}

    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates
      const quadkey = pointToQuadkey(lng, lat)

      await this.db.put(`features/${feature.id}`, feature)

			// TODO: should these two just store the feature id?
			// and then "hydrate" the feature using the feature id on queries?
			await this.db.put(`types/${feature.type}`, feature)
      await this.db.put(`quadkeys/${quadkey}`, feature)
    } else {
      throw new Error(`put not implemented for geojson type ${feature.type}`)
    }
  }

  async get (featureId) {
		return this.db.get(`features/${featureId}`)
  }

  async batch (features) {
    throw new Error('batch not implemented')
  }

  createReadStream (options = {}) {
    return this.db.createReadStream(options)
  }

	quadkeyQuery (quadkey = '') {
		return this.db.createReadStream({ gt: `quadkeys/${quadkey}`, lt: `quadkeys/${quadkey}~` })
	}
}

export function pointToQuadkey (lng, lat, zoom = 24) {
  const tile = pointToTile(lat, lng, zoom)
  return tileToQuadkey(tile)
}

export function polygonToQuadKey (polygonFeature) {
  throw new Error('polygonToQuadKey not implemented')
  // get bbox of polygon
  // bbox to tile
  // tile to quadkey
}
