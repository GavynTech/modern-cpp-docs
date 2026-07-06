---
title: Non-static member initialization
description: Default member initializers, constructor initializer lists, initialization order, and which form to use when.
section: Core language features
section_href: /#core-language-features
next:
  title: Controlling and querying object alignment
  href: /core-language/alignment/
---

<span class="std">C++11: default member initializers</span> <span class="std">C++20: bit-field defaults</span>

A data member can be initialized in three places: a *default member initializer* at its declaration, the constructor's *member initializer list*, or — the form to avoid — assignment inside the constructor body. They are not interchangeable: they differ in cost, in capability, and in how much repetition they create. This page establishes the modern pecking order.

## The pecking order

1. **Default member initializer** for anything with a sensible default that most constructors share.
2. **Constructor initializer list** for members that depend on constructor parameters.
3. **Assignment in the body** almost never — it is initialization followed by reassignment.

All three in one class:

```cpp run
#include <print>
#include <string>

class Connection {
    std::string host_;
    int  port_;
    int  timeout_ms_ = 5000;   // default member initializer: one place, every ctor
    bool open_       = false;

public:
    Connection(std::string host, int port)
        : host_{std::move(host)}, port_{port} {}
        // timeout_ms_ and open_ pick up their defaults automatically

    Connection(std::string host, int port, int timeout_ms)
        : host_{std::move(host)}, port_{port}, timeout_ms_{timeout_ms} {}
        // an initializer list entry OVERRIDES the default - no double init

    void describe() const {
        std::println("{}:{} timeout={}ms open={}",
                     host_, port_, timeout_ms_, open_);
    }
};

int main() {
    Connection a{"example.com", 443};
    Connection b{"localhost", 8080, 250};
    a.describe();
    b.describe();
}
```

The key mechanic: when a constructor's initializer list mentions a member, the default member initializer for that member is simply not used. There is no "initialize twice" cost — the default is a fallback, not a first pass.

## Why assignment in the body is the wrong tool

By the time the constructor body runs, every member has already been initialized. Assignment in the body therefore does the work twice:

```cpp
class Widget {
    std::string name_;
public:
    // BAD: name_ is default-constructed (step 1), then copy-assigned (step 2).
    Widget(const std::string& name) { name_ = name; }

    // GOOD: name_ is copy-constructed directly. One step.
    Widget(const std::string& name) : name_{name} {}
};
```

For an `std::string` this is a wasted allocation-capable operation; for larger types it is worse. And for three categories, body assignment is not merely slow but *impossible*:

- `const` members — cannot be assigned, ever.
- Reference members — must be bound at initialization.
- Members without a default constructor — there is nothing to "step 1" them with.

```cpp
class Session {
    const int id_;          // must use initializer list or a default initializer
    Logger& log_;           // references have no unbound state
    Connection conn_;       // suppose Connection has no default constructor
public:
    Session(int id, Logger& log, std::string host)
        : id_{id}, log_{log}, conn_{std::move(host), 443} {}
};
```

## Members initialize in declaration order

The initializer list's *textual* order is irrelevant: members are always initialized in the order they are **declared** in the class. This matters the moment one member's initializer reads another:

```cpp run
#include <print>
#include <vector>

struct Buffer {
    std::vector<int> data;   // declared first, so initialized first
    std::size_t      half;   // safe: data is alive by the time this runs

    explicit Buffer(std::size_t n) : data(n, 0), half{data.size() / 2} {}
};

int main() {
    Buffer buf{10};
    std::println("size={} half={}", buf.data.size(), buf.half);
}
```

Flip the declarations — `half` before `data` — and `half{data.size() / 2}` reads a vector that does not exist yet: undefined behavior that often "works" in debug builds. Compilers flag mismatched ordering with `-Wreorder` (included in `-Wall`); treat that warning as an error. Keep the initializer list in declaration order so the code reads the way it executes.

## Delegating constructors

<span class="std">C++11</span> One constructor can hand off to another, centralizing validation or setup instead of repeating it:

```cpp
class Socket {
public:
    explicit Socket(int fd) : fd_{validate(fd)} {}     // the "real" one
    Socket() : Socket(default_fd()) {}                 // delegates
    explicit Socket(const Config& c) : Socket(c.fd) {} // delegates
private:
    int fd_;
};
```

A delegating constructor may not also have a member initializer list of its own — the target constructor is responsible for every member. Delegation plus default member initializers together usually collapse constructor boilerplate to near zero.

## Details worth knowing

- **Aggregates keep their defaults.** Since C++14, a struct with default member initializers is still an aggregate, which is exactly what makes [designated initializers](/core-language/uniform-initialization/) pleasant: `ServerConfig{.port = 443}` fills the rest from the defaults.
- **Bit-fields** <span class="std">C++20</span> can have default initializers too: `int flags : 4 = 0b1010;`
- **Braces vs parens in the default initializer:** both are allowed (`int x = 5;`, `int x{5};`); parentheses alone (`int x(5);`) are not — that grammar was left out to avoid parsing ambiguity with member function declarations.
- **Order applies to destruction too:** members are destroyed in reverse declaration order, another reason declaration order is the single source of truth.

## Guidelines

- Give every member with a reasonable default a default member initializer; constructors then only mention what varies.
- Initialize parameter-dependent members in the initializer list, written in declaration order, with `-Wall` (hence `-Wreorder`) on.
- Reserve constructor bodies for logic that is not initialization: validation, logging, registration.
- If two constructors share setup logic, delegate instead of duplicating.
