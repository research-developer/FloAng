/**
 * Console API - Global debugging interface accessible from Chrome DevTools
 *
 * Exposes window.MorphDebug object with methods for:
 * - Live inspection of animation state
 * - Method hot-reload for experimenting with fixes
 * - Golden snapshot management
 * - Playback controls
 */

class ConsoleAPI {
    constructor() {
        this.debugMode = null;
        this.goldenSnapshots = null;
        this.morphLab = null;
        this.originalMethods = new Map();
    }

    /**
     * Initialize the console API
     */
    init(morphLab, debugMode, goldenSnapshots) {
        this.morphLab = morphLab;
        this.debugMode = debugMode;
        this.goldenSnapshots = goldenSnapshots;

        // Display welcome message
        console.log('%c🐛 FloAng Morph Lab - Debug Mode Active', 'font-size: 16px; font-weight: bold; color: #6cf;');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #333;');
        console.log('');
        console.log('%cQuick Start:', 'font-weight: bold; color: #6cf;');
        console.log('  1. Type %cMorphDebug.help()%c to see all available commands', 'background: #222; color: #f6c; padding: 2px 4px; border-radius: 3px;', '');
        console.log('  2. Enable auto-detection: %cMorphDebug.enableAutoDetect()%c', 'background: #222; color: #f6c; padding: 2px 4px; border-radius: 3px;', '');
        console.log('  3. Start a morph to begin capturing frames');
        console.log('');
        console.log('%cPopular Commands:', 'font-weight: bold; color: #6cf;');
        console.log('  • %cMorphDebug.getMetrics()%c       - Get current animation metrics', 'background: #222; color: #4a9; padding: 2px 4px; border-radius: 3px;', '');
        console.log('  • %cMorphDebug.captureGolden(name)%c - Save known-good state', 'background: #222; color: #4a9; padding: 2px 4px; border-radius: 3px;', '');
        console.log('  • %cMorphDebug.pause()%c            - Pause animation', 'background: #222; color: #4a9; padding: 2px 4px; border-radius: 3px;', '');
        console.log('  • %cMorphDebug.step()%c             - Step forward one frame', 'background: #222; color: #4a9; padding: 2px 4px; border-radius: 3px;', '');
        console.log('  • %cMorphDebug.exportFrames()%c     - Download frame data as JSON', 'background: #222; color: #4a9; padding: 2px 4px; border-radius: 3px;', '');
        console.log('');
        console.log('%cExample Workflow:', 'font-weight: bold; color: #fa4;');
        console.log('  %c// Enable automatic anomaly detection', 'color: #888; font-style: italic;');
        console.log('  %cMorphDebug.enableAutoDetect();', 'color: #f6c;');
        console.log('  %cstartMorph();  // Will auto-pause if abrupt change detected', 'color: #f6c;');
        console.log('');
        console.log('  %c// If paused, inspect the problem', 'color: #888; font-style: italic;');
        console.log('  %cMorphDebug.getMetrics();  // See symmetry, angles, etc.', 'color: #4a9;');
        console.log('  %cMorphDebug.getAnomalies();  // See what triggered pause', 'color: #4a9;');
        console.log('');
        console.log('  %c// Step through frame-by-frame', 'color: #888; font-style: italic;');
        console.log('  %cMorphDebug.step();  // Next frame', 'color: #6cf;');
        console.log('  %cMorphDebug.stepBack();  // Previous frame', 'color: #6cf;');
        console.log('');
        console.log('%cDocumentation:', 'font-weight: bold; color: #6cf;');
        console.log('  See DEBUG_MODE_README.md for complete guide');
        console.log('');
        console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #333;');
        console.log('');
    }

    /**
     * Display help information
     */
    help() {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    MORPH DEBUG API HELP                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                                ║
║  DEBUG MODE CONTROLS                                          ║
║  ├─ enable()              Enable debug mode                   ║
║  ├─ disable()             Disable debug mode                  ║
║  ├─ enableAutoDetect(opts) Auto-detect abrupt animations      ║
║  ├─ pause()               Pause animation                     ║
║  ├─ resume()              Resume animation                    ║
║  ├─ step()                Step one frame forward              ║
║  ├─ stepBack()            Step one frame backward             ║
║  ├─ rewind()              Rewind to first frame               ║
║  └─ jumpTo(n)             Jump to frame n                     ║
║                                                                ║
║  INSPECTION                                                    ║
║  ├─ getMetrics()          Get current animation metrics       ║
║  ├─ getAnchorHandles(i)   Get anchor i's handle data          ║
║  ├─ getAllHandles()       Get all anchor handles              ║
║  ├─ getFrame(n)           Get frame n data                    ║
║  ├─ getCurrentFrame()     Get current frame                   ║
║  ├─ getAnomalies()        Get detected anomalies              ║
║  └─ report()              Generate summary report             ║
║                                                                ║
║  GOLDEN SNAPSHOTS                                              ║
║  ├─ captureGolden(name)   Save current state as golden        ║
║  ├─ listGolden()          List all golden snapshots           ║
║  ├─ compareToGolden(name) Compare to golden snapshot          ║
║  └─ loadGolden(name)      Load golden snapshot                ║
║                                                                ║
║  METHOD HOT-RELOAD                                             ║
║  ├─ replaceMethod(cls, method, fn) Replace a method           ║
║  ├─ restoreMethod(cls, method)      Restore original          ║
║  └─ restoreAllMethods()             Restore all methods       ║
║                                                                ║
║  EXPORT                                                        ║
║  ├─ exportFrames()        Download frames as JSON             ║
║  └─ exportGolden(name)    Download golden snapshot            ║
║                                                                ║
╚═══════════════════════════════════════════════════════════════╝
`);
    }

    // ==================== DEBUG MODE CONTROLS ====================

    enable() {
        this.debugMode.enable();
    }

    disable() {
        this.debugMode.disable();
    }

    enableAutoDetect(options = {}) {
        this.debugMode.enableAutoDetect(options);
        this.debugMode.startCapture();
    }

    pause() {
        this.debugMode.pause();
    }

    resume() {
        this.debugMode.resume();
    }

    step() {
        const frame = this.debugMode.stepForward();
        if (frame) {
            this._renderFrame(frame);
        }
        return frame;
    }

    stepBack() {
        const frame = this.debugMode.stepBackward();
        if (frame) {
            this._renderFrame(frame);
        }
        return frame;
    }

    rewind() {
        const frame = this.debugMode.rewind();
        if (frame) {
            this._renderFrame(frame);
        }
        return frame;
    }

    jumpTo(frameIndex) {
        const frame = this.debugMode.jumpToFrame(frameIndex);
        if (frame) {
            this._renderFrame(frame);
        }
        return frame;
    }

    /**
     * Render a captured frame to the canvas
     */
    _renderFrame(frame) {
        // Reconstruct shape from frame data
        const shape = new Shape();
        frame.shape.anchors.forEach(a => {
            const anchor = new AnchorPoint(a.pos.x, a.pos.y);
            anchor.handleIn = { ...a.handleIn };
            anchor.handleOut = { ...a.handleOut };
            if (a._storedHandleIn) anchor._storedHandleIn = { ...a._storedHandleIn };
            if (a._storedHandleOut) anchor._storedHandleOut = { ...a._storedHandleOut };
            shape.anchors.push(anchor);
        });

        // Render to canvas
        this.morphLab.renderer.clear();
        this.morphLab.renderer.drawShape(shape);

        // Update metrics display
        this.morphLab.uiController.updateMetrics(
            frame.progress,
            frame.metrics.symmetry,
            frame.metrics.anchorCount
        );

        console.log(`📍 Frame ${frame.index} - Progress: ${(frame.progress * 100).toFixed(1)}%`);
    }

    // ==================== INSPECTION ====================

    getMetrics() {
        const frame = this.debugMode.getCurrentFrame();
        if (!frame) {
            return this._getLiveMetrics();
        }
        return frame.metrics;
    }

    _getLiveMetrics() {
        if (!this.morphLab.currentShape) return null;

        const shape = this.morphLab.currentShape;
        return {
            progress: this.morphLab.morphAnimation.progress,
            anchorCount: shape.anchors.length,
            symmetry: shape.calculateSymmetry(),
            edgeAngles: this._calculateEdgeAngles(shape),
            params: { ...this.morphLab.params }
        };
    }

    _calculateEdgeAngles(shape) {
        const angles = [];
        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];
            const nextAnchor = shape.anchors[(i + 1) % shape.anchors.length];

            const dx = nextAnchor.pos.x - anchor.pos.x;
            const dy = nextAnchor.pos.y - anchor.pos.y;
            const baseLength = Math.sqrt(dx * dx + dy * dy);

            const cp1 = anchor.getHandleOutAbs();
            const height = Math.abs((cp1.y - anchor.pos.y) * dx - (cp1.x - anchor.pos.x) * dy) / baseLength;
            const angle = Math.atan((2 * height) / (baseLength / 2)) * (180 / Math.PI);
            angles.push(angle);
        }
        return angles;
    }

    getAnchorHandles(anchorIndex) {
        const shape = this.morphLab.currentShape;
        if (!shape || anchorIndex < 0 || anchorIndex >= shape.anchors.length) {
            console.error('Invalid anchor index');
            return null;
        }

        const anchor = shape.anchors[anchorIndex];
        return {
            index: anchorIndex,
            pos: { ...anchor.pos },
            handleIn: { ...anchor.handleIn },
            handleOut: { ...anchor.handleOut },
            handleInAbs: anchor.getHandleInAbs(),
            handleOutAbs: anchor.getHandleOutAbs(),
            stored: {
                handleIn: anchor._storedHandleIn ? { ...anchor._storedHandleIn } : null,
                handleOut: anchor._storedHandleOut ? { ...anchor._storedHandleOut } : null
            }
        };
    }

    getAllHandles() {
        const shape = this.morphLab.currentShape;
        if (!shape) return null;

        return shape.anchors.map((anchor, i) => this.getAnchorHandles(i));
    }

    getFrame(frameIndex) {
        return this.debugMode.getFrame(frameIndex);
    }

    getCurrentFrame() {
        return this.debugMode.getCurrentFrame();
    }

    getAnomalies() {
        return this.debugMode.getAnomalies();
    }

    report() {
        return this.debugMode.generateReport();
    }

    // ==================== GOLDEN SNAPSHOTS ====================

    captureGolden(name) {
        const shape = this.morphLab.currentShape;
        const params = this.morphLab.params;
        this.goldenSnapshots.capture(name, shape, params);
        console.log(`✅ Captured golden snapshot: "${name}"`);
    }

    listGolden() {
        return this.goldenSnapshots.list();
    }

    compareToGolden(name) {
        const shape = this.morphLab.currentShape;
        const diff = this.goldenSnapshots.compare(name, shape);

        if (diff) {
            console.log(`📊 Comparison to golden snapshot "${name}":`);
            console.table({
                'Max Angle Deviation': diff.maxAngleDiff.toFixed(2) + '°',
                'Symmetry Deviation': diff.symmetryDiff.toFixed(2),
                'Max Position Delta': diff.maxPositionDelta.toFixed(2) + 'px',
                'Within Tolerance': diff.withinTolerance ? '✅' : '❌'
            });
        }

        return diff;
    }

    loadGolden(name) {
        return this.goldenSnapshots.load(name);
    }

    exportGolden(name) {
        this.goldenSnapshots.export(name);
    }

    // ==================== METHOD HOT-RELOAD ====================

    replaceMethod(className, methodName, newFunction) {
        // Store original if not already stored
        const key = `${className}.${methodName}`;

        let targetClass;
        switch (className) {
            case 'MorphAnimation':
                targetClass = MorphAnimation;
                break;
            case 'Shape':
                targetClass = Shape;
                break;
            case 'GeometryUtils':
                targetClass = GeometryUtils;
                break;
            case 'Renderer':
                targetClass = Renderer;
                break;
            default:
                console.error(`Unknown class: ${className}`);
                return;
        }

        if (!this.originalMethods.has(key)) {
            this.originalMethods.set(key, targetClass.prototype[methodName] || targetClass[methodName]);
        }

        // Replace method
        if (targetClass.prototype[methodName]) {
            targetClass.prototype[methodName] = newFunction;
        } else {
            targetClass[methodName] = newFunction;
        }

        console.log(`🔄 Replaced ${className}.${methodName}`);
    }

    restoreMethod(className, methodName) {
        const key = `${className}.${methodName}`;

        if (!this.originalMethods.has(key)) {
            console.error(`No original method stored for ${key}`);
            return;
        }

        let targetClass;
        switch (className) {
            case 'MorphAnimation':
                targetClass = MorphAnimation;
                break;
            case 'Shape':
                targetClass = Shape;
                break;
            case 'GeometryUtils':
                targetClass = GeometryUtils;
                break;
            case 'Renderer':
                targetClass = Renderer;
                break;
            default:
                console.error(`Unknown class: ${className}`);
                return;
        }

        const original = this.originalMethods.get(key);
        if (targetClass.prototype[methodName] !== undefined) {
            targetClass.prototype[methodName] = original;
        } else {
            targetClass[methodName] = original;
        }

        this.originalMethods.delete(key);
        console.log(`↩️  Restored ${className}.${methodName}`);
    }

    restoreAllMethods() {
        for (const key of this.originalMethods.keys()) {
            const [className, methodName] = key.split('.');
            this.restoreMethod(className, methodName);
        }
        console.log('↩️  Restored all methods');
    }

    // ==================== EXPORT ====================

    exportFrames() {
        this.debugMode.exportFrames();
    }

    // ==================== CONVENIENCE ACCESSORS ====================

    get shape() {
        return this.morphLab.currentShape;
    }

    get params() {
        return this.morphLab.params;
    }

    get animation() {
        return this.morphLab.morphAnimation;
    }

    get frames() {
        return this.debugMode.getAllFrames();
    }
}

// Create global instance
window.MorphDebug = new ConsoleAPI();
