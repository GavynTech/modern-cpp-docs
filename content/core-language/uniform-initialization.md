---
title: Understanding uniform initialization
description: Brace initialization for every kind of object, narrowing protection, the initializer_list trap, and designated initializers.
section: Core language features
section_href: /#core-language-features
next:
  title: Non-static member initialization
  href: /core-language/member-initialization/
---

<span class="std">C++11</span> <span class="std">C++20: designated initializers</span>

Before C++11, initialization syntax depended on what you were initializing: parentheses for constructor calls, `=` for scalars, braces for aggregates and arrays — and some things (member arrays, containers with contents) could not be directly initialized at all. *Uniform initialization* makes braces work for every kind of object, and adds two safety properties along the way: no narrowing, and no accidental function declarations.

## One syntax for everything

```cpp run
#include <print>
#include <string>
#include <vector>

struct Point { int x; int y; };

int main() {
    int count{42};                        // scalar
    double ratio{2.5};                    // scalar
    std::string name{"modern"};           // class type
    int board[]{1, 2, 3, 4};              // array
    Point origin{0, 0};                   // aggregate
    std::vector<int> primes{2, 3, 5, 7};  // container WITH contents
    auto* heap = new Point{7, 9};         // heap object

    std::println("{} {} {} {} ({},{}) {} ({},{})",
                 count, ratio, name, board[3],
                 origin.x, origin.y, primes.size(), heap->x, heap->y);
    delete heap;
}
```

`std::vector<int> primes{2, 3, 5, 7}` deserves a pause: initializing a container with its contents was impossible before C++11. Braces route through `std::initializer_list`, which containers accept as a constructor parameter — more on the sharp edge of that below.

## Safety property 1: no most vexing parse

Parentheses have a grammar collision — anything that *can* be parsed as a function declaration *is*:

```cpp
Widget w();    // declares a function named w returning Widget. Not a Widget.
Widget w{};    // constructs a default-initialized Widget. Always.
```

Braces are never a function declaration, so `Type name{args};` means construction, every time.

## Safety property 2: no narrowing

Brace initialization rejects any conversion that could lose information:

```cpp
int pixel = 3.9;      // compiles; pixel is 3, the .9 silently discarded
int pixel{3.9};       // error: narrowing conversion from double to int

char c = 300;         // compiles; implementation-defined wraparound
char c{300};          // error: 300 does not fit in char

unsigned u{-1};       // error with braces; the = form compiles and wraps
```

This applies everywhere braces appear, including function arguments and member initializers. It is the strongest argument for defaulting to braces: an entire class of silent data-loss bugs becomes a compile error.

## Empty braces mean value initialization

`T x{};` *value-initializes*: scalars become zero, class types run their default constructor, aggregate members are recursively value-initialized:

```cpp
int n{};              // 0 - not uninitialized garbage
double d{};           // 0.0
Point p{};            // {0, 0}
std::vector<int> v{}; // empty vector (empty braces never mean initializer_list)
```

Compare `int n;`, which leaves `n` holding garbage. Brace-initializing every local eliminates read-of-uninitialized bugs at the cost of an occasional redundant zero-store.

## The initializer_list trap

Braces prefer `std::initializer_list` constructors *greedily*. If a type has one, braces will pick it over any other constructor that matches:

```cpp run
#include <print>
#include <vector>

int main() {
    std::vector<int> a(5);      // vector(size_type): five zeros
    std::vector<int> b{5};      // initializer_list: ONE element, 5
    std::vector<int> c(5, 1);   // five ones
    std::vector<int> d{5, 1};   // TWO elements: 5, 1

    std::println("a.size={} b.size={} c.size={} d.size={}",
                 a.size(), b.size(), c.size(), d.size());
}
```

The rule: when a brace list's elements can convert to the `initializer_list` element type, that constructor wins, even if another constructor is a better match. So *uniform* initialization has one non-uniform seam — for size-style constructors on list-initializable containers, use parentheses deliberately, and expect readers to notice the difference.

## Aggregates and designated initializers

An *aggregate* (roughly: no user-declared constructors, no private non-static data, no virtuals) is initialized member-by-member in declaration order. <span class="std">C++17</span> extends this to base classes, and <span class="std">C++20</span> adds designated initializers, which name the members being set:

```cpp run
#include <print>
#include <string>

struct ServerConfig {
    std::string host = "localhost";
    int  port    = 8080;
    bool tls     = false;
    int  threads = 4;
};

int main() {
    // Name what you set; everything else keeps its default member initializer.
    ServerConfig cfg{.port = 443, .tls = true};

    std::println("{}:{} tls={} threads={}",
                 cfg.host, cfg.port, cfg.tls, cfg.threads);
}
```

This is the modern replacement for both telescoping constructors and setter chains on plain config structs. The rules are stricter than C's version:

- Designators must appear in **declaration order** (`{.tls = true, .port = 443}` is an error).
- You cannot mix designated and positional initializers in one list.
- Members without designators get their default member initializer, or value initialization if there is none.

## Guidelines

- Default to braces: `int n{};`, `Point p{0, 0}`, `auto v = std::vector<int>{1, 2, 3}`.
- Use parentheses on purpose when an `initializer_list` constructor would hijack the call — `std::vector<int>(count)` — and know that's the one seam in "uniform".
- Never leave a local uninitialized; `T x{};` costs almost nothing and reads as intent.
- For config-style aggregates, use designated initializers over constructors — call sites become self-documenting.
- Treat a narrowing error from braces as a real bug report, not an obstacle: fix the types, don't switch to `=` to silence it.
