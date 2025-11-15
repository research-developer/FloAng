/**
 * Debug UI - Visual overlay for debugging information
 *
 * Renders real-time metrics, anomaly highlights, and frame scrubber
 * on top of the canvas for visual debugging.
 */

class DebugUI {
    constructor(canvas, debugMode) {
        this.canvas = canvas;
        this.debugMode = debugMode;
        this.enabled = false;

        // Create overlay canvas
        this.overlayCanvas = document.createElement('canvas');
        this.overlayCanvas.width = canvas.width;
        this.overlayCanvas.height = canvas.height;
        this.overlayCanvas.style.position = 'absolute';
        this.overlayCanvas.style.top = canvas.offsetTop + 'px';
        this.overlayCanvas.style.left = canvas.offsetLeft + 'px';
        this.overlayCanvas.style.pointerEvents = 'none';
        this.overlayCanvas.style.display = 'none';
        this.ctx = this.overlayCanvas.getContext('2d');

        // Insert overlay after canvas
        canvas.parentNode.insertBefore(this.overlayCanvas, canvas.nextSibling);

        // Frame scrubber state
        this.scrubberHeight = 60;
        this.scrubberY = canvas.height - this.scrubberHeight - 10;

        // Anomaly display
        this.showAnomalies = true;
        this.anomalyFlashTimer = 0;
    }

    /**
     * Enable debug UI
     */
    enable() {
        this.enabled = true;
        this.overlayCanvas.style.display = 'block';
    }

    /**
     * Disable debug UI
     */
    disable() {
        this.enabled = false;
        this.overlayCanvas.style.display = 'none';
    }

    /**
     * Render debug overlay
     */
    render(shape, metrics, timestamp) {
        if (!this.enabled) return;

        this.ctx.clearRect(0, 0, this.overlayCanvas.width, this.overlayCanvas.height);

        // Render metrics panel
        this.renderMetricsPanel(metrics, timestamp);

        // Render frame scrubber if capturing
        if (this.debugMode.isCapturing) {
            this.renderFrameScrubber();
        }

        // Render anomaly highlights
        if (this.showAnomalies && shape) {
            this.renderAnomalyHighlights(shape);
        }

        // Render pause indicator
        if (this.debugMode.isPaused) {
            this.renderPauseIndicator();
        }
    }

    /**
     * Render metrics panel
     */
    renderMetricsPanel(metrics, timestamp) {
        const x = 10;
        const y = 10;
        const padding = 10;
        const lineHeight = 18;

        // Background - semi-transparent
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, 320, 220);

        // Border
        this.ctx.strokeStyle = '#6cf';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, 320, 220);

        // Title
        this.ctx.fillStyle = '#6cf';
        this.ctx.font = 'bold 14px Monaco, monospace';
        this.ctx.fillText('DEBUG METRICS', x + padding, y + padding + 12);

        // Separator
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x + padding, y + padding + 20);
        this.ctx.lineTo(x + 320 - padding, y + padding + 20);
        this.ctx.stroke();

        // Metrics
        this.ctx.font = '11px Monaco, monospace';
        this.ctx.fillStyle = '#aaa';

        const lines = [
            '',
            `Anchors: ${metrics.anchorCount}`,
            `Symmetry: ${metrics.symmetry.toFixed(4)}`,
            `Progress: ${(this.debugMode.isCapturing ? metrics.progress * 100 : 0).toFixed(1)}%`,
            '',
            `Edge Angles:`,
            metrics.edgeAngles ? metrics.edgeAngles.map((a, i) =>
                `  [${i}] ${a.toFixed(2)}°`
            ).join('\n') : 'N/A'
        ];

        let currentY = y + padding + 35;
        lines.forEach(line => {
            if (line.includes('\n')) {
                line.split('\n').forEach(subLine => {
                    this.ctx.fillText(subLine, x + padding, currentY);
                    currentY += lineHeight;
                });
            } else {
                this.ctx.fillText(line, x + padding, currentY);
                currentY += lineHeight;
            }
        });

        // Thresholds
        currentY = y + 190;
        this.ctx.fillStyle = '#888';
        this.ctx.fillText('Thresholds:', x + padding, currentY);
        currentY += lineHeight;
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px Monaco, monospace';
        this.ctx.fillText(`  Angle: ${this.debugMode.thresholds.handleAngleDelta}°/frame`, x + padding, currentY);
        currentY += lineHeight - 2;
        this.ctx.fillText(`  Symmetry: ${this.debugMode.thresholds.symmetrySpike}/frame`, x + padding, currentY);
    }

    /**
     * Render frame scrubber
     */
    renderFrameScrubber() {
        const frames = this.debugMode.getAllFrames();
        if (frames.length === 0) return;

        const x = 10;
        const y = this.scrubberY;
        const width = this.canvas.width - 20;
        const height = this.scrubberHeight;

        // Background - semi-transparent
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(x, y, width, height);

        // Border
        this.ctx.strokeStyle = '#6cf';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, width, height);

        // Title
        this.ctx.fillStyle = '#6cf';
        this.ctx.font = 'bold 11px Monaco, monospace';
        this.ctx.fillText(`FRAME SCRUBBER (${frames.length} frames)`, x + 10, y + 15);

        // Timeline bar
        const timelineY = y + 30;
        const timelineHeight = 15;

        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(x + 10, timelineY, width - 20, timelineHeight);

        // Progress bar
        const currentFrame = this.debugMode.currentFrameIndex;
        const progressWidth = frames.length > 0 ? ((currentFrame + 1) / frames.length) * (width - 20) : 0;

        this.ctx.fillStyle = '#4a9';
        this.ctx.fillRect(x + 10, timelineY, progressWidth, timelineHeight);

        // Anomaly markers
        const anomalies = this.debugMode.getAnomalies();
        anomalies.forEach(anomaly => {
            const anomalyX = x + 10 + (anomaly.frameIndex / frames.length) * (width - 20);
            this.ctx.fillStyle = anomaly.severity === 'high' ? '#f44' : '#fa4';
            this.ctx.fillRect(anomalyX - 1, timelineY - 5, 3, timelineHeight + 10);
        });

        // Current frame marker
        const markerX = x + 10 + (currentFrame / Math.max(1, frames.length - 1)) * (width - 20);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(markerX, timelineY - 3);
        this.ctx.lineTo(markerX, timelineY + timelineHeight + 3);
        this.ctx.stroke();

        // Frame info
        this.ctx.fillStyle = '#aaa';
        this.ctx.font = '10px Monaco, monospace';
        this.ctx.fillText(
            `Frame: ${currentFrame + 1}/${frames.length}`,
            x + 10,
            y + height - 8
        );

        // Anomaly count
        if (anomalies.length > 0) {
            this.ctx.fillStyle = '#f44';
            this.ctx.fillText(
                `⚠ ${anomalies.length} anomalies`,
                x + width - 120,
                y + height - 8
            );
        }
    }

    /**
     * Render anomaly highlights on shape
     */
    renderAnomalyHighlights(shape) {
        const currentFrame = this.debugMode.getCurrentFrame();
        if (!currentFrame || !currentFrame.anomalies) return;

        // Flash effect
        this.anomalyFlashTimer += 0.1;
        const alpha = (Math.sin(this.anomalyFlashTimer) + 1) / 2;

        currentFrame.anomalies.forEach(anomaly => {
            if (anomaly.type === 'handle_angle_jump' && anomaly.edgeIndex !== undefined) {
                this.highlightEdge(shape, anomaly.edgeIndex, alpha);
            } else if (anomaly.type === 'handle_position_jump' && anomaly.anchorIndex !== undefined) {
                this.highlightAnchor(shape, anomaly.anchorIndex, alpha, anomaly.handleType);
            }
        });
    }

    /**
     * Highlight an edge with anomaly
     */
    highlightEdge(shape, edgeIndex, alpha) {
        if (edgeIndex >= shape.anchors.length) return;

        const anchor = shape.anchors[edgeIndex];
        const nextAnchor = shape.anchors[(edgeIndex + 1) % shape.anchors.length];

        // Draw thick red line along edge
        this.ctx.strokeStyle = `rgba(255, 68, 68, ${alpha * 0.8})`;
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(anchor.pos.x, anchor.pos.y);
        this.ctx.lineTo(nextAnchor.pos.x, nextAnchor.pos.y);
        this.ctx.stroke();

        // Label
        const midX = (anchor.pos.x + nextAnchor.pos.x) / 2;
        const midY = (anchor.pos.y + nextAnchor.pos.y) / 2;

        this.ctx.fillStyle = `rgba(255, 68, 68, ${alpha})`;
        this.ctx.font = 'bold 12px Monaco, monospace';
        this.ctx.fillText(`⚠ Edge ${edgeIndex}`, midX + 10, midY - 10);
    }

    /**
     * Highlight an anchor with anomaly
     */
    highlightAnchor(shape, anchorIndex, alpha, handleType) {
        if (anchorIndex >= shape.anchors.length) return;

        const anchor = shape.anchors[anchorIndex];

        // Draw circle around anchor
        this.ctx.strokeStyle = `rgba(255, 160, 68, ${alpha})`;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.arc(anchor.pos.x, anchor.pos.y, 15, 0, Math.PI * 2);
        this.ctx.stroke();

        // Highlight specific handle
        if (handleType) {
            const handle = handleType === 'out' ? anchor.getHandleOutAbs() : anchor.getHandleInAbs();

            this.ctx.strokeStyle = `rgba(255, 160, 68, ${alpha})`;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(anchor.pos.x, anchor.pos.y);
            this.ctx.lineTo(handle.x, handle.y);
            this.ctx.stroke();

            this.ctx.fillStyle = `rgba(255, 160, 68, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(handle.x, handle.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Label
        this.ctx.fillStyle = `rgba(255, 160, 68, ${alpha})`;
        this.ctx.font = 'bold 12px Monaco, monospace';
        this.ctx.fillText(
            `⚠ A${anchorIndex} ${handleType || ''}`,
            anchor.pos.x + 20,
            anchor.pos.y - 20
        );
    }

    /**
     * Render pause indicator
     */
    renderPauseIndicator() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const size = 80;

        // Semi-transparent overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Pause icon
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(centerX - size / 2, centerY - size / 2, size / 3, size);
        this.ctx.fillRect(centerX + size / 6, centerY - size / 2, size / 3, size);

        // Text
        this.ctx.fillStyle = '#fff';
        this.ctx.font = 'bold 24px Monaco, monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('PAUSED', centerX, centerY + size);
        this.ctx.textAlign = 'left';

        // Instructions
        this.ctx.font = '14px Monaco, monospace';
        this.ctx.fillStyle = '#aaa';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            'MorphDebug.step() to advance | MorphDebug.resume() to continue',
            centerX,
            centerY + size + 30
        );
        this.ctx.textAlign = 'left';
    }

    /**
     * Toggle anomaly highlights
     */
    toggleAnomalies() {
        this.showAnomalies = !this.showAnomalies;
        console.log(`Anomaly highlights: ${this.showAnomalies ? 'ON' : 'OFF'}`);
    }
}
