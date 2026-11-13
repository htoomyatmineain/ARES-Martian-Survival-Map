import thermal from './data/thermal-observations.json' with { type: 'json' };
import minerals from './data/mineral-observations.json' with { type: 'json' };
import { SCIENCE_SITES } from './scienceSites.ts';
import { fromGeo, type Point } from './terrain.ts';

export type ObservationLayer = 'none' | 'thermal' | 'minerals' | 'environment';
export const THERMAL = thermal;
export const MINERALS = minerals;
export type ThermalObservation = (typeof thermal.observations)[number];
export type MineralObservation = (typeof minerals)[number];
export type ObservationMarker = { id: string; point: Point; label: string; description: string; color: string; kind: 'thermal' | 'minerals' | 'environment' };
export const THERMAL_NOTE = 'Temperature applies only to the shown location, time, and coverage. Rover readings do not represent the whole map.';
export const MINERAL_NOTE = 'Detected minerals do not confirm a usable or mineable deposit. Coverage and confidence vary. Unobserved areas are unknown.';
export function celsius(kelvin: number) { return kelvin - 273.15; }
export function observationMarkers(layer: ObservationLayer, reading: ThermalObservation, center = { lat: 18.46, lon: 77.42 }): ObservationMarker[] {
  if (layer === 'environment') return [{ id: reading.id, point: fromGeo(reading.latitude, reading.longitude, center), label: 'E', description: `Historical near-rover environment / sol ${reading.sol} / ${reading.lmst} LMST`, color: '#e6bd64', kind: 'environment' }];
  if (layer === 'thermal') return [{ id: reading.id, point: fromGeo(reading.latitude, reading.longitude, center), label: 'T', description: `Ground brightness temperature / sol ${reading.sol} / ${reading.lmst} LMST`, color: '#e6bd64', kind: 'thermal' }];
  if (layer === 'minerals') return MINERALS.flatMap(record => {
    const site = SCIENCE_SITES.find(site => site.id === record.siteId);
    return site ? [{ id: record.id, point: fromGeo(site.latitude, site.longitude, center), label: 'M', description: `${record.name} / ${record.mineral} / provisional position`, color: '#c2afe9', kind: 'minerals' as const }] : [];
  });
  return [];
}
