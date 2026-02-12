---
title: "Malloc Implementation"
description: "An overview of dynamic memory allocator internals: structure design, segregated free lists, fit algorithms, and coalescing strategies."
pubDate: 2026-02-11
category: low-level-system
---

## Introduction

This post explores the design and implementation of a dynamic memory allocator for malloc, free, and realloc. It covers block structure and metadata layout, coalescing strategies for merging adjacent free blocks, and fit algorithms built on a segregated free list. The goal is to understand the core mechanisms that underlie production allocators.

**NOTE:** For simplicity this blog targets a single-threaded environment. Concurrency features like atomic operations, locks, and thread-local caches are not covered yet but may be added later.

## Chunk Design

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

## Segregated Free List

Free chunks grouped by size into bins. Logarithmic size classes. Trade-offs between search speed and fragmentation.

## Fit Algorithm

First-fit vs best-fit vs next-fit. How dlmalloc implements best-first with coalescing. Wilderness preservation and mmap for large requests.

## Coalescing Strategy

Immediate vs deferred coalescing. Boundary tag structure for backward/forward merging. When to coalesce and when to cache.

## Implementation

Key implementation details. `malloc`, `free`, and `realloc` logic flow. Caching and locality heuristics.

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/3e/home.html

Doug Lea. A Memory Allocator.
https://gee.cs.oswego.edu/dl/html/malloc.html
