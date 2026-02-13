---
title: "Malloc Implementation"
description: "An overview of dynamic memory allocator internals: structure design, segregated free lists, fit algorithms, and coalescing strategies."
pubDate: 2026-02-11
category: low-level-system
coverImage: cover.png
---

## Introduction

This post explores the design and implementation of a dynamic memory allocator for malloc, free, and realloc. It covers block structure and metadata layout, coalescing algorithm for merging adjacent free blocks, and fit algorithms built on a segregated free list. The goal is to understand the core mechanisms that underlie production allocators.

**NOTE:** For simplicity this blog targets a single-threaded environment. Concurrency features like atomic operations, locks, and thread-local caches are not covered yet but may be added later.

**Image credits:** All images in this blog are created using [TikZ](https://www.overleaf.com/learn/latex/TikZ_package).

## Design

The allocator is divided into a **fast path** and a **slow path**. If the request size exceeds 128 KiB, allocation goes directly to the slow path and uses the `mmap` system call, bypassing the heap to reduce fragmentation. Otherwise, blocks are served from the segregated free list on the fast path.

### Chunk

The allocator uses boundary tags: a header and footer on each block, combined with an implicit list for traversal and an explicit list for free blocks. All blocks are 8-byte aligned.

**Allocated block:** Header, payload, optional padding, and footer. The payload is the region returned to the caller by malloc. Padding maintains alignment and minimum block size.

<img src="/blogimages/low-level-system/malloc-impl/allocated-block-structure.png" alt="Allocated block structure" width="350" />

_Figure: Allocated block layout with header, payload, optional padding, and footer._

**Free block:** Header, `prev` and `next` pointers, optional padding, and footer. The payload area is repurposed for free-list links, so no extra space is needed for management.

<img src="/blogimages/low-level-system/malloc-impl/free-block-structure.png" alt="Free block structure" width="350" />

_Figure: Free block layout with header, prev/next pointers in the old payload area, and footer._

**Header and footer layout:** Same structure in both. On a 32-bit system, the word stores block size in the upper bits (bits 3–31) and flags in the lower bits (bits 0–2).

The LSB is the allocated bit: 1 = allocated, 0 = free. Because block size is a multiple of 8, the low 3 bits are always zero and we can steal it use to flags.

The footer mirrors the header to support bidirectional coalescing: when freeing a block, the allocator can read the preceding block’s footer to get its size and status, enabling efficient merging of adjacent free blocks.

### Size Class

Two common size-class schemes are **power-of-two** and **Fibonacci-like**. Power-of-two classes (e.g., 16, 32, 64, 128 bytes) are simple to compute and align well with hardware, bin selection reduces to bit shifts. Fibonacci-like sequences (e.g., 8, 13, 21, 34, 55) use finer granularity for small sizes, reducing internal fragmentation when requests fall between power-of-two boundaries. The trade-off is simplicity and speed (power-of-two) versus better fit for small allocations (Fibonacci-like).

### Segregated Free List

Free chunks are grouped by size into bins. Two common approaches are **simple segregated storage** and **segregated fit**.

<img src="/blogimages/low-level-system/malloc-impl/seglist.png" alt="Segregated free lists"  />

_Figure: Segregated free lists — size classes (16, 32, 64, ...) with doubly linked lists of free blocks; each block stores size and prev/next pointers._

**Simple segregated storage**: each bin holds blocks of exactly one size class. Allocation and free are $O(1)$: take a block from the matching bin or return it. No splitting or coalescing within a bin. This is very fast but can cause high internal fragmentation when requests are rounded up to the nearest size class.

**Segregated fit**: keeps blocks of a size range in each bin. Allocation searches the bin for a fitting block (e.g., first-fit or best-fit) and may split a larger block; free may coalesce adjacent blocks. This reduces fragmentation but adds search and split/merge overhead.

This blog focused on **segregated fit** with block splitting and coalescing. The structure is an array of free lists, each for some size class. The diagram (c) shows how free blocks of varying sizes are organized into doubly linked lists by size class:

The heap memory layout maps physical free blocks into these segregated lists. Each free block is linked into the appropriate list based on its size:

<img src="/blogimages/low-level-system/malloc-impl/heap-seglist.png" alt="Heap memory with segregated free lists"  />

_Figure: Heap memory with segregated free lists — allocated blocks (shaded) and free blocks (sizes shown) organized into bins below._

**Seglist allocator flow** for a request of size $n$:

1. **Search** the appropriate free list for a block with size $m \ge n$ (first fit).
2. **If found:** split the block, allocate the requested $n$ bytes, and place the remainder on the appropriate list.
3. **If not found:** try the next larger size class; repeat until a block is found.
4. **If no block is found** in any list: request additional heap memory from the OS (e.g., `sbrk()`), allocate $n$ bytes from the new memory, and place the remainder as a single free block in the appropriate size class.

### Placement Policy

**First fit** scans the free list from the start and takes the first block that fits. It is fast often $O(1)$ when the list is ordered by address but can leave small fragments at the front of the list and worsen fragmentation over time.

**Best fit** searches the entire list for the smallest block that satisfies the request. It yields better utilization and lower fragmentation than first fit, at the cost of a full scan $O(N)$ in the worst case, which can be mitigated with segregated lists.

**Next fit** resumes searching from where the previous allocation stopped. But it tends to produce worse fragmentation than first fit because it spreads allocations across the heap instead of compacting them since the "roving pointer" rarely revisits earlier regions, leaving them fragmented.

This implementation uses **best fit** within each size-class bin to balance utilization and the overhead of searching segregated lists.

### Coalescing Algorithm

There are two main coalescing strategies: **immediate coalescing** and **Deferred coalescing**.

**Immediate coalescing** merges adjacent free blocks as soon as a block is freed before returning from `free`. This keeps fragmentation low and simplifies allocation logic, but every free operation may trigger coalescing work.

**Deferred coalescing** postpones merging until allocation time or until some threshold is reached. Free blocks stay separate until the allocator needs to satisfy a request or batch-coalesce. This can reduce the cost of frequent frees but may increase fragmentation and add complexity to the allocator.

## Implementation

### Structure

### Coalescing

### Functions

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/3e/home.html

Doug Lea. A Memory Allocator.
https://gee.cs.oswego.edu/dl/html/malloc.html

Wilson et al. (1995). Dynamic Storage Allocation: A Survey and Critical Review. _IWMM '95_.
https://jyywiki.cn/OS/manuals/malloc-survey.pdf

Railing & Bryant (2018). Implementing Malloc: Students and Systems Programming. _SIGCSE '18_.
https://www.cs.cmu.edu/~bryant/pubdir/sigcse18.pdf
