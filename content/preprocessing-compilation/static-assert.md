---
title: Performing compile-time assertion checks with static_assert
description: Assertions the compiler evaluates - layout and ABI guards, template preconditions, the dependent-false idiom, and when to reach for assert or concepts instead.
section: Preprocessing and compilation
section_href: /#preprocessing-and-compilation
next:
  title: Conditionally compiling classes and functions with enable_if
  href: /preprocessing-compilation/enable-if/
---

<span class="std">C++11</span> <span class="std">C++17: optional message</span>

`static_assert` is an assertion the *compiler* runs: give it a constant expression and, optionally, a message, and compilation stops dead if the expression is false. It costs nothing at runtime — a passing assertion leaves no trace in the binary — which changes the economics of checking things. Anything your code silently assumes and the compiler can evaluate, you can afford to verify on every single build.

## A declaration that fails the build

`static_assert` is a declaration, so it goes anywhere declarations go: namespace scope, class scope, or inside a function. The condition must be a constant expression convertible to `bool`:

```cpp run
#include <print>
#include <type_traits>

// Namespace scope: check the world before anything else compiles.
static_assert(sizeof(void*) == 8, "this code assumes a 64-bit target");

template<typename T>
T midpoint_of(T lo, T hi) {
    // Function scope: a precondition on the template parameter.
    static_assert(std::is_arithmetic_v<T>, "midpoint_of requires an arithmetic type");
    return lo + (hi - lo) / 2;
}

struct Header {
    // Class scope: keep an invariant next to the thing it protects.
    static_assert(sizeof(int) == 4, "wire format requires 32-bit int");
    int magic;
    int length;
};

int main() {
    std::println("{}", midpoint_of(0, 10));
}
```

Since <span class="std">C++17</span> the message is optional — `static_assert(std::is_trivially_copyable_v<T>);` is fine when the condition already reads as the explanation. (C++26 goes further and lets the message itself be a constant expression, but everything on this page is C++11 vocabulary.)

## Guarding layout and ABI

The highest-value asserts in most codebases protect *layout*: structs that get `memcpy`ed to the network, written to disk, or shared across an ABI boundary. A colleague adding one innocent member changes the wire format; a `static_assert` turns that silent corruption into a build break with a message explaining the contract:

```cpp run
#include <cstdint>
#include <cstddef>
#include <print>
#include <type_traits>

struct PacketHeader {
    std::uint32_t id;
    std::uint16_t flags;
    std::uint16_t length;
};

static_assert(sizeof(PacketHeader) == 8,  "header is padded - wire format broken");
static_assert(alignof(PacketHeader) == 4, "alignment changed - check serialization");
static_assert(offsetof(PacketHeader, flags) == 4, "field moved - readers will misparse");
static_assert(std::is_trivially_copyable_v<PacketHeader>);   // memcpy must stay legal

int main() {
    std::println("PacketHeader is {} bytes, safe to memcpy", sizeof(PacketHeader));
}
```

When one of these fires, the compiler quotes the failed condition and your message:

```text
error: static assertion failed: header is padded - wire format broken
   10 | static_assert(sizeof(PacketHeader) == 8,  "header is padded - wire format broken");
      |               ~~~~~~~~~~~~~~~~~~~~~^~~~
note: the comparison reduces to '(12 == 8)'
```

That `note` is a modern-compiler kindness: GCC and Clang show the actual values, so you see not just that the size is wrong but what it became.

## Asserting inside templates

A `static_assert` whose condition depends on template parameters is checked **at instantiation**, once per combination of arguments — which makes it a precondition mechanism. `midpoint_of` above compiles happily until someone instantiates it with `std::string`, at which point they get your sentence, not eighty lines of substitution notes.

One historical trap lives here. Writing `static_assert(false, "...")` in the branch of a template you believe is unreachable used to fail *at definition time*, before any instantiation — the compiler is allowed to reject a template that can never be valid. The portable idiom routes the `false` through a dependent name so it can't be evaluated early:

```cpp
template<typename>
inline constexpr bool dependent_false = false;

template<typename T>
void serialize(T value) {
    if constexpr (std::is_integral_v<T>) {
        // write an integer
    } else if constexpr (std::is_floating_point_v<T>) {
        // write a double
    } else {
        static_assert(dependent_false<T>, "serialize: unsupported type");
    }
}
```

`dependent_false<T>` is always `false`, but the compiler can't know that until `T` exists — so the assert fires only for the types that actually reach the `else`. (A 2023 defect resolution lets recent compilers accept a plain `static_assert(false)` in never-instantiated branches, but the dependent form remains the spelling that works everywhere.)

## A wall, not a filter

`static_assert` and the techniques on the next two pages answer different questions, and mixing them up produces the wrong kind of error. An assert fires **after** overload resolution has already committed to a function; it cannot make the compiler pick a different one:

```cpp
template<typename T>
void process(T value) {
    static_assert(std::is_integral_v<T>, "process needs an integer");
    // ...
}
void process(double value);   // never chosen for process(2.5)? Wrong -
                              // the template matches double exactly and
                              // then hits the assert. This overload is
                              // only picked for... nothing new. Design error.
```

If you want "this function doesn't exist for these types, try another," that's `enable_if` or concepts — they remove candidates *before* the choice. If you want "you picked the right function but broke its contract, here's a clear sentence," that's `static_assert`. A wall stops you with a message; a filter routes you around.

## static_assert versus assert

| | `static_assert` | `assert` (`<cassert>`) |
|---|---|---|
| Checked | at compile time, every build | at runtime, when execution reaches it |
| Can test | constant expressions only | any expression |
| Runtime cost | none | a branch per check |
| In release builds | always active | removed when `NDEBUG` is defined |
| On failure | build error with your message | prints and calls `std::abort()` |

The rule of thumb writes itself: assert **properties of types and constants** statically, and **properties of runtime values** dynamically. The pair covers different halves of correctness; neither replaces the other.

## Guidelines

- Any assumption the compiler can evaluate — sizes, alignments, offsets, type traits, `constexpr` arithmetic — deserves a `static_assert` next to the code that relies on it. Passing checks are free.
- Write messages that tell the reader **what to do**, not what failed (the compiler already prints the condition): "wire format broken - update protocol version" beats "size mismatch."
- Skip the message when the condition is the message: `static_assert(std::is_trivially_copyable_v<T>);`
- In an exhaustive `if constexpr` chain, close the final `else` with `static_assert(dependent_false<T>, ...)` so unsupported types get a sentence instead of silence.
- Use `static_assert` to state contracts *inside* a chosen function; use `enable_if` or concepts when the goal is steering which function gets chosen at all.
