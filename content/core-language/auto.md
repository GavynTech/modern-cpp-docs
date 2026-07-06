---
title: Using auto whenever possible
description: Deduce types instead of spelling them - locals, qualifiers, return types, generic code, and the cases where auto surprises you.
section: Core language features
section_href: /#core-language-features
next:
  title: Creating type aliases and alias templates
  href: /core-language/type-aliases/
---

<span class="std">C++11</span> <span class="std">C++14: return deduction</span> <span class="std">C++20: auto parameters</span>

`auto` asks the compiler to deduce a declaration's type from its initializer. It uses the same rules as template argument deduction, which means it is never wrong about the type — the mistakes it eliminates are yours, not its. This page covers where deduction helps, exactly what it deduces, and the handful of cases where the deduced type is not what it looks like.

## Why deduce types

Writing types by hand fails in two directions. You can write a type that is *close enough to compile* but subtly wrong, and the compiler will insert a silent conversion:

```cpp
std::map<std::string, int> scores = /* ... */;

// Looks right. But the element type is std::pair<const std::string, int>,
// so this copies every pair on every iteration to fix up the mismatch.
for (const std::pair<std::string, int>& entry : scores) { /* ... */ }
```

Or the correct type is simply unknowable at the call site — every lambda has a unique, unnameable type:

```cpp
auto is_positive = [](int n) { return n > 0; };
```

With `auto`, the declaration is guaranteed initialized (deduction requires an initializer) and guaranteed to match. A complete example:

```cpp run
#include <map>
#include <print>
#include <string>
#include <vector>

int main() {
    auto count = 42;                  // int
    auto ratio = 4.2;                 // double
    auto title = std::string{"docs"}; // spell the type when it matters
    auto ids   = std::vector<int>{1, 2, 3};

    auto scores = std::map<std::string, int>{{"alice", 10}, {"bob", 20}};
    for (const auto& [player, score] : scores) {   // no silent copies
        std::println("{} scored {}", player, score);
    }

    std::println("{} {} {} {}", count, ratio, title, ids.size());
}
```

The `auto title = std::string{"docs"};` form is worth noting: when the deduced type would be wrong (`auto title = "docs"` deduces `const char*`), keep `auto` and put the type on the right. The declaration stays left-aligned and still cannot narrow or leave the variable uninitialized.

## What auto actually deduces

`auto` deduces the type of the initializer *after* stripping top-level references and top-level `const`. This is the single most important rule on this page:

```cpp run
#include <print>

int main() {
    int value = 10;
    int& ref  = value;

    auto a = ref;    // int  - the reference is dropped, a is a copy
    a += 1;          // modifies only the copy

    auto& b = ref;   // int& - ask for the reference explicitly
    b += 1;          // modifies value

    std::println("value = {}, copy = {}", value, a);  // value = 11, copy = 11
}
```

The same applies to `const`:

```cpp
const int limit = 100;
auto a = limit;        // int - top-level const dropped, a is mutable
const auto b = limit;  // const int - say what you mean
```

So the qualifiers always come from you, and they mean exactly what they mean on any other declaration:

| Form | Meaning |
|------|---------|
| `auto x = expr;` | Mutable copy |
| `const auto& x = expr;` | Read-only view, no copy |
| `auto& x = expr;` | Mutable reference |
| `auto* x = expr;` | Copy of a pointer (documents pointer-ness; `auto` alone also works) |
| `auto&& x = expr;` | Forwarding reference: binds to anything, preserves value category |

`auto&&` is the tool for generic code that must accept both lvalues and rvalues — it deduces `T&` for lvalues and `T&&` for rvalues, following the reference-collapsing rules.

## auto in functions

<span class="std">C++14</span> Functions can deduce their return type from their `return` statements:

```cpp
auto add(int a, int b) { return a + b; }   // returns int

auto pick(bool flag) {
    if (flag) return 1;
    return 2;        // OK - deduces int both times
    // return 2.0;   // error: conflicting deduction (int vs double)
}
```

All return statements must deduce the same type, and the function body must be visible to callers (deduction needs the definition), which makes deduced returns a better fit for internal code than for public APIs. For declarations that need the parameter names in the return type, use the trailing form:

```cpp
template <typename A, typename B>
auto multiply(A a, B b) -> decltype(a * b) { return a * b; }
```

If you need the return type deduced *with* its reference and const qualifiers intact — for example, a function returning a reference through generic code — use `decltype(auto)`:

```cpp
decltype(auto) front_of(auto& container) {
    return container.front();   // returns T&, not a copy
}
```

Be deliberate with `decltype(auto)`: unlike `auto`, it preserves everything, including a dangling reference to a local if you return one.

## Generic lambdas and auto parameters

<span class="std">C++14</span> Lambdas accept `auto` parameters, making the call operator a template. <span class="std">C++20</span> Regular functions can too — an *abbreviated function template*:

```cpp run
#include <print>
#include <string>
#include <vector>

// Exactly equivalent to: template <typename C> void print_all(const C&)
void print_all(const auto& container) {
    for (const auto& element : container) {
        std::println("{}", element);
    }
}

int main() {
    print_all(std::vector{1, 2, 3});
    print_all(std::vector<std::string>{"modern", "c++"});
}
```

Each `auto` in the parameter list introduces its own template parameter. This is deliberately lightweight generics: if you need to name the type, constrain two parameters to match, or specialize, write the `template` head instead.

## The surprises

**Braces deduce differently.** With `=` and braces, `auto` deduces `std::initializer_list`:

```cpp
auto a{42};     // int (since C++17; was initializer_list in C++11/14)
auto b = {42};  // std::initializer_list<int> - almost never what you want
```

**Proxy types leak through.** Some containers return proxy objects rather than real references, and `auto` faithfully deduces the proxy:

```cpp run
#include <print>
#include <vector>

int main() {
    std::vector<bool> flags{true, false, true};

    auto proxy = flags[0];   // std::vector<bool>::reference, NOT bool
    flags[0] = false;
    // proxy still refers into the vector, so it now reads false:
    std::println("proxy sees {}", static_cast<bool>(proxy));

    bool value = flags[2];   // force the conversion when you need a value
    std::println("value is {}", value);
}
```

The same pattern appears in expression-template libraries (linear algebra, big-int), where `auto result = a + b;` captures an unevaluated expression object. When a library documents proxy returns, spell the type.

**Unused-looking copies in loops.** `for (auto element : container)` copies every element. That is sometimes what you want; when it is not, the fix is one character: `for (auto& element : ...)` or `for (const auto& element : ...)`. The [range-based for page](/core-language/range-based-for/) covers choosing the binding.

## Guidelines

- Prefer `auto x = expr;` when the right-hand side already states the type or the exact type is irrelevant; prefer `auto x = Type{...};` when it is not.
- Always write the qualifiers you need: `const auto&` for read-only access, `auto&` to mutate, `auto&&` in generic code.
- Never `auto x = {...};` — brace-with-equals deduces `initializer_list`.
- Spell the type when the source returns a proxy (`std::vector<bool>`, expression templates).
- Use deduced return types for internal helpers; public APIs should state their return types.
