---
title: Conditionally compiling classes and functions with enable_if
description: SFINAE from first principles, the enable_if placement idioms and the redefinition trap, constraining class templates, and the C++17/C++20 replacements.
section: Preprocessing and compilation
section_href: /#preprocessing-and-compilation
next:
  title: Selecting branches at compile time with constexpr if
  href: /preprocessing-compilation/constexpr-if/
---

<span class="std">C++11: std::enable_if</span> <span class="std">C++14: std::enable_if_t</span>

The previous page ended on a distinction: `static_assert` is a wall, but sometimes you need a *filter* — a way to make a function template simply not exist for the wrong types, so overload resolution flows around it to a better candidate. For a decade, `std::enable_if` was how C++ spelled that. Concepts have since taken the job (and `if constexpr`, next page, took a related one), but `enable_if` is still everywhere: in every major library's internals, in every pre-C++20 codebase, and in every error message you'll ever debug through them.

## The rule it rides on: SFINAE

When the compiler considers a function template for a call, it substitutes the deduced template arguments into the declaration. If that substitution produces invalid code — in the *immediate context* of the declaration — the language rule is **S**ubstitution **F**ailure **I**s **N**ot **A**n **E**rror: the template is silently dropped from the candidate set instead of failing the build.

```cpp
template<typename T>
typename T::value_type first_of(const T& c) { return *c.begin(); }

int first_of(int x) { return x; }

first_of(std::vector<int>{1, 2});  // template: T::value_type is int - viable
first_of(7);                       // template: int::value_type is invalid ->
                                   // dropped without error; plain overload wins
```

SFINAE happens whether or not you invited it. `enable_if` is just a device for triggering it *on purpose*, from a condition you choose.

## What enable_if actually is

The entire facility is four lines — worth reading once, because it demystifies everything built on top:

```cpp
template<bool B, typename T = void>
struct enable_if {};                          // false: no ::type member

template<typename T>
struct enable_if<true, T> { using type = T; };  // true: ::type is T
```

`enable_if<true, int>::type` is `int`. `enable_if<false, int>::type` does not exist — and *naming a member that doesn't exist is a substitution failure*. Put `enable_if_t<condition, ...>` anywhere in a template's declaration, and the whole template evaporates from overload resolution exactly when the condition is false. (<span class="std">C++14</span> added the `enable_if_t` alias so code stops chanting `typename ... ::type`.)

## Where to put the condition

Three placements appear in real code. They behave identically when there's one overload — the differences surface the moment there are two:

| Idiom | Shape | Weakness |
|-------|-------|----------|
| Return type | `std::enable_if_t<cond, T> f(...)` | buries the signature; unusable for constructors |
| Defaulted type parameter | `template<typename T, typename = std::enable_if_t<cond>>` | mutually exclusive overloads collide (below) |
| Non-type parameter | `template<typename T, std::enable_if_t<cond, int> = 0>` | none worth mentioning — the recommended form |

The recommended form in action:

```cpp run
#include <print>
#include <type_traits>

template<typename T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
void describe(T) { std::println("integral"); }

template<typename T, std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
void describe(T) { std::println("floating point"); }

int main() {
    describe(42);        // integral
    describe(2.5);       // floating point
    // describe("hi");   // error: no matching function - both filtered out
}
```

When the condition is false, `enable_if_t` has no type to produce, the anonymous non-type parameter can't be declared, and that overload is gone. Each call sees exactly one survivor. Note the last line: filtering *every* candidate out is a feature — `describe` genuinely does not exist for pointers, and the error says so at the call site.

## The redefinition trap

Why not the tidier-looking defaulted *type* parameter? Because default template arguments are not part of a template's signature. Write two overloads that differ only there, and you haven't written two overloads — you've defined the same template twice:

```cpp
template<typename T, typename = std::enable_if_t<std::is_integral_v<T>>>
void describe(T);
template<typename T, typename = std::enable_if_t<std::is_floating_point_v<T>>>
void describe(T);   // error: redefinition of 'template<class T, class> void describe(T)'
```

The non-type idiom dodges this because the conditions live in the parameter's *type*, and `enable_if_t<is_integral_v<T>, int>` and `enable_if_t<is_floating_point_v<T>, int>` are different expressions — distinct signatures, legal overloads. This single trap is the reason the `int = 0` spelling became the community standard.

## Constraining a class template

Classes don't have overload resolution, but they have partial specialization — and SFINAE applies when the compiler tries to match a partial specialization's arguments. A defaulted extra parameter gives the condition somewhere to live:

```cpp run
#include <print>
#include <type_traits>

// Primary template: chosen whenever no specialization matches.
template<typename T, typename Enable = void>
struct Storage {
    static constexpr const char* strategy = "inline buffer";
};

template<typename T>
struct Storage<T, std::enable_if_t<(sizeof(T) > 16)>> {
    static constexpr const char* strategy = "heap allocation";
};

struct Small { int x; };
struct Big   { double a, b, c; };

int main() {
    std::println("Small: {}", Storage<Small>::strategy);
    std::println("Big:   {}", Storage<Big>::strategy);
}
```

`Storage<Big>` deduces the specialization's second argument as `enable_if_t<true>` — that's `void`, matching the default, so the specialization wins. For `Small` the substitution fails, the specialization is discarded, and the primary template serves. Selecting an entire class layout by a compile-time property of `T` is `enable_if` doing something `if constexpr` cannot: it changes *which type exists*, not which branch runs.

## Constructors — the place with no return type

Constructors can't use the return-type idiom and often can't add function parameters, which makes the non-type template parameter form the only clean option — this is where you'll meet it most in library code:

```cpp
class Seconds {
public:
    template<typename N, std::enable_if_t<std::is_arithmetic_v<N>, int> = 0>
    explicit Seconds(N count) : count_(static_cast<double>(count)) {}
private:
    double count_;
};
```

Without the constraint, `Seconds s{some_string};` would fail *inside* the constructor with a conversion error; with it, the constructor never matches and the error lands at the call site, pointing at the actual mistake.

## What replaced it

<span class="std">C++20</span> Concepts do the same filtering with a fraction of the syntax, and the compiler understands what you *meant* — constraint failures produce "constraint not satisfied" notes naming the requirement, not substitution archaeology:

```cpp
#include <concepts>

void describe(std::integral auto)        { std::println("integral"); }
void describe(std::floating_point auto)  { std::println("floating point"); }
```

Where the goal was never to steer overload resolution but to pick a *branch inside one function*, C++17's `if constexpr` — the next page — replaced whole enable_if overload sets with an ordinary-looking `if`. New code should reach for those. Read `enable_if` fluently anyway: the standard library's own headers are full of it, and "why doesn't this overload get chosen" bugs in existing code will be yours to solve.

## Guidelines

- In new C++20 code, write constraints as concepts (`std::integral auto`, `requires`-clauses); reserve `enable_if` for codebases and public APIs stuck on C++17 or below.
- When you do write it, use the non-type parameter idiom — `std::enable_if_t<cond, int> = 0` — everywhere, including constructors. It's the one placement without a trap.
- Never write two overloads differing only in a defaulted type parameter; that's a redefinition, not an overload set.
- Use `enable_if` (or concepts) when the wrong types should make a function *not exist*; use `static_assert` when they should produce your error message; the difference is whether another overload deserves a chance.
- Partial specialization plus `enable_if` remains the tool for choosing between *class* implementations by type properties — `if constexpr` only selects statements, not members or layouts.
