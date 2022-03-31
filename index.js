import HyperBee from 'hyperbee'
import Hypercore from 'hypercore'
import { pointToTile, tileToQuadkey, bboxToTile } from '@mapbox/tilebelt'
import cover from '@mapbox/tile-cover'
import bboxPolygon from '@turf/bbox-polygon'
import MultiStream from 'multistream'

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

  async ready () {
    return this.core.ready()
  }

  async put (feature) {
    if (!feature.id) {
      throw new Error('feature must have an id')
    }

    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates
      const quadkey = pointToQuadkey(lng, lat)
      feature.quadkey = quadkey

      await this.db.put(`features/${feature.id}`, feature)

      // TODO: should these two indexes just store the feature id?
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

  queryQuadkey (quadkey = '') {
    return this.db.createReadStream({ gte: `quadkeys/${quadkey}`, lt: `quadkeys/${quadkey}~` })
  }

  queryBbox (bbox, options = {}) {
    const {
      minZoom: min_zoom,
      maxZoom: max_zoom
    } = options

    const geojson = bboxPolygon(bbox)
    const quadkeys = cover.indexes(geojson.geometry, {
      min_zoom,
      max_zoom
    })

    // convert quadkey array into array of streams
    const streams = quadkeys.map((quadkey) => {
      return this.queryQuadkey(quadkey)
    })

    // returns stream of features
    return MultiStream.obj(streams)
  }

  queryGeojsonType (geojsonType) {
    return this.db.createReadStream({ gte: `types/${geojsonType}`, lt: `types/${geojsonType}~` })
  }

  /**
   * query features using quadkey, bbox, or geojson type
   * @returns {stream.Readable}
   */
  query (options = {}) {
    const {
      quadkey,
      bbox,
      bboxLimits,
      geojsonType
    } = options

    if (quadkey) {
      return this.queryQuadkey(quadkey)
    } else if (bbox) {
      return this.queryBbox(bbox, bboxLimits)
    } else if (geojsonType) {
      return this.queryGeojsonType(geojsonType)
    }
  }
}

export function bboxToQuadkey (bbox) {
  const tile = bboxToTile(bbox)
  return tileToQuadkey(tile)
}

export function pointToQuadkey (lng, lat, zoom = 24) {
  const tile = pointToTile(lng, lat, zoom)
  return tileToQuadkey(tile)
}

export function polygonToQuadKey (polygonFeature) {
  throw new Error('polygonToQuadKey not implemented')
  // get bbox of polygon
  // bbox to tile
  // tile to quadkey
}
