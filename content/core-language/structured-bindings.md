---
title: Structured bindings and multiple return values
description: Decomposing pairs, tuples, structs, and arrays - and returning multiple values without out-parameters.
section: Core language features
section_href: /#core-language-features
next:
  title: Class template argument deduction
  href: /core-language/ctad/
---

<span class="std">C++17</span> <span class="std">C++20: lambda capture, static</span>

A structured binding declaration unpacks an object into named pieces: `auto [x, y] = point;`. It works on three kinds of things — arrays, tuple-like types, and structs with accessible members — and it is the feature that finally made *returning* multiple values from a function pleasant enough to displace out-parameters.

## The basics, three ways

```cpp run
#include <map>
#include <print>
#include <string>
#include <tuple>

struct Point { double x; double y; };

int main() {
    // 1. Structs: binds public non-static members, in declaration order.
    Point p{3.0, 4.0};
    auto [x, y] = p;

    // 2. Tuple-like: std::pair, std::tuple, std::array.
    auto [quotient, remainder] = std::tuple{7, 1};

    // 3. Built-in arrays.
    int rgb[3]{255, 170, 0};
    auto [r, g, b] = rgb;

    std::println("({}, {}) {}r{} #{:02x}{:02x}{:02x}", x, y, quotient, remainder, r, g, b);

    // The flagship everyday use - map iteration with real names:
    std::map<std::string, int> ages{{"alice", 30}, {"bob", 25}};
    for (const auto& [name, age] : ages) {
        std::println("{} is {}", name, age);
    }
}
```

The names must match the piece count exactly, and you cannot skip pieces. Qualifiers go on the `auto`: `auto&` binds into the original object, `const auto&` for read-only, plain `auto` copies.

## Multiple return values, before and after

The historical options were all bad in a different way: out-parameters (call site can't tell inputs from outputs), returning a struct nobody bothered to define, or `std::tie` into pre-declared variables. Modern code returns a *named struct* and unpacks it:

```cpp run
#include <print>
#include <string>

// A named struct beats std::tuple for public APIs: the fields have names at
// both ends, and adding a field later doesn't silently renumber positions.
struct ParseResult {
    bool ok;
    std::size_t consumed;
    std::string error;
};

ParseResult parse(const std::string& input) {
    if (input.empty()) return {.ok = false, .consumed = 0, .error = "empty input"};
    return {.ok = true, .consumed = input.size(), .error = {}};
}

int main() {
    auto [ok, consumed, error] = parse("route 66");
    std::println("ok={} consumed={} error='{}'", ok, consumed, error);
}
```

The caller pays nothing for the struct (guaranteed copy elision applies to the return), gets to choose its own binding names, and the API stays self-documenting. Standard library functions built this way include `std::to_chars` (`auto [ptr, ec] = ...`) — and the older pair-returning APIs retrofit cleanly:

```cpp run
#include <map>
#include <print>
#include <string>

int main() {
    std::map<std::string, int> ages{{"alice", 30}};

    // insert returns pair<iterator, bool>; unpacked, both halves get names.
    // The if-with-initializer keeps the bindings scoped to the branch.
    if (auto [pos, inserted] = ages.try_emplace("alice", 99); !inserted) {
        std::println("kept existing value {}", pos->second);
    }
}
```

## What's actually happening

`auto [a, b] = expr;` does **not** declare two variables. It declares one invisible object initialized from `expr`, and `a`/`b` become names for its pieces:

```cpp
auto [x, y] = p;
// roughly:
auto __hidden = p;     // one copy of the WHOLE object
// x names __hidden.x, y names __hidden.y
```

Consequences worth knowing:

- **The whole object is copied even if you use one piece.** Bind by reference (`const auto& [x, y]`) when the object is expensive.
- **`decltype(x)` is the member's declared type**, not the reference-ness you might expect — bindings are a special kind of name, not variables.
- **Lambda capture** of bindings is legal only since <span class="std">C++20</span> (`[x] { return x; }`); C++17 required copying into a real variable first. C++20 also allows `static` and `thread_local` structured bindings.
- A binding you don't need still has to be named; the convention is `_` or `ignored` plus `[[maybe_unused]]` on the declaration if warnings complain about the *used* ones... they won't — unused *bindings* don't trigger `-Wunused-variable` on GCC, though naming them honestly (`unused`) is clearer than punctuation.

## Opting in custom types: the tuple protocol

Structs with public members work automatically. A class with *private* members can still support bindings by implementing the tuple-like protocol — `std::tuple_size`, `std::tuple_element`, and a `get`:

```cpp
class Version {
    int major_ = 2, minor_ = 7;
public:
    template <std::size_t I>
    int get() const { return I == 0 ? major_ : minor_; }
};

template <> struct std::tuple_size<Version>
    : std::integral_constant<std::size_t, 2> {};
template <std::size_t I> struct std::tuple_element<I, Version>
    { using type = int; };

// now: auto [maj, min] = Version{};
```

Reach for this only on vocabulary types used pervasively (the standard did it for `std::pair`, `std::array`); for ordinary classes, a public result-struct is less machinery.

## Guidelines

- Return multiple values as a small named struct; let callers unpack with structured bindings. Save `std::pair`/`std::tuple` for genuinely generic code.
- Default to `const auto& [..]` when decomposing anything you didn't just create — remember the hidden whole-object copy.
- Combine with `if`/`switch` initializers to keep result-plus-status bindings inside the branch that uses them.
- Use bindings at *consumption* sites; don't contort a design so everything returns tuples just because unpacking is cheap now.
