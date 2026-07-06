---
title: Unnamed namespaces instead of static globals
description: Internal linkage done right - per-file helpers, ODR safety, and why static at namespace scope is the weaker tool.
section: Core language features
section_href: /#core-language-features
next:
  title: Inline namespaces and symbol versioning
  href: /core-language/inline-namespaces/
---

<span class="std">C++11: internal linkage for all members</span>

Every name you define at namespace scope has *linkage* — a rule about whether other translation units (other `.cpp` files) can refer to it. The default, external linkage, means every helper function in every `.cpp` file of your project shares one global namespace at link time. The unnamed namespace is how modern C++ makes a file's private helpers actually private: everything inside gets **internal linkage**, invisible outside the translation unit.

## The problem: your helpers are global by default

Two files, two authors, one innocent name:

```cpp
// parser.cpp
std::string normalize(const std::string& s) { /* lowercase */ }

// url.cpp
std::string normalize(const std::string& s) { /* strip trailing slash */ }
```

Both files compile. Then the link either fails with a duplicate-symbol error — the *good* outcome — or, if the definitions were `inline` or in templates, the linker silently keeps **one** of them and both callers get it: the One Definition Rule violation, undefined behavior with a habit of surfacing far from the cause. `normalize` was never meant to be visible outside its file in either case.

## The fix

```cpp run
#include <print>
#include <string>

namespace {
    // Everything in here is private to this translation unit. No other file
    // can call it, collide with it, or even observe that it exists.

    constexpr int max_retries = 3;

    struct RetryPolicy {                 // types work too - see below
        int attempts;
        bool exhausted() const { return attempts >= max_retries; }
    };

    std::string describe(const RetryPolicy& p) {
        return p.exhausted() ? "giving up" : "retrying";
    }
}

int main() {
    RetryPolicy policy{.attempts = 3};
    std::println("{} (max {})", describe(policy), max_retries);
}
```

An unnamed namespace behaves as if it had a unique, unutterable name per translation unit, followed by an implicit `using namespace` — so inside the file you use the names bare, and outside the file they cannot be named at all. Every `.cpp` file's unnamed namespace is distinct: ten files can each have their own `normalize`, `helper`, `impl` without any interaction.

## Why not just static?

`static` at namespace scope also gives internal linkage — it's the C way, and it still works. The unnamed namespace is preferred for concrete reasons:

- **It covers types.** `static struct RetryPolicy { ... };` is not a thing; classes, enums, and type aliases can only get TU-privacy from an unnamed namespace. If a "file-private" type with external linkage leaks into two files with different definitions, that's an ODR violation `static` cannot prevent.
- **It covers everything at once.** One block around the whole helper section, instead of remembering the keyword on each of a dozen declarations — and a reader sees the privacy boundary as a *region*, not a per-line detail.
- **`static` is overloaded.** The same keyword means "internal linkage" here, "one per class" on members, and "persists across calls" on locals. Reserving it for the latter two makes each use unambiguous.

One legacy note: since C++11, entities in unnamed namespaces are fully usable as template arguments (their internal linkage is real linkage), so the old C++03 objection is gone.

## The one rule: never in headers

An unnamed namespace in a header hands a *separate private copy* of everything in it to every file that includes the header:

```cpp
// config.h - DON'T DO THIS
namespace {
    int request_count = 0;    // every .cpp gets its OWN counter
}
```

Every translation unit now increments a different `request_count`, while every author believes there is one. The same applies to functions (code bloat, distinct addresses) and types (subtle: the type differs per TU, so templates instantiate separately). Unnamed namespaces belong in `.cpp` files, full stop. In headers, the tools are `inline` variables/functions <span class="std">C++17</span> for "one shared definition", or `constexpr` constants.

## Where the boundary pays off

Beyond collision-proofing, internal linkage is information the toolchain uses:

- The compiler *knows* every caller of an internal function is in the current TU — it can inline aggressively, change the calling convention, or delete the function once fully inlined.
- Dead internal helpers trigger `-Wunused-function`; dead external ones can't (some other TU might call them).
- Readers get the same guarantee: an unnamed-namespace function has no callers to search for elsewhere. Refactoring is local by construction.

## Guidelines

- Every function, variable, constant, and type used by only one `.cpp` file goes in an unnamed namespace at the top of that file.
- Prefer the unnamed namespace over namespace-scope `static`; let `static` keep its other two jobs.
- Never put an unnamed namespace in a header; use `inline` or `constexpr` there instead.
- If a helper graduates to being needed by a second file, *move it* to a named namespace in a real header — don't copy it, and don't widen the original quietly.
