// Reuse the source-geometry/browser suite without overwriting Step 3 evidence.
process.env.JZ01_STEP4 = '1';
await import('./test-runtime.mjs');
