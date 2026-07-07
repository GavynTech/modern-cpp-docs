---
title: Composing functions into a higher-order function
description: A variadic compose() built from lambdas, pipeline direction, partial application with bind_front and bind_back, and why range adaptors made composition a core C++ idiom.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Uniformly invoking anything callable
  href: /functions/invoke/
---

<span class="std">C++14: returned closures</span> <span class="std">C++20: bind_front, range adaptors</span> <span class="std">C++23: bind_back</span>

Composition turns small functions into bigger ones without writing new bodies: `compose(f, g)` is the function that applies `g`, then hands the result to `f` — mathematics' `(f ∘ g)(x) = f(g(x))`. It's the second classic higher-order function pattern, and the previous page's map/fold pipelines are begging for it: instead of nesting calls inside out, you assemble the pipeline once and name it.

## Composing two functions

A lambda that captures both callables and forwards its arguments through the chain:

```cpp
template<typename F, typename G>
auto compose(F f, G g) {
    return [=](auto&&... xs) {
        return f(g(std::forward<decltype(xs)>(xs)...));
    };
}
```

Two details are doing quiet work. The parameter pack means `g` — the *first* function to run — may take any number of arguments; everything after it in the chain is unary, consuming the previous result. And the callables are captured by value: for the stateless lambdas that dominate composition this is free, and it keeps the composed function self-contained — no lifetime ties to the scope that built it.

## Composing any number

Recursion over the pack (or last page's fold thinking — this *is* a fold over ∘):

```cpp run
#include <cctype>
#include <print>
#include <string>
#include <utility>

template<typename F, typename G>
auto compose(F f, G g) {
    return [=](auto&&... xs) {
        return f(g(std::forward<decltype(xs)>(xs)...));
    };
}

template<typename F1, typename F2, typename... Fs>
auto compose(F1 f1, F2 f2, Fs... fs) {
    return compose(f1, compose(f2, fs...));
}

int main() {
    auto trim = [](std::string s) {
        auto b = s.find_first_not_of(' ');
        auto e = s.find_last_not_of(' ');
        return b == std::string::npos ? std::string{} : s.substr(b, e - b + 1);
    };
    auto upper = [](std::string s) {
        for (char& c : s) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        return s;
    };
    auto excite = [](std::string s) { return s + "!"; };

    auto shout = compose(excite, upper, trim);   // excite(upper(trim(x)))
    std::println("{}", shout("  keep going  "));
}
```

Mind the direction: `compose` follows the mathematical convention, so the **rightmost** function runs first. `compose(excite, upper, trim)` reads back-to-front as *trim, then upper, then excite* — name composed pipelines well, because the reading order is the one part newcomers trip on.

## Left-to-right pipelines: what the library chose

The standard library picked the other reading order. Range adaptors compose with `|`, data flowing left to right — and adaptor composition is real composition: partial pipelines are objects you can name, pass, and reuse before any data arrives:

```cpp run
#include <print>
#include <ranges>

int main() {
    auto evens   = std::views::filter([](int n) { return n % 2 == 0; });
    auto squared = std::views::transform([](int n) { return n * n; });

    auto pipeline = evens | squared;    // two adaptors fused into one - no range yet

    for (int n : std::views::iota(1, 11) | pipeline)
        std::print("{} ", n);
    std::println("");
}
```

You might be tempted to give your own `compose` an `operator|`. Resist doing it with unconstrained templates — `template<typename F, typename G> auto operator|(F, G)` matches nearly every pair of types in scope and will hijack expressions that had nothing to do with you. If you want pipeline syntax for arbitrary callables, wrap them in a named type first and define the operator on that type only. Most of the time, the honest answer is that ranges already provide the pipeline, and `compose` covers the rest.

## Composition's sibling: partial application

Fixing *some* arguments of a function also produces a new function — and the library does this one for you:

```cpp
auto scale = [](double factor, double x) { return factor * x; };

auto doubler = std::bind_front(scale, 2.0);           // C++20: binds leading args
auto halver  = std::bind_back(std::divides{}, 2.0);   // C++23: binds trailing args

// doubler(7)  == 14.0
// halver(7.0) ==  3.5
```

`bind_front` and `bind_back` compose beautifully with everything on this page: partially apply to get unary functions, then chain them with `compose` or a view pipeline. (The venerable `std::bind` with its `_1, _2` placeholders is superseded by these two plus lambdas — leave it in pre-C++20 code.)

## Value semantics of composed functions

A composed function *contains copies* of its ingredients. Consequences worth knowing:

- Stateless lambdas: copies are free; compose with abandon.
- Heavy captures: move them in — `compose(std::move(expensive), g)` — or the pipeline pays for copies at every level of nesting.
- Mutable state inside composed callables gets duplicated per copy of the composition; if calls must share state, capture a reference to state that outlives the pipeline — knowingly.

## Guidelines

- Build pipelines once, name them, reuse them — `auto normalize = compose(collapse_ws, trim, to_lower);` documents a policy in one line.
- Remember the direction: `compose` runs right-to-left, `|` runs left-to-right. Pick per audience, never mix in one expression.
- Prefer `bind_front`/`bind_back` over hand-rolled wrapper lambdas for fixing arguments; prefer either over `std::bind`.
- Don't define `operator|` on unconstrained template parameters; scope pipeline operators to your own wrapper type.
- If the data is a range, compose with views and let laziness delete the intermediate containers.
