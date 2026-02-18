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

The complete implementation: [qlibc malloc](https://github.com/unsigend/qlibc/tree/main/src/malloc).

### Structure

The following code defines the core data structures and helpers: alignment and page size macros, the `meta_t` header/footer (29 bits for size, 3 bits for flags: alloc, is_mmap, unused), `block_t` and `free_block_t` layouts, and the heap with 64 Fibonacci-based buckets.

Helper macros (GET_HEADER, GET_FOOTER, write_meta, calc_block_sz) support block traversal and metadata updates. get_bucket_idx maps block size to a bucket; insert_block and remove_block maintain the doubly linked free lists with LIFO insertion. slice_block splits a free block, returning the requested portion and reinserting the remainder into the appropriate bucket when it meets the minimum block size.

```c
#define ALIGNMENT alignof(max_align_t) /* alignment size */
#define ALIGN(size)                                                            \
  (((size) + (ALIGNMENT - 1)) &                                                \
   ~(ALIGNMENT - 1))    /* rounds up to the nearest multiple of ALIGNMENT */
#define BUCKET_COUNT 64 /* bucket count */
#define PAGE_SIZE 4096  /* page size */
#define ALIGN_PAGE(size)                                                       \
  (((size) + (PAGE_SIZE - 1)) &                                                \
   ~(PAGE_SIZE - 1)) /* rounds up to the nearest multiple of PAGE_SIZE */
#define MMAP_THRESHOLD (4096 * 128) /* threshold size to use mmap: 128 KiB */

typedef uint32_t nmeta_t;

#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))

typedef struct meta {
  nmeta_t alloc : 1;   /* allocation status */
  nmeta_t is_mmap : 1; /* whether the block is allocated by mmap */
  nmeta_t unused : 1;  /* unused bits */
  nmeta_t sz : 29;     /* size of the whole block */
} __attribute__((aligned(ALIGNMENT))) meta_t;

typedef meta_t header_t;
typedef meta_t footer_t;

typedef struct block {
  header_t header;         /* header of the block */
  unsigned char payload[]; /* payload of the block */
} block_t;

typedef struct free_block {
  header_t header;         /* header of the free block */
  struct free_block *next; /* next free block */
  struct free_block *prev; /* previous free block */
  unsigned char payload[]; /* payload of the block */
} free_block_t;

typedef struct heap {
  free_block_t *free_buckets[BUCKET_COUNT]; /* free buckets */
  unsigned char *heap_start;                /* start of the heap */
  unsigned char *heap_end;                  /* end of the heap */
  bool init; /* whether the heap is initialized */
} heap_t;

/* Global heap instance */
extern heap_t __heap;
/* Bucket size lookup table */
extern const size_t __slots[BUCKET_COUNT];

/* Minimum threshold of the block size */
#define MINIMUM_BLOCKSZ                                                        \
  (sizeof(header_t) + sizeof(footer_t) + 2 * sizeof(uintptr_t))
/* Returns the header of the block */
#define GET_HEADER(block) (header_t *)((char *)block)
/* Returns the footer of the block */
#define GET_FOOTER(block)                                                      \
  (footer_t *)((char *)block + (block)->header.sz - sizeof(footer_t))
/* Returns whether the block is allocated by mmap */
#define IS_MMAP(block) ((block)->header.is_mmap)
/* Returns whether the block is allocated */
#define IS_ALLOC(block) ((block)->header.alloc)

/* Writes the meta data to the block */
static inline void write_meta(block_t *block, size_t sz, bool alloc,
                              bool is_mmap) {
  block->header.sz = sz;
  block->header.alloc = alloc;
  block->header.is_mmap = is_mmap;
  footer_t *footer = GET_FOOTER(block);
  *footer = block->header;
}

/* Returns the required size of the block with meta data after alignment */
static inline size_t calc_block_sz(size_t reqsz) {
  return MAX(ALIGN(reqsz + sizeof(header_t) + sizeof(footer_t)),
             ALIGN(MINIMUM_BLOCKSZ));
}

static inline size_t get_bucket_idx(size_t sz) {
  for (size_t i = 0; i < BUCKET_COUNT; ++i) {
    if (sz <= __slots[i])
      return i;
  }
  return BUCKET_COUNT - 1;
}

/* Inserts the block into the free buckets. The block is inserted based on
   LIFO strategy, so the new block is inserted at the head of the bucket. */
static inline void insert_block(free_block_t *block, size_t bucket_idx) {
  /* Based on LIFO strategy, the new block is inserted at the head of the
     bucket. */
  free_block_t *free_head = __heap.free_buckets[bucket_idx];
  block->next = free_head;
  block->prev = NULL;
  if (free_head) {
    free_head->prev = block;
  }
  __heap.free_buckets[bucket_idx] = block;
}

/* Removes the block from the free buckets. The caller must ensure that the
   block is not NULL. The bucket_idx is the index of the bucket that the block
   belongs to. */
static inline free_block_t *remove_block(free_block_t *block,
                                         size_t bucket_idx) {
  free_block_t *prev_block = block->prev;
  free_block_t *next_block = block->next;
  if (prev_block) {
    prev_block->next = next_block;
  } else {
    __heap.free_buckets[bucket_idx] = next_block;
  }
  if (next_block) {
    next_block->prev = prev_block;
  }
  block->next = NULL;
  block->prev = NULL;
  return block;
}

/* Slices the block into two parts: the first part is the requested size, the
   second part is the remaining block. It will put the second part back to the
   free buckets. */
static inline void *slice_block(free_block_t *block, size_t sz) {
  size_t blocksz = block->header.sz;
  size_t leftsz = blocksz - sz;

  /* If the left size is less than the minimum block size, return the whole
     block, since it is not worth splitting and acceptable internal
     fragmentation. */
  if (leftsz < MINIMUM_BLOCKSZ) {
    write_meta((block_t *)block, blocksz, true, false);
    return (void *)((unsigned char *)block + sizeof(header_t));
  }

  /* Otherwise, split the block into two parts: the first part is the requested
     size, the second part is the remaining block. */
  free_block_t *remaining_block = (free_block_t *)((unsigned char *)block + sz);
  write_meta((block_t *)block, sz, true, false);
  write_meta((block_t *)remaining_block, leftsz, false, false);
  insert_block(remaining_block, get_bucket_idx(leftsz));
  return (void *)((unsigned char *)block + sizeof(header_t));
}
```

### Coalescing

Immediate coalescing on free: when a block is freed, merge it with any adjacent free blocks and insert the result into the appropriate bucket. `coalescing` handles heap boundaries (first/last block) and uses the footer to locate the previous block; `coalescing_mid` handles the general case of merging with prev, next, or both.

```c
/* Coalescing the middle block with the adjacent memory-allocated free blocks.
   This function has no heap boundary check. And will assume both prev, next
   and current block are not NULL.*/
static inline void coalescing_mid(free_block_t *prev_block, free_block_t *block,
                                  free_block_t *next_block) {
  /* No coalescing is needed. */
  if (prev_block->header.alloc && next_block->header.alloc) {
    write_meta((block_t *)block, block->header.sz, false, false);
    insert_block(block, get_bucket_idx(block->header.sz));
    return;
  }

  /* Coalescing the next block with the current block. */
  if (prev_block->header.alloc && !next_block->header.alloc) {
    size_t newsz = block->header.sz + next_block->header.sz;
    remove_block(next_block, get_bucket_idx(next_block->header.sz));
    write_meta((block_t *)block, newsz, false, false);
    insert_block(block, get_bucket_idx(newsz));
    return;
  }

  /* Coalescing the previous block with the current block. */
  if (!prev_block->header.alloc && next_block->header.alloc) {
    size_t newsz = block->header.sz + prev_block->header.sz;
    remove_block(prev_block, get_bucket_idx(prev_block->header.sz));
    write_meta((block_t *)prev_block, newsz, false, false);
    insert_block(prev_block, get_bucket_idx(newsz));
    return;
  }

  /* Coalescing the previous and next blocks with the current block. */
  else {
    size_t newsz =
        prev_block->header.sz + block->header.sz + next_block->header.sz;
    remove_block(next_block, get_bucket_idx(next_block->header.sz));
    remove_block(prev_block, get_bucket_idx(prev_block->header.sz));
    write_meta((block_t *)prev_block, newsz, false, false);
    insert_block(prev_block, get_bucket_idx(newsz));
    return;
  }
}

/* Coalescing the block with the adjacent memory-allocated free blocks. */
static inline void coalescing(free_block_t *block) {
  /* The coalescing is based on the adjacent heap memory blocks. */
  bool is_first_block = ((unsigned char *)block == __heap.heap_start);
  bool is_last_block = ((unsigned char *)((unsigned char *)block +
                                          block->header.sz) == __heap.heap_end);
  block_t *next_block, *prev_block;
  footer_t *prev_block_footer;

  /* If the current block is the first block in the heap, coalescing the next
     block is needed.*/
  if (is_first_block) {
    next_block = (block_t *)((unsigned char *)block + block->header.sz);
    if (!is_last_block && !next_block->header.alloc) {
      size_t newsz = block->header.sz + next_block->header.sz;
      remove_block((free_block_t *)next_block,
                   get_bucket_idx(next_block->header.sz));
      write_meta((block_t *)block, newsz, false, false);
      insert_block(block, get_bucket_idx(newsz));
    } else {
      write_meta((block_t *)block, block->header.sz, false, false);
      insert_block(block, get_bucket_idx(block->header.sz));
    }
    return;
  }

  prev_block_footer = (footer_t *)((unsigned char *)block - sizeof(footer_t));
  prev_block = (block_t *)((unsigned char *)block - prev_block_footer->sz);

  /* If the current block is the last block in the heap, coalescing the previous
     block is needed.*/
  if (is_last_block) {
    if (!prev_block->header.alloc) {
      size_t newsz = block->header.sz + prev_block->header.sz;
      remove_block((free_block_t *)prev_block,
                   get_bucket_idx(prev_block->header.sz));
      write_meta((block_t *)prev_block, newsz, false, false);
      insert_block((free_block_t *)prev_block, get_bucket_idx(newsz));
    } else {
      write_meta((block_t *)block, block->header.sz, false, false);
      insert_block(block, get_bucket_idx(block->header.sz));
    }
    return;
  }

  next_block = (block_t *)((unsigned char *)block + block->header.sz);
  coalescing_mid((free_block_t *)prev_block, block, (free_block_t *)next_block);
}
```

### Functions

#### malloc

Large requests (≥128 KiB) use `mmap`; smaller ones use the heap. Initialize via `sbrk` on first use, then search buckets with best-fit. If no block fits, refill the heap with `sbrk` and allocate from the new block.

```c
/* Global heap instance */
heap_t __heap = {.init = false};

/* Bucket size lookup table. Base thresholds: MINIMUM_BLOCKSZ 24 on 32-bit, 48
   on 64-bit */
const size_t __slots[BUCKET_COUNT] = {
    /* Tiny: 8-byte increments */
    MINIMUM_BLOCKSZ, 32, 40, 48, 56, 64, 72, 80,
    /* Small: 16-byte increments */
    96, 112, 128, 144, 160, 192, 224, 256,
    /* Medium: Fibonacci-like */
    288, 320, 384, 448, 512, 576, 640, 768, 896, 1024, 1280, 1536,
    /* Large: 512-1024 byte steps */
    2048, 2560, 3072, 4096, 5120, 6144, 8192, 10240, 12288, 16384, 20480, 24576,
    /* Very Large: exponential */
    32768, 40960, 49152, 65536, 81920, 98304, 131072, 163840, 196608, 262144,
    327680, 393216, 524288, 655360, 786432, 1048576, 1310720, 1572864, 2097152,
    2621440, 3145728, 4194304, 5242880};

/* Initialize the malloc package. */
static int __init(void) {
  memset(__heap.free_buckets, 0, sizeof(__heap.free_buckets));
  __heap.heap_start = (unsigned char *)__brk(0);
  __heap.heap_end = __heap.heap_start;
  __heap.init = true;
  return 0;
}

/* Refills the free buckets with the new memory. The sz is the size of the
   memory request form system, put the new block into proper bucket. Return 0
   if successful, -1 if failed. */
static inline int refill(size_t sz) {
  void *p = sbrk((intptr_t)sz);
  if (p == (void *)-1)
    return -1;
  free_block_t *free_block = (free_block_t *)p;
  write_meta((block_t *)free_block, sz, false, false);
  insert_block(free_block, get_bucket_idx(sz));
  __heap.heap_end = (unsigned char *)p + sz;
  return 0;
}

void *malloc(size_t size) {
  if (size >= MMAP_THRESHOLD) {
    /* Align the size + header with page size */
    size_t mmap_sz = ALIGN_PAGE(size + sizeof(header_t));
    void *p = mmap(NULL, mmap_sz, PROT_READ | PROT_WRITE,
                   MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (p == MAP_FAILED) {
      errno = ENOMEM;
      return NULL;
    }
    write_meta((block_t *)p, mmap_sz, true, true);
    return (void *)((unsigned char *)p + sizeof(header_t));
  }
  if (!__heap.init) {
    if (__init() == -1) {
      errno = ENOMEM;
      return NULL;
    }
  }
  if (!size)
    return NULL;
  size_t block_sz = calc_block_sz(size);
  size_t bucket_idx = get_bucket_idx(block_sz);
  while (bucket_idx < BUCKET_COUNT) {
    void *p = best_fit(block_sz, bucket_idx);
    if (p)
      return p;
    ++bucket_idx;
  }

  /* No free block is found, request more memory */
  size_t refillsz = MAX(block_sz, PAGE_SIZE);
  if (refill(refillsz) == -1) {
    errno = ENOMEM;
    return NULL;
  }
  return best_fit(block_sz, get_bucket_idx(refillsz));
}


```

#### free

`mmap`-allocated blocks are returned with `munmap`. Heap blocks are coalesced with neighbors and reinserted into the free list.

```c
/* Free memory allocated by malloc */
void free(void *ptr) {
  if (!ptr)
    return;

  block_t *block = (block_t *)((unsigned char *)ptr - sizeof(header_t));
  if (IS_MMAP(block)) {
    munmap((void *)block, block->header.sz);
    return;
  }
  if (!__heap.init)
    return;

  coalescing((free_block_t *)block);
}

```

#### realloc

Handles `NULL` and zero-size cases. For `mmap` blocks, uses `mremap`. For heap blocks, tries in-place expansion by merging with the next free block, otherwise allocates a new block, copies data, and frees the old one.

```c
void *realloc(void *ptr, size_t new_size) {
  /* realloc(NULL, size) is equivalent to malloc(size) */
  if (!ptr)
    return malloc(new_size);
  /* realloc(ptr, 0) is equivalent to free(ptr) */
  if (!new_size) {
    free(ptr);
    return NULL;
  }
  block_t *block = (block_t *)((unsigned char *)ptr - sizeof(header_t));
  size_t old_payloadsz;

  /* If the block is allocated by mmap, use mremap to resize the block */
  if (IS_MMAP(block)) {
    old_payloadsz = block->header.sz - sizeof(header_t);
  } else {
    old_payloadsz = block->header.sz - sizeof(header_t) - sizeof(footer_t);
  }

  /* If the payload size is large enough, return the pointer to the old block */
  if (old_payloadsz >= new_size)
    return ptr;

  /* If the block is allocated by mmap, use mremap to resize the block */
  if (IS_MMAP(block)) {
    size_t newsz = ALIGN_PAGE(new_size + sizeof(header_t));
    void *new_ptr =
        mremap((unsigned char *)block, block->header.sz, newsz, MREMAP_MAYMOVE);
    if (new_ptr == MAP_FAILED) {
      errno = ENOMEM;
      return NULL;
    }
    write_meta((block_t *)new_ptr, newsz, true, true);
    return (void *)((unsigned char *)new_ptr + sizeof(header_t));
  }

  /* Optimize with in-place explansion */
  size_t required_sz = calc_block_sz(new_size);
  block_t *next_block = (block_t *)((unsigned char *)block + block->header.sz);
  bool is_last_block = ((unsigned char *)next_block >= __heap.heap_end);

  if (!is_last_block && !next_block->header.alloc) {
    size_t newsz = block->header.sz + next_block->header.sz;
    if (newsz >= required_sz) {
      remove_block((free_block_t *)next_block,
                   get_bucket_idx(next_block->header.sz));
      size_t leftsz = newsz - required_sz;

      /* If the left size is less than the minimum block size, return the whole
         block */
      if (leftsz < MINIMUM_BLOCKSZ) {
        write_meta((block_t *)block, newsz, true, false);
      } else {
        free_block_t *remaining_block =
            (free_block_t *)((unsigned char *)block + required_sz);
        write_meta((block_t *)block, required_sz, true, false);
        write_meta((block_t *)remaining_block, leftsz, false, false);
        insert_block(remaining_block, get_bucket_idx(leftsz));
      }

      return ptr;
    }
  }

  /* Fallback to malloc, copy and free case, CPU intensive case. */
  void *new_ptr = malloc(new_size);
  if (!new_ptr)
    return NULL;
  /* Copy the data from the old block to the new block */
  memcpy(new_ptr, ptr, MIN(old_payloadsz, new_size));
  free(ptr);
  return new_ptr;
}

```

## References

Bryant, R. E., & O'Hallaron, D. R. (2016). _Computer Systems: A Programmer's Perspective, Third Edition_. Pearson.
https://csapp.cs.cmu.edu/3e/home.html

Doug Lea. A Memory Allocator.
https://gee.cs.oswego.edu/dl/html/malloc.html

Wilson et al. (1995). Dynamic Storage Allocation: A Survey and Critical Review. _IWMM '95_.
https://jyywiki.cn/OS/manuals/malloc-survey.pdf

Railing & Bryant (2018). Implementing Malloc: Students and Systems Programming. _SIGCSE '18_.
https://www.cs.cmu.edu/~bryant/pubdir/sigcse18.pdf
