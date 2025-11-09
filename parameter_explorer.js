/**
 * Parameter Space Explorer for FlowAngle
 * Discovers novel configurations through systematic exploration
 */

class ParameterSpaceExplorer {
    constructor(geometricAnalyzer) {
        this.analyzer = geometricAnalyzer;
        this.discoveries = new Map(); // Key: n-value, Value: array of notable configs
        this.currentExploration = null;
    }

    /**
     * Explore parameter space for a given n-value
     */
    exploreParameterSpace(n, options = {}) {
        const {
            handleAngleMin = 10,
            handleAngleMax = 170,
            handleAngleStep = 5,
            curveFactorMin = -3,
            curveFactorMax = 1,
            curveFactorStep = 0.1,
            rotation = 0,
            size = 600
        } = options;

        const configurations = [];
        const startTime = Date.now();

        console.log(`🔍 Exploring parameter space for n=${n}`);
        console.log(`Handle Angle: ${handleAngleMin}° to ${handleAngleMax}° (step: ${handleAngleStep}°)`);
        console.log(`Curve Factor: ${curveFactorMin} to ${curveFactorMax} (step: ${curveFactorStep})`);

        let sampleCount = 0;

        // Iterate through parameter combinations
        for (let handleAngle = handleAngleMin; handleAngle <= handleAngleMax; handleAngle += handleAngleStep) {
            for (let curveFactor = curveFactorMin; curveFactor <= curveFactorMax; curveFactor += curveFactorStep) {
                sampleCount++;

                const state = {
                    sides: n,
                    handleAngle: handleAngle,
                    curveFactor: parseFloat(curveFactor.toFixed(2)),
                    rotation: rotation,
                    showGuides: false
                };

                // Run geometric analysis
                const analysisResults = this.analyzer.analyzeFlowAngle(state, size);

                // Calculate metrics
                const metrics = this.calculateMetrics(state, analysisResults, size);

                // Check if configuration is degenerate
                if (metrics.isDegenerate) {
                    continue; // Skip degenerate configs
                }

                // Store configuration with metrics
                configurations.push({
                    state: state,
                    analysis: analysisResults,
                    metrics: metrics,
                    timestamp: Date.now()
                });
            }
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Explored ${sampleCount} configurations in ${duration}s`);
        console.log(`📊 Valid configurations: ${configurations.length}`);

        // Classify configurations
        const classified = this.classifyConfigurations(configurations, n);

        // Store discoveries
        this.discoveries.set(n, classified);

        return classified;
    }

    /**
     * Calculate comprehensive metrics for a configuration
     */
    calculateMetrics(state, analysisResults, size) {
        const metrics = {
            // Basic counts
            curveCount: analysisResults.curves.length,
            intersectionCount: analysisResults.intersections.length,
            regionCount: analysisResults.regions.length,

            // Area metrics
            totalArea: 0,
            centerArea: 0,
            petalAreas: [],
            largestPetalArea: 0,
            smallestPetalArea: Infinity,
            petalAreaVariance: 0,

            // Center region metrics
            centerInscribedRatio: 0,
            centerDominance: 0,

            // Shape characteristics
            roundness: 0,
            regularity: 0,

            // Complexity measures
            complexityScore: 0,
            simplicityScore: 0,

            // Degenerate detection
            isDegenerate: false,
            degenerateReason: null
        };

        // Calculate areas
        analysisResults.regions.forEach(region => {
            metrics.totalArea += region.area;

            if (region.type === 'center') {
                metrics.centerArea = region.area;

                // Center inscribed ratio
                if (region.inscribedRectangle) {
                    metrics.centerInscribedRatio = region.inscribedRectangle.area / region.area;
                }
            } else if (region.type === 'petal') {
                metrics.petalAreas.push(region.area);
                metrics.largestPetalArea = Math.max(metrics.largestPetalArea, region.area);
                metrics.smallestPetalArea = Math.min(metrics.smallestPetalArea, region.area);
            }
        });

        // Center dominance (center area / total area)
        if (metrics.totalArea > 0) {
            metrics.centerDominance = metrics.centerArea / metrics.totalArea;
        }

        // Petal area variance (lower = more equal)
        if (metrics.petalAreas.length > 1) {
            const meanPetalArea = metrics.petalAreas.reduce((a, b) => a + b, 0) / metrics.petalAreas.length;
            const variance = metrics.petalAreas.reduce((sum, area) => {
                return sum + Math.pow(area - meanPetalArea, 2);
            }, 0) / metrics.petalAreas.length;
            metrics.petalAreaVariance = variance;
        }

        // Regularity (inverse of petal area variance, normalized)
        if (metrics.petalAreas.length > 0 && metrics.largestPetalArea > 0) {
            const normalizedVariance = Math.sqrt(metrics.petalAreaVariance) / metrics.largestPetalArea;
            metrics.regularity = 1 / (1 + normalizedVariance);
        }

        // Roundness (how circular is the outer boundary)
        metrics.roundness = this.calculateRoundness(analysisResults, size);

        // Complexity score (higher = more fractal-like)
        // Based on: intersection density, region count, area irregularity
        const canvasArea = size * size;
        const intersectionDensity = metrics.intersectionCount / state.sides;
        const regionComplexity = metrics.regionCount / (state.sides + 1); // Expected: 1 center + n petals
        const irregularity = 1 - metrics.regularity;

        metrics.complexityScore = (
            intersectionDensity * 0.4 +
            regionComplexity * 0.3 +
            irregularity * 0.3
        );

        // Simplicity score (higher = more grid-aligned, simple)
        // Based on: center dominance, regularity, inscribed ratio
        metrics.simplicityScore = (
            metrics.centerDominance * 0.4 +
            metrics.regularity * 0.3 +
            metrics.centerInscribedRatio * 0.3
        );

        // Degenerate detection
        metrics.isDegenerate = this.checkDegenerate(state, analysisResults, metrics, size);

        return metrics;
    }

    /**
     * Calculate roundness of outer boundary
     */
    calculateRoundness(analysisResults, size) {
        if (analysisResults.regions.length === 0) return 0;

        // Get all boundary points from all regions
        const allPoints = [];
        analysisResults.regions.forEach(region => {
            allPoints.push(...region.boundary);
        });

        if (allPoints.length < 3) return 0;

        // Calculate centroid
        const centroid = {
            x: allPoints.reduce((sum, p) => sum + p.x, 0) / allPoints.length,
            y: allPoints.reduce((sum, p) => sum + p.y, 0) / allPoints.length
        };

        // Calculate distances from centroid
        const distances = allPoints.map(p => {
            const dx = p.x - centroid.x;
            const dy = p.y - centroid.y;
            return Math.sqrt(dx * dx + dy * dy);
        });

        // Roundness = inverse of coefficient of variation
        const meanDist = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - meanDist, 2), 0) / distances.length;
        const stdDev = Math.sqrt(variance);

        if (meanDist === 0) return 0;

        const cv = stdDev / meanDist; // Coefficient of variation
        return 1 / (1 + cv); // Higher = more round
    }

    /**
     * Check if configuration is degenerate
     */
    checkDegenerate(state, analysisResults, metrics, size) {
        const canvasArea = size * size;

        // Degenerate if total area is too small (shape collapsed)
        if (metrics.totalArea < canvasArea * 0.01) {
            metrics.degenerateReason = 'collapsed';
            return true;
        }

        // Degenerate if total area is too large (exploded beyond canvas)
        if (metrics.totalArea > canvasArea * 2) {
            metrics.degenerateReason = 'exploded';
            return true;
        }

        // Degenerate if no regions detected
        if (analysisResults.regions.length === 0) {
            metrics.degenerateReason = 'no_regions';
            return true;
        }

        // Degenerate if extreme curve factor causes infinite folding
        if (state.curveFactor < -2.5 && metrics.intersectionCount > state.sides * 3) {
            metrics.degenerateReason = 'infinite_folding';
            return true;
        }

        return false;
    }

    /**
     * Classify configurations into archetypes
     */
    classifyConfigurations(configurations, n) {
        const classified = {
            n: n,
            totalConfigurations: configurations.length,
            archetypes: {
                fractalBloom: [],      // Maximal complexity
                gridAligned: [],       // Maximal simplicity, large center
                petalDominant: [],     // Minimal center, equal petals
                roundTransition: [],   // Round, featureless
                balanced: []           // Good balance of features
            },
            extremes: {
                maxComplexity: null,
                maxSimplicity: null,
                maxCenterDominance: null,
                minCenterDominance: null,
                maxRoundness: null,
                maxRegularity: null
            }
        };

        // Find extremes
        configurations.forEach(config => {
            const m = config.metrics;

            // Track extremes
            if (!classified.extremes.maxComplexity || m.complexityScore > classified.extremes.maxComplexity.metrics.complexityScore) {
                classified.extremes.maxComplexity = config;
            }

            if (!classified.extremes.maxSimplicity || m.simplicityScore > classified.extremes.maxSimplicity.metrics.simplicityScore) {
                classified.extremes.maxSimplicity = config;
            }

            if (!classified.extremes.maxCenterDominance || m.centerDominance > classified.extremes.maxCenterDominance.metrics.centerDominance) {
                classified.extremes.maxCenterDominance = config;
            }

            if (!classified.extremes.minCenterDominance || m.centerDominance < classified.extremes.minCenterDominance.metrics.centerDominance) {
                classified.extremes.minCenterDominance = config;
            }

            if (!classified.extremes.maxRoundness || m.roundness > classified.extremes.maxRoundness.metrics.roundness) {
                classified.extremes.maxRoundness = config;
            }

            if (!classified.extremes.maxRegularity || m.regularity > classified.extremes.maxRegularity.metrics.regularity) {
                classified.extremes.maxRegularity = config;
            }
        });

        // Classify into archetypes
        configurations.forEach(config => {
            const m = config.metrics;

            // Fractal Bloom: High complexity, many intersections
            if (m.complexityScore > 0.7 && m.intersectionCount > n * 1.5) {
                classified.archetypes.fractalBloom.push(config);
            }

            // Grid Aligned: High simplicity, large center, good inscribed ratio
            if (m.simplicityScore > 0.6 && m.centerInscribedRatio > 0.5 && m.centerDominance > 0.3) {
                classified.archetypes.gridAligned.push(config);
            }

            // Petal Dominant: Small center, highly regular petals
            if (m.centerDominance < 0.2 && m.regularity > 0.8 && m.petalAreas.length === n) {
                classified.archetypes.petalDominant.push(config);
            }

            // Round Transition: High roundness, low feature variance
            if (m.roundness > 0.8 && m.regularity > 0.9) {
                classified.archetypes.roundTransition.push(config);
            }

            // Balanced: Moderate values across all metrics
            const isBalanced =
                m.complexityScore > 0.3 && m.complexityScore < 0.7 &&
                m.centerDominance > 0.2 && m.centerDominance < 0.5 &&
                m.regularity > 0.6;
            if (isBalanced) {
                classified.archetypes.balanced.push(config);
            }
        });

        // Sort archetypes by their defining metric
        classified.archetypes.fractalBloom.sort((a, b) => b.metrics.complexityScore - a.metrics.complexityScore);
        classified.archetypes.gridAligned.sort((a, b) => b.metrics.simplicityScore - a.metrics.simplicityScore);
        classified.archetypes.petalDominant.sort((a, b) => b.metrics.regularity - a.metrics.regularity);
        classified.archetypes.roundTransition.sort((a, b) => b.metrics.roundness - a.metrics.roundness);
        classified.archetypes.balanced.sort((a, b) => {
            // Sort by "balance score" - inverse of variance across metrics
            const scoreA = Math.abs(0.5 - a.metrics.complexityScore) + Math.abs(0.35 - a.metrics.centerDominance);
            const scoreB = Math.abs(0.5 - b.metrics.complexityScore) + Math.abs(0.35 - b.metrics.centerDominance);
            return scoreA - scoreB;
        });

        // Limit to top 10 per archetype
        Object.keys(classified.archetypes).forEach(archetype => {
            classified.archetypes[archetype] = classified.archetypes[archetype].slice(0, 10);
        });

        return classified;
    }

    /**
     * Get novel configurations for a given n
     */
    getNovelConfigurations(n) {
        const discoveries = this.discoveries.get(n);
        if (!discoveries) return null;

        const novel = {
            n: n,
            configurations: []
        };

        // Add extremes
        Object.entries(discoveries.extremes).forEach(([type, config]) => {
            if (config) {
                novel.configurations.push({
                    ...config,
                    noveltyType: type,
                    noveltyReason: this.getNoveltyReason(type)
                });
            }
        });

        // Add top representative from each archetype
        Object.entries(discoveries.archetypes).forEach(([archetype, configs]) => {
            if (configs.length > 0) {
                novel.configurations.push({
                    ...configs[0],
                    noveltyType: archetype,
                    noveltyReason: this.getArchetypeReason(archetype)
                });
            }
        });

        return novel;
    }

    /**
     * Get reason for novelty type
     */
    getNoveltyReason(type) {
        const reasons = {
            maxComplexity: 'Maximum fractal complexity',
            maxSimplicity: 'Maximum simplicity and grid alignment',
            maxCenterDominance: 'Largest center region',
            minCenterDominance: 'Smallest center region (petal-dominant)',
            maxRoundness: 'Most circular/round form',
            maxRegularity: 'Most regular petal distribution'
        };
        return reasons[type] || 'Novel configuration';
    }

    /**
     * Get reason for archetype
     */
    getArchetypeReason(archetype) {
        const reasons = {
            fractalBloom: 'Full fractal bloom - maximal visual complexity',
            gridAligned: 'Grid-aligned with large center - ideal for UI components',
            petalDominant: 'Petal-dominant with minimal center - radial symmetry',
            roundTransition: 'Round and featureless - good for n-transitions',
            balanced: 'Balanced features - versatile configuration'
        };
        return reasons[archetype] || 'Interesting archetype';
    }

    /**
     * Export discoveries to JSON
     */
    exportDiscoveries() {
        const exported = {};
        this.discoveries.forEach((classified, n) => {
            exported[`n${n}`] = {
                n: n,
                totalConfigurations: classified.totalConfigurations,
                extremes: Object.fromEntries(
                    Object.entries(classified.extremes).map(([key, config]) => [
                        key,
                        config ? {
                            state: config.state,
                            metrics: config.metrics
                        } : null
                    ])
                ),
                archetypes: Object.fromEntries(
                    Object.entries(classified.archetypes).map(([archetype, configs]) => [
                        archetype,
                        configs.map(c => ({
                            state: c.state,
                            metrics: c.metrics
                        }))
                    ])
                )
            };
        });
        return JSON.stringify(exported, null, 2);
    }

    /**
     * Generate summary report
     */
    generateReport(n) {
        const discoveries = this.discoveries.get(n);
        if (!discoveries) return 'No discoveries for n=' + n;

        let report = `\n🔍 PARAMETER SPACE EXPLORATION REPORT: n=${n}\n`;
        report += `${'='.repeat(60)}\n\n`;

        report += `📊 Total Configurations Analyzed: ${discoveries.totalConfigurations}\n\n`;

        report += `🎯 EXTREMES:\n`;
        Object.entries(discoveries.extremes).forEach(([type, config]) => {
            if (config) {
                const m = config.metrics;
                report += `  ${type}:\n`;
                report += `    HandleAngle: ${config.state.handleAngle}°, CurveFactor: ${config.state.curveFactor}\n`;
                report += `    Complexity: ${m.complexityScore.toFixed(3)}, Simplicity: ${m.simplicityScore.toFixed(3)}\n`;
                report += `    Center: ${m.centerDominance.toFixed(3)}, Roundness: ${m.roundness.toFixed(3)}\n\n`;
            }
        });

        report += `🏛️ ARCHETYPES:\n`;
        Object.entries(discoveries.archetypes).forEach(([archetype, configs]) => {
            report += `  ${archetype}: ${configs.length} configurations\n`;
            if (configs.length > 0) {
                const top = configs[0];
                report += `    Top: HandleAngle=${top.state.handleAngle}°, CurveFactor=${top.state.curveFactor}\n`;
            }
        });

        return report;
    }
}
