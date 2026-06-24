---
title: "Git Internal: Object Model"
description: "Deep dive into Git's internal object model covering blobs, trees, commits, and tags."
pubDate: 2026-06-16
category: low-level-system
coverImage: cover.png
---

## Introduction

The current implementation: [qgit](https://github.com/unsigend/qgit).

qgit version in this blog: [qgit-v0.0.1-obj](https://github.com/unsigend/qgit/tree/v0.0.1-obj)

Git stores repository data in a content addressed object database. Four object types hold file bytes, directory snapshots, history records, and annotated labels. References map human readable names to object IDs. Resolution and peeling turn those names into the concrete objects a tool needs.

**Image credits:** All images in this blog are created using [TikZ](https://www.overleaf.com/learn/latex/TikZ_package).

## Object Model

Git persists all repository data in an object database built from four object types: **blob**, **tree**, **commit**, and **tag**. Together they form a directed graph. Commits point at trees. Trees point at blobs and other trees. Tags optionally wrap any object with a label.

### Object Storage

At the storage layer, each object is written as a header followed by its raw payload. The header declares the object type and the payload size in bytes. The combined header and payload are compressed with zlib and written to the object store under `objects/xx/remaining38`. Git identifies each object by a **SHA 1** hash computed over that uncompressed content. The resulting object ID is a 40 character hexadecimal string.

<img src="/blogimages/low-level-system/git-object-model/object-layout.png" alt="Git object layout" width="650" />

_Figure: Git object layout showing the header and raw payload before compression._

All four object types share the same header structure: a type name, a space, the payload size in bytes, and a null terminator. What differs is the payload. Each type encodes its own data format after that common header.

In qgit, every object shares one in memory container. A typed union holds the parsed view once the payload is decoded.

```c
enum obj_type {
  OBJ_COMMIT,
  OBJ_BLOB,
  OBJ_TREE,
  OBJ_TAG,
  OBJ_NONE = -1,
};

struct obj {
  size_t payloadsz;
  void *payload;
  enum obj_type type;
  unsigned char sha1[SHA1_DIGLEN];
  unsigned parsed : 1;
  union {
    struct commit commit;
    struct blob blob;
    struct tree tree;
    struct tag tag;
  };
};
```

The qgit object use an asymmetric read/write object model. On read, the raw payload is decoded into the typed union and marked as parsed. The structured fields then belong to the in memory object. On write, only the raw payload is valid. The union is not populated until the object is read back from the store.

Each object type shares the same outer container while keeping its own payload layout. One storage shape covers all four types without forcing them into a single field structure.

qgit [object.h](https://github.com/unsigend/qgit/blob/v0.0.1-obj/include/obj/object.h) interface

```c
extern struct obj *obj_open(struct repo *repo, unsigned char *sha1);
extern struct obj *obj_find(struct repo *repo, const char *name,
                            enum obj_type want);
extern struct obj *obj_peel(struct repo *repo, struct obj *obj,
                            enum obj_type want);

extern int obj_parse(struct obj *obj);
extern int obj_fprintf(struct obj *obj, FILE *fp);

extern struct obj *obj_create(unsigned char *buf, size_t buflen,
                              enum obj_type type);
extern int obj_write(struct obj *obj, struct repo *repo);

extern void obj_close(struct obj *obj);

```

### Blob

A blob stores raw file content. It is the leaf of the object graph. The payload is the file bytes themselves with no inner fields or metadata. Two blobs with identical content share the same object ID.

<img src="/blogimages/low-level-system/git-object-model/blob.png" alt="Git blob object" width="650" />

_Figure: Blob object holding raw file content._

The blob type adds no fields beyond the raw payload. qgit models it with an empty struct inside the object union.

```c
struct blob { };
```

### Tree

A tree represents one directory level. It maps names to object IDs for files and subdirectories. Each entry records a Unix mode, a path name, and a 20 byte SHA 1 pointing at a blob or another tree. Mode `100644` marks a regular file. Mode `040000` marks a subdirectory tree. The payload is a packed binary sequence of entries, not text lines.

<img src="/blogimages/low-level-system/git-object-model/tree.png" alt="Git tree object" width="650" />

_Figure: Tree object mapping paths to blob and subtree object IDs._

Nested directories are separate tree objects. A parent tree holds only the child tree ID. Walking the graph from a commit root tree recreates the full directory layout for that snapshot.

The payload is a sequence of binary records. After parse, entries are held in a vector of mode, path, and child object ID.

#### Binary Layout

```
<mode> <path>\0<sha1-20>
...
<mode> <path>\0<sha1-20>
```

```c
struct tree_entry {
  mode_t mode;
  const char *path;
  unsigned char sha1[SHA1_DIGLEN];
};

struct tree {
  struct vector entries;
};
```

### Commit

A commit captures one snapshot of the project plus its history metadata. The payload is text. A header block lists structured lines. A blank line separates the header from the commit message body.

The header contains a `tree` line pointing at the root tree for that snapshot. Zero or more `parent` lines link to prior commits and form the history graph. `author` and `committer` lines record identity and timestamp. The message body follows the blank line.

<img src="/blogimages/low-level-system/git-object-model/commit.png" alt="Git commit object" width="650" />

_Figure: Commit object linking to a root tree and parent commits._

A merge commit lists multiple parents. A root commit has no parent line. The commit object itself does not store file bytes. It only references the tree that holds the snapshot.

#### Identity Signature

Commit and tag payloads encode identity through a signature line. Each signature records a display name, an email address, a Unix epoch timestamp, and a timezone offset written as `+HHMM` or `-HHMM`. Commits carry both an **author** and a **committer** signature. The author created the change. The committer recorded it in the repository (most workflow skip this). Annotated tags may include an optional **tagger** signature with the same field layout.

```c
#define SIGN_ZONE_LEN 5

struct sign {
  const char *name;
  const char *email;
  time_t time;
  char zone[SIGN_ZONE_LEN + 1]; /* +HHMM or -HHMM */
};
```

#### Binary Layout

```
tree <sha1-40>\n
parent <sha1-40>\n
author <name> <email> <timestamp> <timezone>\n
committer <name> <email> <timestamp> <timezone>\n
\n
<message>
```

The `parent` line is optional and may repeat for merge commits.

```c
struct commit {
  unsigned char tree[SHA1_DIGLEN];
  struct slist parents;
  struct sign author;
  struct sign committer;
  const char *msg;
};
```

### Tag

Git supports two ways to mark a named point in history. A **lightweight tag** is only a reference whose value is a commit object ID. An **annotated tag** is a tag object stored in the database. The reference file then points at the tag object, and the tag object points at any git object.

The annotated tag payload is text. It names the wrapped object ID and type, the tag label, an optional tagger signature, and an optional message.

<img src="/blogimages/low-level-system/git-object-model/tag.png" alt="Git tag object" width="650" />

_Figure: Annotated tag object wrapping a commit. A lightweight tag references the commit directly through a ref file._

#### Binary Layout

```
object <sha1-40>\n
type <commit|tree|blob|tag>\n
tag <name>\n
tagger <name> <email> <timestamp> <timezone>\n
\n
<message>
```

The `tagger` line and message are optional.

```c
struct tag {
  unsigned char object[SHA1_DIGLEN];
  const char *type;
  const char *name;
  struct sign tagger;
  const char *msg;
};
```

## Object Reference

References give stable names to object IDs. They do not store object content. A reference is a small file under the repository metadata directory whose content is a 40 character hex object name.

Branch refs live at `refs/heads/name` and track branch. Tag refs live at `refs/tags/name` and track tag targets. `HEAD` names the current branch or holds a direct object name when detached.

```c
struct ref {
  char *name; /* full path like: "refs/heads/main"  */
  unsigned char sha1[SHA1_DIGLEN];
};
```

### Name Resolution

Most Git tools accept a bare name and resolve it to an object ID before loading from the object store. Given a bare name, resolution tries each of the following in order:

1. A full 40 character hex SHA 1.
2. `HEAD`.
3. A full reference path such as `refs/heads/main` or `refs/tags/v1.0`.
4. A branch or tag name under `refs/heads` or `refs/tags`. If both a branch and a tag share the same short name and point at different objects, resolution fails as ambiguous.
5. An abbreviated SHA 1 of at least seven hex digits. The object store is scanned for a unique match. Multiple matches are rejected.

Once an object ID is known, the object is read from the store, decompressed, and split into header and payload.

Reference Resolve Implementation
```c
int ref_resolve(struct repo *repo, const char *refname, unsigned char *sha1)
{
  if (!repo || !refname || !sha1)
    return -1;

  char buf[PATH_MAX];
  int found = 0;
  unsigned char tmp[SHA1_DIGLEN];

  /* HEAD */
  if (strcmp(refname, "HEAD") == 0)
    return ref_resolve_head(repo, sha1);

  /* full SHA1 */
  if (strlen(refname) == SHA1_HEXLEN - 1)
    return hex_to_sha1((unsigned char *)refname, sha1);

  /* full path */
  if (strncmp(refname, "refs/", 5) == 0)
    return ref_resolve_path(repo, refname, sha1);

  /* branches */
  if (snprintf(buf, PATH_MAX, "refs/heads/%s", refname) >= PATH_MAX) {
    errno = ENAMETOOLONG;
    return -1;
  }
  if (ref_resolve_path(repo, buf, sha1) != -1)
    found = 1;

  /* tags */
  if (snprintf(buf, PATH_MAX, "refs/tags/%s", refname) >= PATH_MAX) {
    errno = ENAMETOOLONG;
    return -1;
  }

  if (ref_resolve_path(repo, buf, tmp) != -1) {
    if (found && memcmp(tmp, sha1, SHA1_DIGLEN) != 0) { /* ambiguous */
      setqerrno(QE_AMBIGUOUS);
      return -1;
    }
    found = 1;
    sha1_copy(tmp, sha1);
  }

  if (found) return 0;

  /* short sha1 */
  return ref_resolve_short_sha1(repo, refname, sha1);
}
```

### Revision Peeling

A revision name may include a suffix that requests a peeled result. Git first resolves the base name to an object, then applies the suffix.

`name^{commit}` resolves the base and peels until a commit object is reached. `name^{tree}` peels to a tree. `name^{blob}` peels to a blob. `name^{tag}` peels to a tag object.

`name^{}` dereferences annotated tags recursively. Each tag object is replaced by the object it wraps until a non tag object remains.

Peeling follows object kind. A tag object yields the object named in its payload. A commit yields its root tree when a tree is requested. Blob and tree objects cannot peel further toward other kinds.

Object Peel Logic:

```c
struct obj *obj_peel(struct repo *repo, struct obj *obj, enum obj_type want)
{
  if (!repo || !obj)
    return NULL;

  enum obj_type cur = obj->type;

  if (cur == want) return obj;

  if (cur == OBJ_TAG) /* tag can peel to every type */
  {
    const char *type = obj_type_to_str(want);
    if (!type)
      return NULL;

    if (strcmp(obj->tag.type, type) == 0) /* already match */
      return obj_open(repo, obj->tag.object);

    struct obj *next = obj_open(repo, obj->tag.object);
    if (!next)
      return NULL;
    if (obj_parse(next) == -1) {
      obj_close(next);
      return NULL;
    }
    struct obj *peeled = obj_peel(repo, next, want);
    if (!peeled) {
      obj_close(next);
      return NULL;
    }
    obj_close(next);
    return peeled;
  } else if (cur == OBJ_COMMIT) {
    if (want == OBJ_TREE) /* commit can only peel to tree */
    {
      return obj_open(repo, obj->commit.tree);
    } 
    else {
      setqerrno(QE_PEEL);
      return NULL;
    }
  } else if (cur == OBJ_BLOB || cur == OBJ_TREE) {
    setqerrno(QE_PEEL);
    return NULL;
  } else {
    setqerrno(QE_INVALIDOBJ);
    return NULL;
  }
  return NULL;
}
```

## References

Chacon, S. Git Internals. Pluralsight.
https://github.com/pluralsight/git-internals-pdf

Chacon, S., & Straub, B. (2014). _Pro Git, 2nd Edition_. Apress.
https://git-scm.com/book/en/v2

Git. v0.99 source code.
https://github.com/git/git/tree/v0.99

libgit2. v0.17.0 source code.
https://github.com/libgit2/libgit2/tree/v0.17.0
