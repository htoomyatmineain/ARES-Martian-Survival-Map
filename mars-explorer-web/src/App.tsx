import { lazy, Suspense } from 'react';

const Explorer = lazy(() => import('./Explorer'));
const JZ01Preview = lazy(() => import('./jz01/JZ01Preview'));

export default function App() {
  const jz01 = new URLSearchParams(location.search).get('workspace') === 'jz01';
  return <Suspense fallback={<p role="status">Loading Mars workspace…</p>}>
    {jz01 ? <JZ01Preview /> : <Explorer />}
  </Suspense>;
}
