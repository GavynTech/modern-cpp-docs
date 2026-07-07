---
title: Printing Unicode characters to the console
description: Getting UTF-8 from your source code to the terminal intact - encodings, platform setup, char8_t friction, and the traps in between.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Generating pseudo-random numbers
  href: /numbers-strings/random-numbers/
---

<span class="std">C++20: char8_t</span> <span class="std">C++23: std::println expects UTF-8</span>

Printing "π ≈ 3.14159" correctly requires three encodings to agree: the encoding of your *source file*, the encoding the compiler assumes for string literals (the *execution charset*), and the encoding your *terminal* decodes. When all three are UTF-8 — the modern default everywhere except one famous operating system — Unicode output simply works. This page makes the pipeline explicit so you can fix it when it doesn't.

## The happy path

Save source as UTF-8 (every modern editor's default), compile normally, print with `std::println`:

```cpp run
#include <numbers>
#include <print>
#include <string>

int main() {
    std::println("Greek: αβγδ   Math: ∑ ∫ ≠ ≈   Arrows: → ⇒ ⇄");
    std::println("CJK: 现代 C++   Cyrillic: Привет   Emoji: 🚀");
    std::println("π ≈ {:.5f}", std::numbers::pi);

    // Remember: std::string counts BYTES, not characters.
    std::string rocket = "🚀";
    std::println("'{}' is {} bytes of UTF-8", rocket, rocket.size());
}
```

On Linux and macOS, terminals speak UTF-8 and GCC/Clang default both source and execution charsets to UTF-8 — three for three, nothing to configure. <span class="std">C++23</span> `std::print`/`println` strengthen this contract: when the literal encoding is UTF-8 and the output is a terminal, the implementation is required to write it as Unicode correctly (on Windows this means bypassing the console codepage via native APIs — a real fix, not a convention).

## The Windows checklist

Windows consoles default to legacy codepages (CP437/CP1252), and MSVC guesses source encoding unless told. The reliable setup, once per project:

```cpp
// 1. Compile with /utf-8  (sets source AND execution charset to UTF-8)

// 2. If using iostreams instead of std::print, switch the console:
#include <windows.h>
SetConsoleOutputCP(CP_UTF8);   // once, at startup

// 3. Use a terminal that renders Unicode (Windows Terminal - yes;
//    legacy conhost - partially; and the font must contain the glyphs).
```

With `std::print` on a C++23 toolchain, step 2 becomes unnecessary — another reason it's the default output tool on this site. What *never* works reliably is `std::wcout` mixed with `std::cout`: the two streams fight over the C runtime's mode, and `wchar_t` output drags in the [platform-dependent `wchar_t` mess](/numbers-strings/string-types/).

## Escapes when you can't paste the character

Named escapes keep code reviewable when the raw character would be invisible or confusable:

```cpp run
#include <print>
#include <string>

int main() {
    std::string pi     = "\u03C0";         // code point by number: π
    std::string rocket = "\U0001F680";    // beyond FFFF needs 8 digits: 🚀

    std::println("{} {}", pi, rocket);

    // The dark side of invisible characters - these two are NOT equal:
    std::string composed   = "\u00E9";       // é as one code point, 2 bytes
    std::string decomposed = "e\u0301";      // e + combining accent, 3 bytes
    std::println("'{}' == '{}' -> {}", composed, decomposed, composed == decomposed);
    std::println("sizes: {} vs {}", composed.size(), decomposed.size());
}
```

Both render identically as **é**. Byte comparison says they differ, because Unicode allows multiple encodings of the same visible character (*normalization forms*). If your program compares user-entered text — filenames, usernames, search — normalize first (ICU's NFC), or two identical-looking names will be two different users.

## char8_t: the awkward guest

<span class="std">C++20</span> `u8"..."` literals produce `char8_t`, which carries a type-level guarantee of UTF-8 — and almost no library support: `std::print`, `std::format`, and `std::cout` all decline `char8_t` strings. Until the ecosystem catches up, convert at the border:

```cpp run
#include <print>
#include <string>

// The one place the reinterpret_cast is legitimate: char8_t and char are
// both byte types, and this direction preserves the UTF-8 guarantee.
std::string from_u8(std::u8string_view text) {
    return {reinterpret_cast<const char*>(text.data()), text.size()};
}

int main() {
    std::u8string_view guaranteed = u8"σ is definitely UTF-8";
    std::println("{}", from_u8(guaranteed));
}
```

Practical position: keep UTF-8 in plain `std::string` (documented as such), use `char8_t` only where "this has been validated as UTF-8" must be enforced by the type system, and keep one `from_u8`/`to_u8` pair at that boundary.

## What "prints correctly" still doesn't mean

The terminal renders *grapheme clusters*, and several code points can form one visible glyph: `🇺🇸` is two code points, `👨‍👩‍👧` is five with zero-width joiners. Consequences: `size()` doesn't give display width, column alignment via `{:>10}` mis-pads strings containing wide CJK or emoji characters, and truncating at any fixed byte count can split a glyph. Alignment of Unicode tables and safe truncation are Unicode-library territory (ICU, or a width library) — know the boundary, and keep fixed-width formatting to ASCII fields.

## Guidelines

- Standardize on UTF-8 source files and, on MSVC, put `/utf-8` in the build system — not in a README.
- Prefer `std::print`/`println` for console output; it's the only standard tool with Unicode output as a stated requirement.
- Use `\u`/`\U` escapes for invisible or ambiguous characters; paste the real character for ordinary text.
- Normalize before comparing human-entered text; byte equality is not text equality.
- Treat `char8_t` as a boundary-validation type with one conversion helper, not as your everyday string.
