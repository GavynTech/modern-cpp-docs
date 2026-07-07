---
title: Selecting branches at compile time with constexpr if
description: The discard rule and its limits, replacing SFINAE overload sets and recursion base cases, returning different types per branch, and C++23's if consteval.
section: Preprocessing and compilation
section_href: /#preprocessing-and-compilation
next:
  title: Providing metadata to the compiler with attributes
  href: /preprocessing-compilation/attributes/
---

<span class="std">C++17</span> <span class="std">C++20: is_constant_evaluated</span> <span class="std">C++23: if consteval</span>

`if constexpr` looks like an ordinary `if` with a keyword attached, and that modesty hides how much of this chapter it made obsolete. The condition must be a compile-time constant, and the branch not taken is **discarded** — inside a template, it is never instantiated, so it may contain code that would not even compile for the current type. One function with plain-looking branches now does what previously took an overload set, `enable_if` plumbing, or tag dispatch.

## One function instead of an overload set

The `describe` example from the previous page needed one carefully-constrained template per category. With `if constexpr` the categories become branches:

```cpp run
#include <print>
#include <string>
#include <type_traits>

template<typename T>
void describe(const T& value) {
    if constexpr (std::is_integral_v<T>) {
        std::println("integral: {}", value);
    } else if constexpr (std::is_floating_point_v<T>) {
        std::println("floating point: {}", value);
    } else if constexpr (std::is_same_v<T, std::string>) {
        std::println("string of {} chars", value.size());
    } else {
        std::println("something else");
    }
}

int main() {
    describe(42);
    describe(2.5);
    describe(std::string("hello"));
}
```

Look at the third branch: `value.size()` is only valid when `T` is `std::string`. For `describe(42)` that branch is discarded — not compiled, not instantiated, not an error. That is the feature. A regular `if` would have to compile every branch for every `T`, and `42 .size()` would sink the build.

## What "discarded" means — exactly

The discard rule has precise edges, and knowing them prevents the two classic surprises.

**Discarded code must still parse.** The preprocessor can delete arbitrary text; `if constexpr` cannot. Every branch must be syntactically valid C++.

**Only *dependent* invalid code is forgiven.** Names that don't depend on a template parameter are looked up when the template is defined, discarded branch or not — and outside a template, everything is checked regardless:

```cpp
void not_a_template() {
    if constexpr (false) {
        this_function_does_not_exist();   // error - discarding forgives nothing here
    }
}
```

`if constexpr` is a template-instantiation tool, not a substitute for `#if`. If the code in a branch can't compile *for any* instantiation, it's ill-formed; the escape only applies to code that's invalid *for some types* but valid for the ones that reach it.

**The condition is always evaluated.** There's no short-circuit for the test itself — `if constexpr (std::is_integral_v<T> && has_serialize<T>)` instantiates both traits for every `T`.

## Recursion without a base-case overload

Variadic templates used to end with a second, empty-pack overload just to stop the recursion. Discarding the recursive call does the same job in-line:

```cpp run
#include <print>

template<typename T, typename... Rest>
void print_row(const T& first, const Rest&... rest) {
    std::print("{}", first);
    if constexpr (sizeof...(rest) > 0) {
        std::print(" | ");
        print_row(rest...);          // discarded when the pack is empty -
    } else {                         // so no zero-argument overload is needed
        std::println("");
    }
}

int main() {
    print_row("id", 42, 2.5, 'x');
}
```

When `rest...` is empty, the recursive branch is discarded, so the call `print_row()` — which matches no declaration — is never generated. The termination condition and the work live in one function you can read top to bottom.

## Different types from different branches

In a function returning `auto`, discarded `return` statements don't participate in return type deduction. Each instantiation gets the type of the branch it actually keeps:

```cpp run
#include <print>
#include <string>
#include <type_traits>

template<typename T>
auto normalized(T value) {
    if constexpr (std::is_same_v<T, const char*>) {
        return std::string(value);     // this instantiation returns std::string
    } else {
        return value * 2;              // this one returns T
    }
}

int main() {
    std::println("{}", normalized(21));       // int 42
    std::println("{}", normalized("abc"));    // std::string "abc"
}
```

One spelling, two genuinely different signatures — `normalized<int>` returns `int` while `normalized<const char*>` returns `std::string`. This is something no runtime `if` can express, and it's the backbone of generic adapters that "pass through numbers, wrap strings"-style APIs are built from.

## What if constexpr is not

The keyword invites two misreadings, so to be explicit:

- **It does not make runtime conditions free.** The condition must be a constant expression; `if constexpr (argc > 1)` is an error, full stop. For runtime values you already have `if`.
- **It does not select overloads or class members.** It picks statements inside one function body. Choosing which function exists is `enable_if`/concepts (previous page); choosing class layout is partial specialization.

And one genuine trap when it meets its C++20 cousin. `std::is_constant_evaluated()` reports whether the current evaluation is happening at compile time — but the *condition of `if constexpr` is always evaluated at compile time*, so:

> `if constexpr (std::is_constant_evaluated())` is always true — you asked the question in a context that forced the answer. GCC and Clang both warn about it. Use a plain `if` with `is_constant_evaluated()`, or better, the C++23 syntax below.

## Asking a different question: if consteval

<span class="std">C++23</span> `if constexpr` asks "which branch should exist for this *type*?" `if consteval` asks "is this *call* happening during constant evaluation?" — letting one `constexpr` function take a fast compile-time path and a different runtime path:

```cpp run
#include <print>

constexpr int answer_source() {
    if consteval {
        return 1;      // taken when evaluated as a constant expression
    } else {
        return 2;      // taken for ordinary runtime calls
    }
}

int main() {
    constexpr int compile_time = answer_source();   // forced constant evaluation
    int run_time = answer_source();                  // ordinary call
    std::println("{} {}", compile_time, run_time);   // 1 2
}
```

The shape is easy to remember: `if consteval` takes no condition and no parentheses — the context *is* the condition. It also fixes the `is_constant_evaluated` trap by construction, since there's no boolean to accidentally feed into the wrong kind of `if`.

## Guidelines

- When branches differ by **type properties**, reach for `if constexpr` before designing an overload set — one readable function beats three constrained ones when no caller-facing filtering is needed.
- Use it to delete variadic base-case overloads: guard the recursive call with `if constexpr (sizeof...(rest) > 0)`.
- End exhaustive chains with `else static_assert(dependent_false<T>, "...")` — silence for unsupported types is how wrong instantiations ship.
- Remember the discard rule's limits: branches must parse, non-dependent errors are still errors, and it never replaces `#if` for platform-level exclusion.
- Never write `if constexpr (std::is_constant_evaluated())`; in C++23 write `if consteval`, before that a plain `if`.
