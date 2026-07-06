---
title: Class template argument deduction
description: Letting the compiler deduce class template arguments from constructor calls, writing your own deduction guides, and knowing when to opt out.
section: Core language features
section_href: /#core-language-features
next:
  title: The subscript operator, from operator[] to C++23
  href: /core-language/subscript/
---

<span class="std">C++17</span> <span class="std">C++20: aggregates, alias templates</span>

Function templates have always deduced their arguments — `std::max(1, 2)` never needed `std::max<int>`. Class templates only caught up in C++17: *class template argument deduction* (CTAD) deduces the template arguments from the constructor call, killing an entire genre of boilerplate (`std::make_pair`, `std::make_tuple`) that existed purely to smuggle class construction through function deduction.

## What it looks like

```cpp run
#include <array>
#include <mutex>
#include <print>
#include <utility>
#include <vector>

int main() {
    std::pair p{42, "answer"};        // pair<int, const char*>
    std::vector counts{1, 2, 3};      // vector<int>
    std::array grid{0.5, 1.5, 2.5};   // array<double, 3> - even the size deduced

    std::mutex m;
    std::lock_guard lock(m);          // lock_guard<std::mutex> - the poster child:
                                      // nobody ever wanted to spell that argument

    std::println("{}={} n={} last={}", p.second, p.first, counts.size(), grid[2]);
}
```

The mechanism: for each constructor of the primary template, the compiler manufactures a hypothetical function template (an *implicit deduction guide*) whose parameters are the constructor's and whose return type is the class with its parameters filled in. Ordinary overload resolution across those guides picks the winner. CTAD is **all-or-nothing** — you cannot supply some arguments and deduce the rest (`std::pair<int> p{1, "x"}` is ill-formed).

## Writing deduction guides

When the constructor's parameter types don't say what you want deduced, you write an explicit guide — a "signature with an arrow" placed next to the class:

```cpp run
#include <print>
#include <string>

template <typename T>
class Tagged {
public:
    Tagged(std::string tag, T value) : tag_{std::move(tag)}, value_{std::move(value)} {}
    const std::string& tag() const { return tag_; }
    const T& value() const { return value_; }
private:
    std::string tag_;
    T value_;
};

// Without this guide, Tagged{"key", "value"} would deduce T = const char*.
// The guide says: two string literals mean Tagged<std::string>.
Tagged(const char*, const char*) -> Tagged<std::string>;

int main() {
    Tagged answer{"answer", 42};    // Tagged<int>, via the implicit guides
    Tagged name{"key", "value"};    // Tagged<std::string>, via our guide

    std::println("{}={} {}={}", answer.tag(), answer.value(), name.tag(), name.value());
}
```

The standard library leans on the same tool. The canonical example is deducing a container's element type from an *iterator pair*, where the relationship between iterator and element needs `iterator_traits` to express:

```cpp
template <typename Iter>
vector(Iter, Iter) -> vector<typename std::iterator_traits<Iter>::value_type>;

// which is why this works:
std::list<int> source{1, 2, 3};
std::vector v(source.begin(), source.end());   // vector<int>
```

Guides can be constrained (`requires`), can be `explicit` (participate only in direct-initialization), and live in the class's namespace. They are not functions — never called, only consulted at deduction time.

## The gotchas

**Braces prefer initializer-lists, and CTAD raises the stakes:**

```cpp run
#include <print>
#include <vector>

int main() {
    std::vector a{1, 2, 3};    // vector<int>

    std::vector b{a};          // vector<int> - a COPY, via a special rule that
                               // prefers copying to wrapping
    std::vector c{a, a};       // vector<vector<int>> - two elements!

    std::println("b.size={} c.size={} c[0].size={}", b.size(), c.size(), c[0].size());
}
```

One element brace-copied gives a copy; two gives a nested vector. Code where "how many arguments" flips "what type this is" belongs in code review. With CTAD, prefer parentheses unless you specifically mean list-initialization.

**Deduction is exact, not helpful.** `std::pair p{"key", 7}` deduces `pair<const char*, int>` — if you wanted `std::string`, say so (`std::pair<std::string, int>`), because CTAD deduces from what the arguments *are*, not what you meant.

## C++20 extensions

**Aggregates** deduce without any constructors or guides:

```cpp
template <typename T>
struct Point { T x; T y; };

Point p{1.5, 2.5};    // Point<double>, C++20
```

**Alias templates** participate too:

```cpp
template <typename T>
using pairs_of = std::vector<std::pair<T, T>>;

pairs_of edges{std::pair{1, 2}, std::pair{3, 4}};   // pairs_of<int>, C++20
```

## When to opt out

CTAD is about removing *redundant* spelling, not all spelling. Skip it when:

- **The reader can't reconstruct the type.** `std::vector data{parse(input)};` — deduced what? If the initializer doesn't make the type obvious at a glance, write the argument.
- **You want a conversion.** Deduction never converts; `std::vector<std::string> names{"a", "b"};` is the only way to get strings from literals.
- **The type is the API.** In headers, public signatures, and return types, explicit arguments are documentation.

There's also a blunt instrument for library authors: any constructor parameter you wrap as a non-deduced context (`std::type_identity_t<T>`) stops contributing to deduction — useful when deduction from *that* parameter would routinely surprise.

## Guidelines

- Use CTAD where the arguments make the type self-evident: `lock_guard lock(m)`, `pair{x, y}`, iterator-pair constructors.
- Prefer parentheses with CTAD; brace lists change meaning with element count.
- Write a deduction guide the moment implicit deduction produces the *wrong obvious answer* (string literals are the recurring offender).
- In public interfaces, spell the template arguments; CTAD is for implementation-side clarity, not API design.
