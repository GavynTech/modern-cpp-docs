---
title: Using scoped enumerations
description: enum class - real scoping, no implicit conversions, chosen underlying types, using enum, and std::to_underlying.
section: Core language features
section_href: /#core-language-features
next:
  title: Virtual methods with override and final
  href: /core-language/override-final/
---

<span class="std">C++11</span> <span class="std">C++20: using enum</span> <span class="std">C++23: std::to_underlying</span>

C-style enumerations have two design flaws: their enumerators spill into the surrounding scope, and they convert to integers whenever the compiler feels like it. Scoped enumerations — `enum class` — fix both, and add a third improvement: control over the underlying integer type. In modern code, `enum class` is the default and plain `enum` is the exception that needs a justification.

## The two flaws, demonstrated

```cpp run
#include <print>

// Unscoped: 'red', 'green', 'blue' are now names in the enclosing scope,
// and any of them silently becomes an int on contact.
enum Color { red, green, blue };

// Scoped: enumerators live inside Status, and nothing converts implicitly.
enum class Status { active, suspended, closed };

int main() {
    int paint = red;               // compiles - flaw #2 in action
    // enum Signal { red };        // error - 'red' already taken: flaw #1
    // int s = Status::active;     // error - scoped enums don't convert
    // if (Status::active == 0)    // error - not comparable to int either

    auto s = Status::active;
    std::println("paint={} active={}", paint, s == Status::active);
}
```

Scope pollution is not cosmetic. Two unscoped enums in one header cannot both have an enumerator named `error` or `none` — a real problem in large codebases and the reason for prefixes like `COLOR_RED` in C. Implicit conversion is worse: `if (get_status() == get_color())` compiles with unscoped enums, comparing quantities that share nothing but being secretly `int`.

## Choosing the underlying type

Every enum is stored as an integer type. Unscoped enums leave it implementation-defined; scoped enums default to `int` and let you pick:

```cpp run
#include <cstdint>
#include <print>
#include <utility>

// One byte on the wire, guaranteed - suitable for protocols and packed structs.
enum class ErrorCode : std::uint8_t {
    none      = 0,
    not_found = 4,
    timeout   = 8,
};

int main() {
    ErrorCode e = ErrorCode::timeout;

    // C++23: std::to_underlying is the blessed way out of the enum.
    std::println("code={} storage={} byte(s)", std::to_underlying(e), sizeof(e));

    // The pre-C++23 spelling of the same cast:
    auto raw = static_cast<std::underlying_type_t<ErrorCode>>(e);
    std::println("raw={}", raw);
}
```

A fixed underlying type also enables **forward declaration** — `enum class ErrorCode : std::uint8_t;` in a header, full definition elsewhere — which cuts header dependencies exactly the way forward-declared classes do.

When you *do* need the number (serialization, indexing, C APIs), the conversion is deliberately loud: `std::to_underlying(e)` <span class="std">C++23</span> (in `<utility>`), which unlike a hand-written `static_cast` can never pick the wrong integer type.

## using enum: scoped safety, unscoped brevity

<span class="std">C++20</span> Inside a scope, `using enum` imports all enumerators, which makes `switch` statements read cleanly without giving up any of the type safety:

```cpp run
#include <print>
#include <string_view>

enum class Status { active, suspended, closed };

std::string_view label(Status s) {
    switch (s) {
        using enum Status;         // scoped to this switch only
        case active:    return "active";
        case suspended: return "suspended";
        case closed:    return "closed";
    }
    return "unknown";
}

int main() {
    std::println("{}", label(Status::suspended));
}
```

Keep `using enum` local — a `switch`, a function. At namespace scope it recreates the pollution problem `enum class` was built to solve.

One more `switch` note: because scoped enums have a known, closed set of enumerators, compilers can warn when a `case` is missing (`-Wswitch`, part of `-Wall`) — but only if you *omit* the `default` label. A `default` on an enum switch trades away that safety net.

## Bit flags with scoped enums

The one place unscoped enums used to be more convenient: flag sets, where implicit conversion made `read | write` just work. With scoped enums you define the operators once, and in exchange the flag type stops accepting arbitrary integers:

```cpp run
#include <print>
#include <utility>

enum class Perm : unsigned {
    none  = 0,
    read  = 1 << 0,
    write = 1 << 1,
    exec  = 1 << 2,
};

constexpr Perm operator|(Perm a, Perm b) {
    return static_cast<Perm>(std::to_underlying(a) | std::to_underlying(b));
}
constexpr bool has(Perm value, Perm flag) {
    return (std::to_underlying(value) & std::to_underlying(flag)) != 0;
}

int main() {
    constexpr Perm mode = Perm::read | Perm::write;
    std::println("read={} exec={}", has(mode, Perm::read), has(mode, Perm::exec));
}
```

## Guidelines

- Reach for `enum class` by default; use plain `enum` only when interfacing with C code that requires the implicit conversions.
- Specify the underlying type whenever the enum crosses a boundary — files, sockets, packed structs, C APIs — and forward-declare it in headers.
- Convert out with `std::to_underlying` (C++23) rather than a raw `static_cast` to a hand-picked integer type.
- Use `using enum` inside a `switch` for readability; skip the `default` case so `-Wswitch` guards future enumerator additions.
- Give flag enums their operators via `constexpr` free functions; don't fall back to an unscoped enum for convenience.
