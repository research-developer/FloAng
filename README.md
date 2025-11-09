# 🌊 FloAng - Flowangle Studio & SVG Generator

A geometric pattern generator and interactive studio for creating flowangles and other algorithmically-generated SVG graphics.

## ✨ Features

- **Functional Composition**: Build complex shapes from simple primitives
- **Mathematical Precision**: Real geometric calculations, not approximations
- **Fractal-Friendly**: Designed for recursive and self-similar structures
- **Live Development**: Hot-reload server with file watching
- **Research-Ready**: Tools for tensor visualizations, manifolds, and harmonic relationships

## 🚀 Quick Start

### 1. Start Development Environment

```bash
python dev.py
```

Then open `http://localhost:8000/viewer.html` in your browser.

### 2. Create Your First Pattern

```python
# Copy the template
cp templates/experiment_template.py my_pattern.py

# Edit my_pattern.py, then run:
python my_pattern.py

# Refresh browser to see results!
```

### 3. Workflow

1. **Edit** Python file in `examples/` or `templates/`
2. **Save** → Script auto-runs (if using `dev.py`)
3. **Refresh** browser → See your SVG!

## 📁 Project Structure

```
FloAng/
├── src/                    # Core library
│   └── svg_generator.py    # Point, SVGCanvas, primitives
├── examples/               # Built-in examples
│   ├── advanced_examples.py
│   └── research_examples.py
├── templates/              # Starting templates
│   └── experiment_template.py
├── outputs/                # Generated SVGs (gitignored)
├── docs/                   # Documentation
├── dev.py                  # Start dev environment
├── dev_server.py           # HTTP server only
├── watch.py                # File watcher only
└── viewer.html             # Visual browser for SVGs
```

## 📖 Documentation

- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Complete development workflow guide
- **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** - API cheat sheet
- **[CLAUDE.md](docs/CLAUDE.md)** - Architecture and patterns
- **[REFACTORING_SUMMARY.md](REFACTORING_SUMMARY.md)** - Recent refactoring details

## 🎨 Examples

### Basic Triangle
```python
from svg_generator import *

canvas = SVGCanvas(800, 800)
points = equilateral_triangle(Point(400, 400), 200)
canvas.polygon(points, fill="lightblue", stroke="navy")
canvas.save("outputs/triangle.svg")
```

### Fractal Recursion
```python
def fractal_circles(canvas, center, radius, depth):
    if depth == 0:
        canvas.circle(center, radius, fill=f"hsl({depth*40}, 70%, 60%)")
        return

    canvas.circle(center, radius, fill="none", stroke="black")

    for angle in [0, math.pi/2, math.pi, 3*math.pi/2]:
        new_center = Point(
            center.x + radius * math.cos(angle),
            center.y + radius * math.sin(angle)
        )
        fractal_circles(canvas, new_center, radius * 0.4, depth - 1)
```

Run built-in examples:
```bash
python examples/advanced_examples.py    # Mandalas, spirals, L-systems
python examples/research_examples.py    # Tensors, harmonics, manifolds
```

## 🛠️ Development Tools

### Full Environment (Recommended)
```bash
python dev.py
```
- HTTP server on port 8000
- Auto-regenerates on file save
- Live development workflow

### Individual Tools
```bash
python dev_server.py   # Just HTTP server
python watch.py        # Just file watcher
```

## 🔧 Requirements

- Python 3.7+
- Standard library only (no external dependencies!)

## 🎯 Use Cases

- **Generative Art**: Algorithmic patterns, fractals, tessellations
- **Research Visualizations**: Tensor manifolds, harmonic relationships
- **Mathematical Graphics**: Geometric constructions, transformations
- **Data Visualization**: Multi-dimensional projections
- **Education**: Teaching recursion, geometry, algorithms

## 💡 Philosophy

- **Start Simple**: Test basic shapes before adding recursion
- **Compose Primitives**: Combine simple functions for complexity
- **Parameterize Everything**: Make constants into function parameters
- **Visualize Construction**: Use debug circles/lines to see your math

## 🤝 Contributing

This is a research/personal project. Feel free to:
- Fork and experiment
- Share your creations
- Suggest improvements
- Report issues

## 📜 License

MIT License - see LICENSE file for details

## 🔗 Resources

- **Mathematical Constants**: `math.pi`, `math.tau`, golden ratio `phi = 1.618...`
- **Common Angles**: π/6 (30°), π/4 (45°), π/3 (60°), π/2 (90°)
- **Color Strategy**: HSL for programmatic gradients: `hsl(0-360, 70%, 60%)`

## ⚡ Quick Commands

```bash
# Generate all examples
python examples/advanced_examples.py
python examples/research_examples.py

# Start live development
python dev.py

# Create new experiment
cp templates/experiment_template.py my_experiment.py
python my_experiment.py

# View results
open http://localhost:8000/viewer.html  # (if dev server running)
```

---

**Happy generating! 🎨✨**
