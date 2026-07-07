---
title: Uniformly invoking anything callable
description: std::invoke's unified call rules for functions, member pointers, and functors; why projections accept &Type::member; invoke_r; and the invocation traits behind generic code.
section: Exploring functions
section_href: /#exploring-functions
---

<span class="std">C++17: std::invoke, std::apply</span> <span class="std">C++20: constexpr</span> <span class="std">C++23: std::invoke_r</span>

C++ has five kinds of callable and three call syntaxes. Free functions and function objects use `f(args)`; a pointer to member function needs `(obj.*pmf)(args)` or `(ptr->*pmf)(args)`; a pointer to data member isn't "called" at all, just accessed as `obj.*pmd`. Generic code can't special-case all of that — so the standard defines one operation, *INVOKE*, that does, and `std::invoke` exposes it directly.

## One syntax for every callable

```cpp run
#include <functional>
#include <print>
#include <string>

struct account {
    std::string owner;
    double balance = 0.0;
    void deposit(double amount) { balance += amount; }
};

double doubled(double x) { return 2 * x; }

int main() {
    account a{"gavin", 100.0};

    std::println("{}", std::invoke(doubled, 21.0));                    // free function
    std::println("{}", std::invoke([](int n) { return n + 1; }, 41));  // closure

    std::invoke(&account::deposit, a, 50.0);           // member function + object
    std::invoke(&account::deposit, &a, 25.0);          // member function + pointer
    std::invoke(&account::deposit, std::ref(a), 5.0);  // + reference_wrapper

    std::println("{}", std::invoke(&account::balance, a));  // data member: a read
}
```

The dispatch rules, in the order `std::invoke(f, a1, rest...)` tries them:

1. `f` is a pointer to **member function**: call it on `a1` — directly if `a1` is an object or reference, through `.get()` if it's a `std::reference_wrapper`, through `*a1` if it's a pointer (smart pointers included).
2. `f` is a pointer to **data member**: same three flavors of `a1`, no further arguments allowed — the "call" is an access that yields the member.
3. Anything else: plain `f(a1, rest...)`.

Nothing here is exotic at the call site — you'd rarely write `std::invoke(doubled, 21.0)` over `doubled(21.0)`. The feature exists for the code that *receives* callables.

## Why the library needs INVOKE — and what it gives you

`std::function`, `std::thread`, `std::async`, `bind_front`, and every predicate, comparator, and projection parameter in the ranges algorithms are specified to call through *INVOKE*. The practical consequence: **a pointer to member is a first-class callable everywhere the standard library accepts one**:

```cpp run
#include <algorithm>
#include <print>
#include <string>
#include <vector>

struct task {
    std::string name;
    bool done() const { return done_; }
    bool done_ = false;
};

int main() {
    std::vector<task> tasks{{"write", true}, {"review", false}, {"ship", false}};

    // Algorithms invoke their callables via std::invoke,
    // so member pointers work as predicates and projections:
    std::println("finished: {}", std::ranges::count_if(tasks, &task::done));
    std::println("first open: {}", std::ranges::find_if_not(tasks, &task::done)->name);

    std::ranges::sort(tasks, {}, &task::name);   // project each task to its name
    std::println("alphabetical first: {}", tasks.front().name);
}
```

That `&task::done` where a predicate belongs — no lambda wrapper — is INVOKE working on your behalf. This is the payoff of the projections introduced earlier in the chapter, now with the mechanism visible.

## Writing your own invoke-aware code

The moment a function of yours accepts a callable, three tools keep it generic and honestly constrained — `std::invocable` to state the requirement, `std::invoke_result_t` to name the result, `std::invoke` to make the call:

```cpp run
#include <concepts>
#include <functional>
#include <print>
#include <type_traits>
#include <utility>

template<typename F, typename... Args>
    requires std::invocable<F, Args...>
auto timed(F&& f, Args&&... args) -> std::invoke_result_t<F, Args...> {
    std::print("[call] ");
    return std::invoke(std::forward<F>(f), std::forward<Args>(args)...);
}

int square(int n) { return n * n; }

int main() {
    std::println("{}", timed(square, 12));
    std::println("{}", timed([](int a, int b) { return a + b; }, 20, 22));

    // C++23 invoke_r: invoke, then convert the result to R.
    std::invoke_r<void>(square, 5);                            // discard, explicitly
    std::println("{}", std::invoke_r<double>(square, 3) / 2);  // 4.5 - no integer division
}
```

Call through `std::invoke`, and `timed` automatically accepts member pointers too — the wrapper inherits the full callable zoo for free. <span class="std">C++23</span> `std::invoke_r<R>` performs the same dispatch and then converts the result to `R`: `invoke_r<void>` documents a deliberately discarded result, and a widening `invoke_r<double>` heads off surprises like integer division. Both are `constexpr` <span class="std">C++20</span>, so invocation machinery works in compile-time code.

For testing rather than calling, the trait family mirrors the concept: `std::is_invocable_v<F, Args...>`, `std::is_invocable_r_v<R, F, Args...>`, and `std::is_nothrow_invocable_v` answer "could this call compile (and throw)?" without making the call.

## The tuple variant: std::apply

When the arguments arrive packaged in a tuple — stored earlier from a parameter pack, perhaps — `std::apply` spreads them into the call:

```cpp
void plot(double x, double y);

auto point = std::tuple{1.5, 2.5};
std::apply(plot, point);                       // plot(1.5, 2.5)

auto w = std::make_from_tuple<widget>(point);  // same expansion, into a constructor
```

`apply` is specified in terms of INVOKE as well, so the callable may be anything this page covered — including a member pointer, with the object as the tuple's first element.

## Guidelines

- Generic code that receives a callable should call it with `std::invoke` — anything less rejects member pointers for no reason.
- Constrain with `std::invocable` and name results with `std::invoke_result_t`; together they make wrappers self-documenting.
- Exploit INVOKE at call sites: `&Type::member` is often the entire predicate or projection.
- Use `invoke_r<void>` to discard results on purpose, and `invoke_r<R>` when the natural result type isn't the one you need.
- Pack arguments into tuples to store them; `std::apply` (or `make_from_tuple`) is the sanctioned way back out.
