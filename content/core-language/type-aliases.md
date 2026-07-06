---
title: Creating type aliases and alias templates
description: The using declaration as the full replacement for typedef, and alias templates for parameterized type names.
section: Core language features
section_href: /#core-language-features
next:
  title: Understanding uniform initialization
  href: /core-language/uniform-initialization/
---

<span class="std">C++11</span>

A type alias gives an existing type a new name. C++ has had `typedef` since C, but modern code uses `using` declarations for two reasons: the syntax reads left-to-right like every other declaration, and only `using` can be templated. There is nothing `typedef` can do that `using` cannot.

## The syntax, side by side

The alias name always comes first with `using`, no matter how complicated the type:

```cpp
// Simple types - identical either way, but note the word order.
typedef unsigned long long user_id_t;
using user_id = unsigned long long;

// Function pointers - typedef buries the name in the middle.
typedef bool (*legacy_filter)(int);
using filter = bool (*)(int);

// Arrays - same problem.
typedef int legacy_board[8][8];
using board = int[8][8];

// Pointer to member function.
using handler = void (Widget::*)(int);
```

A complete program:

```cpp run
#include <cstdint>
#include <map>
#include <print>
#include <string>
#include <vector>

using user_id = std::uint64_t;
using filter  = bool (*)(int);

bool is_even(int n) { return n % 2 == 0; }

int main() {
    user_id next = 1001;
    filter f = is_even;

    using scores_by_name = std::map<std::string, std::vector<int>>;
    scores_by_name scores{{"alice", {90, 85}}, {"bob", {70}}};

    std::println("id {}, is_even(4): {}, players: {}",
                 next, f(4), scores.size());
}
```

Aliases can appear at namespace scope, class scope, function scope, and inside templates. They obey normal scoping: an alias declared inside a function is invisible outside it.

## Alias templates

This is the feature `typedef` cannot express at all: an alias parameterized on types. The classic use is fixing some parameters of a template while leaving others open:

```cpp run
#include <map>
#include <print>
#include <string>
#include <vector>

// A "dictionary" is always keyed by string; the value type stays open.
template <typename T>
using dictionary = std::map<std::string, T>;

// Fix an allocator across a whole codebase in one place.
template <typename T>
using vec = std::vector<T>;   // swap in std::pmr::vector<T> project-wide later

int main() {
    dictionary<int> ages{{"alice", 30}, {"bob", 25}};
    dictionary<vec<double>> samples{{"sensor-1", {0.5, 0.7}}};

    std::println("{} entries, first sample {}",
                 ages.size(), samples["sensor-1"].front());
}
```

Before alias templates, the workaround was a struct with a nested `type` member — you still see it in older code and in the standard library's `_t` helpers:

```cpp
// The old idiom this feature replaced:
template <typename T>
struct dictionary_holder {
    typedef std::map<std::string, T> type;
};
dictionary_holder<int>::type ages;   // verbose, needs ::type everywhere

// The standard library itself migrated:
std::remove_const<T>::type   // C++11 idiom (requires typename in templates)
std::remove_const_t<T>       // C++14 alias template
```

Two rules to know:

- **Alias templates cannot be partially or explicitly specialized.** If you need `dictionary<bool>` to be a different type than the general case, you need a class template (or a trait struct) instead, because specialization dispatch happens on real templates.
- **Alias templates are transparent to deduction — mostly.** In a function template, `dictionary<T>` in a parameter type deduces `T` fine because it expands immediately. But an alias is never a distinct type: overloads cannot distinguish `user_id` from `std::uint64_t`.

## Aliases do not create new types

An alias is purely a new spelling. `user_id` and `std::uint64_t` are the same type, so the compiler will happily pass a `product_id` where a `user_id` is expected if both alias the same integer:

```cpp
using user_id    = std::uint64_t;
using product_id = std::uint64_t;

void charge(user_id user, product_id product);
charge(product, user);   // compiles: both are uint64_t. The bug ships.
```

Aliases still buy documentation and single-point-of-change (migrating `user_id` from 32 to 64 bits is one line). When you need the compiler to enforce the distinction, wrap the value in a small struct — a *strong type*:

```cpp
struct user_id    { std::uint64_t value; };
struct product_id { std::uint64_t value; };
// Now charge(product, user) refuses to compile.
```

## Where aliases earn their keep

- **Nested/dependent type shorthand inside templates.** `using value_type = typename Container::value_type;` once, instead of the `typename` dance at every use.
- **Public API vocabulary.** Standard containers expose `value_type`, `size_type`, `iterator` as member aliases; generic code depends on those names. Give your own containers the same members — the [range-for for custom types page](/core-language/range-for-custom-types/) builds one.
- **Deliberately-sized integers.** `using timestamp_ms = std::int64_t;` documents units and width at every use site.
- **Simplifying signatures.** `using callback = std::function<void(std::string_view, int)>;` turns an unreadable parameter list into prose.

## Guidelines

- Use `using`, never `typedef`, in new code — same power, better syntax, and it templates.
- Name aliases for their *role* (`user_id`, `timestamp_ms`), not their implementation (`uint64_alias`).
- Reach for an alias template whenever you would otherwise repeat a template with some arguments fixed.
- Remember aliases are transparent: for compiler-enforced distinctions, use a strong type instead.
