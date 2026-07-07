---
title: Using std::format with user-defined types
description: Specializing std::formatter - the delegation shortcut, custom parse specs, and one specialization powering format, print, and ranges.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Defaulted and deleted functions
  href: /functions/default-delete/
---

<span class="std">C++20</span> <span class="std">C++23: range formatting</span>

Out of the box, `std::format("{}", my_point)` is a compile error — the library refuses to guess how your types print. Teaching it takes one specialization of `std::formatter<T>`, and the payoff is systemic: the same specialization powers `std::format`, `std::print`, `std::format_to`, and (C++23) formatting of any *container* of your type. Two levels of effort exist; start at the cheap one.

## Level 1: delegate and compose

A formatter needs two functions: `parse` (read the bit between `:` and `}`) and `format` (write the value). The shortcut is inheriting both from an existing formatter and only overriding the writing:

```cpp run
#include <format>
#include <print>

struct Point {
    double x, y;
};

// Inherit parse() from the string formatter: fill/align/width specs come free.
template <>
struct std::formatter<Point> : std::formatter<std::string_view> {
    auto format(const Point& p, std::format_context& ctx) const {
        // Render, then hand the result to the base so width/fill apply to it.
        return std::formatter<std::string_view>::format(
            std::format("({}, {})", p.x, p.y), ctx);
    }
};

int main() {
    Point p{3.0, -1.5};

    std::println("point: {}", p);
    std::println("centered: |{:^20}|", p);   // inherited spec handling at work
    std::println("starred:  |{:*>20}|", p);
}
```

The two-step in `format` matters: rendering into a temporary string and passing *that* through the base class is what makes `{:^20}` center the **whole** `(3, -1.5)`. Writing straight to `ctx.out()` would silently ignore the width the user asked for — the most common bug in hand-written formatters.

This level is right for most types: log-friendly output, spec support for free, seven lines.

## Level 2: your own spec language

When the type has genuinely different *presentations*, implement `parse` and define spec characters — exactly how `{:x}` vs `{:d}` works for integers:

```cpp run
#include <format>
#include <print>

struct Temperature {
    double celsius;
};

template <>
struct std::formatter<Temperature> {
    char unit = 'c';

    // parse() must be constexpr: it runs at COMPILE TIME when the format
    // string is a literal - bad specs become build errors.
    constexpr auto parse(std::format_parse_context& ctx) {
        auto it = ctx.begin();
        if (it != ctx.end() && (*it == 'c' || *it == 'f')) unit = *it++;
        if (it != ctx.end() && *it != '}')
            throw std::format_error("Temperature specs are {:c} and {:f}");
        return it;   // point at the '}'
    }

    auto format(const Temperature& t, std::format_context& ctx) const {
        double shown = unit == 'f' ? t.celsius * 9.0 / 5.0 + 32.0 : t.celsius;
        return std::format_to(ctx.out(), "{:.1f}°{}", shown, unit == 'f' ? 'F' : 'C');
    }
};

int main() {
    Temperature t{21.5};

    std::println("{}", t);       // 21.5°C
    std::println("{:f}", t);     // 70.7°F
    // std::println("{:q}", t);  // compile error - parse() throws in consteval
}
```

The state model is worth internalizing: **the formatter object carries the parsed spec** (here, `unit`) from `parse` to `format`. Each `{}` in a format string gets its own formatter instance, so `"{:c} vs {:f}"` on two temperatures does the right thing independently.

For numeric-flavored types, a hybrid is often best: keep a `std::formatter<double>` *member*, forward the spec to *its* `parse`, and call *its* `format` inside yours — your type then honors the full float spec language (`{:.3f}`, `{:>10.1f}`) without reimplementing any of it.

## What one specialization buys

- `std::format`, `std::print`, `std::println`, `std::format_to`, `std::formatted_size` — all of them, immediately.
- <span class="std">C++23</span> **Range formatting**: once `Point` is formattable, so is a container of them —

```cpp
std::vector<Point> path{{0, 0}, {1, 2}};
std::println("{}", path);       // [(0, 0), (1, 2)]
std::println("{::^9}", path);   // spec after '::' applies to each ELEMENT
```

- Generic code can require it: the `std::formattable<T, char>` concept is the constraint to write on logging templates.

Two conventions from the standard library worth copying: default output (`{}`) should be the compact, log-friendly form — save verbosity for opt-in specs; and formatters for *enums* are often better written as a `format_as` mapping to `string_view` names or `std::to_underlying` values, keeping the switch in one place.

## Guidelines

- Every vocabulary type in your codebase deserves a formatter — it's the difference between loggable and legacy.
- Start with the delegation pattern (base `formatter<string_view>`, render-then-forward); it handles user specs correctly by construction.
- Write custom `parse` only for genuine alternate presentations, keep it `constexpr`, and `throw std::format_error` on bad specs so they fail at compile time.
- Composing output? `std::format_to(ctx.out(), ...)` — never build with `+` inside a formatter.
- Test formatters with specs, not just `{}`: `{:^20}`, `{:.1f}` — spec-ignoring formatters pass the easy test and fail the real caller.
