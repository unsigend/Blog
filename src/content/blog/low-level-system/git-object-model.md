---
title: "Git Internal: Object Model"
description: "Deep dive into Git's internal object model covering blobs, trees, commits, and tags."
pubDate: 2026-06-16
category: low-level-system
coverImage: cover.png
---

## Introduction

The complete implementation: [qgit](https://github.com/unsigend/qgit).

Git stores repository data in a content addressed object database. Four object types hold file bytes, directory snapshots, history records, and annotated labels. References map human readable names to object IDs. Resolution and peeling turn those names into the concrete objects a tool needs.

**Image credits:** All images in this blog are created using [TikZ](https://www.overleaf.com/learn/latex/TikZ_package).

## Object Model

Git persists all repository data in an object database built from four object types: **blob**, **tree**, **commit**, and **tag**. Together they form a directed graph. Commits point at trees. Trees point at blobs and other trees. Tags optionally wrap any object with a label.

### Object Storage

At the storage layer, each object is written as a header followed by its raw payload. The header declares the object type and the payload size in bytes. The combined header and payload are compressed with zlib and written to the object store under `objects/xx/remaining38`. Git identifies each object by a **SHA 1** hash computed over that uncompressed content. The resulting object ID is a 40 character hexadecimal string.

<img src="/blogimages/low-level-system/git-object-model/object-layout.png" alt="Git object layout" width="650" />

_Figure: Git object layout showing the header and raw payload before compression._

All four object types share the same header structure: a type name, a space, the payload size in bytes, and a null terminator. What differs is the payload. Each type encodes its own data format after that common header.


### Blob

A blob stores raw file content. It is the leaf of the object graph. The payload is the file bytes themselves with no inner fields or metadata. Two blobs with identical content share the same object ID.

<img src="/blogimages/low-level-system/git-object-model/blob.png" alt="Git blob object" width="650" />

_Figure: Blob object holding raw file content._

### Tree

A tree represents one directory level. It maps names to object IDs for files and subdirectories. Each entry records a Unix mode, a path name, and a 20 byte SHA 1 pointing at a blob or another tree. Mode `100644` marks a regular file. Mode `040000` marks a subdirectory tree. The payload is a packed binary sequence of entries, not text lines.

<img src="/blogimages/low-level-system/git-object-model/tree.png" alt="Git tree object" width="650" />

_Figure: Tree object mapping paths to blob and subtree object IDs._

Nested directories are separate tree objects. A parent tree holds only the child tree ID. Walking the graph from a commit root tree recreates the full directory layout for that snapshot.

### Commit

A commit captures one snapshot of the project plus its history metadata. The payload is text. A header block lists structured lines. A blank line separates the header from the commit message body.

The header contains a `tree` line pointing at the root tree for that snapshot. Zero or more `parent` lines link to prior commits and form the history graph. `author` and `committer` lines record identity and timestamp. The message body follows the blank line.

<img src="/blogimages/low-level-system/git-object-model/commit.png" alt="Git commit object" width="650" />

_Figure: Commit object linking to a root tree and parent commits._

A merge commit lists multiple parents. A root commit has no parent line. The commit object itself does not store file bytes. It only references the tree that holds the snapshot.

### Tag

Git supports two ways to mark a named point in history. A **lightweight tag** is only a reference whose value is a commit object ID. An **annotated tag** is a tag object stored in the database. The reference file then points at the tag object, and the tag object points at any git object.

The annotated tag payload is text. It names the wrapped object ID and type, the tag label, an optional tagger signature, and an optional message.

<img src="/blogimages/low-level-system/git-object-model/tag.png" alt="Git tag object" width="650" />

_Figure: Annotated tag object wrapping a commit. A lightweight tag references the commit directly through a ref file._

## Object Reference

References give stable names to object IDs. They do not store object content. A reference is a small file under the repository metadata directory whose content is a 40 character hex object name.

Branch refs live at `refs/heads/name` and track branch. Tag refs live at `refs/tags/name` and track tag targets. `HEAD` names the current branch or holds a direct object name when detached.

### Name Resolution

Most Git tools accept a bare name and resolve it to an object ID before loading from the object store. Given a bare name, resolution tries each of the following in order:

1. A full 40 character hex SHA 1.
2. `HEAD`.
3. A full reference path such as `refs/heads/main` or `refs/tags/v1.0`.
4. A branch or tag name under `refs/heads` or `refs/tags`. If both a branch and a tag share the same short name and point at different objects, resolution fails as ambiguous.
5. An abbreviated SHA 1 of at least seven hex digits. The object store is scanned for a unique match. Multiple matches are rejected.

Once an object ID is known, the object is read from the store, decompressed, and split into header and payload.

### Revision Peeling

A revision name may include a suffix that requests a peeled result. Git first resolves the base name to an object, then applies the suffix.

`name^{commit}` resolves the base and peels until a commit object is reached. `name^{tree}` peels to a tree. `name^{blob}` peels to a blob. `name^{tag}` peels to a tag object.

`name^{}` dereferences annotated tags recursively. Each tag object is replaced by the object it wraps until a non tag object remains.

Peeling follows object kind. A tag object yields the object named in its payload. A commit yields its root tree when a tree is requested. Blob and tree objects cannot peel further toward other kinds.

## References

Chacon, S. Git Internals. Pluralsight.
https://github.com/pluralsight/git-internals-pdf

Chacon, S., & Straub, B. (2014). _Pro Git, 2nd Edition_. Apress.
https://git-scm.com/book/en/v2
