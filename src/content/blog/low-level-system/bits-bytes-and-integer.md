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

## Integer Operation

## Float Point Number

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/

CMU 15-213: Introduction to Computer Systems. Carnegie Mellon University.
https://www.cs.cmu.edu/~213/

De Morgan's laws. (2025, October 18). In _Wikipedia_. https://en.wikipedia.org/wiki/De_Morgan%27s_laws
