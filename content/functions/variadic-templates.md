---
title: Writing a function template with a variable number of arguments
description: Parameter packs and sizeof..., the recursive peel-one-off pattern, ending recursion with if constexpr, expansion patterns, and perfect forwarding through a pack.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Using fold expressions to simplify variadic function templates
  href: /functions/fold-expressions/
---

<span class="std">C++11: parameter packs</span> <span class="std">C++17: if constexpr</span>

C-style variadics (`printf`-style `...`) throw away the types and hope the caller and callee agree. Variadic *templates* keep every argument's type: a **parameter pack** holds zero or more template arguments, deduction fills it from the call, and everything stays fully type-checked. This is how `emplace_back`, `make_unique`, and `std::format` accept "whatever you pass."

## Parameter packs

```cpp
template<typename... Ts>          // template parameter pack: zero or more types
void log(const Ts&... values);    // function parameter pack: matching values

log();                            // Ts = {}
log(42);                          // Ts = {int}
log(1, 2.5, "three");             // Ts = {int, double, const char*}
```

`sizeof...(Ts)` (or `sizeof...(values)`) yields the number of elements as a constant — no relation to `sizeof` other than the spelling. A pack isn't an object: you can't index it, loop over it, or store it directly. You *expand* it, and before C++17 the main way to consume an expansion was recursion.

## The classic pattern: peel one, recurse on the rest

```cpp run
#include <print>
#include <string>

template<typename T>
T minimum(T value) { return value; }            // base case: one argument left

template<typename T, typename... Rest>
T minimum(T first, Rest... rest) {              // peel off one, recurse on the rest
    T tail = minimum(rest...);
    return tail < first ? tail : first;
}

int main() {
    std::println("{}", minimum(7, 2, 9, 4));
    std::println("{}", minimum(3.5, 1.25));
    std::println("{}", minimum(std::string("pear"), std::string("apple"), std::string("fig")));
}
```

`minimum(7, 2, 9, 4)` instantiates a chain: the four-argument version calls the three-argument version calls the two calls the one, which is the base-case overload. Each link is a real function, inlined away in practice — but conceptually your N-argument call built N instantiations, and the base case *must* exist or the recursion fails to compile at the bottom.

## C++17: one function, if constexpr ends the recursion

`if constexpr` discards the untaken branch at compile time, so the base case moves inside:

```cpp run
#include <print>

template<typename T, typename... Rest>
auto sum(T first, Rest... rest) {
    if constexpr (sizeof...(rest) == 0)
        return first;
    else
        return first + sum(rest...);   // not even instantiated when rest is empty
}

int main() {
    std::println("{}", sum(1, 2, 3, 4, 5));
    std::println("{}", sum(1.5, 2.25));
}
```

A plain `if` would fail here — both branches would compile, and `sum(rest...)` with an empty pack has no viable call. The `constexpr` discard is what makes single-function variadics possible.

## Expansion patterns

`pack...` expands to a comma-separated list, and whatever *pattern* sits before the `...` is applied to each element:

```cpp
template<typename... Ts>
void patterns(Ts... args) {
    g(args...);                          // g(a, b, c)          - plain expansion
    g(h(args)...);                       // g(h(a), h(b), h(c)) - pattern per element
    g((args + 1)...);                    // g(a+1, b+1, c+1)
    int squares[]{ (args * args)... };   // expand inside a braced list
    std::tuple<Ts...> saved{args...};    // a type pack and a value pack, in step
}
```

That last line is the answer to "how do I *store* a pack": you don't — you put it in a `std::tuple` and get it back with `std::apply` (covered at the end of this chapter).

## Perfect forwarding through a pack

The most-written variadic function in real codebases is a wrapper that passes its arguments to something else, unchanged. Pack + forwarding references + `std::forward` is the complete recipe — this is the shape of every `make_` and `emplace` function in the standard library:

```cpp run
#include <memory>
#include <print>
#include <string>
#include <utility>

struct connection {
    connection(std::string host, int port) {
        std::println("connect {}:{}", host, port);
    }
};

template<typename T, typename... Args>
std::unique_ptr<T> build(Args&&... args) {
    return std::make_unique<T>(std::forward<Args>(args)...);
}

int main() {
    auto db = build<connection>("db.internal", 5432);
    (void)db;
}
```

Note the pattern in the forward: `std::forward<Args>(args)...` expands *both* packs together — each value forwarded as its own deduced type, lvalues staying lvalues, rvalues staying movable.

## Guidelines

- Reach for a variadic template whenever "one or more arguments of caller's choice" appears — never C-style `...`.
- In C++17 and later, prefer the `if constexpr` form: one function, base case visible in context.
- Recursion peels O(N) instantiations; that's fine for argument lists, but the *next page* replaces most of these bodies with a single expression.
- Store packs in a `std::tuple`; expand them with patterns rather than trying to iterate.
- Wrappers take `Args&&...` and pass `std::forward<Args>(args)...` — memorize the pair as one unit.
