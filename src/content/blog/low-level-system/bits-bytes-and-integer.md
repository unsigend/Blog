---
title: "Bits, Bytes and Integer"
description: "An overview of bits, bytes, and integer representation in computer systems, covering unsigned and signed number systems from CSAPP Chapter 2 and CMU 15-213."
pubDate: 2026-01-01
updatedDate: 2026-01-01
category: low-level-system
coverImage: cover.gif
---

## Introduction

This blog post is a summary of CSAPP Chapter 2, covering fundamental concepts of how computers represent and manipulate data.

Computers represent all information as sequences of bits (0 or 1). A byte consists of 8 bits and serves as the basic unit of storage. **Unsigned integers** use standard binary encoding for non-negative values, while **signed integers** use two's complement representation to encode both positive and negative values.

## Boolean Algebra

Boolean algebra provides the mathematical foundation for bitwise operations.

- **AND**: $p \land q = 1$ if and only if both $p = 1$ and $q = 1$
- **OR**: $p \lor q = 1$ if at least one of $p = 1$ or $q = 1$
- **NOT**: $\neg p = 1$ if $p = 0$, and $\neg p = 0$ if $p = 1$

These operations form the basis for all logical computations in digital systems.

### De Morgan's Laws

De Morgan's laws describe the relationship between negation and the logical operations AND and OR. These laws allow to transform expressions by distributing negation over conjunctions and disjunctions.

$$
\begin{align}
\neg(p \lor q) &= (\neg p) \land (\neg q) \\
\neg(p \land q) &= (\neg p) \lor (\neg q)
\end{align}
$$

Wiki: [De Morgan's laws](https://en.wikipedia.org/wiki/De_Morgan%27s_laws).

### XOR

**XOR** Exclusive OR returns 1 when exactly one of the inputs is 1. XOR can be expressed using the fundamental operations:

$$
\begin{align}
p \oplus q = (p \land \neg q) \lor (\neg p \land q)
\end{align}
$$

Using De Morgan's laws, it is possible to express XOR using only NOT and AND operations. Starting from the XOR definition:

$$
\begin{align}
p \oplus q &= (p \land \neg q) \lor (\neg p \land q) \\
\neg(p \oplus q) &= \neg\left(p \land \neg q\right) \land \neg\left(\neg p \land q\right) \\
\neg\neg(p \oplus q) &= \neg\left(\neg\left(p \land \neg q\right) \land \neg\left(\neg p \land q\right)\right) \\
p \oplus q &= \neg\left(\neg\left(p \land \neg q\right) \land \neg\left(\neg p \land q\right)\right)
\end{align}
$$

The final expression uses only NOT and AND operations.

## Integer Representation

### Unsigned Encodings

Unsigned integers represent non-negative values using standard binary encoding. For a $w$-bit binary vector, the conversion to unsigned integer is defined as follows.

For vector $\vec{x} = [x_{w-1}, x_{w-2}, \dots, x_0]$:

$$
B2U_w(\vec{x}) \doteq \sum_{i=0}^{w-1} x_i 2^i
$$

The maximum value for a $w$-bit unsigned integer is:

$$
\text{UMax}_w = 2^w - 1
$$

### Two's Complement Encodings

Two's complement encoding is the most common representation for signed integers. The most significant bit $x_{w-1}$ (the sign bit) has negative weight $-2^{w-1}$.

For vector $\vec{x} = [x_{w-1}, x_{w-2}, \dots, x_0]$:

$$
B2T_w(\vec{x}) \doteq -x_{w-1}2^{w-1} + \sum_{i=0}^{w-2} x_i 2^i
$$

The sign bit $x_{w-1}$ determines the sign: if $x_{w-1} = 1$, the value is negative; if $x_{w-1} = 0$, the value is non-negative.

The range of values for a $w$-bit two's-complement integer is:

$$
\begin{align}
\text{TMin}_w &= -2^{w-1} \\
\text{TMax}_w &= 2^{w-1} - 1
\end{align}
$$

Two's-complement representation exhibits an asymmetric property: the absolute value of $\text{TMax}_w$ plus one equals the absolute value of $\text{TMin}_w$:

$$
|\text{TMax}_w| + 1 = |\text{TMin}_w| = 2^{w-1}
$$

This asymmetry arises because $\text{TMax}_w + 1 = 2^{w-1}$ while $\text{TMin}_w = -2^{w-1}$, meaning there is one more negative number than positive numbers in the representable range.

### Conversions between Signed and Unsigned

The same bit pattern can be interpreted as either signed or unsigned, with different numeric values. Conversion functions map between these interpretations.

**Two's-complement to Unsigned (T2U):**

For $x$ such that $\text{TMin}_w \leq x \leq \text{TMax}_w$:

$$
T2U_w(x) = \begin{cases}
x + 2^w, & \text{if } x < 0 \\
x, & \text{if } x \geq 0
\end{cases}
$$

Notable mappings: $T2U_w(-1) = \text{UMax}_w$ and $T2U_w(\text{TMin}_w) = 2^{w-1}$.

**Unsigned to Two's-complement (U2T):**

For $u$ such that $0 \leq u \leq \text{UMax}_w$:

$$
U2T_w(u) = \begin{cases}
u, & \text{if } u \leq \text{TMax}_w \\
u - 2^w, & \text{if } u > \text{TMax}_w
\end{cases}
$$

Notable mapping: $U2T_w(\text{UMax}_w) = -1$.

## Integer Operation

### Addition

#### Unsigned

Unsigned addition follows modular arithmetic, wrapping around when the sum exceeds the maximum representable value. For $x$ and $y$ such that $0 \leq x, y < 2^w$:

$$
x +_w^u y = \begin{cases}
x + y, & \text{if } x + y < 2^w \\
x + y - 2^w, & \text{if } 2^w \leq x + y < 2^{w+1}
\end{cases}
\quad \begin{array}{l}
\text{Normal} \\
\text{Overflow}
\end{array}
$$

**Overflow behavior:** When overflow occurs ($x + y \geq 2^w$), the result wraps around by subtracting $2^w$, effectively mapping values towards zero. This is equivalent to modular arithmetic: $x +_w^u y = (x + y) \bmod 2^w$.

#### Two's-complement

Two's-complement addition handles both positive and negative overflow cases. For integer values $x$ and $y$ in the range $-2^{w-1} \leq x, y \leq 2^{w-1} - 1$:

$$
x +_w^t y = \begin{cases}
x + y - 2^w, & \text{if } 2^{w-1} \leq x + y \\
x + y, & \text{if } -2^{w-1} \leq x + y < 2^{w-1} \\
x + y + 2^w, & \text{if } x + y < -2^{w-1}
\end{cases}
\quad \begin{array}{l}
\text{Positive overflow} \\
\text{Normal} \\
\text{Negative overflow}
\end{array}
$$

**Overflow behavior:**

- **Positive overflow:** When $x + y \geq 2^{w-1}$, the result wraps around by subtracting $2^w$, mapping to negative values. Specifically, when $x + y = 2^{w-1}$ (which is $\text{TMax}_w + 1$), the result becomes $-2^{w-1} = \text{TMin}_w$.
- **Negative overflow:** When $x + y < -2^{w-1}$, the result wraps around by adding $2^w$, mapping to positive values. Specifically, when $x + y = -2^{w-1} - 1$ (which is $\text{TMin}_w - 1$), the result becomes $2^{w-1} - 1 = \text{TMax}_w$.

### Multiplication

Multiplication follows modular arithmetic, truncating the $2w$ bit product to $w$ bits. For unsigned multiplication, the result is simply the product modulo $2^w$:

$$
x *_w^u y = (x \cdot y) \bmod 2^w
$$

For two's complement multiplication, the process involves computing the unsigned product modulo $2^w$ and then converting it to two's-complement representation. For $x$ and $y$ such that $\text{TMin}_w \leq x, y \leq \text{TMax}_w$:

$$
x *_w^t y = U2T_w((x \cdot y) \bmod 2^w)
$$

**Bit-level equivalence:** The bit-level representation of the $w$-bit two's-complement product is identical to the bit-level representation of the $w$-bit unsigned product. This means that at the hardware level, the same multiplication operation works for both signed and unsigned integers only the interpretation of the result differs.

## Float Point Number

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/

CMU 15-213: Introduction to Computer Systems. Carnegie Mellon University.
https://www.cs.cmu.edu/~213/

De Morgan's laws. (2025, October 18). In _Wikipedia_. https://en.wikipedia.org/wiki/De_Morgan%27s_laws
