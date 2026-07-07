---
title: Using the indirection pattern for stringification and concatenation
description: Why # and ## refuse to expand their arguments, the two-level macro fix, and the patterns it unlocks - version strings, unique names, and assertion messages.
section: Preprocessing and compilation
section_href: /#preprocessing-and-compilation
next:
  title: Performing compile-time assertion checks with static_assert
  href: /preprocessing-compilation/static-assert/
---

<span class="std">C++11: __VA_ARGS__</span> <span class="std">C++20: __VA_OPT__</span>

The preprocessor has two operators no other part of C++ has. `#` turns a macro argument into a string literal (*stringification*), and `##` glues two tokens into one (*concatenation*). Both look trivial and both hide the same trap: used directly, they operate on the argument **as you spelled it**, not on what it expands to. The fix is a two-level idiom — the indirection pattern — that every serious macro toolkit is built on.

## The two operators

Inside a macro's replacement text, `#` before a parameter produces a string literal of that argument's tokens, and `##` between two tokens pastes them into a single token:

```cpp
#define SHOW(expr)      #expr              // SHOW(2 + 2)  ->  "2 + 2"
#define MEMBER(n)       field_##n          // MEMBER(id)   ->  field_id
```

Stringification even escapes embedded quotes and backslashes so the result is always a valid string literal. Pasting is stricter: the glued result must itself form a valid token — `field_##2` making `field_2` is fine, pasting `+` and `+` into `++` is fine, pasting `"a"` and `"b"` is not.

## The rule that breaks them

Normally, macro arguments are fully expanded *before* they are substituted into the replacement text. But there is one exception, straight from the standard: an argument that appears next to `#` or `##` is **not** expanded first. The operator sees the raw spelling:

```cpp run
#include <print>

#define VALUE 42

#define STRINGIFY_DIRECT(x)  #x
#define STRINGIFY_IMPL(x)    #x
#define STRINGIFY(x)         STRINGIFY_IMPL(x)

int main() {
    std::println("direct:   {}", STRINGIFY_DIRECT(VALUE));  // "VALUE"
    std::println("indirect: {}", STRINGIFY(VALUE));         // "42"
}
```

`STRINGIFY_DIRECT(VALUE)` prints `VALUE` — the macro name, not its value. Note that `STRINGIFY_IMPL` is *character-for-character identical* to `STRINGIFY_DIRECT`; the behavior difference comes entirely from the extra hop.

## How the indirection works

Walk through `STRINGIFY(VALUE)` one step at a time:

1. The preprocessor substitutes into `STRINGIFY`'s replacement text. Its parameter `x` is *not* adjacent to `#` or `##` there, so the argument is expanded first: `VALUE` becomes `42`.
2. The replacement now reads `STRINGIFY_IMPL(42)`.
3. `STRINGIFY_IMPL` stringifies *its* argument — which is already the expanded `42` — producing `"42"`.

The outer macro exists purely to force expansion; the inner macro applies the operator. Concatenation needs exactly the same ladder:

```cpp
#define CONCAT_IMPL(a, b)  a##b
#define CONCAT(a, b)       CONCAT_IMPL(a, b)
```

Without it, `CONCAT_IMPL(prefix_, __LINE__)` pastes the literal token `__LINE__`, producing the identifier `prefix___LINE__` — with it, the line number expands first and you get `prefix_42`. Define both macros once, centrally; every pattern below is built from them.

## Building strings at preprocessing time

The classic use is assembling a version string from numeric components. Stringify each number, and let a later translation phase — adjacent string literal concatenation — join the pieces:

```cpp run
#include <print>

#define STR_IMPL(x) #x
#define STR(x)      STR_IMPL(x)

#define VERSION_MAJOR 3
#define VERSION_MINOR 12
#define VERSION_PATCH 1

#define VERSION_STRING STR(VERSION_MAJOR) "." STR(VERSION_MINOR) "." STR(VERSION_PATCH)

int main() {
    std::println("libfoo v{}", VERSION_STRING);   // libfoo v3.12.1
}
```

The numbers stay numbers — usable in `#if VERSION_MAJOR >= 3` and in real code — while the string version is derived rather than maintained in parallel. Keeping one source of truth for something embedded in logs, `--version` output, and user agents is the entire point.

## Generating unique identifiers

Concatenating with `__LINE__` mints identifiers that cannot collide within a file — which is what you need when a macro must declare a variable the user never refers to. The canonical example is a scope logger (the same technique powers scope guards and benchmark timers):

```cpp run
#include <print>

#define CONCAT_IMPL(a, b) a##b
#define CONCAT(a, b)      CONCAT_IMPL(a, b)

struct LogScope {
    const char* name;
    explicit LogScope(const char* n) : name(n) { std::println("enter {}", name); }
    ~LogScope() { std::println("exit  {}", name); }
};

#define LOG_SCOPE(label) LogScope CONCAT(log_scope_, __LINE__){label}

int main() {
    LOG_SCOPE("main");
    {
        LOG_SCOPE("inner");
        std::println("doing the work");
    }
}
```

Each expansion declares `log_scope_15`, `log_scope_17`, and so on — distinct names, so two `LOG_SCOPE`s can coexist in one function. Where two expansions might share a line (macros expanding macros), the non-standard but universally supported `__COUNTER__` — a macro that increments on every expansion — is the sturdier ingredient.

## Stringifying expressions for diagnostics

`#` shines brightest in assertion-style macros, where the failure message should show *the code that failed*. Only the preprocessor can capture an expression's spelling:

```cpp run
#include <print>
#include <cstdlib>

[[noreturn]] void check_failed(const char* expr, const char* file, long line) {
    std::println(stderr, "CHECK failed: {} ({}:{})", expr, file, line);
    std::abort();
}

#define CHECK(cond) ((cond) ? (void)0 : check_failed(#cond, __FILE__, __LINE__))

int main() {
    CHECK(2 + 2 == 4);
    std::println("all checks passed");
}
```

A failing `CHECK(size <= capacity)` reports `CHECK failed: size <= capacity (buffer.cpp:81)` — the expression, verbatim, with its location. No runtime string building, no manual message. This is the one job where modern alternatives (`std::source_location` covers the file and line) still can't replace `#cond`.

## Variadic macros

<span class="std">C++11</span> A macro declared with a trailing `...` collects the remaining arguments into `__VA_ARGS__`, and `#__VA_ARGS__` stringifies the whole list at once. <span class="std">C++20</span> `__VA_OPT__(tokens)` expands its tokens only when `__VA_ARGS__` is non-empty — finally solving the dangling-comma problem without compiler extensions:

```cpp
#define TRACE(fmt, ...) log_line(fmt __VA_OPT__(,) __VA_ARGS__)

TRACE("starting");             // log_line("starting")        - no stray comma
TRACE("x = {}", x);            // log_line("x = {}", x)
```

## Guidelines

- Define `STR`/`STR_IMPL` and `CONCAT`/`CONCAT_IMPL` once in a central header and never write a bare `#` or `##` on macro arguments again — the direct forms are latent bugs waiting for an argument that is itself a macro.
- Use string literal adjacency (`"a" "b"`) to assemble compile-time strings from stringified pieces; keep numeric macros numeric and derive the strings.
- Reach for `__COUNTER__` over `__LINE__` when generated names might land on the same line; it is non-standard but supported by GCC, Clang, and MSVC alike.
- Reserve the preprocessor for what only it can do: capturing spellings (`#cond`), minting identifiers, and include-time decisions. For values and locations, `constexpr` and `std::source_location` are type-safe replacements.
- Parenthesize macro parameters in expansions (`((cond) ? ...)`) — arguments arrive as raw tokens and inherit none of the precedence you imagined.
