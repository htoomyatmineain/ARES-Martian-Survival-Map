import { useEffect, useState } from 'react';
import { checkSegment, densify, profileMetrics, type HazardGrid, type NativeRoute } from './nativeRouting';
import { sites, toGeo } from './terrain';
import type { SharedRegionalMap } from './sharedRegionalData';
import { validReturn, type EmergencyContext } from './emergency';

type Candidate = { name: string; route: NativeRoute | null; status: 'verified' | 'no-route' | 'error'; reason: string };
type ReturnState = { context: EmergencyContext | null; loading: boolean; candidates: Candidate[] };
/** Independent arrival-to-habitat searches; outbound is never assumed return-verified. */
export function useEmergencyReturns(context: EmergencyContext | null, grid: HazardGrid | null, shared: SharedRegionalMap) {
  const [state, setState] = useState<ReturnState>({ context: null, loading: false, candidates: [] });
  useEffect(() => {
    if (!context || !grid) return;
    const controller = new AbortController(), workers: Worker[] = [];
    setState({ context, loading: true, candidates: [] });
    const calculate = (name: string, slopeWeight: number) => new Promise<Candidate>((resolve) => {
      const profileController = new AbortController();
      const signal = AbortSignal.any([controller.signal, profileController.signal]);
      let settled = false;
      const worker = new Worker(new URL('./nativeRouting.worker.ts', import.meta.url), { type: 'module' });
      workers.push(worker);
      const timeout = window.setTimeout(() => finish({ name, route: null, status: 'error', reason: 'Return search timed out.' }), 120000);
      const finish = (result: Candidate) => { if (settled) return; settled = true; window.clearTimeout(timeout); profileController.abort(); worker.terminate(); resolve(result); };
      controller.signal.addEventListener('abort', () => finish({ name, route: null, status: 'error', reason: 'Cancelled' }), { once: true });
      worker.onerror = () => finish({ name, route: null, status: 'error', reason: 'Return route worker failed.' });
      worker.onmessage = async (event: MessageEvent<{ route: NativeRoute | null; error?: string; diagnosis?: { message: string } }>) => {
        const m = event.data;
        if (signal.aborted || settled) return;
        if (m.error) { finish({ name, route: null, status: 'error', reason: m.error }); return; }
        if (!m.route) { finish({ name, route: null, status: 'no-route', reason: m.diagnosis?.message ?? 'No complete route under configured demo limits.' }); return; }
        try {
          const route = m.route;
          if (route.approach || route.points.length < 2 || route.points.some((p, i) => i > 0 && !checkSegment(grid, route.points[i - 1], p, route.rules, false).allowed)) throw Error('Return terrain/coverage check failed.');
          const points = densify(route.points, 1);
          const heights = await shared.store.elevationProfile(points.map(p => toGeo(p, shared.terrain.meta.center)), signal);
          signal.throwIfAborted();
          const verified: NativeRoute = { ...route, ...profileMetrics(points, heights), profileStatus: 'verified', profileSamples: points.length };
          if (!validReturn(verified, context.location)) throw Error('Return endpoint or slope verification failed.');
          finish({ name, route: verified, status: 'verified', reason: 'Complete terrain and native elevation profile checked.' });
        } catch (error) { finish({ name, route: null, status: 'error', reason: error instanceof Error ? error.message : 'Return verification failed.' }); }
      };
      worker.postMessage({ id: 1, grid, start: context.location, end: sites[0], allowApproach: false,
        rules: { ...context.outboundRoute.rules, slopeWeight }, blocked: false });
    });
    Promise.all([calculate('Slope priority', context.outboundRoute.rules.slopeWeight), calculate('Distance priority', 0)])
      .then(candidates => { if (!controller.signal.aborted) setState({ context, loading: false, candidates }); })
      .catch(() => { if (!controller.signal.aborted) setState({ context, loading: false, candidates: [{ name: 'Return routing', route: null, status: 'error', reason: 'Return routing could not be initialized.' }] }); });
    return () => { controller.abort(); workers.forEach(worker => worker.terminate()); };
  }, [context, grid, shared]);
  return state.context === context ? state : { context, loading: !!context, candidates: [] };
}
