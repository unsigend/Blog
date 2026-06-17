---
title: "Git Internal: Object Model"
description: "Deep dive into Git's internal object model covering blobs, trees, commits, and tags."
pubDate: 2026-06-16
category: low-level-system
coverImage: cover.png
---

## Introduction

This post examines how Git represents repository data at the storage layer. Start with the four object types that form the core of Git's object database and how each object is stored, addressed, and retrieved.

The complete implementation: [qgit](https://github.com/unsigend/qgit).

The collection library: [collection](https://collection-c.vercel.app).

## Git Object Types

Git persists all repository data in an object database built from four object types: **blob**, **tree**, **commit**, and **tag**.

At the storage layer, each object is written as a header followed by its raw payload. The header declares the object type and the payload size in bytes. The combined header and payload are compressed with zlib and written to the object store. Git identifies each object by a **SHA-1** hash computed over that uncompressed content. The resulting object ID is a 40-character hexadecimal string that serves as the object's unique, content-addressed name.

<img src="/blogimages/low-level-system/git-object-model/obj-layout.png" alt="Git object layout" width="650" />

_Figure: Git object layout showing the header and raw payload before compression._

All four object types share the same header structure: a type name, a space, the payload size in bytes, and a null terminator. What differs is the payload. Each type encodes its own data format after that common header.

## References

Chacon, S. Git Internals. Pluralsight.
https://github.com/pluralsight/git-internals-pdf

Chacon, S., & Straub, B. (2014). _Pro Git, 2nd Edition_. Apress.
https://git-scm.com/book/en/v2

