import HyperBee from 'hyperbee'
import Hypercore from 'hypercore'
import { pointToTile, tileToQuadkey, bboxToTile } from '@mapbox/tilebelt'
import cover from '@mapbox/tile-cover'
import bboxPolygon from '@turf/bbox-polygon'
import MultiStream from 'multistream'

/**
 * @param {object} [core] - hypercore instance https://github.com/hypercore-protocol/hypercore
 */
export class HyperGeoJson {
  constructor (filepath, options = {}) {
    const { key } = options
    this.core = new Hypercore(filepath, key)

    this.db = new HyperBee(this.core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    })
  }

  async ready () {
    return this.core.ready()
  }

  replicate (isInitiator, options) {
    return this.core.replicate(isInitiator, options)
  }

  /**
   * @param {import('@types/geojson').Feature} feature - geojson feature. Only points are allowed for now.
   * @return {Promise<string>} quadkey
   */
  async put (feature) {
    if (!feature.id) {
      throw new Error('feature must have an id')
    }

    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates
      const quadkey = pointToQuadkey(lng, lat)

      await this.db.put(`features/${feature.id}`, feature)

      // TODO: should these two indexes just store the feature id?
      // and then "hydrate" the feature using the feature id on queries?
      await this.db.put(`types/${feature.type}`, feature)
      await this.db.put(`quadkeys/${quadkey}`, feature)

      return quadkey
    } else {
      throw new Error(`put not implemented for geojson type ${feature.type}`)
    }
  }

  /**
   * @param {string} featureId
   * @return {import('@types/geojson').Feature}
   */
  async get (featureId) {
    return this.db.get(`features/${featureId}`)
  }

  async batch (features) {
    throw new Error('batch not implemented')
  }

  createReadStream (options = {}) {
    return this.db.createReadStream(options)
  }

  /**
   * @param {Array<string>} quadkeys
   * @param {object} [options] - passed to hyperbee createReadStream https://github.com/hypercore-protocol/hyperbee#stream--dbcreatereadstreamoptions
   * @return {stream.Readable<import('@types/geojson').Feature>}
   */
  quadKeysToStream (quadkeys, options = {}) {
    // convert quadkey array into array of streams
    const streams = quadkeys.map((quadkey) => {
      return this.queryQuadkey(quadkey, options)
    })

    // returns stream of features
    return MultiStream.obj(streams)
  }

  /**
   * @param {string} quadkey - string containing numerical id of a specific tile https://wiki.openstreetmap.org/wiki/QuadTiles
   * @param {object} [options] - passed to hyperbee createReadStream https://github.com/hypercore-protocol/hyperbee#stream--dbcreatereadstreamoptions
   * @return {stream.Readable<import('@types/geojson').Feature>}
   */
  queryQuadkey (quadkey = '', options = {}) {
    options.gte = `quadkeys/${quadkey}`
    options.lt = `quadkeys/${quadkey}~`
    return this.db.createReadStream(options)
  }

  /**
   * @param {string} geojsonType
   * @param {object} [options] - passed to hyperbee createReadStream https://github.com/hypercore-protocol/hyperbee#stream--dbcreatereadstreamoptions
   * @return {stream.Readable<import('@types/geojson').Feature>}
   */
  queryGeojsonType (geojsonType, options = {}) {
    options.gte = `types/${geojsonType}`
    options.lt = `types/${geojsonType}~`
    return this.db.createReadStream(options)
  }

  /**
   * @param {import('@types/geojson').BBox} bbox
   * @param {object} [options] - passed to hyperbee createReadStream https://github.com/hypercore-protocol/hyperbee#stream--dbcreatereadstreamoptions
   * @param {object} [options.zoomLimits]
   * @param {number} [options.zoomLimits.minZoom]
   * @param {number} [options.zoomLimits.maxZoom]
   * @return {stream.Readable<import('@types/geojson').Feature>}
   */
  queryBbox (bbox, options = {}) {
    const quadkeys = bboxToQuadkeys(bbox, options)
    return this.quadKeysToStream(quadkeys, options)
  }

  /**
   * query features using quadkey, bbox, or geojson type
   * @param {object} [query]
   * @param {string} [query.quadkey]
   * @param {string} [query.geojsonType]
   * @param {import('@types/geojson').BBox} [query.bbox]
   * @param {object} [options.zoomLimits] - used with the bbox query
   * @param {number} [options.zoomLimits.minZoom]
   * @param {number} [options.zoomLimits.maxZoom]
   * @param {object} [options]
   * @return {stream.Readable<import('@types/geojson').Feature>}
   */
  query (query = {}, options = {}) {
    const { quadkey, bbox, geojsonType } = query

    if (quadkey) {
      return this.queryQuadkey(quadkey, options)
    } else if (bbox) {
      return this.queryBbox(bbox, options)
    } else if (geojsonType) {
      return this.queryGeojsonType(geojsonType, options)
    }
  }
}

export function bboxToQuadkey (bbox) {
  const tile = bboxToTile(bbox)
  return tileToQuadkey(tile)
}

export function bboxToQuadkeys (bbox, options = {}) {
  const { zoomLimits } = options
  const geojson = bboxPolygon(bbox)

  return cover.indexes(geojson.geometry, {
    min_zoom: zoomLimits.minZoom,
    max_zoom: zoomLimits.maxZoom
  })
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
