import { lazy, Suspense } from 'react';

const Explorer = lazy(() => import('./Explorer'));
const JZ01Preview = lazy(() => import('./jz01/JZ01Preview'));
const RegionalWorkspace = lazy(() => import('./RegionalWorkspace'));

export default function App() {
  const jz01 = new URLSearchParams(location.search).get('workspace') === 'jz01';
  const regional = new URLSearchParams(location.search).get('workspace') === 'regional';
  return <Suspense fallback={<p role="status">Loading Mars workspace…</p>}>
    {regional ? <RegionalWorkspace /> : jz01 ? <JZ01Preview /> : <Explorer />}
  </Suspense>;
}
