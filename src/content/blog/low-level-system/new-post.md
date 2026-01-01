---
title: "New Post"
description: "Description of your post"
pubDate: 2025-01-01
updatedDate: 2025-01-01
category: low-level-system
---

## Sample Code Examples

This post demonstrates various code examples to test the Fira Code font rendering.

### Inline Code

You can use inline code like `const x = 42` or `function processData()` within paragraphs.

### Code Block Example

Here's a sample C function that demonstrates memory management:

```c
#include <stdio.h>
#include <stdlib.h>

int* allocate_array(int size) {
    int* arr = (int*)malloc(size * sizeof(int));
    if (arr == NULL) {
        fprintf(stderr, "Memory allocation failed\n");
        return NULL;
    }
    return arr;
}

void process_data(int* data, int length) {
    for (int i = 0; i < length; i++) {
        data[i] = data[i] * 2 + 1;
    }
}
```

### Rust Example

Here's a Rust example showing ownership and borrowing:

```rust
fn main() {
    let mut vec = Vec::new();
    vec.push(1);
    vec.push(2);
    vec.push(3);

    let sum: i32 = vec.iter().sum();
    println!("Sum: {}", sum);

    // Borrowing example
    let first = &vec[0];
    println!("First element: {}", first);
}
```

### JavaScript/TypeScript Example

Here's a TypeScript example with async/await:

```typescript
async function fetchUserData(userId: string): Promise<User> {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const user: User = await response.json();
        return user;
    } catch (error) {
        console.error("Failed to fetch user:", error);
        throw error;
    }
}
```

### Python Example

Here's a Python example with type hints:

```python
from typing import List, Optional

def binary_search(arr: List[int], target: int) -> Optional[int]:
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] != target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return None
```

### Assembly Example

Here's a simple x86-64 assembly example:

```asm
section .text
    global _start

_start:
    mov rax, 1        ; sys_write
    mov rdi, 1        ; stdout
    mov rsi, msg      ; message address
    mov rdx, 13       ; message length
    syscall

    mov rax, 60       ; sys_exit
    mov rdi, 0        ; exit code
    syscall

section .data
    msg db 'Hello, World!', 10
```

All code blocks should now display using the **Fira Code** font, which provides better readability for programming code with its ligatures and optimized character spacing.
