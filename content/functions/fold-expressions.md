---
title: Using fold expressions to simplify variadic function templates
description: The four fold forms and their exact expansions, all 32 supported binary operators, empty-pack rules, and the folds that replace entire recursive overload sets.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Implementing the higher-order functions map and fold
  href: /functions/map-fold/
---

<span class="std">C++17</span>

The previous page consumed parameter packs by recursion: peel an argument, recurse, and keep a base-case overload around to stop the chain. Fold expressions delete all of that. A fold applies a binary operator across an entire pack **in one expression** — the compiler writes the chain of operations for you, right there, with no recursion and no base case.

```cpp
// Recursive (C++11): two functions and O(N) instantiations.
template<typename T> auto sum(T x) { return x; }
template<typename T, typename... Rest>
auto sum(T first, Rest... rest) { return first + sum(rest...); }

// Fold (C++17): one function, one expression.
template<typename... Ts>
auto sum(Ts... args) { return (args + ...); }
```

## What the compiler does with a fold expression

When the compiler encounters a fold expression, it expands it into one of the following four forms — where `E1, E2, …, EN` are the elements the pack expands to, `op` is the operator, and `init` is an ordinary expression you supply:

| Fold | You write | The compiler expands it to |
|------|-----------|----------------------------|
| Unary left fold | `(... op pack)` | `((E1 op E2) op E3) op … op EN` |
| Unary right fold | `(pack op ...)` | `E1 op (E2 op (… op (EN-1 op EN)))` |
| Binary left fold | `(init op ... op pack)` | `(((init op E1) op E2) op …) op EN` |
| Binary right fold | `(pack op ... op init)` | `E1 op (E2 op (… op (EN op init)))` |

Reading the syntax: the `...` sits on the side where the grouping *starts* — dots on the left mean the expansion parenthesizes from the left. Binary folds add an `init` expression on the outer side of the dots, and both `op`s in a binary fold must be the same operator. The surrounding parentheses are part of the grammar, not style: `return args + ...;` doesn't parse, `return (args + ...);` does.

Concretely:

```cpp
template<typename... Ts>
auto sum(Ts... args) { return (args + ...); }        // unary right fold
sum(1, 2, 3, 4);   // expands to: 1 + (2 + (3 + 4))

template<typename... Ts>
auto sum0(Ts... args) { return (0 + ... + args); }   // binary left fold
sum0(1, 2, 3);     // expands to: ((0 + 1) + 2) + 3
```

## The operators fold expressions support

A fold can be built over any of these 32 binary operators — and only these:

```text
+    -    *    /    %    ^    &    |    <<   >>
+=   -=   *=   /=   %=   ^=   &=   |=   <<=  >>=   =
==   !=   <    >    <=   >=   &&   ||   ,    .*    ->*
```

Everything binary made the list, including assignment, the compound assignments, the comma operator, and the pointer-to-member operators `.*` and `->*`. Notably absent: `<=>` — the spaceship arrived in C++20 and was never added to the fold grammar, so comparisons don't fold. Neither do function-call syntax or subscripting; if you need "call `f` on each element," that's the comma fold below.

## Empty packs

A variadic template accepts zero arguments, so every fold must answer: what does `sum()` mean? For a **unary** fold over an empty pack, the language defines exactly three answers:

- `&&` folds to `true`
- `||` folds to `false`
- `,` folds to `void()`

Any *other* operator folded over an empty pack is a compile error. **Binary** folds sidestep the problem entirely — the `init` value is the answer. That's the practical reason to default to binary folds with the operation's identity element: `(0 + ... + args)` makes `sum()` a well-formed `0`, and `(1 * ... * args)` makes an empty product `1`.

## Left versus right matters

For associative operations on one type, left and right folds agree. The moment the operator isn't associative, they're different programs:

```cpp run
#include <print>

template<typename... Ts>
auto sub_left(Ts... xs) { return (... - xs); }    // ((10 - 3) - 2)

template<typename... Ts>
auto sub_right(Ts... xs) { return (xs - ...); }   // 10 - (3 - 2)

int main() {
    std::println("left:  {}", sub_left(10, 3, 2));   // 5
    std::println("right: {}", sub_right(10, 3, 2));  // 9
}
```

Left folds also match how humans read `a - b - c`, and how the binary operators associate in ordinary code — a sensible default when either would compute the same value.

## Folds at work

```cpp run
#include <print>
#include <vector>

template<typename... Ts>
auto sum(Ts... xs) { return (0 + ... + xs); }        // binary left: empty-safe

template<typename... Bs>
bool all_true(Bs... bs) { return (bs && ...); }      // unary &&: empty pack is true

template<typename... Ts>
void append_all(std::vector<int>& v, Ts... xs) {
    (v.push_back(xs), ...);                          // comma fold: a statement per element
}

int main() {
    std::println("{}", sum(1, 2, 3, 4));
    std::println("{}", sum());                       // 0 - thanks to the init value
    std::println("{}", all_true(true, 4 > 2));

    std::vector<int> v;
    append_all(v, 1, 2, 3);
    std::println("appended {} elements", v.size());
}
```

The comma fold deserves its own sentence: `(f(args), ...)` runs `f` on every pack element, in order, as a single expression — it is the fold that turned "apply this to each argument" from a recursive template into one line.

The `init` of a binary fold doesn't have to be a number, either. The most famous fold in C++ threads a stream through the whole pack:

```cpp
#include <iostream>

template<typename... Ts>
void log_line(const Ts&... parts) {
    (std::cout << ... << parts) << '\n';   // binary left fold, init = std::cout
}
// log_line("x = ", 42, ", y = ", 3.5);
```

Each `<<` returns the stream, which becomes the left operand of the next `<<` — the expansion `(((std::cout << p1) << p2) << p3)` is exactly what you'd have written by hand.

## Guidelines

- Default to a **binary left fold with the identity element** — `(0 + ... + args)` — it's empty-pack-safe and groups the way readers expect.
- Use unary `&&`, `||`, and `,` folds freely; their empty-pack values are defined and sensible.
- Reach for the comma fold whenever the old code said "recurse just to call something per argument."
- Both operators in a binary fold must match, parentheses are mandatory, and `<=>` doesn't fold — three rules that cover most first-day surprises.
- If a variadic template still has a recursive base-case overload, ask whether a fold deletes it; the answer is usually yes.
