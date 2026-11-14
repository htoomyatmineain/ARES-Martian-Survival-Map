import { lazy, Suspense } from 'react';

const RegionalWorkspace = lazy(() => import('./RegionalWorkspace'));

export default function App() {
  return <Suspense fallback={<p role="status">Loading Mars workspace…</p>}>
    <RegionalWorkspace />
  </Suspense>;
}
