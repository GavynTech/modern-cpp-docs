# Modern C++ Documentation

Deep, code-first documentation for modern C++ — covering the language as it exists today, from C++11 through C++23. Every page is built around complete, working examples, and every runnable sample on the site compiles cleanly under `-std=c++23` and links straight into Compiler Explorer so you can run it in one click.

**Live site:** https://moderncppdocumentation.com

## What this is

This is a modern c++ programing documentation focused on comperhensive code infrastructure to master solutions for c++ 23 and all previous standards

## Coverage

**Chapter 1 -- Learning Modern Core Lauguage Features** : type deduction with `auto`, type aliases and alias templates, uniform initialization, non-static member initialization, object alignment, scoped enumerations, `override` and `final`, range-based for loops (including support for your own types), `explicit` and implicit conversions, unnamed namespaces, inline namespaces and symbol versioning, structured bindings, class template argument deduction, and the subscript operator through C++23's multidimensional form.

**Chapter 2 -- Working with Numbers and Strings** : the numeric types and their limits, character and string types across all encodings, Unicode console output, pseudo-random number generation and proper seeding, cooked and raw user-defined literals, raw string literals, a string helpers library, parsing and replacing with regular expressions, `std::string_view`, and the modern formatting stack (`std::format`, `std::print`, and formatters for user-defined types).

**Chapter 3 -- Exploring Functions** : defaulted and deleted functions, lambdas with the standard algorithms, generic and template lambdas, recursive lambdas (through C++23's deducing `this`), function templates from deduction to concepts, variadic function templates, fold expressions with all four expansion forms and every supported operator, hand-built implementations of the higher-order functions map and fold, function composition, and uniform invocation of anything callable with `std::invoke`.

Future phases will expand into containers and ranges, general-purpose utilities, and concurrency.

## Quality Infrastucture 

- All content is original writing.
- Every runnable code sample is compile-checked in CI-style tooling before publishing.
- Each feature is labeled with the standard that introduced it and the ones that refined it.
- Each chapter of this documination was inspired by modern c++ programming cookbook third edition by Marius Bancila I have sythensized all 750 pages and turned it into documentation for deeper understanding.
## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 1 | Core language features | Live |
| 2 | Numbers and strings | Live |
| 3 | Exploring functions | Live |
| 4 | TBD | Planned |

## Feedback

Spotted an error or want a topic covered? [Open an issue](https://github.com/GavynTech/modern-cpp-docs/issues).
