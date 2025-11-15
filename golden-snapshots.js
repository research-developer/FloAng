/**
 * Golden Snapshots - Reference state management for regression testing
 *
 * Captures known-good animation states and provides comparison tools
 * to detect regressions in future runs.
 */

class GoldenSnapshots {
    constructor() {
        this.snapshots = new Map();
        this.loadFromStorage();
    }

    /**
     * Capture current state as a golden snapshot
     */
    capture(name, shape, params) {
        const snapshot = {
            name,
            capturedAt: new Date().toISOString(),
            params: { ...params },
            shape: this._serializeShape(shape),
            metrics: this._calculateMetrics(shape, params)
        };

        this.snapshots.set(name, snapshot);
        this.saveToStorage();

        return snapshot;
    }

    /**
     * Serialize shape for storage
     */
    _serializeShape(shape) {
        return {
            anchors: shape.anchors.map(a => ({
                pos: { ...a.pos },
                handleIn: { ...a.handleIn },
                handleOut: { ...a.handleOut }
            }))
        };
    }

    /**
     * Calculate comprehensive metrics
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

        const center = { x: CANVAS_CONFIG.centerX, y: CANVAS_CONFIG.centerY };

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

            // Center distance
            const dist = Math.sqrt((anchor.pos.x - center.x) ** 2 + (anchor.pos.y - center.y) ** 2);
            metrics.centerDistances.push(dist);

            // Edge length
            metrics.edgeLengths.push(baseLength);
        }

        return metrics;
    }

    /**
     * Compare current shape to a golden snapshot
     */
    compare(name, currentShape, tolerance = {}) {
        const golden = this.snapshots.get(name);
        if (!golden) {
            console.error(`Golden snapshot "${name}" not found`);
            return null;
        }

        const defaultTolerance = {
            angleDiff: 1.0,      // degrees
            symmetryDiff: 5.0,   // units
            positionDelta: 2.0   // pixels
        };

        const tol = { ...defaultTolerance, ...tolerance };

        // Calculate current metrics
        const currentMetrics = this._calculateMetrics(currentShape, {});

        // Compare metrics
        const diff = {
            name: golden.name,
            comparison: {
                anchorCount: {
                    golden: golden.metrics.anchorCount,
                    current: currentMetrics.anchorCount,
                    match: golden.metrics.anchorCount === currentMetrics.anchorCount
                },
                symmetry: {
                    golden: golden.metrics.symmetry,
                    current: currentMetrics.symmetry,
                    diff: Math.abs(currentMetrics.symmetry - golden.metrics.symmetry)
                }
            },
            maxAngleDiff: 0,
            maxPositionDelta: 0,
            symmetryDiff: Math.abs(currentMetrics.symmetry - golden.metrics.symmetry),
            edgeAngleDiffs: [],
            positionDeltas: [],
            withinTolerance: true
        };

        // Compare edge angles
        if (golden.metrics.edgeAngles.length === currentMetrics.edgeAngles.length) {
            for (let i = 0; i < golden.metrics.edgeAngles.length; i++) {
                const angleDiff = Math.abs(golden.metrics.edgeAngles[i] - currentMetrics.edgeAngles[i]);
                diff.edgeAngleDiffs.push({
                    edge: i,
                    golden: golden.metrics.edgeAngles[i],
                    current: currentMetrics.edgeAngles[i],
                    diff: angleDiff,
                    withinTolerance: angleDiff <= tol.angleDiff
                });

                if (angleDiff > diff.maxAngleDiff) {
                    diff.maxAngleDiff = angleDiff;
                }

                if (angleDiff > tol.angleDiff) {
                    diff.withinTolerance = false;
                }
            }
        }

        // Compare anchor positions
        if (golden.shape.anchors.length === currentShape.anchors.length) {
            for (let i = 0; i < golden.shape.anchors.length; i++) {
                const goldenAnchor = golden.shape.anchors[i];
                const currentAnchor = currentShape.anchors[i];

                const positionDelta = Math.sqrt(
                    (goldenAnchor.pos.x - currentAnchor.pos.x) ** 2 +
                    (goldenAnchor.pos.y - currentAnchor.pos.y) ** 2
                );

                diff.positionDeltas.push({
                    anchor: i,
                    delta: positionDelta,
                    withinTolerance: positionDelta <= tol.positionDelta
                });

                if (positionDelta > diff.maxPositionDelta) {
                    diff.maxPositionDelta = positionDelta;
                }

                if (positionDelta > tol.positionDelta) {
                    diff.withinTolerance = false;
                }
            }
        }

        // Check symmetry tolerance
        if (diff.symmetryDiff > tol.symmetryDiff) {
            diff.withinTolerance = false;
        }

        return diff;
    }

    /**
     * Load a golden snapshot
     */
    load(name) {
        return this.snapshots.get(name) || null;
    }

    /**
     * List all golden snapshots
     */
    list() {
        const list = [];
        for (const [name, snapshot] of this.snapshots.entries()) {
            list.push({
                name,
                capturedAt: snapshot.capturedAt,
                anchors: snapshot.metrics.anchorCount,
                symmetry: snapshot.metrics.symmetry.toFixed(4),
                params: snapshot.params
            });
        }

        console.table(list);
        return list;
    }

    /**
     * Delete a golden snapshot
     */
    delete(name) {
        const deleted = this.snapshots.delete(name);
        if (deleted) {
            this.saveToStorage();
            console.log(`🗑️  Deleted golden snapshot: "${name}"`);
        }
        return deleted;
    }

    /**
     * Export a golden snapshot as JSON
     */
    export(name) {
        const snapshot = this.snapshots.get(name);
        if (!snapshot) {
            console.error(`Golden snapshot "${name}" not found`);
            return;
        }

        const data = JSON.stringify(snapshot, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `golden-${name}-${Date.now()}.json`;
        a.click();

        console.log(`📥 Exported golden snapshot: "${name}"`);
    }

    /**
     * Import a golden snapshot from JSON
     */
    import(jsonData, name) {
        try {
            const snapshot = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
            snapshot.name = name || snapshot.name;
            this.snapshots.set(snapshot.name, snapshot);
            this.saveToStorage();

            console.log(`📤 Imported golden snapshot: "${snapshot.name}"`);
            return snapshot;
        } catch (error) {
            console.error('Failed to import golden snapshot:', error);
            return null;
        }
    }

    /**
     * Save snapshots to localStorage
     */
    saveToStorage() {
        try {
            const data = {};
            for (const [name, snapshot] of this.snapshots.entries()) {
                data[name] = snapshot;
            }

            localStorage.setItem('morph-lab-golden-snapshots', JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save golden snapshots to localStorage:', error);
        }
    }

    /**
     * Load snapshots from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem('morph-lab-golden-snapshots');
            if (data) {
                const snapshots = JSON.parse(data);
                for (const [name, snapshot] of Object.entries(snapshots)) {
                    this.snapshots.set(name, snapshot);
                }

                console.log(`📂 Loaded ${this.snapshots.size} golden snapshot(s) from localStorage`);
            }
        } catch (error) {
            console.warn('Failed to load golden snapshots from localStorage:', error);
        }
    }

    /**
     * Clear all snapshots
     */
    clear() {
        this.snapshots.clear();
        localStorage.removeItem('morph-lab-golden-snapshots');
        console.log('🗑️  Cleared all golden snapshots');
    }
}
