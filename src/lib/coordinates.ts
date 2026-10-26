export type Axis = 'lat' | 'lon'
export type CoordinateFormat = 'dd' | 'ddm' | 'dms'
const limit = (axis: Axis) => axis === 'lat' ? 90 : 180

/** Angular notation only: no datum transformation, geocoding or rounding of input coordinates. */
export function parseCoordinate(input: string, axis: Axis): number {
  let text = input.trim().toUpperCase().replace(/−/g, '-')
  if (!text) throw new RangeError('Enter a coordinate in decimal degrees, degrees/minutes or degrees/minutes/seconds.')
  const prefix = /^[NSEW]/.exec(text)?.[0]
  const suffix = /[NSEW]$/.exec(text)?.[0]
  if (prefix && suffix) throw new RangeError('Use one hemisphere letter, at the start or end.')
  const hemisphere = prefix ?? suffix
  if (hemisphere && !(axis === 'lat' ? 'NS' : 'EW').includes(hemisphere)) throw new RangeError(axis === 'lat' ? 'Latitude uses N or S.' : 'Longitude uses E or W.')
  if (prefix) text = text.slice(1).trim()
  if (suffix) text = text.slice(0, -1).trim()
  const match = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*[°º]?$/.exec(text)
    ?? /^([+-]?\d+)(?:\s*[°º:]\s*|\s+)(\d+(?:\.\d*)?|\.\d+)\s*[′']?$/.exec(text)
    ?? /^([+-]?\d+)(?:\s*[°º:]\s*|\s+)(\d+)(?:\s*[′':]\s*|\s+)(\d+(?:\.\d*)?|\.\d+)\s*[″"]?$/.exec(text)
  if (!match) throw new RangeError('Use DD, degrees/minutes or degrees/minutes/seconds in that order, e.g. 25° 45′ 00″ S.')
  const fields = match.slice(1)
  const parts = fields.map(Number), degrees = Math.abs(parts[0])
  if (parts.slice(1).some(v => v < 0 || v >= 60)) throw new RangeError('Minutes and seconds must be at least 0 and less than 60.')
  const southWest = hemisphere === 'S' || hemisphere === 'W'
  if (hemisphere && ((fields[0].startsWith('-') && !southWest) || (fields[0].startsWith('+') && southWest))) throw new RangeError('The sign and hemisphere disagree. South/west is negative; north/east is positive.')
  const magnitude = degrees + (parts[1] ?? 0) / 60 + (parts[2] ?? 0) / 3600
  if (!Number.isFinite(magnitude) || magnitude > limit(axis) || (degrees === limit(axis) && parts.slice(1).some(v => v > 0))) throw new RangeError(`${axis === 'lat' ? 'Latitude' : 'Longitude'} must be within ±${limit(axis)}°.`)
  return (hemisphere ? southWest : fields[0].startsWith('-')) ? -magnitude : magnitude
}

export function formatCoordinate(value: number, axis: Axis, format: CoordinateFormat): string {
  if (!Number.isFinite(value) || Math.abs(value) > limit(axis)) throw new RangeError('Coordinate is outside the supported range.')
  const hemisphere = axis === 'lat' ? (value < 0 || Object.is(value, -0) ? 'S' : 'N') : (value < 0 || Object.is(value, -0) ? 'W' : 'E')
  if (format === 'dd') return `${Math.abs(value).toFixed(6)}° ${hemisphere}`
  // Round the total first so 59.999... seconds carries cleanly into the next minute/degree.
  const scale = format === 'dms' ? 360000 : 600000
  const ticks = Math.round(Math.abs(value) * scale), degrees = Math.floor(ticks / scale), remainder = ticks % scale
  if (format === 'ddm') return `${degrees}° ${(remainder / 10000).toFixed(4).padStart(7, '0')}′ ${hemisphere}`
  const minutes = Math.floor(remainder / 6000), seconds = (remainder % 6000) / 100
  return `${degrees}° ${String(minutes).padStart(2, '0')}′ ${seconds.toFixed(2).padStart(5, '0')}″ ${hemisphere}`
}
