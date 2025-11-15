/**
 * DebugMode - Automatic abrupt animation detection and frame-by-frame debugging
 *
 * Features:
 * - Auto-detects abrupt changes in handle angles, symmetry, positions
 * - Captures every frame during morph animation
 * - Provides playback controls (pause, step, rewind)
 * - Frame-by-frame inspection and comparison
 */

class DebugMode {
    constructor() {
        this.enabled = false;
        this.autoDetectEnabled = false;

        // Detection thresholds
        this.thresholds = {
            handleAngleDelta: 5.0,   // Max degrees per frame
            symmetrySpike: 100,       // Max symmetry increase per frame
            handleJump: 10,           // Max pixels per frame
            positionJump: 5           // Max position change per frame
        };

        // Frame capture
        this.frames = [];
        this.currentFrameIndex = 0;
        this.isCapturing = false;
        this.isPaused = false;

        // Anomaly tracking
        this.anomalies = [];

        // Previous frame data for delta calculation
        this.previousFrame = null;

        // Callbacks
        this.onAnomalyDetected = null;
        this.onFrameCaptured = null;
    }

    /**
     * Enable debug mode
     */
    enable() {
        this.enabled = true;
        console.log('🐛 Debug mode enabled');
    }

    /**
     * Disable debug mode
     */
    disable() {
        this.enabled = false;
        this.autoDetectEnabled = false;
        console.log('✅ Debug mode disabled');
    }

    /**
     * Enable automatic abrupt animation detection
     */
    enableAutoDetect(customThresholds = {}) {
        this.autoDetectEnabled = true;
        this.thresholds = { ...this.thresholds, ...customThresholds };
        console.log('🎯 Auto-detect enabled with thresholds:', this.thresholds);
    }

    /**
     * Start capturing frames
     */
    startCapture() {
        this.frames = [];
        this.currentFrameIndex = 0;
        this.isCapturing = true;
        this.isPaused = false;
        this.anomalies = [];
        this.previousFrame = null;
        console.log('📹 Frame capture started');
    }

    /**
     * Stop capturing frames
     */
    stopCapture() {
        this.isCapturing = false;
        console.log(`📹 Frame capture stopped. Captured ${this.frames.length} frames`);
        return this.frames;
    }

    /**
     * Capture current frame with full state
     */
    captureFrame(shape, params, progress, timestamp) {
        if (!this.isCapturing) return null;

        const frame = {
            index: this.frames.length,
            timestamp,
            progress,
            shape: this._serializeShape(shape),
            params: { ...params },
            metrics: this._calculateMetrics(shape, params)
        };

        // Detect anomalies if auto-detect enabled
        if (this.autoDetectEnabled && this.previousFrame) {
            const anomalies = this._detectAnomalies(frame, this.previousFrame);
            if (anomalies.length > 0) {
                frame.anomalies = anomalies;
                this.anomalies.push(...anomalies.map(a => ({ ...a, frameIndex: frame.index })));

                // Auto-pause on first anomaly
                this.pause();
                console.error('🚨 ANOMALY DETECTED at frame', frame.index, anomalies);

                if (this.onAnomalyDetected) {
                    this.onAnomalyDetected(frame, anomalies);
                }
            }
        }

        this.frames.push(frame);
        this.previousFrame = frame;
        this.currentFrameIndex = this.frames.length - 1;

        if (this.onFrameCaptured) {
            this.onFrameCaptured(frame);
        }

        return frame;
    }

    /**
     * Serialize shape for storage
     */
    _serializeShape(shape) {
        return {
            anchors: shape.anchors.map(a => ({
                pos: { ...a.pos },
                handleIn: { ...a.handleIn },
                handleOut: { ...a.handleOut },
                _storedHandleIn: a._storedHandleIn ? { ...a._storedHandleIn } : null,
                _storedHandleOut: a._storedHandleOut ? { ...a._storedHandleOut } : null
            }))
        };
    }

    /**
     * Calculate comprehensive metrics for a frame
     */
    _calculateMetrics(shape, params) {
        const metrics = {
            anchorCount: shape.anchors.length,
            symmetry: shape.calculateSymmetry(),
            edgeAngles: [],
            handleMagnitudes: [],
            centerDistances: [],
            edgeLengths: []
        };

        // Calculate edge angles and handle magnitudes
        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];
            const nextAnchor = shape.anchors[(i + 1) % shape.anchors.length];

            // Edge angle (using shared utility)
            const angle = GeometryUtils.calculateEdgeAngle(anchor, nextAnchor);
            metrics.edgeAngles.push(angle);

            const baseLength = GeometryUtils.distance(anchor.pos, nextAnchor.pos);

            // Handle magnitudes
            const handleInMag = Math.sqrt(anchor.handleIn.x ** 2 + anchor.handleIn.y ** 2);
            const handleOutMag = Math.sqrt(anchor.handleOut.x ** 2 + anchor.handleOut.y ** 2);
            metrics.handleMagnitudes.push({ in: handleInMag, out: handleOutMag });

            // Distance from center
            const center = { x: CANVAS_CONFIG.centerX, y: CANVAS_CONFIG.centerY };
            const dist = Math.sqrt((anchor.pos.x - center.x) ** 2 + (anchor.pos.y - center.y) ** 2);
            metrics.centerDistances.push(dist);

            // Edge length
            metrics.edgeLengths.push(baseLength);
        }

        return metrics;
    }

    /**
     * Detect anomalies by comparing current frame to previous
     */
    _detectAnomalies(currentFrame, previousFrame) {
        const anomalies = [];
        const curr = currentFrame.metrics;
        const prev = previousFrame.metrics;

        // Check symmetry spike
        const symmetryDelta = Math.abs(curr.symmetry - prev.symmetry);
        if (symmetryDelta > this.thresholds.symmetrySpike) {
            anomalies.push({
                type: 'symmetry_spike',
                severity: 'high',
                delta: symmetryDelta,
                threshold: this.thresholds.symmetrySpike,
                message: `Symmetry spiked by ${symmetryDelta.toFixed(2)} (threshold: ${this.thresholds.symmetrySpike})`
            });
        }

        // Check handle angle deltas
        if (curr.edgeAngles.length === prev.edgeAngles.length) {
            for (let i = 0; i < curr.edgeAngles.length; i++) {
                const angleDelta = Math.abs(curr.edgeAngles[i] - prev.edgeAngles[i]);
                if (angleDelta > this.thresholds.handleAngleDelta) {
                    anomalies.push({
                        type: 'handle_angle_jump',
                        severity: 'high',
                        edgeIndex: i,
                        delta: angleDelta,
                        threshold: this.thresholds.handleAngleDelta,
                        message: `Edge ${i} angle jumped ${angleDelta.toFixed(2)}° (threshold: ${this.thresholds.handleAngleDelta}°)`
                    });
                }
            }
        }

        // Check handle position jumps
        for (let i = 0; i < Math.min(currentFrame.shape.anchors.length, previousFrame.shape.anchors.length); i++) {
            const currAnchor = currentFrame.shape.anchors[i];
            const prevAnchor = previousFrame.shape.anchors[i];

            // HandleOut jump
            const handleOutDelta = Math.sqrt(
                (currAnchor.handleOut.x - prevAnchor.handleOut.x) ** 2 +
                (currAnchor.handleOut.y - prevAnchor.handleOut.y) ** 2
            );
            if (handleOutDelta > this.thresholds.handleJump) {
                anomalies.push({
                    type: 'handle_position_jump',
                    severity: 'medium',
                    anchorIndex: i,
                    handleType: 'out',
                    delta: handleOutDelta,
                    threshold: this.thresholds.handleJump,
                    message: `Anchor ${i} handleOut jumped ${handleOutDelta.toFixed(2)}px (threshold: ${this.thresholds.handleJump}px)`
                });
            }

            // HandleIn jump
            const handleInDelta = Math.sqrt(
                (currAnchor.handleIn.x - prevAnchor.handleIn.x) ** 2 +
                (currAnchor.handleIn.y - prevAnchor.handleIn.y) ** 2
            );
            if (handleInDelta > this.thresholds.handleJump) {
                anomalies.push({
                    type: 'handle_position_jump',
                    severity: 'medium',
                    anchorIndex: i,
                    handleType: 'in',
                    delta: handleInDelta,
                    threshold: this.thresholds.handleJump,
                    message: `Anchor ${i} handleIn jumped ${handleInDelta.toFixed(2)}px (threshold: ${this.thresholds.handleJump}px)`
                });
            }
        }

        return anomalies;
    }

    /**
     * Pause playback
     */
    pause() {
        this.isPaused = true;
        console.log('⏸️  Paused at frame', this.currentFrameIndex);
    }

    /**
     * Resume playback
     */
    resume() {
        this.isPaused = false;
        console.log('▶️  Resumed from frame', this.currentFrameIndex);
    }

    /**
     * Step to next frame
     */
    stepForward() {
        if (this.currentFrameIndex < this.frames.length - 1) {
            this.currentFrameIndex++;
            console.log(`⏭️  Stepped to frame ${this.currentFrameIndex}/${this.frames.length - 1}`);
            return this.frames[this.currentFrameIndex];
        }
        return null;
    }

    /**
     * Step to previous frame
     */
    stepBackward() {
        if (this.currentFrameIndex > 0) {
            this.currentFrameIndex--;
            console.log(`⏮️  Stepped to frame ${this.currentFrameIndex}/${this.frames.length - 1}`);
            return this.frames[this.currentFrameIndex];
        }
        return null;
    }

    /**
     * Jump to specific frame
     */
    jumpToFrame(index) {
        if (index >= 0 && index < this.frames.length) {
            this.currentFrameIndex = index;
            console.log(`⏩ Jumped to frame ${index}/${this.frames.length - 1}`);
            return this.frames[index];
        }
        return null;
    }

    /**
     * Rewind to start
     */
    rewind() {
        this.currentFrameIndex = 0;
        console.log('⏪ Rewound to frame 0');
        return this.frames[0];
    }

    /**
     * Get current frame
     */
    getCurrentFrame() {
        return this.frames[this.currentFrameIndex] || null;
    }

    /**
     * Get specific frame
     */
    getFrame(index) {
        return this.frames[index] || null;
    }

    /**
     * Get all frames
     */
    getAllFrames() {
        return this.frames;
    }

    /**
     * Get all detected anomalies
     */
    getAnomalies() {
        return this.anomalies;
    }

    /**
     * Export frames as JSON
     */
    exportFrames() {
        const data = {
            frames: this.frames,
            anomalies: this.anomalies,
            thresholds: this.thresholds,
            exportedAt: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `morph-debug-frames-${Date.now()}.json`;
        a.click();

        console.log('📥 Exported', this.frames.length, 'frames to JSON');
    }

    /**
     * Generate summary report
     */
    generateReport() {
        const report = {
            totalFrames: this.frames.length,
            anomalyCount: this.anomalies.length,
            anomaliesByType: {},
            maxSymmetry: 0,
            maxSymmetryFrame: null,
            maxAngleJump: 0,
            maxAngleJumpFrame: null
        };

        // Count anomalies by type
        this.anomalies.forEach(a => {
            report.anomaliesByType[a.type] = (report.anomaliesByType[a.type] || 0) + 1;

            if (a.type === 'symmetry_spike' && a.delta > report.maxSymmetry) {
                report.maxSymmetry = a.delta;
                report.maxSymmetryFrame = a.frameIndex;
            }

            if (a.type === 'handle_angle_jump' && a.delta > report.maxAngleJump) {
                report.maxAngleJump = a.delta;
                report.maxAngleJumpFrame = a.frameIndex;
            }
        });

        console.table(report);
        return report;
    }
}
