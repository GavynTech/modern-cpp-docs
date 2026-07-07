---
title: Implementing the higher-order functions map and fold
description: Building map and fold generically with invoke_result and inserters, fold direction, and their standard names - transform, accumulate, reduce, and C++23's fold_left.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Composing functions into a higher-order function
  href: /functions/composing-functions/
---

<span class="std">C++11 foundations</span> <span class="std">C++20: ranges</span> <span class="std">C++23: fold_left</span>

A *higher-order function* takes functions as arguments or returns one. Two of them are load-bearing for everything else: **map** (apply a function to every element, keep the shape) and **fold** (combine all elements into one value). C++ has shipped both for decades under other names — but implementing them yourself, once, is the fastest way to understand what `transform`, `accumulate`, and the ranges library are actually doing.

## Implementing map

The honest signature: given `f` and a container of `T`, return a container of *whatever `f` returns* — the element type is allowed to change:

```cpp
template<typename F, typename T>
auto mapf(F f, const std::vector<T>& in) {
    std::vector<std::invoke_result_t<F, T>> out;   // element type = f's result type
    out.reserve(in.size());
    std::transform(in.begin(), in.end(), std::back_inserter(out), f);
    return out;
}
```

`std::invoke_result_t<F, T>` asks, at compile time, "what does calling `F` with a `T` yield?" — that one trait is what lets `mapf` turn a `vector<string>` into a `vector<size_t>` without being told.

## Implementing fold

Fold has a direction. Folding left walks front-to-back, feeding an accumulator; folding right walks back-to-front:

```cpp
template<typename F, typename R, typename T>
T foldl(F f, const R& range, T init) {
    for (const auto& e : range) init = f(init, e);       // f(accumulator, element)
    return init;
}

template<typename F, typename R, typename T>
T foldr(F f, const R& range, T init) {
    for (auto it = std::rbegin(range); it != std::rend(range); ++it)
        init = f(*it, init);                             // f(element, accumulator)
    return init;
}

// foldl over {1,2,3} with '-' and 0:  ((0-1)-2)-3 = -6
// foldr over {1,2,3} with '-' and 0:  1-(2-(3-0)) =  2
```

Same elements, same operator, different programs — the mirror image of the previous page's left and right *fold expressions*, which are this exact idea applied to argument packs at compile time instead of ranges at run time.

## Map and fold together

The two compose naturally: map reshapes the elements, fold collapses them.

```cpp run
#include <algorithm>
#include <cctype>
#include <iterator>
#include <print>
#include <string>
#include <type_traits>
#include <vector>

template<typename F, typename T>
auto mapf(F f, const std::vector<T>& in) {
    std::vector<std::invoke_result_t<F, T>> out;
    out.reserve(in.size());
    std::transform(in.begin(), in.end(), std::back_inserter(out), f);
    return out;
}

template<typename F, typename R, typename T>
T foldl(F f, const R& range, T init) {
    for (const auto& e : range) init = f(init, e);
    return init;
}

int main() {
    std::vector<std::string> words{"map", "and", "fold"};

    // map: string -> length, then fold: lengths -> total
    auto lengths = mapf([](const std::string& w) { return w.size(); }, words);
    auto total = foldl([](std::size_t acc, std::size_t n) { return acc + n; },
                       lengths, std::size_t{0});
    std::println("total letters: {}", total);

    // map: uppercase each word, then fold: join with spaces
    auto shout = mapf([](std::string w) {
        for (char& c : w) c = static_cast<char>(std::toupper(static_cast<unsigned char>(c)));
        return w;
    }, words);
    auto joined = foldl([](std::string acc, const std::string& w) {
        return acc.empty() ? w : acc + " " + w;
    }, shout, std::string{});
    std::println("{}", joined);
}
```

Every data pipeline you've written is some arrangement of these two shapes; naming them just makes the arrangement visible.

## The standard library already ships them

Once the concepts are yours, use the standard spellings:

| Concept | Standard name | Since |
|---------|--------------|-------|
| map, eager | `std::transform` | C++98 |
| map, lazy | `std::views::transform` | C++20 |
| fold left | `std::accumulate` | C++98 |
| fold, parallelizable | `std::reduce` | C++17 |
| fold left, done right | `std::ranges::fold_left` | C++23 |

```cpp run
#include <algorithm>
#include <functional>
#include <print>
#include <ranges>
#include <string>
#include <vector>

int main() {
    std::vector<std::string> words{"higher", "order", "functions"};

    // Lazy map + eager fold: no intermediate vector is ever built.
    auto lengths = words | std::views::transform([](const auto& w) { return w.size(); });
    std::println("total letters: {}",
                 std::ranges::fold_left(lengths, 0uz, std::plus{}));

    auto squares = std::views::iota(1, 6)
                 | std::views::transform([](int n) { return n * n; });
    std::println("sum of squares 1..5: {}",
                 std::ranges::fold_left(squares, 0, std::plus{}));
}
```

Why <span class="std">C++23</span> added `fold_left` when `accumulate` existed: `accumulate` lives in `<numeric>`, doesn't take ranges or projections, and its result type is locked to the init parameter's type — a classic bug source (`accumulate(v, 0)` over doubles truncates every step). `fold_left` takes a range, deduces the result from the operation, and has siblings — `fold_right`, and `fold_left_first`, which uses the first element as the seed so empty ranges return an empty `optional` instead of a made-up zero. Prefer `std::reduce` only when you mean it: it's allowed to reorder, so the operation must be associative and commutative — that's the license parallel execution needs.

## Guidelines

- Implement `mapf` and `foldl` once as an exercise; ship `transform` / `fold_left` / views in production code.
- Let `std::invoke_result_t` compute result element types — never hardcode what `f` returns.
- Pick fold direction deliberately; with non-associative operations, left and right are different answers.
- `views::transform` over a temporary vector-of-results: laziness removes the allocation entirely.
- `accumulate`'s init parameter fixes the accumulator type — the `0` vs `0.0` trap. `fold_left` was designed so you stop having to remember this.
