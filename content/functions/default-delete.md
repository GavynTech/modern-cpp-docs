---
title: Defaulted and deleted functions
description: Taking explicit control of the special member functions - restoring what the compiler suppressed, preserving triviality, and removing dangerous overloads from the program.
section: Exploring functions
section_href: /#exploring-functions
next:
  title: Using lambdas with standard algorithms
  href: /functions/lambdas-algorithms/
---

<span class="std">C++11: = default, = delete</span> <span class="std">C++20: defaulted comparisons</span>

Every class carries six functions the compiler is willing to write for you — and a set of quiet rules deciding when it actually does. Before C++11, controlling that machinery meant tricks: empty bodies, private declarations left undefined. Modern C++ replaces the tricks with two direct statements. `= default` says *generate the obvious implementation*; `= delete` says *this function does not exist, and saying so is a compile error*.

## The six special member functions

Default constructor, destructor, copy constructor, copy assignment, move constructor, move assignment. The generation rules that matter in practice:

- Declaring **any constructor** suppresses the implicit default constructor.
- Declaring a **destructor or either copy operation** suppresses the move operations. They aren't deleted — they simply never exist, so `std::move` quietly falls back to copying.
- Declaring **either move operation** deletes the copy operations. Move-aware types don't get accidental copies.
- The implicit copy operations are *deprecated* the moment you declare a destructor — recent compilers say so with `-Wdeprecated-copy-dtor`.

The middle rule is the expensive one. A destructor added for logging is enough to turn every move of that type into a copy, with no diagnostic unless you ask for it.

## = default: ask for the compiler's implementation

A defaulted function is the compiler-generated version, requested explicitly. That restores what a declaration above suppressed — and it is *better* than an empty body `{}`, because a defaulted function can remain trivial, while a user-provided one never is:

```cpp run
#include <print>
#include <utility>

struct loud {
    loud() = default;
    loud(const loud&) { std::println("  copy-construct"); }
    loud(loud&&) { std::println("  move-construct"); }
};

struct dtor_only {                  // a destructor, and nothing else declared:
    loud member;                    // the move operations are never generated
    ~dtor_only() {}
    dtor_only() = default;
    dtor_only(const dtor_only&) = default;
    dtor_only& operator=(const dtor_only&) = default;
};

struct rule_of_five {               // everything spelled out, nothing lost
    loud member;
    rule_of_five() = default;
    ~rule_of_five() = default;
    rule_of_five(const rule_of_five&) = default;
    rule_of_five& operator=(const rule_of_five&) = default;
    rule_of_five(rule_of_five&&) = default;
    rule_of_five& operator=(rule_of_five&&) = default;
};

int main() {
    dtor_only a;
    std::println("moving dtor_only:");
    dtor_only b = std::move(a);     // silently copies - there is no move constructor

    rule_of_five c;
    std::println("moving rule_of_five:");
    rule_of_five d = std::move(c);  // an actual move
    (void)b; (void)d;
}
```

Two more things `= default` buys you:

- **Triviality.** A defaulted special member (on a type whose members allow it) keeps the class trivially copyable — eligible for `memcpy`-style optimization and for passing in registers. An empty `{}` body forfeits that permanently.
- **Out-of-line defaulting.** `widget::~widget() = default;` in the *.cpp* file is the standard move for pimpl types: the header declares the destructor, and it's defaulted where `std::unique_ptr`'s deleter can see the complete implementation type.

One C++20 caution: a type with *any* user-declared constructor — even `= default` — is no longer an aggregate, so brace-initialization of members stops working the aggregate way.

## = delete: remove a function from the program

A deleted function still *participates in overload resolution* — it just makes the program ill-formed when chosen. That's the whole trick: you position deleted overloads exactly where dangerous arguments would land.

```cpp run
#include <print>
#include <string>
#include <utility>

// Accept real indices only. Floating-point callers get a compile error,
// not a silent truncation.
void store_index(int i) { std::println("stored {}", i); }
void store_index(double) = delete;   // catches double AND float (promotion wins over conversion)

struct session {
    std::string user;
    explicit session(std::string u) : user(std::move(u)) {}
    session(const session&) = delete;             // identity type: two copies of a
    session& operator=(const session&) = delete;  // session is always a bug
    session(session&&) = default;                 // transferring ownership is fine
    session& operator=(session&&) = default;
};

void watch(const session& s) { std::println("watching {}", s.user); }
void watch(session&&) = delete;      // refuse temporaries: we keep a reference

int main() {
    store_index(42);
    // store_index(3.14);      // error: use of deleted function 'store_index(double)'
    // store_index(2.5f);      // error: float promotes to double - also deleted

    session s{"gavin"};
    watch(s);
    // watch(session{"tmp"});  // error: a temporary would dangle behind our back

    session t = std::move(s);  // ownership transfer still allowed
    std::println("moved to {}", t.user);
}
```

The patterns that come up again and again:

- **Non-copyable types**: delete the copy pair for sessions, mutexes, file handles — anything where identity matters. Delete all four and you have an immovable type (`std::mutex` itself).
- **Blocking conversions**: a deleted overload on the *better-matching* type intercepts arguments before they convert. `store_index(double) = delete` rejects every floating-point call, because promotion to `double` outranks conversion to `int`.
- **Refusing rvalues**: `f(T&&) = delete` next to `f(const T&)` stops callers from passing temporaries to functions that retain a reference.
- Any function can be deleted — free functions, member functions, even `operator new` to keep a type off the heap. <span class="std">C++26</span> adds `= delete("use store_index(int) instead")` so the error message explains itself.

Before C++11, the closest tool was declaring the copy operations `private` and never defining them — a compile error for outsiders, a *link* error for members and friends, and a confusing message either way. `= delete` is diagnosed at the call site, immediately, with the reason visible in the declaration.

## Defaulted comparisons (C++20)

The same `= default` syntax extends to comparison operators, which the compiler implements memberwise, in declaration order:

```cpp
struct version {
    int major, minor, patch;
    auto operator<=>(const version&) const = default;  // ==, !=, <, <=, >, >= all work
};
```

One line replaces six hand-rolled operators and the inevitable bug where someone compares `minor` before `major`. Comparisons get a full treatment in a later chapter; here it's enough to know the keyword composes.

## Guidelines

- Start from the **rule of zero**: if a class manages no resource directly, declare none of the six and the compiler gets all of them right.
- The moment you declare *one* of destructor/copy/move, spell out **all five** — `= default` for the ones you want, so nothing silently disappears.
- Prefer `= default` to an empty body `{}` — it preserves triviality and documents intent.
- Delete the copy operations of identity types, and use deleted overloads to reject conversions and dangling-prone temporaries at compile time.
- Turn on `-Wdeprecated-copy-dtor` (it lives in `-Wextra`): it catches the "destructor killed my moves" trap the day it happens.
