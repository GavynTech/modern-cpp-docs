---
title: Avoiding implicit conversion with explicit
description: Converting constructors, conversion operators, the bugs implicit conversions cause, and conditional explicit(bool).
section: Core language features
section_href: /#core-language-features
next:
  title: Unnamed namespaces instead of static globals
  href: /core-language/unnamed-namespaces/
---

<span class="std">C++11: conversion operators</span> <span class="std">C++20: explicit(bool)</span>

Any constructor callable with one argument is a *converting constructor*: the compiler may invoke it silently, anywhere, to turn that argument type into yours. Conversion operators are the same door swinging the other way. Both are opt-out — C++ converts by default — and `explicit` is the opt-out switch. Modern style flips the default: constructors and conversion operators are `explicit` unless you can argue why a silent conversion is a feature.

## The bug implicit conversions write

```cpp
class Buffer {
public:
    Buffer(std::size_t size);   // allocates 'size' bytes
    // ...
};

void process(const Buffer& b);

process(4096);       // compiles. Allocates a 4 KB buffer you never asked for.
process('x');        // also compiles: char -> size_t -> Buffer. 120-byte buffer.
```

Neither call *looks* like it constructs anything, and both do — a hidden allocation via a conversion the author of `process` never intended to accept. One keyword removes the entire failure mode:

```cpp run
#include <print>

class Buffer {
public:
    explicit Buffer(std::size_t size) : size_{size} {}
    std::size_t size() const { return size_; }
private:
    std::size_t size_;
};

void process(const Buffer& b) { std::println("processing {} bytes", b.size()); }

int main() {
    process(Buffer{4096});   // intent is visible at the call site
    // process(4096);        // error: explicit constructor is not a conversion
    // Buffer b = 4096;      // error: copy-initialization needs the implicit path
    Buffer b{4096};          // fine: direct initialization is always allowed
    process(b);
}
```

`explicit` does not make the constructor harder to call — `Buffer{4096}` works everywhere — it only forbids the *silent* invocations: implicit argument conversion, `Buffer b = 4096;`, and `return 4096;` from a `Buffer`-returning function.

Braces don't rescue you from this, by the way: `process({4096})` — copy-list-initialization — is also blocked by `explicit`. That's part of the point.

## Multi-argument constructors too

Since braced lists exist, even multi-parameter constructors can be invoked invisibly:

```cpp
struct Rect { Rect(int w, int h); };
void draw(const Rect& r);

draw({800, 600});    // compiles without explicit - is that a Rect? Who knows.
```

For an obvious pairing like `Rect` this may be fine. For anything where `{800, 600}` doesn't self-evidently mean one thing, mark the constructor `explicit` and make call sites say `draw(Rect{800, 600})`.

## Explicit conversion operators

<span class="std">C++11</span> The same keyword applies to conversions *out* of your type. The flagship case is `operator bool` — every handle-like type wants "is it valid?" to read naturally, but a plain `operator bool` turns your type into an accidental integer:

```cpp
class Connection {
public:
    operator bool() const;   // NOT explicit - watch what compiles:
};

Connection a, b;
int total = a + b;           // bool -> int arithmetic. Nonsense, compiles.
if (a == b) { }              // compares as bools, not as connections
```

With `explicit`, the useful contexts keep working and the nonsense stops:

```cpp run
#include <print>

class Connection {
public:
    explicit Connection(bool up) : up_{up} {}
    explicit operator bool() const { return up_; }   // "is this usable?"
private:
    bool up_;
};

int main() {
    Connection conn{true};

    if (conn) {                                  // OK: contextual conversion
        std::println("connected");
    }
    bool ok = static_cast<bool>(conn);           // OK: conversion by name
    // bool b = conn;                            // error: no silent copy-init
    // int n = conn + 1;                         // error: no arithmetic

    std::println("ok={}", ok);
}
```

The rule that makes this ergonomic: conditions (`if`, `while`, `for`, `!`, `&&`, `||`, the ternary test) perform *contextual conversion to bool*, which is allowed to use an `explicit operator bool`. You get natural syntax exactly where a boolean is unambiguous, and a compile error everywhere else. This is precisely how `std::unique_ptr`, `std::optional`, and `std::function` behave.

Also remember the chain limit: an implicit conversion sequence may contain **at most one** user-defined conversion. Even without `explicit`, `A` → `B` → `C` never happens silently — but one hop is plenty for a bad bug, as `process('x')` showed.

## Conditional explicit

<span class="std">C++20</span> `explicit` takes a compile-time boolean, which matters for wrapper types: the wrapper should be exactly as implicit as the thing it wraps.

```cpp
template <typename T>
class Box {
public:
    template <typename U>
    explicit(!std::is_convertible_v<U, T>)   // implicit only if U -> T is
    Box(U&& value) : value_(std::forward<U>(value)) {}
private:
    T value_;
};

Box<std::string> a = "hello";   // OK: const char* converts to string implicitly
// Box<Buffer> b = 4096;        // error: Buffer's constructor is explicit
```

Before `explicit(bool)`, this required two SFINAE-constrained constructor overloads; the standard library uses the conditional form throughout (`std::pair`, `std::tuple`, `std::optional`).

## When implicit is the right call

Silent conversion is a feature when the two types are, semantically, *the same value*:

- `std::string_view` from `const char*` and `std::string` — a view is the same text.
- `std::span<T>` from `std::vector<T>` — same elements.
- A `Meters` type from a `double` in a physics API might stay implicit *within* an equation-heavy module — or might not; that's a judgment call about how much the units discipline matters.

The test: if a reader seeing `f(x)` would never be surprised that `x` became a `T`, implicit is defensible. Otherwise `explicit`.

## Guidelines

- Write `explicit` on every constructor callable with one argument, then delete it only with a stated reason.
- Every `operator bool` is `explicit operator bool` — contextual conversion keeps `if (obj)` working.
- Audit existing types with clang-tidy's `google-explicit-constructor` check.
- Use `explicit(bool)` in generic wrappers to inherit the wrapped type's convertibility instead of guessing.
