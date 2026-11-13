import catalog from './data/science-sites.json' with { type: 'json' };
import additional from './data/additional-science-sites.json' with { type: 'json' };
import { fromGeo, MARS_RADIUS } from './terrain.ts';
export const SCIENCE_SITES = catalog;
export type ScienceSite = (typeof catalog)[number];
export const MAP_SCIENCE_SITES: ScienceSite[] = [...catalog, ...additional];
export function isProvisionalSite(siteId: string) { return additional.some(site => site.id === siteId); }
export type ScienceFocus = { id: string; tick: number };
export function sciencePoint(site: ScienceSite, center = { lat: 18.46, lon: 77.42 }) {
  return fromGeo(site.latitude, site.longitude, center);
}
export function siteSeparationMetres(a: ScienceSite, b: ScienceSite) {
  const d = Math.PI / 180, lat = (b.latitude - a.latitude) * d, lon = (b.longitude - a.longitude) * d;
  const h = Math.sin(lat / 2) ** 2 + Math.cos(a.latitude * d) * Math.cos(b.latitude * d) * Math.sin(lon / 2) ** 2;
  return 2 * MARS_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)));
}
