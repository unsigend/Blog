---
title: "x86 ISA"
description: "An overview of the x86 Instruction Set Architecture (ISA), covering instruction formats, addressing modes, and fundamental assembly programming."
pubDate: 2026-01-01
updatedDate: 2026-01-01
category: low-level-system
coverImage: cover.png
---

## Introduction

This blog post provides a summary of x86-64 assembly language, covering instruction sets, registers, addressing modes, and calling conventions essential for understanding low-level system programming.

## Registers

x86-64 provides 16 general-purpose registers, each accessible at multiple sizes: 64-bit, 32-bit, 16-bit, and 8-bit. Registers serve specific roles in the calling convention: argument passing, return values, and preservation across function calls.

![x86-64 General-Purpose Registers](/blogimages/low-level-system/x86-isa/registers.png)

_Figure: x86-64 general-purpose registers showing different sizes and their roles in the calling convention._

**Argument registers:** The first six function arguments are passed in _%rdi_, _%rsi_, _%rdx_, _%rcx_, _%r8_, and _%r9_. The return value is stored in _%rax_.

**Callee-saved registers:** _%rbx_, _%rbp_, and _%r12_ through _%r15_ must be preserved by callee functions. If a function modifies these registers, it must save and restore their values.

**Caller-saved registers:** _%rax_, _%rcx_, _%rdx_, _%r8_, _%r9_, _%r10_, and _%r11_ may be modified by callee functions. Callers must save these values if they need to be preserved across function calls.

**Special registers:** _%rsp_ is the stack pointer, pointing to the top of the stack. _%rbp_ base pointer is typically used as a frame pointer, though it can be used as a general-purpose callee-saved register.

## Addressing Modes

x86-64 supports three types of operands: immediate values, register contents, and memory references. The most general form for memory addressing combines an immediate offset, base register, index register, and scale factor:

$$
\text{Effective Address} = \text{Imm} + R[r_b] + R[r_i] \times s
$$

where _Imm_ is an immediate constant, $R[r_b]$ is the base register value, $R[r_i]$ is the index register value, and $s$ is a scale factor (1, 2, 4, or 8). This form is commonly used for array element access.

| Type      | Form               | Operand Value                              | Name                |
| --------- | ------------------ | ------------------------------------------ | ------------------- |
| Immediate | \$$Imm$            | _Imm_                                      | Immediate           |
| Register  | $r_a$              | $R[r_a]$                                   | Register            |
| Memory    | $Imm$              | $M[\text{Imm}]$                            | Absolute            |
| Memory    | $(r_a)$            | $M[R[r_a]]$                                | Indirect            |
| Memory    | $Imm(r_b)$         | $M[\text{Imm} + R[r_b]]$                   | Base + displacement |
| Memory    | $(r_b, r_i)$       | $M[R[r_b] + R[r_i]]$                       | Indexed             |
| Memory    | $Imm(r_b, r_i)$    | $M[\text{Imm} + R[r_b] + R[r_i]]$          | Indexed             |
| Memory    | $(, r_i, s)$       | $M[R[r_i] \times s]$                       | Scaled indexed      |
| Memory    | $Imm(, r_i, s)$    | $M[\text{Imm} + R[r_i] \times s]$          | Scaled indexed      |
| Memory    | $(r_b, r_i, s)$    | $M[R[r_b] + R[r_i] \times s]$              | Scaled indexed      |
| Memory    | $Imm(r_b, r_i, s)$ | $M[\text{Imm} + R[r_b] + R[r_i] \times s]$ | Scaled indexed      |

**Summary:** Immediate operands are prefixed with _$_ in AT&T syntax. Register operands access register contents directly. Memory addressing modes compute an effective address to access memory locations.

The general form $$Imm(r_b, r_i, s)$$ allows flexible address computation by combining displacement, base, index, and scaling, making it ideal for array indexing and structure member access. Simpler addressing modes are special cases where some components are omitted.

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/

CMU 15-213: Introduction to Computer Systems. Carnegie Mellon University.
https://www.cs.cmu.edu/~213/

Harvard CS 61: Assembly. Harvard University.
https://cs61.seas.harvard.edu/site/2025/Asm/

Intel 80386 Programmer's Reference Manual. Intel Corporation.
https://pdos.csail.mit.edu/6.828/2018/readings/i386.pdf
