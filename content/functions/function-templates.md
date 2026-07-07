---
title: Writing function templates
description: Template argument deduction and what it does to your arguments, non-type template parameters, overloading versus specialization, and constraining templates with C++20 concepts.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Writing a function template with a variable number of arguments
  href: /functions/variadic-templates/
---

<span class="std">C++14: return type deduction</span> <span class="std">C++17: auto non-type parameters</span> <span class="std">C++20: concepts, abbreviated templates</span>

A function template is a recipe the compiler cooks on demand: each distinct set of template arguments stamps out a separate, fully type-checked function. The mechanics are old; what's modern is how little of the machinery you have to spell — deduction fills in types, `auto` deduces returns, and concepts state requirements that used to live in comments.

## The shape, and what deduction fills in

```cpp run
#include <print>
#include <string>

template<typename T>
const T& largest(const T& a, const T& b) {
    return b > a ? b : a;
}

// Different parameters may need different type parameters;
// the return type can be left to deduction (C++14).
template<typename A, typename B>
auto sum(A a, B b) { return a + b; }

int main() {
    std::println("{}", largest(3, 7));
    std::println("{}", largest(std::string("ash"), std::string("oak")));
    // largest(3, 7.5);          // error: T deduced as both int and double
    std::println("{}", largest<double>(3, 7.5));  // explicit argument settles it
    std::println("{}", sum(3, 7.5));              // deduces double: 10.5
}
```

Deduction runs per argument and every conclusion must agree — `largest(3, 7.5)` fails not because it's meaningless but because `T` can't be two things. The fixes, in order of preference: separate type parameters (like `sum`), an explicit template argument at the call, or a cast that makes the arguments agree.

## What deduction does to your arguments

The parameter's form decides how faithfully the argument's type survives:

```cpp
template<typename T> void f(T x);     // by value: decays
template<typename T> void g(T& x);    // by reference: preserved
template<typename T> void h(T&& x);   // forwarding reference: binds to anything

int arr[3]{};
const int c = 1;

f(arr);   // T = int*           arrays decay to pointers
f(c);     // T = int            top-level const is dropped
g(arr);   // T = int[3]         references keep the real type
g(c);     // T = const int
h(42);    // T = int,        x is int&&
h(c);     // T = const int&, x is const int&  (reference collapsing)
```

By-value parameters *decay*: arrays become pointers, functions become function pointers, const falls away. Reference parameters see the true type. `T&&` on a deduced parameter is a *forwarding reference* — it accepts lvalues and rvalues alike and remembers which it got, the foundation `std::forward` builds on.

## Non-type template parameters

Templates also take *values* as parameters — compile-time constants baked into each instantiation:

```cpp run
#include <print>

template<int N>
constexpr long long power(long long base) {
    long long result = 1;
    for (int i = 0; i < N; ++i) result *= base;
    return result;
}

template<auto Divisor>                        // C++17: the constant's type is deduced
bool divisible(decltype(Divisor) n) { return n % Divisor == 0; }

int main() {
    std::println("2^10 = {}", power<10>(2));
    static_assert(power<8>(3) == 6561);       // usable at compile time, too
    std::println("{}", divisible<3>(42));
}
```

<span class="std">C++17</span> `template<auto N>` deduces the constant's type from the argument, so one template serves `divisible<3>` and `divisible<3L>` without a second type parameter. <span class="std">C++20</span> extends what can be a non-type parameter to floating-point values and many class types — string-literal wrapper types being the popular use.

## Overloading beats specialization

Function templates can be overloaded — with other templates and with plain functions — and can be explicitly specialized. These interact in a way worth memorizing:

```cpp
template<typename T> void serialize(T value);     // (1) primary template
template<typename T> void serialize(T* pointer);  // (2) overload: joins overload resolution
template<> void serialize<int>(int value);        // (3) specialization of (1): does NOT
```

Overload resolution considers (1) and (2) — never (3). Specializations only swap in the body *after* resolution has already picked their primary. That subtlety (plus the fact that partial specialization of function templates doesn't exist at all) leads to the standing advice: **customize function templates with overloads, not specializations**. A non-template overload is preferred on an exact match, which is usually exactly what you want.

## Constraining templates (C++20)

Requirements used to be documentation; concepts make them part of the signature, checked *before* the body is ever instantiated:

```cpp run
#include <concepts>
#include <print>

template<std::floating_point T>
T lerp_between(T a, T b, T t) { return a + t * (b - a); }

// Abbreviated form: every constrained-auto parameter is a template parameter.
auto twice(std::integral auto n) { return 2 * n; }

int main() {
    std::println("{}", lerp_between(0.0, 10.0, 0.25));
    std::println("{}", twice(21));
    // lerp_between(0, 10, 0.5);  // rejected at the signature: int isn't floating_point
}
```

The difference shows up in the error message: an unconstrained template fails somewhere inside its body, ten instantiation frames deep; a constrained one fails at the call site with the requirement by name. The abbreviated syntax (`std::integral auto n`) and the classic template head are the same feature at two levels of formality — and an unadorned `auto` parameter on a plain function makes it a template too, identical to the generic lambdas of two pages ago.

## Guidelines

- Let deduction work: explicit template arguments are for resolving genuine ambiguity, not decoration.
- Know the decay rules — most "template deduced the wrong type" bugs are by-value decay doing its documented job.
- Constrain every function template in a public interface; the concept is both the documentation and the firewall around your error messages.
- Customize behavior with overloads; treat explicit specialization of function templates as a red flag in review.
- Templates live in headers — the definition must be visible wherever instantiation happens. Plan file layout accordingly.
