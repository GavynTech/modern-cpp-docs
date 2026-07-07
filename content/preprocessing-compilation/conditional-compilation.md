---
title: Conditionally compiling your source code
description: The #if family - platform, compiler, and build-mode detection, testing for headers with __has_include, feature-test macros, and C++23's #elifdef.
section: Preprocessing and compilation
section_href: /#preprocessing-and-compilation
next:
  title: Using the indirection pattern for stringification and concatenation
  href: /preprocessing-compilation/stringification/
---

<span class="std">C++17: __has_include</span> <span class="std">C++20: &lt;version&gt;</span> <span class="std">C++23: #elifdef, #elifndef</span>

Before the compiler proper ever sees your code, the preprocessor walks it as plain tokens — expanding macros, splicing in headers, and, most importantly for this page, **deleting entire regions of source** based on conditions you write. Code inside a false conditional block isn't compiled badly or compiled to nothing; it is never compiled at all. That makes conditional compilation the tool for the cases where one source tree must produce different programs: per platform, per compiler, per build mode, or per available language feature.

## The #if family

Six directives control which lines survive preprocessing:

| Directive | Keeps the region when |
|-----------|----------------------|
| `#if expr` | `expr` evaluates to nonzero |
| `#ifdef NAME` | `NAME` is defined as a macro |
| `#ifndef NAME` | `NAME` is not defined |
| `#elif expr` | no earlier branch matched and `expr` is nonzero |
| `#else` | no earlier branch matched |
| `#endif` | — closes the conditional |

`#if` evaluates an integral constant expression *after* macro expansion, with two preprocessor-only extras: `defined(NAME)` yields 1 or 0, and any identifier that survives expansion without being a defined macro evaluates to 0. That second rule is why `#if ENABLE_LOGGING` quietly does the right thing when the macro was never defined — and also why a typo in a macro name fails silently instead of loudly. `#ifdef X` is exactly `#if defined(X)`; the longer form earns its keep the moment you need to combine tests:

```cpp
#if defined(_WIN32) && !defined(FORCE_POSIX_SOCKETS)
    // Windows socket implementation
#endif
```

## Detecting the platform and the compiler

Every toolchain predefines macros naming the target platform and the compiler itself. None of them are in the standard — they are conventions old and universal enough to rely on:

```cpp run
#include <print>

int main() {
#if defined(_WIN32)
    std::println("target: Windows");
#elif defined(__APPLE__)
    std::println("target: macOS");
#elif defined(__linux__)
    std::println("target: Linux");
#else
    std::println("target: something more exotic");
#endif

#if defined(__clang__)
    std::println("compiler: Clang {}.{}", __clang_major__, __clang_minor__);
#elif defined(__GNUC__)
    std::println("compiler: GCC {}.{}", __GNUC__, __GNUC_MINOR__);
#elif defined(_MSC_VER)
    std::println("compiler: MSVC {}", _MSC_VER);
#endif
}
```

The order of the compiler checks is load-bearing: Clang defines `__GNUC__` too (it advertises GCC compatibility), so testing `__GNUC__` first would misidentify Clang. Always test the most specific macro first. The same applies to platforms — `_WIN32` is defined for 64-bit Windows as well; `_WIN64` narrows it.

## Debug versus release

The one build-mode macro with standard meaning is `NDEBUG`: when it is defined, `assert` from `<cassert>` expands to nothing. Build systems define it for release configurations by convention (CMake's `Release` adds `-DNDEBUG`), which makes it the natural switch for your own diagnostic scaffolding:

```cpp
#ifndef NDEBUG
    validate_invariants(tree);   // exists only in debug builds
#endif
```

Note the double negative — `NDEBUG` means "no debug," so debug-only code hides behind `#ifndef`. Defining your own positive macro (`#ifndef NDEBUG` `#define MYLIB_DEBUG 1` `#endif`) in one central header spares the rest of the codebase from reading inverted logic.

## C++23: #elifdef and #elifndef

For forty years the family had a gap: `#ifdef` existed, but there was no `#elifdef`, so chains of definedness tests had to switch spelling midway to `#elif defined(...)`. C++23 closed it:

```cpp run
#include <print>

#define BACKEND_OPENGL

int main() {
#ifdef BACKEND_VULKAN
    std::println("render backend: Vulkan");
#elifdef BACKEND_OPENGL              // C++23 - previously: #elif defined(BACKEND_OPENGL)
    std::println("render backend: OpenGL");
#elifndef BACKEND_HEADLESS           // ...and the negated form
    std::println("render backend: default");
#endif
}
```

Small, but it makes definedness chains uniform — every branch now reads the same way.

## Asking whether a header exists

<span class="std">C++17</span> `__has_include` moved a whole category of build-system probing into the language. It evaluates to 1 inside `#if` when the named header can be included:

```cpp run
#if __has_include(<print>)
    #include <print>
    #define HAVE_STD_PRINT 1
#else
    #include <cstdio>
#endif

int main() {
#ifdef HAVE_STD_PRINT
    std::println("modern formatting available");
#else
    std::puts("falling back to <cstdio>");
#endif
}
```

This is the graceful-degradation pattern: prefer the modern facility, keep a fallback alive for older toolchains, and let each translation unit decide for itself. One honest caveat — a header can exist without its contents working (shipped but stubbed, or gated behind flags). For standard library features, the feature-test macros below are the more precise question.

## Feature-test macros

<span class="std">C++20</span> Every language feature has a predefined macro named `__cpp_<feature>`, and every library feature has one named `__cpp_lib_<feature>`, each expanding to the year-and-month the feature landed. The library macros live in their own headers and — since C++20 — all together in `<version>`, which exists precisely so you can ask about everything with one cheap include:

```cpp run
#include <version>
#include <print>

int main() {
    std::println("__cplusplus       = {}", __cplusplus);
#ifdef __cpp_concepts
    std::println("__cpp_concepts    = {}", __cpp_concepts);
#endif
#ifdef __cpp_if_consteval
    std::println("__cpp_if_consteval = {}", __cpp_if_consteval);
#endif
#ifdef __cpp_lib_print
    std::println("__cpp_lib_print   = {}", __cpp_lib_print);
#endif
#ifdef __cpp_lib_expected
    std::println("__cpp_lib_expected = {}", __cpp_lib_expected);
#endif
}
```

`__cplusplus` itself reports the standard the compiler is targeting: `201103L`, `201402L`, `201703L`, `202002L`, and `202302L` for C++11 through C++23. Prefer the specific feature macro over comparing `__cplusplus` — compilers implement standards feature by feature, and the specific macro tells the truth about the one thing you actually need:

```cpp
#if __cpp_lib_format >= 201907L
    #include <format>
    // use std::format
#else
    // fall back to snprintf or a third-party library
#endif
```

## Guidelines

- Prefer asking **specific** questions: a feature-test macro over `__cplusplus`, `__has_include` over guessing from compiler versions.
- Test the most specific macro first — Clang defines `__GNUC__`, and `_WIN32` is defined on 64-bit Windows too.
- Keep conditional regions short. Whole alternative implementations belong in separate files chosen by the build system, not in 300-line `#if` blocks.
- Remember that an undefined identifier inside `#if` silently evaluates to 0 — a typo'd macro name is a bug the preprocessor will never report.
- Hide debug-only code behind `#ifndef NDEBUG` (or one central positive macro derived from it) so your scaffolding disappears from release builds the same way `assert` does.
- Where a compile-time decision lives *inside* a function and both sides are valid C++, reach for `if constexpr` (later in this chapter) instead of the preprocessor.
