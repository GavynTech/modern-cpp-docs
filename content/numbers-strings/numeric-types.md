---
title: Understanding the various numeric types
description: The fundamental integer and floating-point types, fixed-width integers, mixed-sign pitfalls, and modern literal syntax.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Limits and other properties of numeric types
  href: /numbers-strings/numeric-limits/
---

<span class="std">C++11: cstdint</span> <span class="std">C++20: cmp_* utilities</span> <span class="std">C++23: stdfloat</span>

C++ inherits C's zoo of numeric types, where the standard guarantees only *minimum* sizes and platforms fill in the rest. Modern C++ doesn't shrink the zoo, but it gives you precise tools for picking from it: fixed-width aliases when layout matters, safe comparison utilities for mixed signs, and literals you can actually read. This page is the map.

## The fundamental types and what's actually guaranteed

The standard guarantees ordering (`short` ≤ `int` ≤ `long` ≤ `long long`) and minimum widths — not exact sizes:

| Type | Guaranteed at least | Linux/macOS x86-64 | Windows x64 |
|------|--------------------:|-------------------:|------------:|
| `short` | 16 bits | 16 | 16 |
| `int` | 16 bits | 32 | 32 |
| `long` | 32 bits | **64** | **32** |
| `long long` | 64 bits | 64 | 64 |

That `long` row is the classic portability trap: code that assumes `long` holds a pointer or a file size works on Linux (LP64) and breaks on Windows (LLP64). See for yourself:

```cpp run
#include <cstdint>
#include <print>

int main() {
    std::println("short:        {} bytes", sizeof(short));
    std::println("int:          {} bytes", sizeof(int));
    std::println("long:         {} bytes   <- differs across platforms", sizeof(long));
    std::println("long long:    {} bytes", sizeof(long long));
    std::println("float/double: {}/{} bytes", sizeof(float), sizeof(double));
    std::println("long double:  {} bytes", sizeof(long double));
    std::println("int64_t:      {} bytes   <- everywhere, by definition", sizeof(std::int64_t));
}
```

Three more facts people learn the hard way:

- `char`, `signed char`, and `unsigned char` are **three distinct types**, and whether plain `char` is signed is platform-defined (signed on x86, unsigned on ARM Linux).
- Floating-point is `float` (32-bit IEEE), `double` (64-bit IEEE), and `long double` (80-bit on x86 Linux, just 64-bit on MSVC). `double` is the default; `float` is a deliberate space/bandwidth optimization.
- `bool` participates in arithmetic by promoting to `int` — the source of `true + true == 2`.

## Fixed-width integers: say what you mean

<span class="std">C++11</span> `<cstdint>` provides aliases with exact contracts:

```cpp
#include <cstdint>

std::int32_t  file_offset;   // exactly 32 bits, everywhere
std::uint8_t  raw_byte;      // exactly 8 bits (careful: formats/streams as a char-ish type in some APIs)
std::int64_t  timestamp_us;  // exactly 64 bits
std::uint64_t hash;

std::int_fast32_t counter;   // "at least 32, whatever is fastest"
std::int_least16_t packed;   // "smallest type with at least 16"
std::intptr_t     addr;      // an integer that can round-trip a pointer
```

The rule of thumb:

- **Serialization, protocols, file formats, hardware registers:** exact-width (`int32_t`, `uint8_t`) — layout is the contract.
- **Sizes and indexing:** `std::size_t` (what containers use) and `std::ptrdiff_t`/`ssize` for differences.
- **Everyday arithmetic:** plain `int` remains the idiomatic default; `int64_t` when the domain can exceed two billion.

## Signed vs unsigned: the conversion trap

When a signed and unsigned operand meet, the signed one converts to unsigned — silently, and with dramatic results for negatives:

```cpp run
#include <print>
#include <utility>

int main() {
    int money = -1;
    unsigned int count = 1;

    // 'money < count' converts money to unsigned: -1 becomes 4294967295.
    // (Written with the cast so this sample compiles warning-free.)
    std::println("what 'money < count' computes: {}",
                 static_cast<unsigned>(money) < count);          // false!

    // C++20: mathematically correct mixed-sign comparison.
    std::println("std::cmp_less(money, count):   {}", std::cmp_less(money, count));  // true

    // And a checked "does this value fit in that type":
    std::println("fits in uint8_t? {}", std::in_range<std::uint8_t>(300));           // false
}
```

<span class="std">C++20</span> `std::cmp_less`, `cmp_equal`, `cmp_greater` (in `<utility>`) compare *values*, not bit patterns. Until your codebase uses them habitually: compile with `-Wsign-compare` (in `-Wall`) and treat it seriously, and prefer signed types for arithmetic — unsigned is for bit manipulation and modular arithmetic, not "numbers that shouldn't be negative."

Related trap: unsigned *underflow* is well-defined wraparound, which is worse than a crash — `for (std::size_t i = v.size() - 1; i >= 0; --i)` loops forever, because `i >= 0` is always true.

## Literals you can read

```cpp
auto million   = 1'000'000;        // digit separators (C++14) - just readability
auto mask      = 0b1010'1100;      // binary literals (C++14)
auto perms     = 0755;             // octal (the leading 0 - a trap in disguise)
auto color     = 0xFF'88'00;       // hex, separators group bytes
auto big       = 9'000'000'000LL;  // suffix picks the type: long long
auto unsigned_ = 42u;
auto precise   = 1.5;              // double by default
auto fast      = 1.5f;             // float only with the suffix
```

The suffix matters with `auto`: `auto x = 1.5f` deduces `float`, no suffix deduces `double`. And note that innocent-looking `0755` — a leading zero means octal, which is only ever what you want for file permissions.

<span class="std">C++23</span> `<stdfloat>` adds explicit IEEE types — `std::float32_t`, `std::float64_t`, `std::float16_t`, `std::bfloat16_t` (the last two for GPU/ML interop) — with literal suffixes `f32`, `f64`, etc., ending the "is `double` really IEEE binary64 here" ambiguity on platforms that support them.

## Guidelines

- Default to `int` for arithmetic and `double` for real numbers; reach for `std::size_t` when indexing containers.
- The moment a number crosses a process boundary — disk, network, hardware — switch to `<cstdint>` exact-width types.
- Never mix signed and unsigned in comparisons or arithmetic; when you must compare across, use `std::cmp_*`.
- Use digit separators on every literal over four digits, and binary literals for masks.
- Don't use `long`: it's the one type that changes meaning between the platforms you're most likely to target. `int` or `int64_t` say what you mean.
