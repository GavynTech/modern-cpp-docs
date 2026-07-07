---
title: Providing metadata to the compiler with attributes
description: The standard attributes from C++11 to C++23 - nodiscard, deprecated, fallthrough, maybe_unused, likely, no_unique_address, and assume - and how to use each honestly.
section: Preprocessing and compilation
section_href: /#preprocessing-and-compilation
next:
  title: Using vector as a default container
  href: /containers-algorithms-iterators/vector/
---

<span class="std">C++11</span> <span class="std">C++17: nodiscard, fallthrough, maybe_unused</span> <span class="std">C++20: likely, no_unique_address</span> <span class="std">C++23: assume</span>

Attributes are structured metadata attached to code — facts you know that the language can't express in types: *this function never returns*, *ignoring this result is a bug*, *this fallthrough is deliberate*. Before C++11 each compiler had its own spelling (`__attribute__((...))`, `__declspec(...)`); the `[[attribute]]` syntax unified them, and each standard since has added a few with real teeth. They are the cheapest correctness tool in this chapter: one annotation, and the compiler starts catching a class of caller mistakes forever.

## The syntax and the contract

An attribute in `[[double brackets]]` appears before the entity it describes (or after its name), and standard attributes need no header, no library, no flags. Vendor extensions live in namespaces — `[[gnu::always_inline]]`, `[[msvc::no_unique_address]]` — and a `using` prefix applies one namespace to a whole list: `[[using gnu: hot, always_inline]]`.

The portability contract makes attributes safe to adopt: since C++17, a compiler must **ignore attributes it doesn't recognize** (at most warning), and `__has_cpp_attribute` lets you ask before relying on one:

```cpp
#if __has_cpp_attribute(assume) >= 202207L
    #define ASSUME(x) [[assume(x)]]
#else
    #define ASSUME(x)
#endif
```

## The standard set

Every attribute in the standard, in order of arrival:

| Attribute | Since | Meaning |
|-----------|-------|---------|
| `[[noreturn]]` | C++11 | this function never returns to its caller |
| `[[carries_dependency]]` | C++11 | memory-order arcana; effectively unused in practice |
| `[[deprecated]]`, `[[deprecated("why")]]` | C++14 | using this entity warns |
| `[[nodiscard]]` | C++17 | discarding the return value warns |
| `[[fallthrough]]` | C++17 | this case label falls through on purpose |
| `[[maybe_unused]]` | C++17 | don't warn if this entity goes unused |
| `[[nodiscard("why")]]` | C++20 | the warning now explains itself |
| `[[likely]]`, `[[unlikely]]` | C++20 | optimize for / against this branch |
| `[[no_unique_address]]` | C++20 | this member may share its address; empty types cost zero bytes |
| `[[assume(expr)]]` | C++23 | the optimizer may take `expr` as true, unchecked |

## Refusing to be ignored: [[nodiscard]]

The workhorse. On a function, discarding its return value draws a warning; on a **type**, every function returning that type inherits the behavior — which is exactly right for error codes and handles:

```cpp run
#include <print>

enum class [[nodiscard]] Status { ok, out_of_space, io_error };

Status write_block(int block) {
    return block < 8 ? Status::ok : Status::out_of_space;
}

int main() {
    // write_block(3);        // warning: ignoring returned value of type 'Status'

    if (auto s = write_block(9); s != Status::ok) {
        std::println("write failed - handling it");
        return 0;
    }
    std::println("write succeeded");
}
```

Marking the `Status` *type* once beats remembering to mark fifty functions. <span class="std">C++20</span> added the reason string — `[[nodiscard("the lock releases when the guard dies")]]` — and blessed `[[nodiscard]]` on constructors, which is how a misuse like `std::lock_guard{m};` (a temporary that unlocks immediately) becomes a warning instead of a race condition.

## Managing an API's lifecycle: [[deprecated]]

Deprecation with a message is a migration note delivered at the exact moment someone types the old name:

```cpp
[[deprecated("use parse_config(std::string_view) - path overload goes away in 4.0")]]
Config parse_config(const char* path);
```

Every caller gets the sentence in their build log, with a pointer to the replacement. Attach it to functions, types, namespaces, enumerators, variables — anything nameable. Pair it with a version plan: deprecate in one release, remove in the next.

## Silencing exactly the right warnings

Good builds run with `-Wall -Wextra`, and two attributes exist so *intentional* code doesn't drown real warnings in noise. `[[fallthrough]]` marks a deliberate case fallthrough; `[[maybe_unused]]` marks entities that are conditionally used — parameters consumed only in debug builds, variables only touched under some `#if`:

```cpp run
#include <print>

int flags_for(char category, [[maybe_unused]] bool verbose) {
    int flags = 0;
    switch (category) {
        case 'a':
            flags |= 0b01;
            [[fallthrough]];       // 'a' implies everything 'b' implies
        case 'b':
            flags |= 0b10;
            break;
        default:
            break;
    }
#ifdef ENABLE_TRACE
    if (verbose) std::println("flags = {:#b}", flags);
#endif
    return flags;
}

int main() {
    std::println("{} {}", flags_for('a', true), flags_for('b', false));
}
```

Without the attributes, `-Wextra` flags both the fallthrough and (when `ENABLE_TRACE` is off) the unused parameter. With them, the warnings vanish **for these lines only** — unlike a global `-Wno-...`, which would silence the accidents too. That asymmetry is the entire value: annotate the intentional, keep warnings loud for everything else.

## Zero-cost members: [[no_unique_address]]

Every member normally occupies at least one byte, so a stateless policy object — a comparator, an allocator, a hasher — inflates the struct that carries it. `[[no_unique_address]]` lets an empty member overlap with others, costing nothing:

```cpp run
#include <print>

struct DefaultCompare {};    // stateless policy

struct Plain {
    int* data;
    DefaultCompare cmp;      // 1 byte + 7 bytes padding
};

struct Packed {
    int* data;
    [[no_unique_address]] DefaultCompare cmp;   // overlaps - zero bytes
};

int main() {
    std::println("Plain:  {} bytes", sizeof(Plain));    // 16
    std::println("Packed: {} bytes", sizeof(Packed));   // 8
}
```

This replaced the contortion known as the empty-base-optimization hack (inheriting from the policy just to make it free). One honest footnote: MSVC ignores the standard spelling for ABI reasons and requires `[[msvc::no_unique_address]]` — the rare standard attribute with a portability asterisk.

## Steering the optimizer: [[likely]], [[unlikely]], and [[assume]]

`[[likely]]` and `[[unlikely]]` annotate statements — most usefully a branch — to tell the optimizer which path is hot, so it can lay out code for the common case:

```cpp
if (rc != 0) [[unlikely]] {
    log_error(rc);       // error path: keep it out of the hot cache lines
    return rc;
}
```

Use them for paths that are *structurally* rare — error handling, cold initialization — not for guesses about data. Where you have profiles, profile-guided optimization beats hand annotation; where you don't, an incorrect `[[likely]]` quietly pessimizes every call.

<span class="std">C++23</span> `[[assume(expr)]]` is the sharpest tool on this page: the expression is **not evaluated and not checked** — the optimizer simply gets to treat it as true. If it's ever false, the program has undefined behavior. In exchange, the compiler can delete work it can't otherwise prove unnecessary:

```cpp run
#include <print>

int fast_bucket(int i) {
    [[assume(i >= 0)]];
    return i % 8;        // sign handling for i % 8 can be dropped entirely
}

int main() {
    std::println("{}", fast_bucket(1234));
}
```

`i % 8` for possibly-negative `i` needs extra instructions to honor C++'s signed-remainder rules; the assumption lets the compiler emit a single masking operation. Treat `[[assume]]` like `unsafe`: only state what a `static_assert` *would* verify if the value were constant, keep the expression side-effect-free, and comment where the guarantee comes from.

## Never coming back: [[noreturn]]

Functions that always throw, abort, or exit should say so — it lets the compiler drop dead code after the call and silences "control reaches end of non-void function" in callers:

```cpp
[[noreturn]] void fatal(const char* msg) {
    std::println(stderr, "fatal: {}", msg);
    std::abort();
}
```

(The `check_failed` helper on the stringification page earlier in this chapter wears the same attribute — assertion handlers are the canonical use.) Lying here is undefined behavior: `[[noreturn]]` on a function that returns is a promise the optimizer will collect on.

## Guidelines

- Put `[[nodiscard]]` on every error-code type, factory, and RAII handle — mark types rather than functions where possible, and give C++20 reason strings so the warning teaches.
- Deprecate with messages that name the replacement and the removal version; an unexplained `[[deprecated]]` is just nagging.
- Use `[[fallthrough]]` and `[[maybe_unused]]` to keep `-Wall -Wextra` viable — silence individual intentional sites, never whole warning classes.
- Reach for `[[no_unique_address]]` whenever a struct carries a possibly-empty policy member; remember MSVC needs its vendor spelling.
- Treat `[[likely]]`/`[[unlikely]]` as documentation for structurally-cold paths and `[[assume]]` as a loaded weapon: both are promises, and false promises are pessimization or UB, not "hints."
- Attributes are for facts the type system can't state. If a type can carry the fact (`std::optional` over "may be null"), prefer the type.
