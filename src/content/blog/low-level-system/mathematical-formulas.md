---
title: "Mathematical Formulas Test"
description: "Testing mathematical formula rendering with KaTeX - De Morgan's law, integration, summation, and differentiation"
pubDate: 2025-01-01
updatedDate: 2025-01-01
category: low-level-system
---

## Introduction

This post demonstrates mathematical formula rendering using KaTeX, which supports LaTeX syntax similar to Overleaf. Below are various mathematical expressions including De Morgan's law, integration, summation, and differentiation.

## De Morgan's Law

De Morgan's laws are fundamental rules in Boolean algebra and set theory. They state:

### For Sets:

$$
\overline{A \cup B} = \overline{A} \cap \overline{B}
$$

$$
\overline{A \cap B} = \overline{A} \cup \overline{B}
$$

### For Boolean Logic:

$$
\neg(A \lor B) = \neg A \land \neg B
$$

$$
\neg(A \land B) = \neg A \lor \neg B
$$

You can also write these inline: $\neg(A \lor B) = \neg A \land \neg B$ and $\neg(A \land B) = \neg A \lor \neg B$.

## Integration

Integration is a fundamental concept in calculus. Here are some examples:

### Definite Integral

The definite integral of a function $f(x)$ from $a$ to $b$:

$$
\int_{a}^{b} f(x) \, dx = F(b) - F(a)
$$

where $F(x)$ is the antiderivative of $f(x)$.

### Common Integration Formulas

$$
\int x^n \, dx = \frac{x^{n+1}}{n+1} + C \quad \text{for } n \neq -1
$$

$$
\int e^x \, dx = e^x + C
$$

$$
\int \frac{1}{x} \, dx = \ln|x| + C
$$

$$
\int \sin(x) \, dx = -\cos(x) + C
$$

$$
\int \cos(x) \, dx = \sin(x) + C
$$

### Integration by Parts

$$
\int u \, dv = uv - \int v \, du
$$

### Example: Gaussian Integral

$$
\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}
$$

## Summation

Summation notation is used to represent the sum of a sequence of terms:

### Basic Summation

$$
\sum_{i=1}^{n} i = 1 + 2 + 3 + \cdots + n = \frac{n(n+1)}{2}
$$

### Sum of Squares

$$
\sum_{i=1}^{n} i^2 = 1^2 + 2^2 + 3^2 + \cdots + n^2 = \frac{n(n+1)(2n+1)}{6}
$$

### Sum of Cubes

$$
\sum_{i=1}^{n} i^3 = \left( \sum_{i=1}^{n} i \right)^2 = \left( \frac{n(n+1)}{2} \right)^2
$$

### Geometric Series

$$
\sum_{k=0}^{n} ar^k = a \frac{1-r^{n+1}}{1-r} \quad \text{for } r \neq 1
$$

### Infinite Geometric Series

$$
\sum_{k=0}^{\infty} ar^k = \frac{a}{1-r} \quad \text{for } |r| < 1
$$

### Double Summation

$$
\sum_{i=1}^{m} \sum_{j=1}^{n} a_{ij} = \sum_{j=1}^{n} \sum_{i=1}^{m} a_{ij}
$$

## Differentiation

Differentiation is the process of finding the derivative of a function:

### Definition of Derivative

$$
f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}
$$

### Common Differentiation Rules

#### Power Rule

$$
\frac{d}{dx}(x^n) = nx^{n-1}
$$

#### Product Rule

$$
\frac{d}{dx}[f(x) \cdot g(x)] = f'(x) \cdot g(x) + f(x) \cdot g'(x)
$$

#### Quotient Rule

$$
\frac{d}{dx}\left[\frac{f(x)}{g(x)}\right] = \frac{f'(x) \cdot g(x) - f(x) \cdot g'(x)}{[g(x)]^2}
$$

#### Chain Rule

$$
\frac{d}{dx}[f(g(x))] = f'(g(x)) \cdot g'(x)
$$

### Trigonometric Derivatives

$$
\frac{d}{dx}[\sin(x)] = \cos(x)
$$

$$
\frac{d}{dx}[\cos(x)] = -\sin(x)
$$

$$
\frac{d}{dx}[\tan(x)] = \sec^2(x)
$$

### Exponential and Logarithmic Derivatives

$$
\frac{d}{dx}[e^x] = e^x
$$

$$
\frac{d}{dx}[a^x] = a^x \ln(a)
$$

$$
\frac{d}{dx}[\ln(x)] = \frac{1}{x}
$$

$$
\frac{d}{dx}[\log_a(x)] = \frac{1}{x \ln(a)}
$$

### Higher Order Derivatives

The second derivative:

$$
f''(x) = \frac{d^2}{dx^2}f(x) = \frac{d}{dx}\left(\frac{d}{dx}f(x)\right)
$$

The $n$-th derivative:

$$
f^{(n)}(x) = \frac{d^n}{dx^n}f(x)
$$

### Example: Derivative of a Complex Function

$$
\frac{d}{dx}\left[\sin(x^2 + 3x)\right] = \cos(x^2 + 3x) \cdot (2x + 3)
$$

## Combined Examples

### Fundamental Theorem of Calculus

$$
\frac{d}{dx}\left[\int_{a}^{x} f(t) \, dt\right] = f(x)
$$

### Integration and Differentiation Relationship

$$
\int \frac{d}{dx}[f(x)] \, dx = f(x) + C
$$

### Series Expansion (Taylor Series)

$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n
$$

### Euler's Formula

$$
e^{ix} = \cos(x) + i\sin(x)
$$

## Conclusion

These examples demonstrate the rendering of various mathematical formulas using KaTeX. The syntax is compatible with LaTeX, making it easy to write mathematical expressions similar to Overleaf.
