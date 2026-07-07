---
title: Using lambdas with standard algorithms
description: Capture semantics from value to init-capture, the closure type the compiler generates, and the lambda patterns that make the algorithm library click - including C++20 projections.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Using generic and template lambdas
  href: /functions/generic-lambdas/
---

<span class="std">C++11: lambdas</span> <span class="std">C++14: init captures</span> <span class="std">C++20: ranges algorithms and projections</span>

The standard algorithms are parameterized over *behavior*: what to count, how to order, which element to find. Before lambdas, supplying that behavior meant writing a named function object somewhere far from the call. A lambda puts the behavior in the argument list, where the reader is already looking — which is why lambdas and algorithms are effectively one feature used together.

## What a lambda actually is

A lambda expression is compiler shorthand for a class with a call operator. Captures become data members; the body becomes `operator()`:

```cpp
double limit = 100.0;
auto pricier = [limit](const order& o) { return o.total > limit; };

// is essentially:
class __closure {
    double limit;                              // captures become members
public:
    explicit __closure(double l) : limit(l) {}
    bool operator()(const order& o) const {    // const unless declared mutable
        return o.total > limit;
    }
};
```

Every lambda has a distinct, unnamed type — which is why you store them in `auto`. A lambda with *no* captures additionally converts to a plain function pointer, so it can feed C-style APIs.

## Captures: what, and more importantly, when

A capture copies (or references) the variable **when the lambda is created**, not when it's called. Reference captures see later changes; value captures don't:

```cpp run
#include <memory>
#include <print>
#include <string>

int main() {
    int rate = 3;
    auto by_value = [rate](int x) { return x * rate; };
    auto by_ref   = [&rate](int x) { return x * rate; };
    rate = 10;
    std::println("by value: {}", by_value(2));   // 6  - captured at creation
    std::println("by ref:   {}", by_ref(2));     // 20 - reads the current value

    // Init captures (C++14): a member initialized by any expression,
    // which is also how move-only things get into a lambda.
    auto owner = std::make_unique<std::string>("resource");
    auto sink = [p = std::move(owner)] { return p->size(); };
    std::println("owned length: {}", sink());
}
```

The working rules:

- `[x]` copies, `[&x]` references, `[this]` captures the enclosing object's pointer, `[*this]` <span class="std">C++17</span> copies the whole object.
- The defaults `[=]` and `[&]` capture *everything the body touches*. Fine for a lambda consumed on the same line; for anything stored, list captures explicitly so the reader can audit lifetimes.
- Init captures `[n = compute(), v = std::move(v)]` <span class="std">C++14</span> create members from arbitrary expressions — the only way to capture by move.
- Globals, statics, and constexpr constants aren't captured at all; the body just uses them.

## Lambdas meet the algorithms

This is the payoff. Predicates, comparators, and transformations become one-liners at the call site — and the C++20 ranges algorithms add **projections**, which peel a member out of each element so the lambda (when you still need one) shrinks to just the criterion:

```cpp run
#include <algorithm>
#include <functional>
#include <print>
#include <string>
#include <vector>

struct book { std::string title; int pages; double rating; };

int main() {
    std::vector<book> shelf{
        {"Systems", 512, 4.6}, {"Compilers", 800, 4.8},
        {"Networks", 350, 4.1}, {"Databases", 610, 3.9},
    };

    auto long_read = [](const book& b) { return b.pages > 500; };
    std::println("long reads: {}", std::ranges::count_if(shelf, long_read));

    // Projection: the comparator is stock, the projection picks the member.
    std::ranges::sort(shelf, std::ranges::greater{}, &book::rating);
    std::println("best: {}", shelf.front().title);

    // Predicate + projection: the lambda sees only the projected value.
    bool any_bad = std::ranges::any_of(
        shelf, [](double r) { return r < 4.0; }, &book::rating);
    std::println("anything under 4.0? {}", any_bad);
}
```

Naming the lambda (`long_read`) instead of inlining it is free documentation — the algorithm call reads as a sentence, and the same predicate serves several algorithms without duplication.

## Stateful lambdas

`mutable` lets the call operator modify the members that captures created. The classic use is a generator:

```cpp
std::vector<int> ids(5);
std::ranges::generate(ids, [n = 100]() mutable { return n++; });  // 100 101 102 103 104
```

Two cautions. Algorithms are allowed to *copy* function objects, so state may not accumulate where you expect — if the state must be shared, keep it outside and capture by reference. And comparators must stay pure: a `sort` comparator that mutates or answers inconsistently is undefined behavior, not just a wrong order.

## The dangling capture

Reference captures make lambdas cheap; they also make them time bombs when the lambda outlives the scope:

```cpp
auto make_greeter(const std::string& name) {
    return [&] { return "hi " + name; };   // dangles: 'name' dies at return
}
```

The rule that prevents every version of this bug: **a lambda that escapes the current scope — returned, stored, queued on a thread pool — captures by value or by init-capture move. Reference captures are for lambdas consumed in place**, like an algorithm argument.

## Guidelines

- Prefer an algorithm-plus-lambda over a raw loop: `count_if`, `any_of`, `find_if` state the intent in their names.
- List captures explicitly in any lambda that outlives its statement; save `[=]`/`[&]` for throwaways.
- Use init captures to move expensive or move-only state in, and to give captured copies decent names.
- Reach for projections before writing a lambda at all — `&book::rating` plus a stock comparator beats a hand-written one.
- Escaping lambda ⇒ value captures. No exceptions; this rule is cheaper than the debugging session.
