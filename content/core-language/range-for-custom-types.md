---
title: Enabling range-based for on your own types
description: The exact protocol the compiler looks for, writing a minimal iterator, adapting third-party types, and sentinel-terminated ranges.
section: Core language features
section_href: /#core-language-features
next:
  title: Avoiding implicit conversion with explicit
  href: /core-language/explicit/
---

<span class="std">C++11</span> <span class="std">C++17: sentinel types</span>

Range-based `for` is not magic reserved for standard containers — it is a small, documented protocol, and any type that implements it becomes iterable. This page implements the protocol three ways: on a type you own, on a type you can't modify, and with a sentinel where the end of the range is a condition rather than a position.

## The protocol

From the [loop's expansion](/core-language/range-based-for/), the compiler needs three things:

1. **`begin` and `end`** — member functions `r.begin()`/`r.end()` if they exist, otherwise free functions `begin(r)`/`end(r)` found by argument-dependent lookup (ADL).
2. The returned iterator must support **`operator*`** (produce the element), **`operator++`** (advance, prefix form), and **`operator!=`** against whatever `end` returned.
3. Nothing else. No tags, no base classes, no standard headers.

## A minimal range you own

A lazy integer range — it stores two `int`s and manufactures values on the fly:

```cpp run
#include <print>

// The half-open range [first, last), generated lazily.
class NumberRange {
public:
    class iterator {
    public:
        explicit iterator(int value) : value_{value} {}
        int operator*() const { return value_; }
        iterator& operator++() { ++value_; return *this; }
        bool operator!=(const iterator& other) const { return value_ != other.value_; }
    private:
        int value_;
    };

    NumberRange(int first, int last) : first_{first}, last_{last} {}

    iterator begin() const { return iterator{first_}; }
    iterator end() const   { return iterator{last_}; }

private:
    int first_;
    int last_;
};

int main() {
    for (int v : NumberRange{1, 6}) {
        std::print("{} ", v);          // 1 2 3 4 5
    }
    std::println("");
}
```

That's the entire cost of entry: ~20 lines. Both accessors are `const`, so `const NumberRange&` parameters iterate too. For a container that owns elements, the same shape applies with `operator*` returning `T&` — and you typically provide a `const` overload of `begin`/`end` returning a const-element iterator so read-only access stays read-only.

For real libraries, one more step is worth it: give the iterator the standard member aliases (`value_type`, `difference_type`, `reference`, plus post-increment and `==`). That upgrades it from "works with range-for" to satisfying `std::ranges::range`, which unlocks the entire ranges library: `NumberRange{1, 6} | std::views::filter(...)`.

## A type you can't modify

Third-party and C-style types can't grow member functions, so use the free-function half of the protocol. The functions must live in the **same namespace as the type** — that is what ADL means:

```cpp run
#include <cstddef>
#include <print>

namespace vendor {
    // Imagine this comes from a header you do not control.
    struct Buffer {
        int*        data;
        std::size_t size;
    };

    // Adapters in the type's own namespace, so ADL finds them.
    int* begin(Buffer& b) { return b.data; }
    int* end(Buffer& b)   { return b.data + b.size; }
    const int* begin(const Buffer& b) { return b.data; }
    const int* end(const Buffer& b)   { return b.data + b.size; }
}

int main() {
    int storage[]{10, 20, 30};
    vendor::Buffer buf{storage, 3};

    for (int v : buf) std::print("{} ", v);
    std::println("");
}
```

Raw pointers are already perfectly good iterators — `*`, `++`, and `!=` all work — which is why this adapter needs no iterator class at all. Note the pitfall: putting `begin`/`end` in *your* namespace (or globally) does not work reliably; ADL searches the namespace of the argument's type.

## Sentinel ranges: when the end is a condition

<span class="std">C++17</span> relaxed the protocol: `begin` and `end` may return **different types**. That turns "end" from a position into a predicate — exactly right for ranges whose length you don't know up front, like a null-terminated string, a socket stream, or a token sequence:

```cpp run
#include <print>

// End is not a place; it is the condition "*p == '\0'".
struct CStringSentinel {};

class CStringIterator {
public:
    explicit CStringIterator(const char* p) : p_{p} {}
    char operator*() const { return *p_; }
    CStringIterator& operator++() { ++p_; return *this; }
    bool operator!=(CStringSentinel) const { return *p_ != '\0'; }
private:
    const char* p_;
};

class CString {
public:
    explicit CString(const char* s) : s_{s} {}
    CStringIterator begin() const { return CStringIterator{s_}; }
    CStringSentinel end() const   { return {}; }
private:
    const char* s_;
};

int main() {
    for (char c : CString{"wow"}) std::print("[{}]", c);
    std::println("");
}
```

Without a sentinel, iterating a C string means an up-front `strlen` — a full extra pass — just to manufacture an end position. The sentinel folds the termination test into `operator!=`, one pass total. This same design is load-bearing across `std::ranges`, where `std::default_sentinel` and unbounded ranges (`std::unreachable_sentinel`) are everyday tools.

## Guidelines

- Prefer member `begin`/`end` on types you own; use ADL free functions to adapt types you don't.
- Always provide `const` iteration; loops over `const Type&` are the common case.
- A minimal iterator is three operators — start there, and add the standard aliases when you want ranges-library compatibility.
- Reach for a sentinel whenever computing the end position costs a pass over the data.
- Don't hand-write an iterator for a type that just wraps a container — forward `begin()`/`end()` to the member and be done.
