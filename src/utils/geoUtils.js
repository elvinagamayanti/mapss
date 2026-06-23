/**
 * Custom point-in-polygon implementation using the Ray-Casting algorithm.
 *
 * @param {Array<number>} point - The point coordinates [longitude, latitude]
 * @param {Array<Array<number>>} ring - Array of ring coordinates [[longitude, latitude], ...]
 * @returns {boolean} True if the point is inside the polygon ring
 */
export function isPointInRing(point, ring) {
  if (!ring || ring.length < 3) return false;
  const x = point[0];
  const y = point[1];
  let inside = false;
  
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Checks if a point is inside a GeoJSON Polygon
 *
 * @param {Array<number>} point - [longitude, latitude]
 * @param {Array<Array<Array<number>>>} polygonCoords - Polygon coordinates [outerRing, hole1, ...]
 * @returns {boolean}
 */
export function isPointInPolygon(point, polygonCoords) {
  if (!polygonCoords || polygonCoords.length === 0) return false;
  
  // Must be inside the outer ring
  if (!isPointInRing(point, polygonCoords[0])) {
    return false;
  }
  
  // Must not be inside any holes (inner rings)
  for (let i = 1; i < polygonCoords.length; i++) {
    if (isPointInRing(point, polygonCoords[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Checks if a point is inside a GeoJSON MultiPolygon
 *
 * @param {Array<number>} point - [longitude, latitude]
 * @param {Array<Array<Array<Array<number>>>>} multiPolygonCoords - MultiPolygon coordinates
 * @returns {boolean}
 */
export function isPointInMultiPolygon(point, multiPolygonCoords) {
  if (!multiPolygonCoords) return false;
  for (let i = 0; i < multiPolygonCoords.length; i++) {
    if (isPointInPolygon(point, multiPolygonCoords[i])) {
      return true;
    }
  }
  return false;
}

/**
 * Finds which feature (SLS) the location belongs to
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} geojson - The GeoJSON FeatureCollection
 * @returns {Object|null} The matching feature, or null
 */
export function findSLSForLocation(lat, lng, geojson) {
  if (!geojson || !geojson.features) return null;
  const point = [lng, lat]; // GeoJSON uses [longitude, latitude]
  
  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    
    if (geometry.type === 'Polygon') {
      if (isPointInPolygon(point, geometry.coordinates)) {
        return feature;
      }
    } else if (geometry.type === 'MultiPolygon') {
      if (isPointInMultiPolygon(point, geometry.coordinates)) {
        return feature;
      }
    }
  }
  
  return null;
}
