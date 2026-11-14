# Validate once per unchanged dependency set

Every gate records input asset hashes, code commit, tool versions, relevant configuration and output hashes. Reuse a pass only when these dependencies match. Label reused evidence as reused, with its original date. A changed layer does not invalidate unchanged DEM decoding; a changed coordinate transform invalidates spatial registration and dependent routes. A UI spacing edit requires layout/build checks, not a full 105-million-sample DEM audit.

## Accuracy statements

Keep four measurements separate: (1) source sampling resolution, (2) bit-for-bit processing fidelity, (3) coarsening/registration difference, (4) independently established physical accuracy. Do not turn any one into the others. Never describe route warnings as probabilities or demo thresholds as NASA astronaut limits.

Historical comparison references, not fresh passes:

- Native package: 105,450,544 height samples, zero bit differences; display 1,002,001 nodes, zero sampled-height/mask differences; independent 289 coordinate controls, zero pixel-index disagreements.
- Display versus native: bilinear RMSE 0.19874 m, maximum 6.75797 m; triangle RMSE 0.20247 m, maximum 6.70284 m. These are display approximation errors, not ground truth accuracy.
- PLACES comparison: 311 in-zone valid rover records, RMS 0.04748 m; shared map dependencies mean this is archive consistency, not 5 cm absolute accuracy.
- Geology: 43 polygons/7 units/61 contact parts; three regional offsets ~97–107 m; source warning remains. Spectral: 60,931/62,500 valid output cells per index, 97.4896%; not a mineral-confidence percentage.
- MEDA: 43 reference ground readings, 43 local air-detector records and 42 pressure records; no wind product in the checked sol directories.

Reproduce counts only for the same source versions and algorithms. Unexpected differences trigger diagnosis, not editing the expected result to make a test pass.

## Gate evidence template

```md
# Phase NN evidence
Status: NOT STARTED | RUNNING | BLOCKED | PASSED
Owner / branch / commit:
Input files, source URLs and SHA256:
Configuration and tool versions:
Commands actually executed:
Results / counts / numerical differences:
Browser/device checks and screenshots:
Reused evidence and matching dependencies:
Limitations / unresolved failures:
Output paths, bytes and SHA256:
Next phase unlocked:
```

Fresh builds require meaningful tests: analytic flat/tilted surfaces, narrow obstacles, missing strips and corner touches; independent source reading/projection; normal/aborted/approach-only missions; failed network/corrupt packages. Tests that only repeat the implementation formula are insufficient as independent evidence.

After relevant checks pass, run a final full suite/build at integration. Do not keep rerunning unchanged checks. Record 3D visuals only when actually rendered with WebGL; DOM markers alone are not visual confirmation. Missing sources stay unknown and explicit. If blocked, keep independent work progressing; do not mark the gate passed.
