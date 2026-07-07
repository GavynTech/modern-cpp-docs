---
title: Limits and other properties of numeric types
description: std::numeric_limits - min, max, lowest, epsilon, precision digits, infinities, and putting them to work in real code.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Understanding the various character and string types
  href: /numbers-strings/string-types/
---

<span class="std">C++11: constexpr limits</span> <span class="std">C++20: midpoint</span>

Every numeric type answers a set of questions — how big, how small, how precise, does it have infinity — and `std::numeric_limits<T>` (in `<limits>`) is the one interface that answers them for *any* numeric type, including your platform's exotic ones and, if you write one, your own. Since C++11 every member is `constexpr`, so the answers are available to `static_assert`, template logic, and array sizes.

## The essential members

```cpp run
#include <limits>
#include <print>

int main() {
    using il = std::numeric_limits<int>;
    using dl = std::numeric_limits<double>;

    std::println("int range:  [{}, {}]", il::min(), il::max());
    std::println("int bits:   {} value bits, signed: {}", il::digits, il::is_signed);

    std::println("double max:     {:.3e}", dl::max());
    std::println("double min:     {:.3e}  <- smallest POSITIVE, not most negative!", dl::min());
    std::println("double lowest:  {:.3e}  <- this is the most negative", dl::lowest());
    std::println("double epsilon: {:.3e}", dl::epsilon());
    std::println("digits10: {}  max_digits10: {}", dl::digits10, dl::max_digits10);
    std::println("infinity: {}  quiet NaN: {}", dl::infinity(), dl::quiet_NaN());
}
```

The trap in the middle of that list has bitten generations of code: **for floating-point types, `min()` is the smallest positive normal value** (about `2.2e-308` for `double`), *not* the most negative. Initialize a "find the maximum" accumulator with `dl::min()` and every negative input beats it incorrectly. `lowest()` (added in C++11) is the true bottom of the range. For integers `min()` and `lowest()` agree — which is exactly why the floating case slips through review.

These replace the C macros wholesale: `INT_MAX` → `numeric_limits<int>::max()`, `DBL_EPSILON` → `numeric_limits<double>::epsilon()` — same values, but they work in templates where the type is a parameter.

## Precision: digits10 vs max_digits10

Two members answer two different questions about decimal precision, and swapping them causes real bugs:

- **`digits10`** (15 for `double`): how many decimal digits the type can absorb *losslessly*. Any 15-digit decimal survives a round-trip into `double` and back.
- **`max_digits10`** (17 for `double`): how many digits you must *print* to guarantee the reverse round-trip — text back to the exact same bits.

So: validating user input? `digits10`. Serializing floats as text (JSON, logs you'll re-parse)? `max_digits10`, or better, let `std::format("{}", x)` pick the shortest round-trippable form automatically.

## Epsilon, used correctly

`epsilon()` is the gap between `1.0` and the next representable value — about `2.2e-16` for `double`. It is a *unit of relative error at 1.0*, not a universal tolerance. The classic misuse compares numbers of arbitrary size against raw epsilon; the fix scales it by the magnitudes involved:

```cpp run
#include <cmath>
#include <limits>
#include <print>

// Relative comparison: tolerance scales with the values' magnitude.
bool nearly_equal(double a, double b, double factor = 4.0) {
    double scale = std::fmax(std::fabs(a), std::fabs(b));
    return std::fabs(a - b) <= factor * std::numeric_limits<double>::epsilon() * scale;
}

int main() {
    double sum = 0.1 + 0.2;

    std::println("0.1 + 0.2 == 0.3   -> {}", sum == 0.3);       // false
    std::println("nearly_equal(...)  -> {}", nearly_equal(sum, 0.3));
    std::println("what's stored: {:.17f}", sum);
}
```

For values near zero, relative comparison degenerates (everything is huge relative to zero) — mixed absolute/relative tolerances are the robust pattern in numeric libraries. The one-liner above covers the common middle ground.

## Compile-time contracts

Because every member is `constexpr`, limits turn silent platform assumptions into loud ones:

```cpp
#include <limits>

// This code assumes 32-bit int and IEEE doubles. Now it SAYS so:
static_assert(std::numeric_limits<int>::digits >= 31, "need 32-bit int");
static_assert(std::numeric_limits<double>::is_iec559, "need IEEE 754 doubles");

// And templates can adapt instead of assuming:
template <typename T>
constexpr T safe_start_for_max_search = std::numeric_limits<T>::lowest();
```

`is_iec559` (IEEE 754 conformance) is the gateway check before relying on infinity semantics, signed zero, or NaN propagation.

## Overflow: what limits can't fix, midpoint can dodge

Signed integer overflow is undefined behavior — `numeric_limits` tells you where the cliff is, but stepping off it is still on you. The classic overflow hides in the middle of binary search:

```cpp run
#include <limits>
#include <numeric>
#include <print>

int main() {
    int lo = std::numeric_limits<int>::max() - 2;
    int hi = std::numeric_limits<int>::max();

    // int mid = (lo + hi) / 2;        // UB: lo + hi overflows
    int mid = lo + (hi - lo) / 2;      // the classic manual dodge
    int mid2 = std::midpoint(lo, hi);  // C++20 <numeric>: correct by construction

    std::println("{} == {}", mid, mid2);
}
```

<span class="std">C++20</span> `std::midpoint` handles the overflow, the rounding, and even pointers. For running totals over user-sized data, do the arithmetic in a wider type (`std::int64_t` accumulator for `int` data) — chosen, again, with `digits` from `numeric_limits` if the code is generic.

## Guidelines

- `lowest()`, not `min()`, to initialize floating-point max-searches — or skip the footgun with `std::ranges::max_element`.
- Print floats with `max_digits10` (or `std::format`'s default) anywhere the text will be parsed back.
- Scale `epsilon()` by operand magnitude; never use it as an absolute tolerance.
- `static_assert` the numeric properties your code assumes; it's one line, and it fails at the port instead of in production.
- Use `std::midpoint` for midpoints and wider accumulators for sums; `numeric_limits` locates the cliff but doesn't fence it.
