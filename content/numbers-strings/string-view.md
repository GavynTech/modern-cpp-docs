---
title: Using std::string_view instead of constant string references
description: The non-owning string parameter type - why it replaces const std::string&, cheap parsing with views, and the lifetime rules that keep it safe.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Formatting and printing text with std::format and std::print
  href: /numbers-strings/format-print/
---

<span class="std">C++17</span> <span class="std">C++20: starts_with/ends_with</span> <span class="std">C++23: contains</span>

`std::string_view` is a pointer and a length — a read-only window onto characters owned by someone else. That's the entire design, and it solves a real cost problem: a function taking `const std::string&` forces every caller holding a literal or a substring to **allocate a whole `std::string`** just to make the call. A `string_view` parameter accepts all of them for free.

## The parameter problem, concretely

```cpp run
#include <print>
#include <string>
#include <string_view>

// Old style: const std::string& - looks free, isn't.
bool has_scheme_old(const std::string& url) { return url.find("://") != std::string::npos; }

// Modern: string_view BY VALUE (it's two words - references would add a hop).
bool has_scheme(std::string_view url) { return url.find("://") != std::string_view::npos; }

int main() {
    std::string owned = "https://example.com/path";

    // Three call shapes, zero allocations with string_view:
    std::println("{}", has_scheme("https://literal.example"));  // literal: no temp string
    std::println("{}", has_scheme(owned));                      // string: implicit view
    std::println("{}", has_scheme(std::string_view{owned}.substr(0, 8)));  // O(1) slice

    // The old signature makes the FIRST call construct a std::string,
    // and the third allocate a copy of the substring.
    std::println("{}", has_scheme_old(owned));
}
```

Every string-y read-only parameter in a modern codebase wants this signature. The full menu of what converts in silently: string literals, `std::string`, other views, and any contiguous char range you wrap yourself. One exception to "always", covered below: functions that *store* the string.

## Parsing without allocating

`substr` on a `string_view` is O(1) — it adjusts a pointer and a length. Add `remove_prefix`/`remove_suffix` and you get an allocation-free cursor over text, which is why parsers were the feature's original clientele:

```cpp run
#include <print>
#include <string_view>

// Split "key=value;key=value" pairs - no strings created, ever.
void parse_pairs(std::string_view input) {
    while (!input.empty()) {
        auto semi = input.find(';');
        std::string_view pair = input.substr(0, semi);
        input.remove_prefix(semi == std::string_view::npos ? input.size() : semi + 1);

        auto eq = pair.find('=');
        if (eq == std::string_view::npos) continue;
        std::println("  '{}' -> '{}'", pair.substr(0, eq), pair.substr(eq + 1));
    }
}

int main() {
    parse_pairs("mode=fast;retries=3;log=off");
}
```

The [string helpers page](/numbers-strings/string-helpers/) builds `trim` and `split` on exactly this foundation, and the modern convenience members work here too: `starts_with`/`ends_with` <span class="std">C++20</span> and `contains` <span class="std">C++23</span> exist on views and strings alike.

## The lifetime rules — where string_view earns its scary reputation

A view owns nothing, so it is only valid **while the characters it points at stay alive and unmoved**. All `string_view` bugs are this one bug:

```cpp
// BUG 1: viewing a temporary that dies at the semicolon.
std::string_view v = get_name() + "-suffix";   // temporary string destroyed; v dangles

// BUG 2: returning a view of a local.
std::string_view label() {
    std::string s = compute();
    return s;                    // s destroyed at return; caller gets garbage
}

// BUG 3: the container outlives the view's TARGET, not the view.
std::string_view first;
{
    std::string data = load();
    first = std::string_view{data}.substr(0, 10);
}                                // data gone; 'first' dangles

// BUG 4: mutation moves the ground under the view.
std::string s = "short";
std::string_view v2 = s;
s += " but now it reallocated";  // v2 may now point at freed memory
```

The discipline that prevents all four: **views flow down the call stack, not up or sideways.** Parameters: great. Locals inside one processing pass: great. Return values, class members, containers of views: each is a lifetime contract you must be able to state aloud ("these views index into the arena that outlives the index" is a legitimate one — parsers do exactly that).

One more sharp edge: **a view is not NUL-terminated.** `view.data()` is *not* a C string — the terminator may be beyond the view, or absent. Crossing into `fopen`, `getenv`-style APIs requires materializing: `std::string{view}.c_str()`.

## When NOT to use it: sink parameters

If the function's job is to **keep** the string, taking a view forces an allocation *inside* — and steals the caller's chance to hand over an existing string:

```cpp
class User {
    std::string name_;
public:
    explicit User(std::string name) : name_{std::move(name)} {}
    //            ^ by value + move: callers with an rvalue pay nothing,
    //              callers with an lvalue pay exactly one necessary copy.
};
```

Rule of thumb: **read → `string_view`; store → `std::string` by value and move.**

## Guidelines

- Every read-only string parameter is `std::string_view`, passed by value. Retire `const std::string&` from new signatures.
- Views flow downward: parameters and pass-locals freely; returns, members, and containers only with a stated lifetime contract.
- Never feed `.data()` to an API expecting NUL termination; convert at the boundary.
- Sinks take `std::string` by value and move — a view there is a pessimization.
- Suffix trick for tests and constants: `using namespace std::string_view_literals;` makes `"text"sv` a view at compile time.
