---
title: Writing a recursive lambda
description: Why a lambda can't name itself, the std::function and self-passing workarounds, and C++23's deducing this - the version that finally reads like recursion.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Writing function templates
  href: /functions/function-templates/
---

<span class="std">C++11: std::function</span> <span class="std">C++14: self-passing</span> <span class="std">C++23: deducing this</span>

A named function recurses by simply using its own name. A lambda has no name to use — the closure type is unnamed, and the variable you're assigning it to isn't usable inside its own initializer:

```cpp
auto fib = [](int n) {
    return n < 2 ? n : fib(n - 1) + fib(n - 2);   // error: 'fib' is not usable here
};
```

By the time the body is compiled, `fib`'s type is still being deduced *from this very lambda*. Three generations of workaround exist; C++23's is the one that stops feeling like a workaround.

## Workaround one: std::function names the type

Declare the variable with a concrete type first, and the body can capture and call it:

```cpp run
#include <functional>
#include <print>

int main() {
    // The name 'fib' has a real type before the lambda body needs it.
    std::function<long long(int)> fib = [&fib](int n) -> long long {
        return n < 2 ? n : fib(n - 1) + fib(n - 2);
    };

    // C++14 alternative: pass the lambda to itself. No type erasure,
    // but the trick leaks into every call site.
    auto fib2 = [](auto&& self, int n) -> long long {
        return n < 2 ? n : self(self, n - 1) + self(self, n - 2);
    };

    std::println("via std::function: {}", fib(30));
    std::println("via self-passing:  {}", fib2(fib2, 30));
}
```

The `std::function` version works since C++11 but bills you twice: every recursive step goes through a type-erased indirect call, and the lambda captures `fib` *by reference* — copy or move the `std::function` elsewhere and the copy's body still points at the original variable. Fine as a local; dangerous as an escapee.

## Workaround two: pass the lambda to itself

`fib2` above is the C++14 trick: a generic lambda receives itself as its first argument, so `self(self, ...)` recurses with zero overhead — the compiler sees the concrete closure type all the way down and can inline it. Note the explicit `-> long long`: a recursive call can't participate in deducing the return type it's part of, so recursive lambdas in any style spell the return type out.

The `fib2(fib2, 30)` call syntax is the tax. A small fixed-point helper hides it:

```cpp
template<typename F>
auto fix(F f) {
    return [f](auto&&... args) {
        return f(f, std::forward<decltype(args)>(args)...);
    };
}

auto fib = fix([](auto&& self, int n) -> long long {
    return n < 2 ? n : self(self, n - 1) + self(self, n - 2);
});
// fib(30) - callers no longer see the trick
```

## C++23: deducing this

Explicit object parameters let the closure receive *itself* the way member functions receive `this` — and the call sites go back to normal:

```cpp run
#include <print>
#include <vector>

struct node { int value; std::vector<node> children; };

int main() {
    auto fib = [](this auto self, int n) -> long long {
        return n < 2 ? n : self(n - 1) + self(n - 2);
    };
    std::println("fib(30) = {}", fib(30));

    // The pattern earns its keep on real structures:
    node tree{1, {{2, {{4, {}}, {5, {}}}}, {3, {}}}};

    auto sum = [](this auto self, const node& n) -> int {
        int total = n.value;
        for (const node& child : n.children) total += self(child);
        return total;
    };
    std::println("tree sum = {}", sum(tree));
}
```

`this auto self` takes the closure by value, which is free here because these closures capture nothing. A capturing recursive lambda should declare `this auto&& self` (or `this const auto& self`) so recursion doesn't copy the captures at every level. Everything else is ordinary: direct calls, full inlining, and the recursion reads exactly like the algorithm it implements.

## Choosing between them

| You have | Use |
|----------|-----|
| C++23 | `[](this auto self, ...)` — no ceremony, no overhead |
| C++14/17/20 | self-passing, wrapped in `fix` if it spreads |
| Only C++11, or you need to *store* the recursive callable in a type-erased slot anyway | `std::function` |

And one honest question belongs on the list: does this need to be a lambda at all? A local recursive helper that captures nothing is often clearest as a plain function — the lambda versions earn their place when the recursion needs captured state or has to travel inline with other code.

## Guidelines

- Always write the explicit return type on a recursive lambda; deduction cannot see through the recursive call.
- Prefer deducing `this` wherever C++23 is available — it's the only version with no distortion at either the definition or the call.
- In the self-passing pattern, keep `self` as `auto&&` and pass the lambda itself, never a `std::function` wrapper around it.
- If a `std::function`-based recursive lambda must escape its scope, it's broken by construction (reference capture of a dead variable) — restructure before it ships.
- Recursive lambdas with captures: take `this auto&& self`, or every level of recursion copies the captures.
