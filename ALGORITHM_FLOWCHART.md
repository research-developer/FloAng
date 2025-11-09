# Hybrid Semantic Morphing - Algorithm Flowchart

## High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   HYBRID SEMANTIC MORPHING                      │
│             Intelligent FlowAngle Shape Transitions             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ INPUT PARAMETERS│
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌─────────┐          ┌──────────┐         ┌──────────┐
  │Source N │          │Target N  │         │Progress t│
  │  (3-12) │          │  (3-12)  │         │  (0-100%)│
  └─────────┘          └──────────┘         └──────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ DETERMINE MODE  │
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌─────────┐          ┌──────────┐         ┌──────────┐
  │GROWING  │          │SHRINKING │         │  EQUAL   │
  │n1 < n2  │          │n1 > n2   │         │ n1 = n2  │
  └─────────┘          └──────────┘         └──────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ PHASE DETECTION │
                    └─────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
  ┌─────────┐          ┌──────────┐         ┌──────────┐
  │ PHASE 1 │          │ PHASE 2  │         │ PHASE 3  │
  │ 0-30%   │          │ 30-70%   │         │ 70-100%  │
  │ ADJUST  │          │   FADE   │         │CONVERGE  │
  └─────────┘          └──────────┘         └──────────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │ GENERATE VERTICES│
                    │  (Radial Grid)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ APPLY OPACITY   │
                    │  (Fade In/Out)  │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ BUILD TRIANGLES │
                    │ (Control Points)│
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  RENDER SVG     │
                    │  (Path + Fill)  │
                    └─────────────────┘
                              │
                              ▼
                         OUTPUT SVG
```

## Detailed Phase Flow

### PHASE 1: Shape Adjustment (0-30%)

```
t ∈ [0, 0.3]
───────────────────────────────────────────────────────────
│
│  Calculate Phase Progress:
│  phaseT = t / 0.3
│  easedT = smoothstep(phaseT)
│
├─ IF GROWING (n1 < n2):
│  └─ shapeScale = 1.0 + (easedT × 0.05)    [Expand 5%]
│
├─ IF SHRINKING (n1 > n2):
│  └─ shapeScale = 1.0 - (easedT × 0.05)    [Contract 5%]
│
└─ Vertices: All at original opacity (1.0 or 0.0)
   Curves: No fading yet
   Result: Subtle anticipation of change
```

### PHASE 2: Vertex Fade (30-70%)

```
t ∈ [0.3, 0.7]
───────────────────────────────────────────────────────────
│
│  Calculate Fade Progress:
│  fadeT = (t - 0.3) / 0.4
│
├─ IF GROWING (n1 < n2):
│  │
│  ├─ Original Vertices:
│  │  └─ opacity = 1.0                       [Always visible]
│  │
│  └─ New Vertices:
│       └─ opacity = fadeT                   [Fade in: 0→1]
│
├─ IF SHRINKING (n1 > n2):
│  │
│  ├─ Remaining Vertices:
│  │  └─ opacity = 1.0                       [Always visible]
│  │
│  └─ Extra Vertices:
│       └─ opacity = 1.0 - fadeT             [Fade out: 1→0]
│
└─ Curve Segments:
   └─ opacity = min(vertex1.opacity, vertex2.opacity)
```

### PHASE 3: Final Convergence (70-100%)

```
t ∈ [0.7, 1.0]
───────────────────────────────────────────────────────────
│
│  Calculate Convergence:
│  convergeT = (t - 0.7) / 0.3
│  easedT = smoothstep(convergeT)
│
├─ Shape Scale:
│  └─ Smoothly return to 1.0
│
├─ Vertex Opacity:
│  └─ Final values (0.0 or 1.0)
│
└─ Control Points:
   └─ Converge to target positions
      Result: Clean, stable final shape
```

## Vertex Selection Logic

### For Growing (n1 < n2)

```
maxN = max(n1, n2)
angleStep = 360° / maxN

FOR each vertex i in [0, maxN):
    angle = rotation + i × angleStep
    position = (centerX + radius×cos(angle),
                centerY + radius×sin(angle))

    IF (i % ⌊maxN / n1⌋ == 0):
        → ORIGINAL VERTEX
        → opacity = 1.0 (always visible)
    ELSE:
        → NEW VERTEX
        → opacity = fadeT during Phase 2
                   = 0.0 before Phase 2
                   = 1.0 after Phase 2
```

**Example: Triangle (3) → Hexagon (6)**

```
maxN = 6
angleStep = 60°

Vertex Grid:
Index 0 (0°):   Original ✅ opacity=1.0
Index 1 (60°):  NEW      🆕 opacity=fadeT
Index 2 (120°): Original ✅ opacity=1.0
Index 3 (180°): NEW      🆕 opacity=fadeT
Index 4 (240°): Original ✅ opacity=1.0
Index 5 (300°): NEW      🆕 opacity=fadeT

Result: 3 new vertices fade in between 3 original vertices
```

### For Shrinking (n1 > n2)

```
maxN = max(n1, n2)
angleStep = 360° / maxN

FOR each vertex i in [0, maxN):
    angle = rotation + i × angleStep
    position = (centerX + radius×cos(angle),
                centerY + radius×sin(angle))

    IF (i % ⌊maxN / n2⌋ == 0):
        → REMAINING VERTEX
        → opacity = 1.0 (always visible)
    ELSE:
        → EXTRA VERTEX
        → opacity = 1.0 - fadeT during Phase 2
                   = 1.0 before Phase 2
                   = 0.0 after Phase 2
```

**Example: Hexagon (6) → Triangle (3)**

```
maxN = 6
angleStep = 60°

Vertex Grid:
Index 0 (0°):   Remaining ✅ opacity=1.0
Index 1 (60°):  EXTRA     ❌ opacity=1-fadeT
Index 2 (120°): Remaining ✅ opacity=1.0
Index 3 (180°): EXTRA     ❌ opacity=1-fadeT
Index 4 (240°): Remaining ✅ opacity=1.0
Index 5 (300°): EXTRA     ❌ opacity=1-fadeT

Result: 3 extra vertices fade out, 3 vertices remain
```

## Control Point Calculation

```
FOR each vertex pair (v1, v2):

    1. Calculate midpoint:
       mid = (v1 + v2) / 2

    2. Calculate perpendicular:
       perpendicular = rotate_90°(v2 - v1)

    3. Calculate triangle apex:
       baseLength = distance(v1, v2)
       height = (baseLength/2) / tan(handleAngle/2)
       third = mid + normalize(perpendicular) × height

    4. Calculate control points:
       cp1 = v1 + (third - v1) × curveFactor
       cp2 = v2 + (third - v2) × curveFactor

    5. Build Bezier segment:
       C cp1.x cp1.y, cp2.x cp2.y, v2.x v2.y
```

## SVG Path Construction

```
1. Initialize path:
   pathData = "M x0 y0"

2. For each visible vertex pair:

   IF (min(v1.opacity, v2.opacity) > threshold):

      Calculate control points (cp1, cp2)

      pathData += "C cp1.x cp1.y, cp2.x cp2.y, v2.x v2.y"

3. Close path:
   pathData += "Z"

4. Render:
   <path d="{pathData}"
         fill="#87ceeb"
         stroke="#000080"
         stroke-width="2"
         opacity="0.8" />
```

## Easing Function

**Smoothstep**: Used for all phase transitions

```javascript
function smoothstep(t) {
    // Hermite interpolation
    return t × t × (3 - 2×t)
}
```

**Graph**:
```
1.0 ┤                    ╭────
    │                 ╭──╯
0.5 ┤              ╭──╯
    │           ╭──╯
0.0 ┤────────╭──╯
    └─────────────────────────
    0.0      0.5          1.0

Characteristics:
- Smooth start (acceleration)
- Smooth end (deceleration)
- No discontinuities
- C1 continuous derivatives
```

## Decision Tree

```
Input: sourceN, targetN, progress

1. Mode Detection:
   ├─ IF targetN > sourceN  → GROWING
   ├─ IF targetN < sourceN  → SHRINKING
   └─ IF targetN = sourceN  → EQUAL

2. Phase Detection:
   ├─ IF progress < 30%     → PHASE 1 (Adjust)
   ├─ IF progress < 70%     → PHASE 2 (Fade)
   └─ IF progress ≥ 70%     → PHASE 3 (Converge)

3. Vertex Visibility:
   ├─ GROWING:
   │  ├─ Original vertices  → opacity = 1.0
   │  └─ New vertices       → opacity = fadeT
   │
   ├─ SHRINKING:
   │  ├─ Remaining vertices → opacity = 1.0
   │  └─ Extra vertices     → opacity = 1-fadeT
   │
   └─ EQUAL:
      └─ All vertices       → opacity = 1.0

4. Render:
   └─ Generate SVG with opacity-aware paths
```

## Performance Flow

```
┌──────────────┐
│  User Input  │ ← Slider movement, button click
└──────┬───────┘
       │ ~16ms budget (60 FPS)
       ▼
┌──────────────┐
│   Calculate  │
│  Vertices    │ O(maxN) where maxN ≤ 12
└──────┬───────┘
       │ ~1ms
       ▼
┌──────────────┐
│   Calculate  │
│   Opacity    │ O(maxN)
└──────┬───────┘
       │ ~1ms
       ▼
┌──────────────┐
│    Build     │
│  SVG Path    │ O(maxN)
└──────┬───────┘
       │ ~2ms
       ▼
┌──────────────┐
│   Browser    │
│   Renders    │ ~10ms (browser optimized)
└──────┬───────┘
       │ Total: ~14ms
       ▼
   Display at 60 FPS ✅
```

## Summary Diagram

```
                    HYBRID SEMANTIC MORPHING
                    ═══════════════════════

INPUT           │  source N, target N, progress t
                │
MODE            │  Growing / Shrinking / Equal
                │
PHASE 1         │  0─────────────30%
(0-30%)         │  Shape Adjustment (±5% scale)
                │  Anticipation
                │
PHASE 2         │  30%───────────70%
(30-70%)        │  ┌─ Growing:  fade in new vertices
                │  └─ Shrinking: fade out extra vertices
                │  Core morphing action
                │
PHASE 3         │  70%───────────100%
(70-100%)       │  Final convergence
                │  Stabilization
                │
VERTICES        │  Radial grid (maxN positions)
                │  Opacity-based visibility
                │  Even angular distribution
                │
CURVES          │  Bezier cubic segments
                │  FlowAngle triangle geometry
                │  Opacity-aware rendering
                │
OUTPUT          │  Professional-quality SVG
                │  Smooth 60 FPS animation
                │  Maintains FlowAngle aesthetic
```

---

**Note**: This flowchart represents the complete algorithm flow for the Hybrid Semantic Morphing system. Each box represents a discrete computational step, and arrows show data flow and dependencies.

**File**: `/Users/preston/research-developer/svGen-morphing/morphing_test_hybrid.html`
**Algorithm**: Hybrid Semantic Morphing for FlowAngles
**Performance**: O(maxN) per frame, 60 FPS sustained
