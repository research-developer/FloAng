/**
 * Geometric Analysis Module for FlowAngle
 * Analyzes overlapping regions, calculates areas, and finds inscribed shapes
 */

class GeometricAnalyzer {
    constructor() {
        this.regions = [];
        this.intersections = [];
        this.curves = [];
    }

    /**
     * Analyze a flowangle and identify all distinct regions
     */
    analyzeFlowAngle(state, size = 600) {
        this.regions = [];
        this.intersections = [];
        this.curves = [];

        const center = { x: size / 2, y: size / 2 };
        const radius = size * (1 / state.sides);
        const vertices = [];
        const angleStep = (2 * Math.PI) / state.sides;
        const rotRad = (state.rotation * Math.PI) / 180;

        // Calculate vertices
        for (let i = 0; i < state.sides; i++) {
            const angle = rotRad + i * angleStep;
            vertices.push({
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle)
            });
        }

        // Build curves
        const apexAngle = (state.handleAngle * Math.PI) / 180;

        for (let i = 0; i < state.sides; i++) {
            const v1 = vertices[i];
            const v2 = vertices[(i + 1) % state.sides];
            const midX = (v1.x + v2.x) / 2;
            const midY = (v1.y + v2.y) / 2;
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const baseLength = Math.sqrt(dx * dx + dy * dy);
            const perpX = dy;
            const perpY = -dx;
            const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
            const height = (baseLength / 2) / Math.tan(apexAngle / 2);
            const thirdX = midX + (perpX / perpLength) * height;
            const thirdY = midY + (perpY / perpLength) * height;

            const cp1x = v1.x + (thirdX - v1.x) * state.flowFactor;
            const cp1y = v1.y + (thirdY - v1.y) * state.flowFactor;
            const cp2x = v2.x + (thirdX - v2.x) * state.flowFactor;
            const cp2y = v2.y + (thirdY - v2.y) * state.flowFactor;

            this.curves.push({
                index: i,
                start: v1,
                end: v2,
                cp1: { x: cp1x, y: cp1y },
                cp2: { x: cp2x, y: cp2y },
                samples: this.sampleCurve(v1, { x: cp1x, y: cp1y }, { x: cp2x, y: cp2y }, v2, 100)
            });
        }

        // Find intersections between curves
        this.findCurveIntersections();

        // Identify enclosed regions using polygon approximation
        this.identifyRegions(state);

        return {
            curves: this.curves,
            intersections: this.intersections,
            regions: this.regions
        };
    }

    /**
     * Sample a cubic Bézier curve into discrete points
     */
    sampleCurve(p0, cp1, cp2, p1, samples = 100) {
        const points = [];
        for (let i = 0; i <= samples; i++) {
            const t = i / samples;
            const mt = 1 - t;
            const mt2 = mt * mt;
            const mt3 = mt2 * mt;
            const t2 = t * t;
            const t3 = t2 * t;

            const x = mt3 * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t3 * p1.x;
            const y = mt3 * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t3 * p1.y;

            points.push({ x, y, t });
        }
        return points;
    }

    /**
     * Find intersections between all curve pairs
     */
    findCurveIntersections() {
        this.intersections = [];

        // Check each pair of curves
        for (let i = 0; i < this.curves.length; i++) {
            for (let j = i + 1; j < this.curves.length; j++) {
                const intersects = this.findCurvePairIntersections(
                    this.curves[i],
                    this.curves[j]
                );
                this.intersections.push(...intersects);
            }
        }

        return this.intersections;
    }

    /**
     * Find intersections between two curves using sample-based approach
     */
    findCurvePairIntersections(curve1, curve2) {
        const intersections = [];
        const threshold = 3; // Distance threshold for considering intersection

        // Compare all sample points
        for (let i = 0; i < curve1.samples.length - 1; i++) {
            const seg1Start = curve1.samples[i];
            const seg1End = curve1.samples[i + 1];

            for (let j = 0; j < curve2.samples.length - 1; j++) {
                const seg2Start = curve2.samples[j];
                const seg2End = curve2.samples[j + 1];

                const intersection = this.lineSegmentIntersection(
                    seg1Start, seg1End,
                    seg2Start, seg2End
                );

                if (intersection) {
                    // Check if we already have a nearby intersection
                    const isDuplicate = intersections.some(existing =>
                        this.distance(existing, intersection) < threshold
                    );

                    if (!isDuplicate) {
                        intersections.push({
                            ...intersection,
                            curve1Index: curve1.index,
                            curve2Index: curve2.index
                        });
                    }
                }
            }
        }

        return intersections;
    }

    /**
     * Find intersection point of two line segments
     */
    lineSegmentIntersection(p1, p2, p3, p4) {
        const x1 = p1.x, y1 = p1.y;
        const x2 = p2.x, y2 = p2.y;
        const x3 = p3.x, y3 = p3.y;
        const x4 = p4.x, y4 = p4.y;

        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

        if (Math.abs(denom) < 1e-10) return null; // Parallel

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }

        return null;
    }

    /**
     * Calculate distance between two points
     */
    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Identify distinct regions formed by overlapping curves
     */
    identifyRegions(state) {
        this.regions = [];

        // Create a unified polygon from all curve samples
        const allPoints = [];
        this.curves.forEach(curve => {
            allPoints.push(...curve.samples.slice(0, -1)); // Avoid duplicates at endpoints
        });

        // For now, identify key regions based on curve count and intersections
        // More sophisticated region decomposition would require a proper DCEL or sweep line algorithm

        if (this.intersections.length === 0) {
            // No intersections - single region (the whole shape)
            this.regions.push({
                id: 0,
                type: 'outer',
                boundary: allPoints,
                area: this.calculatePolygonArea(allPoints),
                centroid: this.calculateCentroid(allPoints),
                inscribedEllipse: null,
                inscribedRectangle: null
            });
        } else {
            // Multiple regions - identify center region and petal regions
            this.identifyRegionsByTopology(state, allPoints);
        }

        // Calculate inscribed shapes for each region
        this.regions.forEach(region => {
            region.inscribedEllipse = this.findLargestInscribedEllipse(region.boundary);
            region.inscribedRectangle = this.findLargestInscribedRectangle(region.boundary);
        });

        return this.regions;
    }

    /**
     * Identify regions based on topology (center vs petals)
     */
    identifyRegionsByTopology(state, allPoints) {
        const center = {
            x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
            y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length
        };

        // Central region (where all curves overlap)
        const centerRegion = this.extractCenterRegion(state, center);
        if (centerRegion) {
            this.regions.push(centerRegion);
        }

        // Petal regions (between each pair of adjacent curves)
        for (let i = 0; i < state.sides; i++) {
            const petalRegion = this.extractPetalRegion(state, i, center);
            if (petalRegion) {
                this.regions.push(petalRegion);
            }
        }
    }

    /**
     * Extract the central overlapping region
     */
    extractCenterRegion(state, center) {
        // Sample points in a grid and find those inside all curves
        const sampleSize = 50;
        const bounds = this.getBoundingBox(this.curves[0].samples);
        const centerPoints = [];

        for (let y = bounds.minY; y <= bounds.maxY; y += (bounds.maxY - bounds.minY) / sampleSize) {
            for (let x = bounds.minX; x <= bounds.maxX; x += (bounds.maxX - bounds.minX) / sampleSize) {
                const point = { x, y };
                if (this.isPointInAllCurves(point)) {
                    centerPoints.push(point);
                }
            }
        }

        if (centerPoints.length > 3) {
            const hull = this.convexHull(centerPoints);
            return {
                id: 0,
                type: 'center',
                boundary: hull,
                area: this.calculatePolygonArea(hull),
                centroid: center,
                inscribedEllipse: null,
                inscribedRectangle: null
            };
        }

        return null;
    }

    /**
     * Extract a petal region
     */
    extractPetalRegion(state, index, globalCenter) {
        const curve = this.curves[index];

        // Sample points along the curve and nearby
        const petalPoints = [];
        const offset = 20; // Offset to sample inside the petal

        curve.samples.forEach((point, i) => {
            if (i % 5 === 0) { // Sample every 5th point
                // Calculate inward normal
                const nextIdx = Math.min(i + 1, curve.samples.length - 1);
                const dx = curve.samples[nextIdx].x - point.x;
                const dy = curve.samples[nextIdx].y - point.y;
                const len = Math.sqrt(dx * dx + dy * dy);

                if (len > 0) {
                    const normalX = -dy / len;
                    const normalY = dx / len;

                    // Determine inward direction (toward global center)
                    const toCenter = {
                        x: globalCenter.x - point.x,
                        y: globalCenter.y - point.y
                    };
                    const dot = normalX * toCenter.x + normalY * toCenter.y;
                    const sign = dot > 0 ? 1 : -1;

                    petalPoints.push({
                        x: point.x + sign * normalX * offset,
                        y: point.y + sign * normalY * offset
                    });
                }
            }
        });

        if (petalPoints.length > 3) {
            const hull = this.convexHull(petalPoints);
            const centroid = this.calculateCentroid(hull);

            return {
                id: index + 1,
                type: 'petal',
                petalIndex: index,
                boundary: hull,
                area: this.calculatePolygonArea(hull),
                centroid: centroid,
                inscribedEllipse: null,
                inscribedRectangle: null
            };
        }

        return null;
    }

    /**
     * Check if a point is inside all curves (for center region detection)
     */
    isPointInAllCurves(point) {
        // Simple approximation: check if point is inside the polygon formed by all curve samples
        const allSamples = [];
        this.curves.forEach(curve => allSamples.push(...curve.samples));
        return this.isPointInPolygon(point, allSamples);
    }

    /**
     * Check if point is inside polygon using ray casting
     */
    isPointInPolygon(point, polygon) {
        let inside = false;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].x, yi = polygon[i].y;
            const xj = polygon[j].x, yj = polygon[j].y;

            const intersect = ((yi > point.y) !== (yj > point.y))
                && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    /**
     * Calculate area of polygon using shoelace formula
     */
    calculatePolygonArea(points) {
        if (points.length < 3) return 0;

        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area / 2);
    }

    /**
     * Calculate centroid of polygon
     */
    calculateCentroid(points) {
        if (points.length === 0) return { x: 0, y: 0 };

        const sum = points.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y
        }), { x: 0, y: 0 });

        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }

    /**
     * Get bounding box of points
     */
    getBoundingBox(points) {
        if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        return {
            minX: Math.min(...points.map(p => p.x)),
            maxX: Math.max(...points.map(p => p.x)),
            minY: Math.min(...points.map(p => p.y)),
            maxY: Math.max(...points.map(p => p.y))
        };
    }

    /**
     * Compute convex hull using Graham scan
     */
    convexHull(points) {
        if (points.length < 3) return points;

        // Find bottom-most point (or leftmost if tie)
        let bottom = points[0];
        for (let p of points) {
            if (p.y > bottom.y || (p.y === bottom.y && p.x < bottom.x)) {
                bottom = p;
            }
        }

        // Sort by polar angle with respect to bottom point
        const sorted = points.slice().sort((a, b) => {
            const angleA = Math.atan2(a.y - bottom.y, a.x - bottom.x);
            const angleB = Math.atan2(b.y - bottom.y, b.x - bottom.x);
            return angleA - angleB;
        });

        const hull = [sorted[0], sorted[1]];

        for (let i = 2; i < sorted.length; i++) {
            while (hull.length > 1 && this.crossProduct(
                hull[hull.length - 2],
                hull[hull.length - 1],
                sorted[i]
            ) <= 0) {
                hull.pop();
            }
            hull.push(sorted[i]);
        }

        return hull;
    }

    /**
     * Cross product for convex hull computation
     */
    crossProduct(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }

    /**
     * Find largest inscribed ellipse using sampling approach
     */
    findLargestInscribedEllipse(boundary) {
        if (boundary.length < 3) return null;

        const centroid = this.calculateCentroid(boundary);
        const bounds = this.getBoundingBox(boundary);

        // Sample approach: test ellipses at different sizes and orientations
        let maxEllipse = null;
        let maxArea = 0;

        const widthRange = bounds.maxX - bounds.minX;
        const heightRange = bounds.maxY - bounds.minY;

        // Test different sizes
        for (let widthRatio = 0.2; widthRatio <= 1.0; widthRatio += 0.1) {
            for (let heightRatio = 0.2; heightRatio <= 1.0; heightRatio += 0.1) {
                const semiMajor = (widthRange / 2) * widthRatio;
                const semiMinor = (heightRange / 2) * heightRatio;

                // Test different orientations
                for (let angle = 0; angle < Math.PI; angle += Math.PI / 8) {
                    if (this.isEllipseInPolygon(centroid, semiMajor, semiMinor, angle, boundary)) {
                        const area = Math.PI * semiMajor * semiMinor;
                        if (area > maxArea) {
                            maxArea = area;
                            maxEllipse = {
                                center: centroid,
                                semiMajorAxis: semiMajor,
                                semiMinorAxis: semiMinor,
                                rotation: angle,
                                area: area
                            };
                        }
                    }
                }
            }
        }

        return maxEllipse;
    }

    /**
     * Check if ellipse is fully contained within polygon
     */
    isEllipseInPolygon(center, semiMajor, semiMinor, rotation, polygon) {
        // Sample points on the ellipse and check if all are inside polygon
        const samples = 16;
        for (let i = 0; i < samples; i++) {
            const theta = (i / samples) * 2 * Math.PI;
            const x = center.x + semiMajor * Math.cos(theta) * Math.cos(rotation) -
                      semiMinor * Math.sin(theta) * Math.sin(rotation);
            const y = center.y + semiMajor * Math.cos(theta) * Math.sin(rotation) +
                      semiMinor * Math.sin(theta) * Math.cos(rotation);

            if (!this.isPointInPolygon({ x, y }, polygon)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Find largest inscribed rectangle (axis-aligned)
     */
    findLargestInscribedRectangle(boundary) {
        if (boundary.length < 3) return null;

        const bounds = this.getBoundingBox(boundary);
        const centroid = this.calculateCentroid(boundary);

        let maxRectangle = null;
        let maxArea = 0;

        const widthRange = bounds.maxX - bounds.minX;
        const heightRange = bounds.maxY - bounds.minY;

        // Sample different rectangle sizes centered at centroid
        for (let widthRatio = 0.1; widthRatio <= 1.0; widthRatio += 0.05) {
            for (let heightRatio = 0.1; heightRatio <= 1.0; heightRatio += 0.05) {
                const width = widthRange * widthRatio;
                const height = heightRange * heightRatio;

                const rect = {
                    x: centroid.x - width / 2,
                    y: centroid.y - height / 2,
                    width: width,
                    height: height
                };

                if (this.isRectangleInPolygon(rect, boundary)) {
                    const area = width * height;
                    if (area > maxArea) {
                        maxArea = area;
                        maxRectangle = { ...rect, area };
                    }
                }
            }
        }

        return maxRectangle;
    }

    /**
     * Check if rectangle is fully contained within polygon
     */
    isRectangleInPolygon(rect, polygon) {
        // Check all four corners
        const corners = [
            { x: rect.x, y: rect.y },
            { x: rect.x + rect.width, y: rect.y },
            { x: rect.x + rect.width, y: rect.y + rect.height },
            { x: rect.x, y: rect.y + rect.height }
        ];

        return corners.every(corner => this.isPointInPolygon(corner, polygon));
    }
}
