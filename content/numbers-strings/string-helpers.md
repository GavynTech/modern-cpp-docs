---
title: Creating a library of string helpers
description: trim, case mapping, split, join, replace_all - the missing std::string utilities, built correctly once.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Parsing the content of a string using regular expressions
  href: /numbers-strings/regex-parsing/
---

<span class="std">C++17: string_view</span> <span class="std">C++23: split subranges to string_view</span>

`std::string` has fifty member functions and somehow not the five everyone needs: trim, lowercase, split, join, replace-all. Every codebase grows these helpers; most grow them subtly wrong (the `tolower` UB below ships constantly). This page builds the set once, with the two design rules that make such a library good: **accept `string_view`** so every caller is cheap, and **be explicit about which functions allocate and which return views into the input**.

## Trimming: views in, views out

Trimming is pure arithmetic on the bounds — no allocation required, so don't:

```cpp run
#include <cctype>
#include <print>
#include <string>
#include <string_view>

namespace str {
    inline constexpr std::string_view whitespace = " \t\n\r\f\v";

    constexpr std::string_view trim_left(std::string_view s) {
        auto pos = s.find_first_not_of(whitespace);
        return pos == std::string_view::npos ? std::string_view{} : s.substr(pos);
    }
    constexpr std::string_view trim_right(std::string_view s) {
        auto pos = s.find_last_not_of(whitespace);
        return pos == std::string_view::npos ? std::string_view{} : s.substr(0, pos + 1);
    }
    constexpr std::string_view trim(std::string_view s) {
        return trim_right(trim_left(s));
    }

    // Case mapping transforms content, so it allocates a fresh string.
    // The unsigned char cast is load-bearing: std::tolower on a negative
    // char (any non-ASCII byte where char is signed) is undefined behavior.
    std::string to_lower(std::string_view s) {
        std::string out{s};
        for (char& c : out) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
        return out;
    }
}

int main() {
    std::println("'{}'", str::trim("   padded value \t\n"));
    std::println("'{}'", str::to_lower("MiXeD Case INPUT"));
    static_assert(str::trim("  x  ") == "x");    // constexpr: usable at compile time
}
```

That cast deserves its comment: with plain `char` being signed on x86, `std::tolower('é' as a byte)` passes a negative value where the C library demands `unsigned char`-range values — real UB, found in real crashes. And a scope note: this is *ASCII* case mapping. Real Unicode case folding (Turkish dotless-i, ß→SS) is locale- and language-dependent — ICU territory, not six lines of `cctype`.

## Split, join, replace_all

```cpp run
#include <print>
#include <ranges>
#include <string>
#include <string_view>
#include <vector>

namespace str {
    // Returned views point INTO 'text': valid only while the source lives.
    std::vector<std::string_view> split(std::string_view text, std::string_view sep) {
        std::vector<std::string_view> parts;
        for (auto piece : std::views::split(text, sep)) {
            parts.emplace_back(piece);            // C++23: string_view from subrange
        }
        return parts;
    }

    std::string join(const std::vector<std::string_view>& parts, std::string_view sep) {
        std::string out;
        for (std::size_t i = 0; i < parts.size(); ++i) {
            if (i != 0) out += sep;
            out += parts[i];
        }
        return out;
    }

    std::string replace_all(std::string_view text, std::string_view from, std::string_view to) {
        if (from.empty()) return std::string{text};   // guard the infinite loop
        std::string out;
        std::size_t pos = 0;
        for (auto hit = text.find(from); hit != std::string_view::npos;
             hit = text.find(from, pos)) {
            out += text.substr(pos, hit - pos);
            out += to;
            pos = hit + from.size();
        }
        out += text.substr(pos);
        return out;
    }
}

int main() {
    auto fields = str::split("alpha,beta,,gamma", ",");
    std::println("{} fields; empty third field survives: {}", fields.size(), fields[2].empty());

    std::println("{}", str::join(fields, " | "));
    std::println("{}", str::replace_all("a-b-c", "-", "::"));
}
```

Design decisions worth stealing:

- **`split` returns views, not strings** — zero allocations for the pieces, which is what makes it usable in parsers. The cost is a lifetime contract (views die with the source text); the comment *is* the API. When callers need to keep pieces, converting is one line: `std::vector<std::string>(parts.begin(), parts.end())`.
- **Empty fields are preserved** (`"a,,b"` → three parts). CSV-ish formats mean it; helpers that silently drop empties corrupt data.
- **`replace_all` guards the empty needle.** `find("")` matches at every position; without the guard the loop never advances. Every hand-rolled version hits this eventually.

## What you no longer need to write

The standard has been quietly absorbing this category — check before adding to your library:

```cpp
std::string s = "modern-cpp-docs";

s.starts_with("modern");   // C++20
s.ends_with("docs");       // C++20
s.contains("cpp");         // C++23
```

Plus `std::format` [for concatenation-with-formatting](/numbers-strings/format-print/), and `std::views::split`/`join_with` when you want lazy pipelines instead of materialized vectors. The helper library's job is shrinking with every standard; that's a feature.

## Packaging it

Keep the library as one header of free functions in a short namespace (`str::`, as above) — not a `StringUtils` class of statics, which adds ceremony and prevents ADL, and not member-function wishes on `std::string`, which you can't have. Mark the non-allocating functions `constexpr` (as `trim` is above — note the `static_assert` using it at compile time), and unit-test the edges: empty input, all-whitespace, separators at the ends, empty needle.

## Guidelines

- Parameters are `std::string_view`, always — accepts literals, `std::string`, and other views with zero conversions.
- Name the contract in types: transforms return `std::string` (owning); slices like `trim`/`split` return views and document the lifetime.
- Cast to `unsigned char` before any `<cctype>` call; treat this as non-negotiable review policy.
- Preserve empty fields in `split`; guard empty needles in `replace_all`.
- Audit the library against each new standard — `starts_with`, `contains`, and friends made whole helper files deletable.
