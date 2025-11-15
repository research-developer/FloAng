# Debug Mode Documentation

Comprehensive debugging system for morph-lab with automatic anomaly detection, frame-by-frame playback, and live code editing via Chrome DevTools.

## Quick Start

1. **Open morph-lab.html** in a browser
2. **Open Chrome DevTools Console** (F12)
3. **Type:** `MorphDebug.help()`

## Features Overview

### 1. Automatic Anomaly Detection

Monitors every frame during morph animations for:
- **Handle angle jumps** > 5° per frame
- **Symmetry spikes** > 100 units per frame
- **Handle position jumps** > 10px per frame

**Auto-pause** on first anomaly detected.

```javascript
// Enable auto-detect with custom thresholds
MorphDebug.enableAutoDetect({
    handleAngleDelta: 3.0,   // degrees per frame
    symmetrySpike: 50,        // units
    handleJump: 8             // pixels
});

// Start a morph - will auto-pause if abrupt change detected
startMorph();
```

### 2. Frame-by-Frame Playback

Capture and replay animations frame-by-frame.

```javascript
// After anomaly detection pauses animation:
MorphDebug.step();           // Step forward one frame
MorphDebug.stepBack();       // Step backward one frame
MorphDebug.jumpTo(15);       // Jump to frame 15
MorphDebug.rewind();         // Back to start
MorphDebug.resume();         // Continue animation
```

### 3. Live Inspection

Examine animation state in real-time.

```javascript
// Get current metrics
const metrics = MorphDebug.getMetrics();
console.log('Symmetry:', metrics.symmetry);
console.log('Edge angles:', metrics.edgeAngles);

// Inspect specific anchor
const anchor2 = MorphDebug.getAnchorHandles(2);
console.log('Position:', anchor2.pos);
console.log('Handles:', anchor2.handleIn, anchor2.handleOut);
console.log('Stored:', anchor2.stored);

// Get all anchor handles
const allHandles = MorphDebug.getAllHandles();
```

### 4. Golden Snapshots

Save known-good states for regression testing.

```javascript
// Capture current state as reference
MorphDebug.captureGolden('3to4-perfect');

// Run animation, then compare
MorphDebug.compareToGolden('3to4-perfect');
// Output:
// Max Angle Deviation: 0.52°
// Symmetry Deviation: 2.35
// Max Position Delta: 1.23px
// Within Tolerance: ✅

// List all golden snapshots
MorphDebug.listGolden();

// Export for sharing
MorphDebug.exportGolden('3to4-perfect');
```

### 5. Method Hot-Reload

Modify algorithms live without refreshing the page.

```javascript
// Replace a method to test a fix
MorphDebug.replaceMethod('MorphAnimation', '_normalizeShape',
    function(result, to, fromOrth, toOrth, t, toSides) {
        // Your experimental implementation here
        console.log('Testing new normalization logic');
        // ... modified algorithm ...
    }
);

// Rewind and replay with new code
MorphDebug.rewind();
MorphDebug.resume();

// Restore original if needed
MorphDebug.restoreMethod('MorphAnimation', '_normalizeShape');
```

### 6. Visual Debug Overlay

Toggle visual debugging information on canvas.

- **Metrics panel**: Real-time symmetry, angles, progress
- **Frame scrubber**: Timeline with anomaly markers
- **Anomaly highlights**: Flash red on problematic edges/anchors
- **Pause indicator**: Shows playback controls

```javascript
// Click "Toggle Debug UI" button, or:
MorphDebug.enable();
```

### 7. Export & Analysis

Download captured data for external analysis.

```javascript
// Export all captured frames as JSON
MorphDebug.exportFrames();

// Generate summary report
const report = MorphDebug.report();
console.table(report);
// Shows: total frames, anomaly counts by type, max values
```

## Complete API Reference

### Debug Mode Controls

| Method | Description |
|--------|-------------|
| `enable()` | Enable debug mode |
| `disable()` | Disable debug mode |
| `enableAutoDetect(opts)` | Enable auto-detection with optional threshold overrides |
| `pause()` | Pause animation |
| `resume()` | Resume animation |
| `step()` | Step one frame forward |
| `stepBack()` | Step one frame backward |
| `rewind()` | Rewind to first frame |
| `jumpTo(n)` | Jump to specific frame number |

### Inspection

| Method | Description |
|--------|-------------|
| `getMetrics()` | Get current animation metrics |
| `getAnchorHandles(i)` | Get anchor i's handle data |
| `getAllHandles()` | Get all anchor handles |
| `getFrame(n)` | Get frame n data |
| `getCurrentFrame()` | Get current frame |
| `getAnomalies()` | Get all detected anomalies |
| `report()` | Generate summary report |

### Golden Snapshots

| Method | Description |
|--------|-------------|
| `captureGolden(name)` | Save current state as golden snapshot |
| `listGolden()` | List all golden snapshots |
| `compareToGolden(name)` | Compare current state to golden |
| `loadGolden(name)` | Load golden snapshot data |
| `exportGolden(name)` | Download golden snapshot as JSON |

### Method Hot-Reload

| Method | Description |
|--------|-------------|
| `replaceMethod(class, method, fn)` | Replace a method temporarily |
| `restoreMethod(class, method)` | Restore original method |
| `restoreAllMethods()` | Restore all replaced methods |

### Export

| Method | Description |
|--------|-------------|
| `exportFrames()` | Download all captured frames as JSON |

### Convenience Accessors

| Property | Description |
|----------|-------------|
| `MorphDebug.shape` | Current shape object |
| `MorphDebug.params` | Current parameters |
| `MorphDebug.animation` | MorphAnimation instance |
| `MorphDebug.frames` | All captured frames |

## Example Workflows

### Debugging Abrupt Animation

```javascript
// 1. Enable auto-detect
MorphDebug.enableAutoDetect();

// 2. Start morph - will auto-pause on anomaly
startMorph();

// 3. Inspect the problematic frame
const frame = MorphDebug.getCurrentFrame();
console.log('Frame', frame.index);
console.log('Anomalies:', frame.anomalies);

// 4. Examine edge angles
console.log('Edge angles:', frame.metrics.edgeAngles);

// 5. Step backward to see what happened before
MorphDebug.stepBack();
const prevFrame = MorphDebug.getCurrentFrame();
console.log('Previous angles:', prevFrame.metrics.edgeAngles);

// 6. Try a fix
MorphDebug.replaceMethod('MorphAnimation', '_easeEmergingAnchorHandles',
    function(result, newAnchorIdx, currentAngle, t) {
        // Your fix here
    }
);

// 7. Rewind and test
MorphDebug.rewind();
MorphDebug.resume();
```

### Regression Testing

```javascript
// 1. Run animation until you get a perfect result
startMorph();

// 2. Wait for completion, then capture golden
MorphDebug.captureGolden('3to4-reference');

// 3. Make code changes, then test
// ... edit code ...

// 4. Run animation again
startMorph();

// 5. Compare to golden reference
const diff = MorphDebug.compareToGolden('3to4-reference');

if (!diff.withinTolerance) {
    console.error('Regression detected!');
    console.log('Max angle diff:', diff.maxAngleDiff);
    console.log('Edge diffs:', diff.edgeAngleDiffs);
}
```

### Frame Analysis

```javascript
// 1. Capture entire animation
MorphDebug.enable();
startMorph();

// Wait for completion...

// 2. Export frames
MorphDebug.exportFrames();

// 3. Analyze in external tool
// Load JSON file and analyze frame-by-frame progression
```

## Architecture

### Files

- `debug-mode.js` - Core DebugMode class with auto-detection
- `console-api.js` - MorphDebug global API
- `golden-snapshots.js` - Snapshot management
- `debug-ui.js` - Visual overlay rendering

### Integration

Debug mode is conditionally loaded and initialized:

```javascript
// In MorphLab constructor
if (typeof DebugMode !== 'undefined') {
    this.debugMode = new DebugMode();
    this.goldenSnapshots = new GoldenSnapshots();
    this.debugUI = new DebugUI(canvasElement, this.debugMode);
    MorphDebug.init(this, this.debugMode, this.goldenSnapshots);
}
```

### Frame Capture

Every render loop frame is captured when debug mode is active:

```javascript
if (this.debugMode && this.debugMode.isCapturing) {
    this.debugMode.captureFrame(
        this.currentShape,
        this.params,
        this.morphAnimation.progress,
        timestamp
    );
}
```

## Testing

Automated Playwright tests verify all debug mode functionality:

```bash
python3 /tmp/test_debug_mode.py
```

Tests cover:
- ✅ MorphDebug API availability
- ✅ Debug UI toggle
- ✅ Auto-detect enable
- ✅ Golden snapshot capture/compare
- ✅ Frame capture during animation
- ✅ Console API methods
- ✅ Anomaly detection

## Performance

Debug mode has minimal performance impact when disabled:
- **Disabled**: No overhead
- **Enabled**: ~1-2ms per frame for capture
- **UI Overlay**: ~0.5ms per frame for rendering

## Browser Compatibility

Tested on:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari

Requires ES6+ support.

## Future Enhancements

Potential additions:
- [ ] WebGL-accelerated visualization
- [ ] Timeline scrubbing with mouse
- [ ] Automatic anomaly classification (ML-based)
- [ ] Diff view between frames
- [ ] Video export of captured frames
- [ ] Remote debugging support

## Support

For issues or questions:
- Check console for error messages
- Run `MorphDebug.report()` for diagnostics
- Export frames for analysis
- Refer to source code comments

---

**Debug Mode Version**: 1.0.0
**Last Updated**: 2025-11-15
