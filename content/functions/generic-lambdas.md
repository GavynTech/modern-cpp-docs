---
title: Using generic and template lambdas
description: auto parameters as invisible templates, C++20 template heads on lambdas, constraining closure parameters with concepts, and perfect forwarding inside a lambda.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Writing a recursive lambda
  href: /functions/recursive-lambda/
---

<span class="std">C++14: auto parameters</span> <span class="std">C++20: template lambdas, concepts</span>

A lambda whose parameters are `auto` isn't dynamically typed — it's a template. Each call instantiates the call operator for the argument types at hand, with all the usual compile-time checking. That one idea lets a single closure serve every type it makes sense for, and C++20's template lambdas finish the job by giving you the template head back when `auto` alone can't say what you mean.

## auto parameters create a template

```cpp
auto add = [](auto a, auto b) { return a + b; };

// The closure type behind it:
struct __closure {
    template<typename A, typename B>          // each auto is an independent parameter
    auto operator()(A a, B b) const { return a + b; }
};
```

Because `operator()` is a member *template*, one lambda object handles every viable combination — and produces a normal template error for the rest:

```cpp run
#include <algorithm>
#include <print>
#include <string>
#include <vector>

int main() {
    auto add = [](auto a, auto b) { return a + b; };
    std::println("{}", add(2, 3));                        // int + int
    std::println("{}", add(2.5, 4));                      // double + int
    std::println("{}", add(std::string("mod"), "ern"));   // string + const char*

    // One comparator, any element type that defines <
    auto descending = [](const auto& x, const auto& y) { return y < x; };

    std::vector v{3, 1, 4, 1, 5};
    std::vector<std::string> w{"cherry", "apple", "banana"};
    std::ranges::sort(v, descending);
    std::ranges::sort(w, descending);
    std::println("{} {}", v.front(), w.front());
}
```

This is the same mechanism behind the *transparent* function objects — `std::plus<>`, `std::less<>` — whose call operators are templates for exactly this reason.

## When auto isn't enough

Three things a plain `auto` parameter cannot express:

- **Naming the type.** Traits, casts, and declarations need a name; the workaround is `std::decay_t<decltype(x)>`, which works and reads terribly.
- **Relating two parameters.** `[](auto a, auto b)` deduces `a` and `b` independently — there is no way to demand they match.
- **Seeing through a type.** Given a `std::vector<T>` argument, `auto` gives you the vector; it can't hand you `T`.

## C++20: the template head returns

Template lambdas put explicit template parameters — and constraints — back on the closure:

```cpp run
#include <concepts>
#include <print>
#include <string>
#include <vector>

int main() {
    // Same-type constraint: both parameters deduce the one T.
    auto same_add = []<typename T>(T a, T b) { return a + b; };
    std::println("{}", same_add(2, 3));
    std::println("{}", same_add(std::string("a"), std::string("b")));
    // same_add(2, 3.5);   // error: T deduced as both int and double

    // The element type, by name - impossible with a plain auto parameter.
    auto middle = []<typename T>(const std::vector<T>& v) -> T {
        return v[v.size() / 2];
    };
    std::println("{}", middle(std::vector{1, 2, 3}));

    // Concept-constrained parameters read like types.
    auto halve = [](std::integral auto n) { return n / 2; };
    std::println("{}", halve(9));
}
```

Constraints work everywhere they do on ordinary templates: a `requires` clause after the parameter list, a concept in the template head, or — lightest of all — a concept in front of `auto`, as in `halve`.

## Perfect forwarding inside a lambda

Forwarding is where the C++14 and C++20 spellings differ most:

```cpp
// C++14: auto&& is a forwarding reference, but the type has no name,
// so forwarding goes through decltype - it works, and reads like a puzzle.
auto relay14 = [](auto&&... args) {
    return target(std::forward<decltype(args)>(args)...);
};

// C++20: a real template head - forwarding reads like a function template.
auto relay20 = []<typename... Ts>(Ts&&... args) {
    return target(std::forward<Ts>(args)...);
};
```

Both are correct; the second one is the one your reviewers parse on the first pass.

## One generic lambda, many alternatives: visitors

Generic lambdas are the natural visitors for `std::variant`, and combining them with the *overloaded* idiom builds a complete visitor from cases:

```cpp
template<class... Fs> struct overloaded : Fs... { using Fs::operator()...; };

std::variant<int, std::string> field = std::string("42");
std::visit(overloaded{
    [](int n) { std::println("number {}", n); },
    [](const std::string& s) { std::println("text '{}'", s); },
}, field);
```

The generic-lambda machinery is what makes each case its own overload of a single call operator. Variants get their full treatment in a later chapter; this is the shape to remember.

## Guidelines

- Reach for `auto` parameters whenever the body is type-agnostic — comparators, accumulators, small adapters.
- The moment you write `decltype` gymnastics inside a C++14 generic lambda, upgrade it to a C++20 template lambda.
- Constrain generic lambdas exposed through an API: `std::integral auto` documents and enforces in three tokens.
- Use `[]<typename T>(T a, T b)` when parameters must agree — deduction mismatches then fail at the call, not deep in the body.
- Prefer `[]<typename... Ts>(Ts&&...)` with `std::forward<Ts>` for forwarding wrappers; save `decltype` forwarding for pre-C++20 code.
