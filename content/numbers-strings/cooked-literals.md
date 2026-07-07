---
title: Creating cooked user-defined literals
description: Giving values their units at the point of writing - literal operators, the allowed signatures, and the namespace conventions that keep them sane.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Creating raw user-defined literals
  href: /numbers-strings/raw-literals/
---

<span class="std">C++11</span> <span class="std">C++14: standard suffixes</span>

`set_timeout(5000)` — five thousand *what*? User-defined literals attach the unit to the number itself: `set_timeout(5s)`, `allocate(64_KiB)`, `rotate(90.0_deg)`. A *cooked* literal operator receives the value **after** the compiler has parsed it (an integer arrives as `unsigned long long`, a floating literal as `long double`), which covers almost every use; the [raw form](/numbers-strings/raw-literals/), which sees the original spelling, is the next page.

## Defining literal operators

A literal operator is a function named `operator""_suffix`. Two rules before anything else: suffixes for user code **must start with an underscore** (bare suffixes are reserved for the standard library), and the operator should be `constexpr` so literals stay compile-time constants.

```cpp run
#include <print>

namespace storage {
    inline namespace literals {
        constexpr unsigned long long operator""_KiB(unsigned long long n) { return n * 1024; }
        constexpr unsigned long long operator""_MiB(unsigned long long n) { return n * 1024 * 1024; }
    }
}

int main() {
    using namespace storage::literals;

    constexpr auto page   = 4_KiB;
    constexpr auto budget = 8_MiB;

    std::println("budget {} bytes = {} pages", budget, budget / page);
}
```

The `inline namespace literals` wrapping is the convention worth copying from the standard library (it's [inline namespaces](/core-language/inline-namespaces/) doing real work): users can import *just the suffixes* with `using namespace storage::literals;` without pulling in the rest of `storage`, and a `using namespace storage;` gets them too.

## The real payoff: literals that build strong types

Returning plain numbers is the warm-up. Returning a *type* makes the unit machine-checked at every API boundary:

```cpp run
#include <numbers>
#include <print>

// A strong type: an angle is not interchangeable with a bare double.
struct Radians {
    double value;
};

namespace geometry::literals {
    constexpr Radians operator""_deg(long double degrees) {
        return Radians{static_cast<double>(degrees) * std::numbers::pi / 180.0};
    }
    constexpr Radians operator""_rad(long double r) {
        return Radians{static_cast<double>(r)};
    }
}

void rotate(Radians angle) { std::println("rotating {:.4f} rad", angle.value); }

int main() {
    using namespace geometry::literals;

    rotate(90.0_deg);      // the degrees->radians conversion happened at compile time
    rotate(1.5708_rad);
    // rotate(90.0);       // error: which unit did you mean? Exactly the point.
}
```

This is precisely how `std::chrono` works: `250ms` is not a number, it's a `std::chrono::milliseconds`, and passing it where seconds are expected converts *correctly* instead of silently being wrong by a factor of a thousand. The Mars Climate Orbiter was lost to a units mix-up; the type system works for free.

## The allowed signatures

Cooked literal operators can only have these parameter lists — the compiler picks by literal kind:

| You write | Operator receives |
|-----------|-------------------|
| `42_x` (integer) | `unsigned long long` |
| `3.14_x` (floating) | `long double` |
| `'c'_x` (character) | `char` (or `wchar_t`/`char8_t`/`char16_t`/`char32_t`) |
| `"text"_x` (string) | `const char*, std::size_t` (and the wide/UTF variants) |

Notes that matter: the integer form always receives `unsigned long long` — your operator narrows deliberately if it wants to; a *negative* literal doesn't exist (`-5_x` is unary minus applied to `5_x`, so your returned type needs negation if that should work); and the string form receives length explicitly, so embedded NULs survive — this is how `"a\0b"sv` keeps all three bytes.

The standard library's own suffixes, for reference and to avoid colliding conceptually: `s` (both `std::string` *and* seconds — different argument types, no conflict), `sv`, `h/min/s/ms/us/ns`, `y/d` for calendar types, `i/if/il` for complex numbers.

## Compile-time enforcement with consteval

`constexpr` allows compile-time evaluation; <span class="std">C++20</span> `consteval` *requires* it, which turns validation into build errors:

```cpp run
#include <print>

struct Percent { double fraction; };

namespace ui::literals {
    consteval Percent operator""_pct(long double p) {
        if (p < 0.0L || p > 100.0L) throw "percentage out of range";
        return Percent{static_cast<double>(p) / 100.0};
    }
}

int main() {
    using namespace ui::literals;

    constexpr auto opacity = 87.5_pct;
    // constexpr auto bad = 250.0_pct;   // compile error: throw in constant evaluation

    std::println("opacity fraction: {}", opacity.fraction);
}
```

A `throw` reached during constant evaluation is ill-formed — so an out-of-range literal *cannot compile*. For literal operators (whose whole purpose is compile-time-known input), `consteval` is usually the more honest choice than `constexpr`.

## Guidelines

- Underscore-prefixed suffixes, `constexpr`/`consteval` bodies, defined in an `inline namespace literals` inside your library's namespace.
- Return strong types, not raw numbers, whenever the suffix denotes a unit — the literal is the ergonomic front door to the type safety.
- Keep suffixes short and unambiguous (`_KiB`, `_deg`, `_pct`); they read as part of the number.
- Use `consteval` plus `throw` for domain validation — invalid literals should fail the build, not the run.
- Before inventing a suffix, check `std::chrono` and `std::literals` — the best literal is one your readers already know.
