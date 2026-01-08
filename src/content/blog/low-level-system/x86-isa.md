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

## Instructions

### Data Movement

Data movement instructions transfer values between registers and memory. The move instructions support different operand sizes, indicated by the suffix.

| Instruction    | Effect           | Description             |
| -------------- | ---------------- | ----------------------- |
| MOV $S, D$     | $D \leftarrow S$ | Move                    |
| movb           |                  | Move byte               |
| movw           |                  | Move word               |
| movl           |                  | Move double word        |
| movq           |                  | Move quad word          |
| movabsq $I, R$ | $R \leftarrow I$ | Move absolute quad word |

When moving 32-bit data to a 64-bit register using _movl_, the high 32 bits of the destination register are automatically set to 0. This zero-extension behavior ensures that 32-bit values are properly extended to 64 bits.

#### Zero Extension

Zero-extension instructions move smaller values to larger registers by filling the upper bits with zeros. These instructions are useful when converting unsigned values to larger sizes.

| Instruction | Effect                              | Description                            |
| ----------- | ----------------------------------- | -------------------------------------- |
| MOVZ $S, R$ | $R \leftarrow \text{ZeroExtend}(S)$ | Move with zero extension               |
| movzbw      |                                     | Move zero-extended byte to word        |
| movzbl      |                                     | Move zero-extended byte to double word |
| movzwl      |                                     | Move zero-extended word to double word |
| movzbq      |                                     | Move zero-extended byte to quad word   |
| movzwq      |                                     | Move zero-extended word to quad word   |

#### Sign Extension

Sign-extension instructions move smaller signed values to larger registers by replicating the sign bit into the upper bits. This preserves the sign and magnitude of two's-complement numbers.

| Instruction | Effect                                          | Description                                 |
| ----------- | ----------------------------------------------- | ------------------------------------------- |
| MOVS $S, R$ | $R \leftarrow \text{SignExtend}(S)$             | Move with sign extension                    |
| movsbw      |                                                 | Move sign-extended byte to word             |
| movsbl      |                                                 | Move sign-extended byte to double word      |
| movswl      |                                                 | Move sign-extended word to double word      |
| movsbq      |                                                 | Move sign-extended byte to quad word        |
| movswq      |                                                 | Move sign-extended word to quad word        |
| movslq      |                                                 | Move sign-extended double word to quad word |
| cltq        | _%rax_ $\leftarrow \text{SignExtend}($_%eax_$)$ | Sign-extend _%eax_ to _%rax_                |

### Stack Management

Stack operations manipulate the stack pointer _%rsp_ to push and pop quad-word values. The stack grows downward in memory.

| Instruction | Effect                                                                           | Description    |
| ----------- | -------------------------------------------------------------------------------- | -------------- |
| pushq $S$   | $R[\text{rsp}] \leftarrow R[\text{rsp}] - 8;$<br>$M[R[\text{rsp}]] \leftarrow S$ | Push quad word |
| popq $D$    | $D \leftarrow M[R[\text{rsp}]];$<br>$R[\text{rsp}] \leftarrow R[\text{rsp}] + 8$ | Pop quad word  |

**Operation order:** _pushq_ first decrements the stack pointer by 8, then writes the value to the new stack location. _popq_ first reads the value from the current stack location, then increments the stack pointer by 8.

### Arithmetic

Arithmetic and logical instructions perform computations on operands, with most instructions using the destination as both source and destination. The _leaq_ instruction computes effective addresses without accessing memory.

| Instruction | Effect                              | Description              |
| ----------- | ----------------------------------- | ------------------------ |
| leaq $S, D$ | $D \leftarrow \&S$                  | Load effective address   |
| INC $D$     | $D \leftarrow D + 1$                | Increment                |
| DEC $D$     | $D \leftarrow D - 1$                | Decrement                |
| NEG $D$     | $D \leftarrow -D$                   | Negate                   |
| NOT $D$     | $D \leftarrow \sim D$               | Complement               |
| ADD $S, D$  | $D \leftarrow D + S$                | Add                      |
| SUB $S, D$  | $D \leftarrow D - S$                | Subtract                 |
| IMUL $S, D$ | $D \leftarrow D \times S$           | Multiply                 |
| XOR $S, D$  | $D \leftarrow D \mathbin{\hat{}} S$ | Exclusive Or             |
| OR $S, D$   | $D \leftarrow D \mid S$             | Or                       |
| AND $S, D$  | $D \leftarrow D \mathbin{\&} S$     | And                      |
| SAL $k, D$  | $D \leftarrow D \ll k$              | Left shift               |
| SHL $k, D$  | $D \leftarrow D \ll k$              | Left shift (same as SAL) |
| SAR $k, D$  | $D \leftarrow D \gg_A k$            | Arithmetic right shift   |
| SHR $k, D$  | $D \leftarrow D \gg_L k$            | Logical right shift      |

#### Special Arithmetic Operations

Multiplication and division operations that produce 128-bit results require special register usage. For 64×64-bit multiplication, one operand must be in _%rax_, and the 128-bit result is stored with the low 64 bits in _%rax_ and the high 64 bits in _%rdx_.

| Instruction | Effect                                                                                                                                       | Description            |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| imulq $S$   | $R[\text{\%rdx}]:R[\text{\%rax}] \leftarrow S \times R[\text{\%rax}]$                                                                        | Signed full multiply   |
| mulq $S$    | $R[\text{\%rdx}]:R[\text{\%rax}] \leftarrow S \times R[\text{\%rax}]$                                                                        | Unsigned full multiply |
| cqto        | $R[\text{\%rdx}]:R[\text{\%rax}] \leftarrow \text{SignExtend}(R[\text{\%rax}])$                                                              | Convert to oct word    |
| idivq $S$   | $R[\text{\%rdx}] \leftarrow R[\text{\%rdx}]:R[\text{\%rax}] \bmod S;$<br>$R[\text{\%rax}] \leftarrow R[\text{\%rdx}]:R[\text{\%rax}] \div S$ | Signed divide          |
| divq $S$    | $R[\text{\%rdx}] \leftarrow R[\text{\%rdx}]:R[\text{\%rax}] \bmod S;$<br>$R[\text{\%rax}] \leftarrow R[\text{\%rdx}]:R[\text{\%rax}] \div S$ | Unsigned divide        |

**Multiplication:** The two-operand _IMUL_ instruction (mentioned earlier) produces a 64-bit result. For full 64×64-bit multiplication requiring a 128-bit result, use _imulq_ or _mulq_ with one operand in _%rax_. The result spans _%rdx_ (high 64 bits) and _%rax_ (low 64 bits).

**Division:** Division requires a 128-bit dividend in _%rdx:%rax_. The quotient is stored in _%rax_ and the remainder in _%rdx_. For signed division, use _cqto_ to sign-extend _%rax_ into _%rdx:%rax_ before calling _idivq_.

**cqto:** The _cqto_ instruction sign-extends the 64-bit value in _%rax_ to a 128-bit value spanning _%rdx:%rax_, preparing the dividend for signed division operations.

### Branching

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/

CMU 15-213: Introduction to Computer Systems. Carnegie Mellon University.
https://www.cs.cmu.edu/~213/

Harvard CS 61: Assembly. Harvard University.
https://cs61.seas.harvard.edu/site/2025/Asm/

Intel 80386 Programmer's Reference Manual. Intel Corporation.
https://pdos.csail.mit.edu/6.828/2018/readings/i386.pdf
