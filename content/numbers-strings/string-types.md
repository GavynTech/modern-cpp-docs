---
title: Understanding the various character and string types
description: char through char32_t, the five string literal encodings, std::string and its siblings, and which to actually use.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Printing Unicode characters to the console
  href: /numbers-strings/unicode-output/
---

<span class="std">C++11: char16_t, char32_t</span> <span class="std">C++20: char8_t</span>

C++ has five character types, five matching string literal prefixes, and a `std::basic_string` instantiation for each. That menu exists because "text" means different things at different boundaries — UTF-8 bytes on the network, UTF-16 in Windows and Java APIs, code points in a text-shaping algorithm. The good news: for code you control, the modern answer is almost always the simplest one, `std::string` holding UTF-8.

## The character types

| Type | Size | Encoding it implies | Literal |
|------|------|---------------------|---------|
| `char` | 1 byte | execution charset (UTF-8 on modern toolchains) | `"text"` |
| `wchar_t` | **2 bytes on Windows, 4 on Linux** | UTF-16 / UTF-32 respectively | `L"text"` |
| `char8_t` <span class="std">C++20</span> | 1 byte | UTF-8, by definition | `u8"text"` |
| `char16_t` | 2 bytes | UTF-16 | `u"text"` |
| `char32_t` | 4 bytes | UTF-32: one unit = one code point | `U"text"` |

Each has a string type: `std::string`, `std::wstring`, `std::u8string`, `std::u16string`, `std::u32string` — all the same `std::basic_string<CharT>` template, so they share every member function you know.

```cpp run
#include <print>
#include <string>

int main() {
    const char* c_str  = "C string: pointer to NUL-terminated bytes";
    std::string owned  = "std::string: owns, resizes, small-string-optimizes";
    std::string_view v = owned;   // non-owning window - its own page follows

    // One text, five encodings:
    auto a  = "text";     // const char[5]
    auto w  = L"text";    // const wchar_t[5]
    auto u8 = u8"text";   // const char8_t[5]
    auto u16 = u"text";   // const char16_t[5]
    auto u32 = U"text";   // const char32_t[5]

    std::println("{}", c_str);
    std::println("{} ({} bytes, view of first 11: '{}')", owned, owned.size(), v.substr(0, 11));
    std::println("unit sizes: char={} wchar_t={} char8_t={} char16_t={} char32_t={}",
                 sizeof(a[0]), sizeof(w[0]), sizeof(u8[0]), sizeof(u16[0]), sizeof(u32[0]));
}
```

Two footnotes with teeth. First, `wchar_t`'s size difference isn't trivia — it means `wstring` code is *not portable text handling*, it's a Windows dialect. Second, `char8_t` is a **distinct type**, deliberately incompatible with `char`: C++20 changed the type of `u8` literals, which broke pre-C++20 code that assigned `u8"..."` to `const char*`. The compensation is real, though — a `char8_t*` *guarantees* UTF-8, while a `char*` guarantees nothing.

## A string is code units, not characters

`std::string` is a sequence of *bytes*. Its `size()`, `operator[]`, and `substr` all count code units, and a Unicode code point may occupy 1–4 of them in UTF-8:

```cpp run
#include <print>
#include <string>

int main() {
    std::string ascii = "pi";
    std::string greek = "π";
    std::string emoji = "🚀";

    std::println("'{}' size={}", ascii, ascii.size());   // 2
    std::println("'{}' size={}", greek, greek.size());   // 2 - one char, two bytes!
    std::println("'{}' size={}", emoji, emoji.size());   // 4

    // substr on byte boundaries can shear a character in half:
    std::println("greek.substr(0, 1) yields {} byte(s) of a 2-byte character",
                 greek.substr(0, 1).size());
}
```

This is the single most important mental adjustment: byte-oriented operations (search for ASCII delimiters, split on `,`, compare equality) are perfectly safe on UTF-8, because UTF-8 guarantees no multi-byte sequence contains an ASCII byte. What's *not* safe is anything that assumes `size() == character count` or slices at arbitrary indices. For real character-level work — grapheme boundaries, case folding, width — use a Unicode library (ICU); the standard doesn't provide it.

`std::u32string` is the escape hatch when an algorithm genuinely needs one-unit-one-code-point indexing — at 4 bytes per character and a conversion at each boundary.

## Small string optimization

Every mainstream `std::string` stores short strings *inside the object itself* — no heap allocation (libstdc++: up to 15 bytes; libc++: up to 22). Consequences worth knowing: short-string copies are cheap; `data()` pointers into a small string are invalidated by *moving* the string (the buffer is inside the object that just moved); and "avoid `std::string` because allocation" is often wrong for identifier-sized text.

## Which type, where

- **Default: `std::string`, treated as UTF-8.** File paths via `std::filesystem::path`, JSON, network protocols, logs — the entire modern Linux/macOS world and most libraries agree on this.
- **`std::wstring`:** only at Win32 API boundaries (`CreateFileW`), converted at the edge, never stored as the canonical form.
- **`std::u16string`:** interop with UTF-16 ecosystems — ICU, Java (JNI), JavaScript engines, Qt internals.
- **`std::u32string`:** short-lived, algorithm-internal code point processing.
- **`std::u8string`:** honestly, rare — the type-level UTF-8 guarantee is nice, but the ecosystem (including `std::format` and this site's samples) speaks `std::string`. Use it at boundaries where "is this validated UTF-8?" must be a type, not a comment.

There is deliberately **no standard conversion machinery** between them anymore (`std::codecvt` is deprecated); conversions are a library concern (ICU, simdutf, platform APIs at the edges).

## Guidelines

- One internal string type: `std::string` carrying UTF-8. Convert at system boundaries, not in the middle of your logic.
- Never index or slice UTF-8 at arbitrary positions; search for ASCII delimiters, slice at match boundaries.
- Treat `.size()` as bytes. If a feature needs "number of characters," that's a Unicode-library feature, not arithmetic.
- Reserve `wchar_t`/`wstring` for the Windows API edge, and keep the conversion in one utility file.
- Reach for the [string helpers page](/numbers-strings/string-helpers/) patterns before writing byte-fiddling code inline.
