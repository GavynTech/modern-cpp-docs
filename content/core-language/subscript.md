---
title: The subscript operator, from operator[] to C++23
description: Writing correct subscript access for your own collections - const and non-const pairs, multidimensional operator[], and deducing this.
section: Core language features
section_href: /#core-language-features
next:
  title: Understanding the various numeric types
  href: /numbers-strings/numeric-types/
---

<span class="std">C++23: multidimensional and static operator[], deducing this</span>

`operator[]` is the access grammar of collections: if your type conceptually maps an index (or key) to an element, subscripting is how users will expect to reach it. This page covers writing it correctly — the const pairing, the checked counterpart, and the two C++23 upgrades that changed the shape of the operator itself: multiple subscripts and explicit object parameters.

## The classic form: a const and non-const pair

Subscript must work on both mutable and `const` collections, and those are different signatures — a mutable reference out of a mutable object, a const view out of a const one:

```cpp run
#include <print>
#include <stdexcept>
#include <vector>

template <typename T>
class Ring {
public:
    explicit Ring(std::size_t n) : items_(n) {}

    // Wrapping, unchecked access: the fast path.
    T& operator[](std::size_t i)             { return items_[i % items_.size()]; }
    const T& operator[](std::size_t i) const { return items_[i % items_.size()]; }

    // Checked counterpart - same convention the standard containers use.
    T& at(std::size_t i) {
        if (i >= items_.size()) throw std::out_of_range{"Ring::at"};
        return items_[i];
    }

    std::size_t size() const { return items_.size(); }

private:
    std::vector<T> items_;
};

int main() {
    Ring<int> ring{3};
    ring[0] = 10;      // non-const overload: returns T&, assignable
    ring[4] = 20;      // wraps to index 1 - Ring's own indexing semantics

    const Ring<int>& view = ring;
    std::println("{} {} size={}", view[0], view[1], view.size());
}
```

Design notes baked into that example:

- **Return references**, not values — `ring[0] = 10` only works if the non-const overload yields `T&`. (Return a value only when a reference is impossible; see the proxy note at the bottom.)
- **Keep `operator[]` cheap and unchecked; give `at()` the bounds check.** That split — the standard containers' convention — lets callers choose per call site instead of paying for checks in inner loops.
- **Map-style `operator[]`** (lookup by key, inserting if absent, like `std::map`) is a *different contract*: it can't be `const` at all, since lookup may mutate. If insert-on-access would surprise your users, provide `find`/`at` and skip subscript for lookups.

## C++23: multidimensional subscripts

Until C++23, `operator[]` took exactly one parameter. Matrices and grids had two workarounds, both crooked: `m(i, j)` (function-call syntax for indexing) or `m[i][j]` (requires manufacturing a row-proxy type just to be indexed again). Now the operator takes any number of subscripts:

```cpp run
#include <print>
#include <vector>

class Matrix {
public:
    Matrix(std::size_t rows, std::size_t cols)
        : cols_{cols}, cells_(rows * cols, 0.0) {}

    // C++23: one operator, two subscripts, no proxy machinery.
    double& operator[](std::size_t r, std::size_t c)      { return cells_[r * cols_ + c]; }
    double operator[](std::size_t r, std::size_t c) const { return cells_[r * cols_ + c]; }

private:
    std::size_t cols_;
    std::vector<double> cells_;
};

int main() {
    Matrix m{2, 3};
    m[1, 2] = 42.5;

    const Matrix& view = m;
    std::println("m[1, 2] = {}", view[1, 2]);
}
```

`m[1, 2]` indexes the flat storage directly — better codegen than proxy chains and better semantics than `operator()` because subscripting *reads as* subscripting. This is the interface `std::mdspan` <span class="std">C++23</span> is built around; matching it keeps your types drop-in compatible with mdspan-shaped code. (Historical footnote: `m[1, 2]` in older C++ compiled as the comma operator — `m[2]` — which C++20 deprecated precisely to free this syntax.)

C++23 also allows **`static operator[]`** (and `static operator()`): a stateless lookup object has no `this` to pass, so making the operator static removes a dead parameter from every call.

## C++23: collapsing the const/non-const duplication

Every example above defines each subscript twice, identical except for `const`. *Deducing this* — explicit object parameters — writes it once, with the object's const-ness deduced like any other template parameter:

```cpp run
#include <print>
#include <utility>
#include <vector>

class Grid {
public:
    explicit Grid(std::size_t side) : cells_(side * side, 0) {}

    // One definition. Self deduces as Grid& / const Grid& / Grid&&, and the
    // return type follows: int& for mutable access, const int& for const.
    template <typename Self>
    auto&& operator[](this Self&& self, std::size_t i) {
        return std::forward<Self>(self).cells_[i];
    }

private:
    std::vector<int> cells_;
};

int main() {
    Grid g{2};
    g[3] = 7;                       // Self = Grid&  -> int&

    const Grid& cg = g;
    std::println("{}", cg[3]);      // Self = const Grid& -> const int&
}
```

`std::forward<Self>(self).cells_[i]` propagates everything: const-ness, and even value category (subscripting an rvalue `Grid` moves-from correctly if the element type cares). For any class with several accessor pairs, deducing this halves the surface area that can drift out of sync.

## When you can't return a reference

Some collections have no element object to reference — a bitset packs eight "elements" per byte. The pattern is a *proxy* object whose assignment writes back (`std::vector<bool>::reference`, `std::bitset::reference`). Know the cost before choosing it: proxies leak into user code through `auto` (documented in [the auto page](/core-language/auto/)), so reserve them for when packing genuinely pays.

## Guidelines

- Provide subscript as a const/non-const pair returning references — or once via deducing this in C++23 codebases.
- Follow the standard split: `operator[]` unchecked, `at()` checked and throwing.
- Model multidimensional data with C++23 multi-argument `operator[]`, flat storage, and mdspan-compatible index order — not proxy-row chains.
- Don't give a type `operator[]` if access has side effects users won't expect; `std::map`'s insert-on-subscript is grandfathered, yours won't be forgiven.
