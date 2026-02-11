# Pseudo-Random Distribution Lab

> A Pseudo-Random Distribution Explorer

Pseudo-Random Distribution Lab is a **static, mobile-friendly** educational site that helps you understand **Pseudo-Random Distribution (PRD)** and compare it against **True RNG**.

It includes:
- **Dota2 PRD calculator** (P(N) = min(1, C×N), with C solved to match the nominal proc chance)
- **Chart views**: per-attempt chance, PMF (proc on attempt N), CDF (proc by attempt N)
- **Radiant/Dire theme switch**
- **General PRD playground** (try different ramp shapes: Dota-linear, linear c0+inc, exponential)

[Live Link](https://nishanth-murthy-kottapalli.github.io/Psuedo-Random-Distribution-Lab/)

## Local run

This is a static site. You can open `index.html` directly, or run a local server:

```bash
python -m http.server 8080
```
Then open: `http://localhost:8080/#calculator`
