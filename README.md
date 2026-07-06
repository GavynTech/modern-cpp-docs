# Modern C++ Documentation

Deep, code-first documentation for modern C++ — covering the language as it exists today, from C++11 through C++23. Every page is built around complete, working examples, and every runnable sample on the site compiles cleanly under `-std=c++23` and links straight into Compiler Explorer so you can run it in one click.

**Live site:** https://gavyntech.github.io/modern-cpp-docs/

## What this is

Most C++ material online is either a scattered reference or a decade out of date. This project documents modern C++ the way the Go project documents Go: one place, a clean reading experience, and pages that go deep on how each feature actually behaves — including the edge cases and the pitfalls.

## Coverage

**Phase 1 — Core language features** (available now): type deduction with `auto`, type aliases and alias templates, uniform initialization, non-static member initialization, object alignment, scoped enumerations, `override` and `final`, range-based for loops (including support for your own types), `explicit` and implicit conversions, unnamed namespaces, inline namespaces and symbol versioning, structured bindings, class template argument deduction, and the subscript operator through C++23's multidimensional form.

Future phases will expand into the standard library, numbers and strings, containers and ranges, general-purpose utilities, and concurrency.

## Quality bar

- All content is original writing.
- Every runnable code sample is compile-checked in CI-style tooling before publishing.
- Each feature is labeled with the standard that introduced it and the ones that refined it.

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Core language features | Live |
| 2 | TBD | Planned |

## Feedback

Spotted an error or want a topic covered? [Open an issue](https://github.com/GavynTech/modern-cpp-docs/issues).
