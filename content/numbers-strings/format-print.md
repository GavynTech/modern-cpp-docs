---
title: Formatting and printing text with std::format and std::print
description: The {} mini-language - fill, alignment, precision, bases - plus compile-time checked format strings and C++23's print family.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Using std::format with user-defined types
  href: /numbers-strings/format-udt/
---

<span class="std">C++20: std::format</span> <span class="std">C++23: std::print, std::println</span>

`std::format` ended C++'s forty-year output dilemma: `printf` was concise but type-unsafe, iostreams were type-safe but unreadable (`std::setw(10)` per value, stateful flags leaking across calls). Format strings with `{}` placeholders are all three at once — concise, type-safe, *and* checked at compile time. <span class="std">C++23</span> `std::print`/`println` complete the story by sending the result to the console correctly (including [Unicode](/numbers-strings/unicode-output/)) and faster than either predecessor.

## Placeholders

```cpp run
#include <format>
#include <print>
#include <string>

int main() {
    // Automatic numbering - the everyday form:
    std::println("{} scored {} points", "alice", 42);

    // Explicit indexes: reuse and reorder (translations love this):
    std::println("{0} beats {1}; {1} loses to {0}", "rock", "scissors");

    // std::format returns a std::string instead of printing:
    std::string label = std::format("run-{:04}", 7);
    std::println("{}", label);

    // A literal brace is doubled:
    std::println("empty set: {{}}");
}
```

The killer feature is invisible: **format strings are checked at compile time.** `std::println("{} {}", x)` — too few arguments — is a *compile error*, as is `{:d}` applied to a string. The entire class of `printf`-crashes-in-production bugs simply doesn't exist. (When the format string genuinely arrives at runtime — templates from config files — the escape hatch is `std::vformat`, which moves the same errors to thrown `std::format_error`.)

## The format spec mini-language

After a colon inside the braces: `{:[fill][align][sign][#][0][width][.precision][type]}` — each piece optional:

```cpp run
#include <print>

int main() {
    // width, alignment, fill:
    std::println("|{:10}|",   "left");     // strings left-align by default
    std::println("|{:>10}|",  "right");
    std::println("|{:^10}|",  "center");
    std::println("|{:*^10}|", "fill");     // any fill char before the align

    // numbers: sign, zero-pad, precision:
    std::println("{:+}",     42);          // +42 - force the sign
    std::println("{:08.3f}", 3.14159);     // 0003.142
    std::println("{:.2e}",   123456.0);    // 1.23e+05

    // bases, with # adding the prefix:
    std::println("{0:d}  {0:#x}  {0:#b}  {0:#o}", 255);

    // and everything can be an argument itself:
    int width = 12;
    std::println("|{:>{}}|", "dynamic", width);
}
```

A table worth pinning — the `type` characters you'll actually use:

| Spec | Meaning |
|------|---------|
| `d`, `x`/`X`, `b`, `o` | integer bases (decimal, hex, binary, octal); `#` adds `0x`/`0b`/`0` |
| `f`, `e`, `g` | fixed / scientific / shortest-ish float |
| *(none)* on floats | **shortest round-trippable** representation — the right default for logs |
| `s` | string (explicit; usually omitted) |
| `?` <span class="std">C++23</span> | *debug* format: quotes and escapes strings — `{:?}` on `"a\nb"` prints `"a\nb"` |

Two defaults that quietly fix old bugs: floats print round-trippably (no more `max_digits10` rituals from [the limits page](/numbers-strings/numeric-limits/)), and formatting is **locale-independent** unless you opt in with the `L` spec — output no longer changes because a library set the global locale to German.

## print and println: the output half

`std::format` builds strings; <span class="std">C++23</span> `std::print`/`std::println` deliver them:

```cpp
std::println("{} items", n);          // stdout, newline appended
std::print("no newline");             // stdout, exact
std::println(stderr, "warn: {}", w);  // any FILE* - stderr logging built in
std::println("");                     // blank line
```

Why prefer them over `std::cout << std::format(...)`:

- **No interleaving seams** — one call, one write; two threads' `println`s don't shear mid-line the way chained `<<` does.
- **Unicode correctness is specified**, not hoped for (the Windows console problem is handled inside).
- **Faster**: no temporary `std::string` (it formats straight to the stream), no iostream sync machinery. For bulk output, `std::print` to a `FILE*` beats both predecessors comfortably.

Building strings incrementally? `std::format_to` writes into any output iterator — `std::format_to(std::back_inserter(buffer), ...)` appends to an existing string without intermediate allocations, and `std::formatted_size` pre-computes the exact size when you want to reserve.

## Migration cheat sheet

| Old | New |
|-----|-----|
| `printf("%08.3f", x)` | `std::print("{:08.3f}", x)` |
| `printf("%s", s.c_str())` | `std::print("{}", s)` |
| `cout << hex << showbase << n` | `std::print("{:#x}", n)` — no sticky state |
| `cout << setw(10) << left << v` | `std::print("{:<10}", v)` |
| `snprintf` size dance | `std::format` returns the string |
| `ostringstream` accumulation | `std::format_to(back_inserter(s), ...)` |

## Guidelines

- Default to `std::println` for console output and `std::format` for building strings; keep iostreams for stream *abstraction* (files, sockets via streambuf), not formatting.
- Let compile-time checking work: format strings are literals; `vformat` only for genuinely dynamic templates.
- Don't hand-round floats for logs — the default format already round-trips; use `.precision` only for human presentation.
- `{:?}` for logging untrusted/whitespace-y strings — escapes make the invisible visible.
- Next page: one `std::formatter` specialization makes *your* types first-class citizens of all of this.
