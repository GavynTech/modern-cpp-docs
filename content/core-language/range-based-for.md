---
title: Iterating with range-based for loops
description: What the loop actually expands to, choosing the right element binding, init-statements, and C++23's temporary-lifetime fix.
section: Core language features
section_href: /#core-language-features
next:
  title: Enabling range-based for on your own types
  href: /core-language/range-for-custom-types/
---

<span class="std">C++11</span> <span class="std">C++20: init-statement</span> <span class="std">C++23: lifetime fix, views::enumerate</span>

The range-based `for` loop iterates a whole range with no index bookkeeping, no iterator declarations, and no off-by-one bugs — for most iteration in modern C++ it is the only loop you write. Its behavior is fully defined by a mechanical rewrite into an ordinary loop, and knowing that rewrite is what lets you predict copies, mutations, and lifetime.

## What the compiler generates

`for (declaration : range-expr) body` expands to (approximately):

```cpp
{
    auto&& __range = range-expr;
    auto __begin = /* __range.begin() or begin(__range) */;
    auto __end   = /* __range.end()   or end(__range)   */;
    for (; __begin != __end; ++__begin) {
        declaration = *__begin;
        body
    }
}
```

Three consequences fall straight out of this expansion:

1. `begin`/`end` are found via members first, then via free functions — which is exactly the protocol for [making your own types iterable](/core-language/range-for-custom-types/).
2. Your `declaration` is initialized from `*__begin` each pass, so *its form decides whether elements are copied*.
3. The container is only "captured" once, up front — mutating the container's *structure* (insert/erase) mid-loop invalidates `__begin` just as it would in a hand-written iterator loop.

## Choosing the element binding

| Binding | Effect | Use when |
|---------|--------|----------|
| `for (auto e : r)` | Copy each element | Elements are cheap (ints, pointers, `string_view`) or you want a scratch copy |
| `for (auto& e : r)` | Mutable reference | You're modifying elements in place |
| `for (const auto& e : r)` | Read-only reference | Default for class-type elements |
| `for (auto&& e : r)` | Forwarding reference | Generic code; also required for proxy ranges like `std::vector<bool>` |

```cpp run
#include <map>
#include <print>
#include <string>
#include <vector>

int main() {
    std::vector<int> scores{90, 85, 70};

    for (int s : scores) std::print("{} ", s);   // copies: fine for int
    std::println("");

    for (auto& s : scores) s += 5;               // mutate in place

    std::map<std::string, int> ages{{"alice", 30}, {"bob", 25}};
    for (const auto& [name, age] : ages) {       // structured binding, no copies
        std::println("{} is {}", name, age);
    }

    std::println("bumped: {} {} {}", scores[0], scores[1], scores[2]);
}
```

The map case hides the classic copy trap: the element type is `std::pair<const std::string, int>`. Write `const std::pair<std::string, int>&` (missing the inner `const`) and every element is silently copied to satisfy the mismatched reference. `const auto&` cannot make that mistake, which is why it's the default binding for anything non-trivial.

## Loop-scoped state: the init-statement

<span class="std">C++20</span> Like `if` and `switch`, range-`for` accepts an init-statement — the idiomatic home for a counter or a helper that should not outlive the loop:

```cpp run
#include <print>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> lines{"alpha", "beta", "gamma"};

    for (std::size_t i = 0; const auto& line : lines) {
        std::println("{}: {}", i++, line);
    }
}
```

<span class="std">C++23</span> When the counter *is* the point, `std::views::enumerate` pairs each element with its index directly, and structured bindings unpack it:

```cpp run
#include <print>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> lines{"alpha", "beta", "gamma"};

    for (const auto& [i, line] : std::views::enumerate(lines)) {
        std::println("{}: {}", i, line);
    }
}
```

## The lifetime bug C++23 fixed

Look at the expansion again: `auto&& __range = range-expr;` lifetime-extends the temporary that `range-expr` *itself* returns — but, before C++23, not any *intermediate* temporaries inside the expression. The classic trap:

```cpp
std::vector<std::string> make_names();

// C++20 and earlier: UNDEFINED BEHAVIOR.
// make_names() returns a temporary vector; .front() returns a reference into
// it; only the reference is bound, the vector is destroyed before the loop.
for (char c : make_names().front()) { /* c reads freed memory */ }
```

<span class="std">C++23</span> changes the rule (P2718): **every** temporary created in the range-initializer now lives for the whole loop, so the code above is simply correct. Two practical notes:

- If you support pre-C++23 compilers, keep the old discipline: name the intermediate (`auto names = make_names();`) and loop over the named object.
- The fix applies to range-`for` only. The same dangling pattern in other contexts (`auto& s = make_names().front();`) is still undefined behavior in every standard.

## Not just containers

The loop works on anything satisfying the begin/end protocol: built-in arrays, `std::initializer_list`, string literals via `std::string_view`, and every ranges view:

```cpp run
#include <print>
#include <ranges>

int main() {
    int raw[]{1, 2, 3};                         // built-in array
    for (int v : raw) std::print("{} ", v);

    for (int v : {10, 20, 30}) std::print("{} ", v);   // initializer_list

    for (int v : std::views::iota(0, 4)) std::print("{} ", v);  // lazy range

    std::println("");
}
```

## Guidelines

- Default bindings: `const auto&` for class types, plain `auto` for scalars, `auto&` only when mutating, `auto&&` in templates.
- Never insert into or erase from the container inside its own range-`for` — the captured iterators go stale.
- Pre-C++23, don't chain off a temporary in the range expression; from C++23 on, that pattern is well-defined.
- Need the index? Prefer `views::enumerate` (C++23) or a C++20 init-statement counter over widening the loop back to `for (size_t i = 0; ...)`.
