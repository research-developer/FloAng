/**
 * FloAng Morph Lab - Continuous Vector Animation System
 *
 * Core Concept: Instead of discretizing anchor points on a circle,
 * we represent them as continuous vectors with position, velocity,
 * and handle control points. This allows smooth morphing.
 */

// ===== CORE DATA STRUCTURES =====

/**
 * Anchor Point - Continuous vector representation
 */
class AnchorPoint {
    constructor(x, y) {
        this.pos = { x, y };           // Position vector
        this.handleIn = { x: 0, y: 0 }; // Incoming handle (relative to pos)
        this.handleOut = { x: 0, y: 0 }; // Outgoing handle (relative to pos)
        this.velocity = { x: 0, y: 0 }; // For physics-based movement
        this.targetPos = null;          // Target position during morph
    }

    // Calculate absolute handle positions
    getHandleInAbs() {
        return {
            x: this.pos.x + this.handleIn.x,
            y: this.pos.y + this.handleIn.y
        };
    }

    getHandleOutAbs() {
        return {
            x: this.pos.x + this.handleOut.x,
            y: this.pos.y + this.handleOut.y
        };
    }

    // Set handles from flow and angle parameters
    setHandlesFromParams(flow, angle, nextAnchor) {
        const apex = GeometryUtils.calculateApex(this.pos, nextAnchor.pos, angle);
        const handles = GeometryUtils.calculateHandlesFromApex(
            this.pos,
            nextAnchor.pos,
            apex,
            flow
        );

        this.handleOut = handles.handleOut;
        nextAnchor.handleIn = handles.handleIn;
    }
}

/**
 * Shape - Collection of anchor points forming a closed path
 */
class Shape {
    constructor(anchors = []) {
        this.anchors = anchors;
    }

    // Create n-sided polygon
    static createPolygon(sides, radius, centerX, centerY, rotation = 0) {
        const anchors = [];
        const angleStep = (2 * Math.PI) / sides;
        const rotRad = (rotation * Math.PI) / 180;

        for (let i = 0; i < sides; i++) {
            const angle = rotRad + i * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            anchors.push(new AnchorPoint(x, y));
        }

        return new Shape(anchors);
    }

    // Apply flow/angle parameters to all edges
    applyParams(flow, angle) {
        for (let i = 0; i < this.anchors.length; i++) {
            const anchor = this.anchors[i];
            const nextAnchor = this.anchors[(i + 1) % this.anchors.length];
            anchor.setHandlesFromParams(flow, angle, nextAnchor);
        }
    }

    // Calculate comprehensive symmetry score
    calculateSymmetry() {
        if (this.anchors.length < 3) return 0;

        let totalError = 0;
        const n = this.anchors.length;

        // 1. Check edge length variance
        const edgeLengths = [];
        for (let i = 0; i < n; i++) {
            const a1 = this.anchors[i];
            const a2 = this.anchors[(i + 1) % n];
            const dx = a2.pos.x - a1.pos.x;
            const dy = a2.pos.y - a1.pos.y;
            edgeLengths.push(Math.sqrt(dx * dx + dy * dy));
        }
        const meanEdgeLength = edgeLengths.reduce((a, b) => a + b, 0) / n;
        const edgeLengthVariance = edgeLengths.reduce((sum, len) =>
            sum + Math.pow(len - meanEdgeLength, 2), 0) / n;
        totalError += edgeLengthVariance;

        // 2. Check angular distances from center
        const center = { x: 400, y: 400 }; // Known center
        const distances = [];
        for (let i = 0; i < n; i++) {
            const dx = this.anchors[i].pos.x - center.x;
            const dy = this.anchors[i].pos.y - center.y;
            distances.push(Math.sqrt(dx * dx + dy * dy));
        }
        const meanDistance = distances.reduce((a, b) => a + b, 0) / n;
        const distanceVariance = distances.reduce((sum, dist) =>
            sum + Math.pow(dist - meanDistance, 2), 0) / n;
        totalError += distanceVariance;

        // 3. Check handle magnitude variance (should be similar)
        const handleMagnitudes = [];
        for (let i = 0; i < n; i++) {
            const anchor = this.anchors[i];
            const magIn = Math.sqrt(anchor.handleIn.x ** 2 + anchor.handleIn.y ** 2);
            const magOut = Math.sqrt(anchor.handleOut.x ** 2 + anchor.handleOut.y ** 2);
            handleMagnitudes.push(magIn, magOut);
        }
        const meanHandleMag = handleMagnitudes.reduce((a, b) => a + b, 0) / handleMagnitudes.length;
        const handleVariance = handleMagnitudes.reduce((sum, mag) =>
            sum + Math.pow(mag - meanHandleMag, 2), 0) / handleMagnitudes.length;
        totalError += handleVariance * 0.1; // Less weight on handles

        return totalError;
    }

    clone() {
        const newAnchors = this.anchors.map(a => {
            const clone = new AnchorPoint(a.pos.x, a.pos.y);
            clone.handleIn = { ...a.handleIn };
            clone.handleOut = { ...a.handleOut };
            return clone;
        });
        return new Shape(newAnchors);
    }
}

/**
 * Geometry Utilities - Reusable geometric calculations
 */
class GeometryUtils {
    /**
     * Calculate orthogonal angle for n-sided polygon
     * This is the "perfect symmetry" angle where all edges are equal
     */
    static calculateOrthogonalAngle(sides) {
        return ((sides - 2) * 180) / sides;
    }

    /**
     * Calculate perpendicular vector to (dx, dy)
     * Returns normalized perpendicular with its length
     */
    static calculatePerpendicular(dx, dy) {
        const perpX = dy;
        const perpY = -dx;
        const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
        return { perpX, perpY, perpLength };
    }

    /**
     * Calculate apex point for bezier curve given two anchor positions,
     * an angle, and the edge vector between them
     */
    static calculateApex(p1, p2, angleDegrees) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const baseLength = Math.sqrt(dx * dx + dy * dy);

        const { perpX, perpY, perpLength } = this.calculatePerpendicular(dx, dy);

        const apexAngle = (angleDegrees * Math.PI) / 180;
        const height = (baseLength / 2) / Math.tan(apexAngle / 2);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        const apexX = midX + (perpX / perpLength) * height;
        const apexY = midY + (perpY / perpLength) * height;

        return { x: apexX, y: apexY };
    }

    /**
     * Calculate handle vectors from an apex point for two anchors
     * Returns { handleOut, handleIn } suitable for assignment
     */
    static calculateHandlesFromApex(anchor1, anchor2, apex, flow) {
        return {
            handleOut: {
                x: (apex.x - anchor1.x) * flow,
                y: (apex.y - anchor1.y) * flow
            },
            handleIn: {
                x: (apex.x - anchor2.x) * flow,
                y: (apex.y - anchor2.y) * flow
            }
        };
    }

    /**
     * Evaluate cubic bezier curve at parameter t
     */
    static evaluateBezier(p0, cp1, cp2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;

        return {
            x: mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p3.x,
            y: mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p3.y
        };
    }

    /**
     * Calculate tangent vector of cubic bezier at parameter t
     */
    static calculateBezierTangent(p0, cp1, cp2, p3, t) {
        const mt = 1 - t;
        const mt2 = mt * mt;
        const t2 = t * t;

        const dx = 3 * (mt2 * (cp1.x - p0.x) + 2 * mt * t * (cp2.x - cp1.x) + t2 * (p3.x - cp2.x));
        const dy = 3 * (mt2 * (cp1.y - p0.y) + 2 * mt * t * (cp2.y - cp1.y) + t2 * (p3.y - cp2.y));

        return { dx, dy, length: Math.sqrt(dx * dx + dy * dy) };
    }

    /**
     * Linearly interpolate between two vectors
     */
    static lerp(v1, v2, t) {
        return {
            x: v1.x + (v2.x - v1.x) * t,
            y: v1.y + (v2.y - v1.y) * t
        };
    }

    /**
     * Calculate distance between two points
     */
    static distance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Calculate magnitude of a vector
     */
    static magnitude(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    }
}

/**
 * MorphAnimation - Encapsulates the morph animation state and logic
 */
class MorphAnimation {
    constructor() {
        this.active = false;
        this.startTime = 0;
        this.fromShape = null;
        this.toShape = null;
        this.progress = 0;
        this.params = null;
    }

    /**
     * Start a morph animation from one shape to another
     */
    start(fromShape, toShape, params) {
        this.fromShape = fromShape.clone();
        this.toShape = toShape;
        this.params = params;
        this.active = true;
        this.startTime = performance.now();
        this.progress = 0;
    }

    /**
     * Update the morph animation and return the current interpolated shape
     */
    update(timestamp) {
        if (!this.active) return null;

        const elapsed = timestamp - this.startTime;
        this.progress = Math.min(elapsed / this.params.duration, 1);
        const easedProgress = this._easeInOutCubic(this.progress, this.params.easingPower);

        const currentShape = this._interpolateShapes(this.fromShape, this.toShape, easedProgress);

        if (this.progress >= 1) {
            this.active = false;
        }

        return currentShape;
    }

    /**
     * Check if animation is complete
     */
    isComplete() {
        return this.progress >= 1;
    }

    /**
     * Easing function
     */
    _easeInOutCubic(t, power) {
        return t < 0.5
            ? Math.pow(2, power - 1) * Math.pow(t, power)
            : 1 - Math.pow(-2 * t + 2, power) / 2;
    }

    /**
     * Main interpolation logic (extracted from lerpShapes)
     */
    _interpolateShapes(from, to, t) {
        const fromSides = from.anchors.length;
        const toSides = fromSides + 1;

        const fromOrthogonal = GeometryUtils.calculateOrthogonalAngle(fromSides);
        const toOrthogonal = GeometryUtils.calculateOrthogonalAngle(toSides);

        const result = from.clone();

        // STEP 1: Insert new anchor (if not already inserted)
        if (t > 0 && result.anchors.length === fromSides) {
            this._insertNewAnchor(result, fromSides);
        }

        // STEP 2 & 3: Normalize positions and handles
        if (result.anchors.length === toSides) {
            this._normalizeShape(result, to, fromOrthogonal, toOrthogonal, t, toSides);
        }

        return result;
    }

    /**
     * STEP 1: Insert new anchor on the bezier curve
     * FIXES BUG #2: Check bounds before accessing from.anchors
     */
    _insertNewAnchor(result, fromSides) {
        const lastAnchor = result.anchors[fromSides - 1];
        const firstAnchor = result.anchors[0];

        const p0 = lastAnchor.pos;
        const cp1 = lastAnchor.getHandleOutAbs();
        const cp2 = firstAnchor.getHandleInAbs();
        const p3 = firstAnchor.pos;

        const insertT = this.params.insertionPosition;
        const newPos = GeometryUtils.evaluateBezier(p0, cp1, cp2, p3, insertT);
        const newAnchor = new AnchorPoint(newPos.x, newPos.y);

        const tangent = GeometryUtils.calculateBezierTangent(p0, cp1, cp2, p3, insertT);
        const initialRatio = 0.2;
        const handleLength = tangent.length * insertT * initialRatio;

        if (tangent.length > 0) {
            const normDx = tangent.dx / tangent.length;
            const normDy = tangent.dy / tangent.length;

            newAnchor.handleIn.x = -normDx * handleLength;
            newAnchor.handleIn.y = -normDy * handleLength;
            newAnchor.handleOut.x = normDx * handleLength;
            newAnchor.handleOut.y = normDy * handleLength;
        } else {
            newAnchor.handleIn = { x: 0, y: 0 };
            newAnchor.handleOut = { x: 0, y: 0 };
        }

        result.anchors.push(newAnchor);

        // Store initial handle values for smooth interpolation
        // BUG FIX #2: Add bounds checking before storing
        const newAnchorIdx = result.anchors.length - 1;
        if (!this.fromShape.anchors[newAnchorIdx - 1]._storedHandleOut) {
            this.fromShape.anchors[newAnchorIdx - 1]._storedHandleOut = {
                x: result.anchors[newAnchorIdx - 1].handleOut.x,
                y: result.anchors[newAnchorIdx - 1].handleOut.y
            };
        }
        if (!this.fromShape.anchors[0]._storedHandleIn) {
            this.fromShape.anchors[0]._storedHandleIn = {
                x: result.anchors[0].handleIn.x,
                y: result.anchors[0].handleIn.y
            };
        }

        // Copy stored values to result
        result.anchors[newAnchorIdx - 1]._storedHandleOut = this.fromShape.anchors[newAnchorIdx - 1]._storedHandleOut;
        result.anchors[0]._storedHandleIn = this.fromShape.anchors[0]._storedHandleIn;
    }

    /**
     * STEP 2 & 3: Normalize shape positions and handles
     * FIXES BUGS #3 and #4: Ensure handleOut and handleIn are set for emerging anchor
     */
    _normalizeShape(result, to, fromOrthogonal, toOrthogonal, t, toSides) {
        const currentAngle = fromOrthogonal + (toOrthogonal - fromOrthogonal) * t;
        const newAnchorIdx = result.anchors.length - 1;

        // Move new anchor toward target position
        const newAnchor = result.anchors[newAnchorIdx];
        const targetAnchor = to.anchors[toSides - 1];
        newAnchor.pos = GeometryUtils.lerp(
            newAnchor.pos,
            targetAnchor.pos,
            t * this.params.emergenceSpeed
        );

        // Normalize all anchor positions to maintain symmetry
        const radius = 250;
        const center = { x: 400, y: 400 };
        const angleStep = (2 * Math.PI) / toSides;

        for (let i = 0; i < result.anchors.length; i++) {
            const targetAngle = i * angleStep;
            const targetX = center.x + radius * Math.cos(targetAngle);
            const targetY = center.y + radius * Math.sin(targetAngle);
            const currentAnchor = result.anchors[i];
            const normalizationStrength = t * this.params.symmetryWeight;

            currentAnchor.pos = GeometryUtils.lerp(
                currentAnchor.pos,
                { x: targetX, y: targetY },
                normalizationStrength
            );
        }

        // Recalculate handles for all edges
        for (let i = 0; i < result.anchors.length; i++) {
            const anchor = result.anchors[i];
            const nextAnchor = result.anchors[(i + 1) % result.anchors.length];

            const isEdgeBeforeEmerging = (i === newAnchorIdx - 1);
            const isEdgeAfterEmerging = (i === newAnchorIdx);

            const apex = GeometryUtils.calculateApex(anchor.pos, nextAnchor.pos, currentAngle);
            const handles = GeometryUtils.calculateHandlesFromApex(
                anchor.pos,
                nextAnchor.pos,
                apex,
                this.params.flow
            );

            // FIX BUG #3: Ensure emerging anchor's handleOut is set
            if (isEdgeBeforeEmerging && anchor._storedHandleOut) {
                anchor.handleOut = GeometryUtils.lerp(
                    anchor._storedHandleOut,
                    handles.handleOut,
                    t
                );
            } else if (!isEdgeAfterEmerging) {
                // Non-adjacent edges and emerging anchor itself: set directly
                anchor.handleOut = handles.handleOut;
            }

            // FIX BUG #4: Ensure emerging anchor's handleIn is set
            if (isEdgeAfterEmerging && nextAnchor._storedHandleIn) {
                nextAnchor.handleIn = GeometryUtils.lerp(
                    nextAnchor._storedHandleIn,
                    handles.handleIn,
                    t
                );
            } else if (!isEdgeBeforeEmerging) {
                // Non-adjacent edges and emerging anchor itself: set directly
                nextAnchor.handleIn = handles.handleIn;
            }
        }

        // STEP 3: Handle emerging anchor specially with tangent->orthogonal easing
        this._easeEmergingAnchorHandles(result, newAnchorIdx, currentAngle, t);
    }

    /**
     * STEP 3: Ease emerging anchor handles from tangent to orthogonal
     */
    _easeEmergingAnchorHandles(result, newAnchorIdx, currentAngle, t) {
        const emergingAnchor = result.anchors[newAnchorIdx];
        const lastAnchor = result.anchors[newAnchorIdx - 1];
        const firstAnchor = result.anchors[0];

        // Re-calculate initial tangent-based handles
        const p0 = lastAnchor.pos;
        const cp1Initial = {
            x: p0.x + lastAnchor.handleOut.x,
            y: p0.y + lastAnchor.handleOut.y
        };
        const cp2Initial = {
            x: firstAnchor.pos.x + firstAnchor.handleIn.x,
            y: firstAnchor.pos.y + firstAnchor.handleIn.y
        };
        const p3 = firstAnchor.pos;

        const insertT = this.params.insertionPosition;
        const tangent = GeometryUtils.calculateBezierTangent(p0, cp1Initial, cp2Initial, p3, insertT);

        let initialHandleIn = { x: 0, y: 0 };
        let initialHandleOut = { x: 0, y: 0 };

        if (tangent.length > 0) {
            const normDx = tangent.dx / tangent.length;
            const normDy = tangent.dy / tangent.length;
            const initialRatio = 0.2;
            const handleLength = tangent.length * insertT * initialRatio;

            initialHandleIn.x = -normDx * handleLength;
            initialHandleIn.y = -normDy * handleLength;
            initialHandleOut.x = normDx * handleLength;
            initialHandleOut.y = normDy * handleLength;
        }

        // Calculate target orthogonal handles
        const prevAnchor = result.anchors[newAnchorIdx - 1];
        const nextAnchor = result.anchors[0];

        const apexOut = GeometryUtils.calculateApex(emergingAnchor.pos, nextAnchor.pos, currentAngle);
        const apexIn = GeometryUtils.calculateApex(prevAnchor.pos, emergingAnchor.pos, currentAngle);

        const targetHandleOut = {
            x: (apexOut.x - emergingAnchor.pos.x) * this.params.flow,
            y: (apexOut.y - emergingAnchor.pos.y) * this.params.flow
        };
        const targetHandleIn = {
            x: (apexIn.x - emergingAnchor.pos.x) * this.params.flow,
            y: (apexIn.y - emergingAnchor.pos.y) * this.params.flow
        };

        // Interpolate from initial to target
        emergingAnchor.handleIn = GeometryUtils.lerp(initialHandleIn, targetHandleIn, t);
        emergingAnchor.handleOut = GeometryUtils.lerp(initialHandleOut, targetHandleOut, t);

        // Set anchor[0].handleIn to match same apex as emergingAnchor.handleOut
        const anchor0 = result.anchors[0];
        anchor0.handleIn.x = (apexOut.x - anchor0.pos.x) * this.params.flow;
        anchor0.handleIn.y = (apexOut.y - anchor0.pos.y) * this.params.flow;
    }
}

/**
 * Renderer - Handles all canvas drawing operations
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    /**
     * Clear the canvas
     */
    clear() {
        this.ctx.fillStyle = '#0a0a0a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * Draw a shape with its anchors and handles
     */
    drawShape(shape, options = {}) {
        if (!shape || shape.anchors.length < 2) return;

        const {
            strokeColor = '#4682b4',
            fillColor = 'rgba(135, 206, 235, 0.3)',
            lineWidth = 2,
            showAnchors = true,
            showHandles = true
        } = options;

        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = lineWidth;
        this.ctx.fillStyle = fillColor;

        // Draw the bezier path
        this.ctx.beginPath();
        const firstAnchor = shape.anchors[0];
        this.ctx.moveTo(firstAnchor.pos.x, firstAnchor.pos.y);

        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];
            const nextAnchor = shape.anchors[(i + 1) % shape.anchors.length];

            const cp1 = anchor.getHandleOutAbs();
            const cp2 = nextAnchor.getHandleInAbs();

            this.ctx.bezierCurveTo(
                cp1.x, cp1.y,
                cp2.x, cp2.y,
                nextAnchor.pos.x, nextAnchor.pos.y
            );
        }

        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        if (showAnchors) {
            this._drawAnchors(shape.anchors, showHandles);
        }
    }

    /**
     * Draw anchor points and their handles
     */
    _drawAnchors(anchors, showHandles) {
        anchors.forEach(anchor => {
            // Draw anchor point
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.beginPath();
            this.ctx.arc(anchor.pos.x, anchor.pos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();

            if (showHandles) {
                // Draw handle out
                this.ctx.strokeStyle = '#f66';
                this.ctx.lineWidth = 1;
                const outAbs = anchor.getHandleOutAbs();
                this.ctx.beginPath();
                this.ctx.moveTo(anchor.pos.x, anchor.pos.y);
                this.ctx.lineTo(outAbs.x, outAbs.y);
                this.ctx.stroke();

                this.ctx.fillStyle = '#f66';
                this.ctx.beginPath();
                this.ctx.arc(outAbs.x, outAbs.y, 2, 0, Math.PI * 2);
                this.ctx.fill();
            }
        });
    }
}

/**
 * UIController - Manages UI interactions and parameter updates
 */
class UIController {
    constructor(params, onParamChange) {
        this.params = params;
        this.onParamChange = onParamChange;
        this.setupListeners();
    }

    setupListeners() {
        // Sides slider
        document.getElementById('sides').addEventListener('input', (e) => {
            this.params.sides = parseInt(e.target.value);
            document.getElementById('sides-value').textContent = this.params.sides;
            this.onParamChange('sides', this.params.sides);
        });

        // Flow slider
        document.getElementById('flow').addEventListener('input', (e) => {
            this.params.flow = parseFloat(e.target.value);
            document.getElementById('flow-value').textContent = this.params.flow.toFixed(2);
            this.onParamChange('flow', this.params.flow);
        });

        // Angle slider
        document.getElementById('angle').addEventListener('input', (e) => {
            this.params.angle = parseFloat(e.target.value);
            document.getElementById('angle-value').textContent = this.params.angle + '°';
            this.onParamChange('angle', this.params.angle);
        });

        // Duration slider
        document.getElementById('duration').addEventListener('input', (e) => {
            this.params.duration = parseInt(e.target.value);
            document.getElementById('duration-value').textContent = this.params.duration;
        });

        // Easing slider
        document.getElementById('easing').addEventListener('input', (e) => {
            this.params.easingPower = parseFloat(e.target.value);
            document.getElementById('easing-value').textContent = this.params.easingPower.toFixed(1);
        });

        // Insertion position slider
        document.getElementById('insertion').addEventListener('input', (e) => {
            this.params.insertionPosition = parseFloat(e.target.value);
            document.getElementById('insertion-value').textContent = this.params.insertionPosition.toFixed(2);
        });

        // Emergence speed slider
        document.getElementById('emergence').addEventListener('input', (e) => {
            this.params.emergenceSpeed = parseFloat(e.target.value);
            document.getElementById('emergence-value').textContent = this.params.emergenceSpeed.toFixed(1);
        });

        // Symmetry weight slider
        document.getElementById('symmetry-weight').addEventListener('input', (e) => {
            this.params.symmetryWeight = parseFloat(e.target.value);
            document.getElementById('symmetry-value').textContent = this.params.symmetryWeight.toFixed(1);
        });
    }

    updateMetrics(progress, symmetry, anchorCount) {
        document.getElementById('progress-metric').textContent = (progress * 100).toFixed(1) + '%';
        document.getElementById('symmetry-metric').textContent = symmetry.toFixed(4);
        document.getElementById('anchor-metric').textContent = anchorCount;
    }
}

/**
 * SnapshotDebugger - Captures and displays shape snapshots for debugging
 */
class SnapshotDebugger {
    constructor(params) {
        this.params = params;
        this.snapshots = {
            before: null,
            justAfter: null,
            finished: null
        };
    }

    capture(shape, label) {
        if (!shape || shape.anchors.length < 2) return null;

        // Create SVG path data
        let pathData = `M ${shape.anchors[0].pos.x} ${shape.anchors[0].pos.y}`;

        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];
            const nextAnchor = shape.anchors[(i + 1) % shape.anchors.length];
            const cp1 = anchor.getHandleOutAbs();
            const cp2 = nextAnchor.getHandleInAbs();

            pathData += ` C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${nextAnchor.pos.x} ${nextAnchor.pos.y}`;
        }
        pathData += ' Z';

        // Calculate edge angles
        const edgeAngles = [];
        for (let i = 0; i < shape.anchors.length; i++) {
            const anchor = shape.anchors[i];
            const nextAnchor = shape.anchors[(i + 1) % shape.anchors.length];
            const dx = nextAnchor.pos.x - anchor.pos.x;
            const dy = nextAnchor.pos.y - anchor.pos.y;
            const baseLength = Math.sqrt(dx * dx + dy * dy);

            const cp1 = anchor.getHandleOutAbs();
            const height = Math.abs((cp1.y - anchor.pos.y) * dx - (cp1.x - anchor.pos.x) * dy) / baseLength;
            const angle = Math.atan((2 * height) / (baseLength / 2)) * (180 / Math.PI);
            edgeAngles.push(angle.toFixed(2));
        }

        return {
            label,
            pathData,
            anchors: shape.anchors.length,
            symmetry: shape.calculateSymmetry().toFixed(4),
            edgeAngles: edgeAngles.join(', '),
            params: {
                flow: this.params.flow.toFixed(2),
                angle: this.params.angle.toFixed(0)
            }
        };
    }

    display() {
        console.log('\n=== SNAPSHOT COMPARISON ===');
        console.log('BEFORE:', this.snapshots.before);
        console.log('JUST AFTER:', this.snapshots.justAfter);
        console.log('FINISHED:', this.snapshots.finished);

        // Create SVG comparison (using template literals for better readability)
        // Paths use absolute coordinates with center at (400,400), so we translate to offset them
        const svg = `
<svg width="1400" height="900" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 900">
    <rect width="1400" height="900" fill="#0a0a0a"/>

    <!-- Before -->
    <g transform="translate(-200, 50)">
<path d="${this.snapshots.before?.pathData || ''}" fill="rgba(135,206,235,0.3)" stroke="#4682b4" stroke-width="2"/>
<text x="400" y="50" fill="#fff" text-anchor="middle" font-size="14" font-weight="bold">BEFORE</text>
<text x="400" y="70" fill="#aaa" text-anchor="middle" font-size="10">Anchors: ${this.snapshots.before?.anchors || 0}</text>
<text x="400" y="85" fill="#aaa" text-anchor="middle" font-size="10">Symmetry: ${this.snapshots.before?.symmetry || 0}</text>
<text x="400" y="100" fill="#aaa" text-anchor="middle" font-size="10">Flow: ${this.snapshots.before?.params.flow || 0}, Angle: ${this.snapshots.before?.params.angle || 0}°</text>
    </g>

    <!-- Just After -->
    <g transform="translate(200, 50)">
<path d="${this.snapshots.justAfter?.pathData || ''}" fill="rgba(255,165,0,0.3)" stroke="#ff8c00" stroke-width="2"/>
<text x="400" y="50" fill="#fff" text-anchor="middle" font-size="14" font-weight="bold">JUST AFTER START</text>
<text x="400" y="70" fill="#aaa" text-anchor="middle" font-size="10">Anchors: ${this.snapshots.justAfter?.anchors || 0}</text>
<text x="400" y="85" fill="#aaa" text-anchor="middle" font-size="10">Symmetry: ${this.snapshots.justAfter?.symmetry || 0}</text>
<text x="400" y="100" fill="#aaa" text-anchor="middle" font-size="10">Flow: ${this.snapshots.justAfter?.params.flow || 0}, Angle: ${this.snapshots.justAfter?.params.angle || 0}°</text>
    </g>

    <!-- Finished -->
    <g transform="translate(600, 50)">
<path d="${this.snapshots.finished?.pathData || ''}" fill="rgba(0,255,0,0.3)" stroke="#00ff00" stroke-width="2"/>
<text x="400" y="50" fill="#fff" text-anchor="middle" font-size="14" font-weight="bold">FINISHED</text>
<text x="400" y="70" fill="#aaa" text-anchor="middle" font-size="10">Anchors: ${this.snapshots.finished?.anchors || 0}</text>
<text x="400" y="85" fill="#aaa" text-anchor="middle" font-size="10">Symmetry: ${this.snapshots.finished?.symmetry || 0}</text>
<text x="400" y="100" fill="#aaa" text-anchor="middle" font-size="10">Flow: ${this.snapshots.finished?.params.flow || 0}, Angle: ${this.snapshots.finished?.params.angle || 0}°</text>
    </g>
</svg>`;

        console.log('SVG comparison:\n' + svg);

        // Save to file for viewing
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'morph-snapshots.svg';
        a.click();
    }

    reset() {
        this.snapshots.justAfter = null;
        this.snapshots.finished = null;
    }
}

/**
 * MorphLab - Main orchestrator class coordinating all components
 */
class MorphLab {
    constructor(canvasElement) {
        // Initialize parameters
        this.params = {
            sides: 3,
            flow: -0.66,
            angle: 60,
            duration: 3000,
            easingPower: 3,
            insertionPosition: 0.5,
            emergenceSpeed: 1.0,
            symmetryWeight: 1.0
        };

        // Initialize components
        this.renderer = new Renderer(canvasElement);
        this.morphAnimation = new MorphAnimation();
        this.snapshotDebugger = new SnapshotDebugger(this.params);

        // Create initial shape
        this.currentShape = Shape.createPolygon(this.params.sides, 250, 400, 400, 0);
        this.currentShape.applyParams(this.params.flow, this.params.angle);

        // Setup UI controller
        this.uiController = new UIController(this.params, this.onParamChange.bind(this));

        // Start render loop
        requestAnimationFrame(this.render.bind(this));
    }

    /**
     * Handle parameter changes from UI
     */
    onParamChange(paramName, value) {
        if (!this.morphAnimation.active) {
            if (paramName === 'sides') {
                this.currentShape = Shape.createPolygon(value, 250, 400, 400, 0);
                this.currentShape.applyParams(this.params.flow, this.params.angle);
            } else if (paramName === 'flow' || paramName === 'angle') {
                this.currentShape.applyParams(this.params.flow, this.params.angle);
            }
        }
    }

    /**
     * Start morph animation
     */
    startMorph() {
        if (this.morphAnimation.active) return;

        const fromSides = this.params.sides;
        const toSides = fromSides + 1;

        // Capture before snapshot
        this.snapshotDebugger.snapshots.before = this.snapshotDebugger.capture(this.currentShape, 'BEFORE');

        // Create target shape
        const toShape = Shape.createPolygon(toSides, 250, 400, 400, 0);
        toShape.applyParams(this.params.flow, this.params.angle);

        // Start animation
        this.morphAnimation.start(this.currentShape, toShape, this.params);

        // Reset snapshots
        this.snapshotDebugger.reset();

        console.log(`Starting morph: ${fromSides} → ${toSides} sides`);
    }

    /**
     * Reset to initial state
     */
    resetState() {
        this.morphAnimation.active = false;
        this.currentShape = Shape.createPolygon(this.params.sides, 250, 400, 400, 0);
        this.currentShape.applyParams(this.params.flow, this.params.angle);
    }

    /**
     * Add failure to hall of shame
     */
    addFailure() {
        const failure = prompt('What didn\'t work?');
        if (failure) {
            const list = document.getElementById('failure-list');
            const li = document.createElement('li');
            li.textContent = failure;
            list.appendChild(li);
        }
    }

    /**
     * Main render loop
     */
    render(timestamp) {
        // Clear canvas
        this.renderer.clear();

        // Update morph animation
        if (this.morphAnimation.active) {
            this.currentShape = this.morphAnimation.update(timestamp);

            // Capture snapshots at key moments
            if (!this.snapshotDebugger.snapshots.justAfter &&
                this.morphAnimation.progress > 0.01 &&
                this.morphAnimation.progress < 0.03) {
                this.snapshotDebugger.snapshots.justAfter = this.snapshotDebugger.capture(
                    this.currentShape,
                    'JUST AFTER'
                );
                console.log('Captured JUST AFTER snapshot at progress:',
                    (this.morphAnimation.progress * 100).toFixed(1) + '%');
            }

            // Update UI metrics
            this.uiController.updateMetrics(
                this.morphAnimation.progress,
                this.currentShape.calculateSymmetry(),
                this.currentShape.anchors.length
            );

            // Check if complete
            if (this.morphAnimation.isComplete()) {
                this.snapshotDebugger.snapshots.finished = this.snapshotDebugger.capture(
                    this.currentShape,
                    'FINISHED'
                );
                console.log('Captured FINISHED snapshot');

                this.snapshotDebugger.display();

                this.params.sides++;
                document.getElementById('sides').value = this.params.sides;
                document.getElementById('sides-value').textContent = this.params.sides;
                console.log('Morph complete');
            }
        }

        // Draw current shape
        if (this.currentShape) {
            this.renderer.drawShape(this.currentShape);
        }

        // Continue render loop
        requestAnimationFrame(this.render.bind(this));
    }
}

// ===== INITIALIZATION =====

let morphLab = null;

function init() {
    const canvas = document.getElementById('canvas');
    morphLab = new MorphLab(canvas);
}

// Global functions for button callbacks
function startMorph() {
    morphLab.startMorph();
}

function resetState() {
    morphLab.resetState();
}

function addFailure() {
    morphLab.addFailure();
}

// Start the lab!
init();
