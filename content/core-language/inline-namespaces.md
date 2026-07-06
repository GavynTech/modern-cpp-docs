---
title: Inline namespaces and symbol versioning
description: Publishing versioned APIs under one name, how the standard library uses inline namespaces, and ABI-safe evolution.
section: Core language features
section_href: /#core-language-features
next:
  title: Structured bindings and multiple return values
  href: /core-language/structured-bindings/
---

<span class="std">C++11</span>

An `inline namespace` is a namespace whose members are *also* members of the enclosing namespace — callers can name them with or without the inner namespace. That sounds like a small convenience; it is actually the language's mechanism for **versioning an API under a stable name**, and it is load-bearing inside every major standard library implementation.

## The core mechanic

```cpp run
#include <print>
#include <string_view>

namespace geo {
    namespace v1 {
        constexpr double area(double r) { return 3.14 * r * r; }   // the old, sloppy pi
        constexpr std::string_view version() { return "v1"; }
    }

    inline namespace v2 {
        constexpr double area(double r) { return 3.14159265358979 * r * r; }
        constexpr std::string_view version() { return "v2"; }
    }
}

int main() {
    // Unqualified use gets the inline namespace - the "current" version:
    std::println("default ({}): {:.6f}", geo::version(), geo::area(1.0));

    // Callers who need the old behavior pin themselves explicitly:
    std::println("pinned  ({}): {:.6f}", geo::v1::version(), geo::v1::area(1.0));
}
```

`geo::area` and `geo::v2::area` are the same function — not a copy, not a forwarder. When `v3` ships, the library moves the `inline` keyword; unpinned callers get `v3` on their next recompile, and pinned callers keep exactly what they asked for. The version selection can even be a build flag:

```cpp
namespace net {
#if defined(NET_PREVIEW)
    inline namespace v3 { /* next generation */ }
    namespace v2 { /* stable */ }
#else
    namespace v3 { /* opt-in preview */ }
    inline namespace v2 { /* stable is the default */ }
#endif
}
```

## Why not just a using-declaration?

`namespace geo { using v2::area; }` gets you the *name*, but inline namespaces preserve the deeper semantics that versioning actually needs:

- **Argument-dependent lookup.** For a type defined in `geo::v2`, ADL finds operators and free functions whether callers think in `geo` or `geo::v2`.
- **Template specialization.** Users can specialize `geo::hash<T>` from outside even though it really lives in `geo::v2` — impossible across a plain `using`.
- **Distinct mangled names — the ABI point.** The linker symbol for `geo::v2::area` *contains the `v2`*. Compile one `.cpp` against the v2-inline headers and another against v3-inline headers, and they cannot accidentally resolve to each other's symbols. Version skew becomes a loud link error instead of a silent crash at 2 a.m. This is the entire reason libstdc++ shipped its C++11-conforming `std::string` inside `std::__cxx11` — old and new string layouts coexist in one process without ever cross-linking.

## Where you already use them

The standard library's literal suffixes all live in inline namespaces so that one `using` brings in exactly the set you want:

```cpp run
#include <chrono>
#include <print>
#include <string>

int main() {
    using namespace std::literals;   // string_literals + chrono_literals + ...

    auto name = "modern"s;           // std::string, not const char*
    auto wait = 150ms;               // std::chrono::milliseconds

    std::println("{} for {}", name, wait);
}
```

`std::literals`, `std::literals::string_literals`, and `std::literals::chrono_literals` are nested inline namespaces — which is why `using namespace std::literals;`, `using namespace std::string_literals;`, and even plain `std::chrono` usage all compose without conflict.

Since C++20, the shorthand `namespace geo::inline v2 { }` declares the nested inline namespace in one line.

## Practical rules

- The `inline` keyword must be consistent: a namespace is inline from its first declaration, in every declaration.
- Exactly **one** version namespace should be inline at a time per build — two inline siblings with the same function names makes unqualified calls ambiguous.
- Reopening the namespace elsewhere may omit the keyword, but writing it everywhere is kinder to readers.
- Inline namespaces are for *publishers* of libraries. Application code that isn't maintaining API/ABI compatibility across versions rarely needs one — reach for it when you have downstream users you can't recompile.

## Guidelines

- Version a library as `lib::vN` namespaces with `inline` marking the current default; document that pinning to `lib::v1::` is the compatibility escape hatch.
- Flip which namespace is inline in exactly one place (ideally via one macro/config header) so a build can never see two defaults.
- Treat the mangled-name distinctness as a feature: after an ABI-relevant change, bump the namespace so stale objects fail to link instead of misbehaving.
- Don't nest unrelated machinery in inline namespaces "for organization" — every level is another name for the same things, and that multiplies confusion, not clarity.
