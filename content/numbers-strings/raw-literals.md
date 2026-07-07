---
title: Creating raw user-defined literals
description: Literal operators that see the original spelling - the const char* and template char-pack forms, and when exact digits beat cooked values.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Using raw string literals to avoid escaping characters
  href: /numbers-strings/raw-strings/
---

<span class="std">C++11</span>

A [cooked literal operator](/numbers-strings/cooked-literals/) receives a finished value — `19.99_usd` arrives as the `long double` closest to 19.99, which is *not exactly* 19.99. A **raw** literal operator receives the literal's original **spelling**, character by character, before any numeric interpretation. When the digits themselves are the data — exact decimals, other bases, validation of the written form — raw is the tool. It comes in two shapes.

## Shape 1: the const char* form

Declare `operator""_suffix(const char*)` — one parameter, no length — and integer/floating literals with that suffix arrive as a NUL-terminated string of exactly what was typed:

```cpp run
#include <cstdint>
#include <print>

namespace money {
    // Cooked would round 19.99 through long double. Raw sees "19.99" as
    // written and computes exact integer cents.
    constexpr std::int64_t operator""_usd(const char* spelling) {
        std::int64_t cents = 0;
        int decimals = -1;                          // -1: still left of the dot
        for (const char* p = spelling; *p != '\0' && decimals < 2; ++p) {
            if (*p == '.')  { decimals = 0; continue; }
            if (*p == '\'') continue;               // digit separators come through!
            cents = cents * 10 + (*p - '0');
            if (decimals >= 0) ++decimals;
        }
        if (decimals < 0) decimals = 0;             // "42_usd": no dot at all
        while (decimals < 2) { cents *= 10; ++decimals; }
        return cents;
    }
}

int main() {
    using namespace money;

    constexpr auto price = 19.99_usd;               // exactly 1999 cents
    constexpr auto total = price * 3;

    std::println("3 x $19.99 = {} cents = ${}.{:02}", total, total / 100, total % 100);
}
```

This is the canonical raw-literal use case: money, fixed-point, arbitrary precision — any type where "the decimal digits, exactly" is the contract and a detour through binary floating-point would corrupt the value before you ever saw it.

Two mechanics visible in that code: **digit separators appear in the spelling** (`19'99.0_usd` would deliver the `'` characters — skip them), and the raw form applies **only to integer and floating literals**. String literals never take this path; they are always delivered cooked, with pointer and length.

## Shape 2: the template char-pack form

Declare `template <char... Digits> operator""_suffix()` and the spelling arrives as a pack of *template arguments* — every character a compile-time constant, enabling full validation with zero runtime machinery:

```cpp run
#include <print>

namespace base3 {
    // consteval: this literal cannot exist at runtime, so bad digits
    // are guaranteed to be build errors, never latent bugs.
    template <char... Digits>
    consteval int operator""_ternary() {
        constexpr char text[]{Digits...};
        int value = 0;
        for (char c : text) {
            if (c == '\'') continue;
            if (c < '0' || c > '2') throw "ternary digits are 0, 1, 2";
            value = value * 3 + (c - '0');
        }
        return value;
    }
}

int main() {
    using namespace base3;

    constexpr int t = 102_ternary;        // 1*9 + 0*3 + 2 = 11
    static_assert(1'02_ternary == 11);    // separators tolerated
    // constexpr int bad = 190_ternary;   // compile error: '9' rejected

    std::println("102 (base 3) = {}", t);
}
```

The pack form is what pre-C++14 libraries used to implement binary literals before `0b1010` existed, and it remains the foundation for compile-time-checked literal DSLs — dimensioned quantities where the exponent lives in the type, `constexpr` big integers beyond `unsigned long long`'s range, and compile-time-validated formats. If the *type of the result* must depend on the digits (not just the value), the pack form is the only option, because each spelling instantiates its own function.

## Choosing between the forms — and against them

- **Cooked first.** If the numeric value is all you need, the [cooked form](/numbers-strings/cooked-literals/) is simpler and communicates that nothing exotic is happening.
- **Raw `const char*`** when you need the exact spelling but an ordinary function suffices — parsing into a fixed result type.
- **Template pack** when validation must be structural, the result *type* depends on the digits, or you want `consteval` guarantees per unique spelling.

Overload note: if both a cooked and a raw operator for the same suffix are visible, **cooked wins** — raw is the fallback. In practice, define one form per suffix and spare your users the subtlety.

Everything from the cooked page still applies here: underscore-prefixed suffix, `inline namespace literals` packaging, `constexpr`/`consteval` bodies.

## Guidelines

- Reach for raw literals only when the spelling carries information the cooked value destroys — exact decimals and non-decimal bases are the honest use cases.
- Prefer `consteval` + `throw` in raw operators: the whole point is compile-time exactness, so make compile-time mandatory.
- Handle `'` separators and (for `const char*` parsing) absent fractional parts — the spelling is user input, at compile time.
- Don't re-implement what literals already do: `0b`, `0x`, and `'` separators are built in since C++14; a raw literal that duplicates them is a museum piece.
