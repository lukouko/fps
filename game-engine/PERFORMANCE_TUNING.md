# Performance Tuning Guide

## Running Benchmarks

```bash
npm test -- scene.bench.test.js
```

## Understanding the Output

The benchmark tests measure execution time for the hot rendering paths:

- **skyTexelCoords**: Pure math function (should be <0.001ms)
- **scene.initialise**: Initialization (should be <10ms)
- **OffScreenBuffer.clear**: Pixel buffer reset (should be <0.1ms per call)
- **drawVerticalBufferSlice**: Rendering one screen column (~0.14ms)
- **blendVerticalBufferSlice**: Blending one column with glass (~0.13ms)
- **Full frame (1280 columns)**: Complete render without glass (~132ms = 8fps)
- **Full frame with 25% glass**: Complete render with glass walls (~165ms = 6fps)

## Baseline (Current Performance)

- No glass: **~132ms per frame** (suggests ~8 fps capacity in this synthetic test)
- With 25% glass: **~165ms per frame** (suggests ~6 fps capacity in this synthetic test)

**Note**: These benchmarks test only the pixel-pushing operations via OffScreenBuffer. Real rendering includes raycasting, texture lookups, and sprite rendering, so actual frame times are higher.

## Testing an Optimization

1. Make a code change in `src/scene.js` or `src/offscreen-buffer.js`
2. Run: `npm run benchmark`
3. Look for improvements in the "Full frame" benchmarks
4. If performance got worse, revert and try a different approach

Example run:

```
Before:  Full frame (1280 columns): 131.8642ms avg
After:   Full frame (1280 columns): 125.2311ms avg (5% improvement ✓)
```

## Common Performance Issues

### Texture Lookups in Hot Loops
- `textures.getTextureById()` is called per-pixel inside loops
- **Solution**: Cache textures at the column level or precompute which textures are needed

### Object Spreading
- `{ ...object }` in hot loops creates new allocations
- **Solution**: Reuse objects or pass values directly

### Duplicate Calculations
- Same math computed multiple times in conditional branches
- **Solution**: Factor out common calculations before branching

### Array Operations in Hot Paths
- `concat()`, `filter()`, `sort()` create new arrays
- **Solution**: Only when necessary; reuse arrays when possible

### Memory Bandwidth
- Large texture lookups with poor cache locality
- **Solution**: Keep hot data structures compact; avoid random access patterns

## Profiling Full Render

To profile the real game rendering (not just OffScreenBuffer):

1. Start the dev server: `npm run serve`
2. Open DevTools → Performance tab
3. Record a frame while rendering
4. Look for hot functions in the timeline

The profile will show:
- Time in `renderWallRay()` (wall rendering)
- Time in `renderSprites()` (sprite rendering)
- Time in raycasting (`castWallRay()`, `calculateVerticalCollision()`, etc.)
- Time in OffScreenBuffer calls

## Notes

- Benchmarks use synthetic data (uniform textures, no real raycasting)
- Real game rendering includes raycasting overhead not measured here
- Optimizations should be verified in the real game at target FPS
- All tests pass before optimizing—don't break correctness for speed
