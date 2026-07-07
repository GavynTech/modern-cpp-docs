---
title: Using raw string literals to avoid escaping characters
description: R"(...)" syntax, custom delimiters, multi-line text, and the places escaped strings quietly go wrong.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Creating a library of string helpers
  href: /numbers-strings/string-helpers/
---

<span class="std">C++11</span>

Inside a raw string literal, **nothing is an escape**: backslashes are backslashes, quotes are quotes, newlines are newlines. `R"(...)"` exists because entire categories of text — regex patterns, Windows paths, JSON, embedded code — are written in languages that *also* use backslash, and double-escaping is where correctness goes to die.

## The syntax

`R"(` opens, `)"` closes, everything between is taken literally:

```cpp run
#include <print>
#include <string>

int main() {
    // The same Windows path, twice:
    std::string escaped = "C:\\Users\\gavin\\Documents\\notes.txt";
    std::string raw     = R"(C:\Users\gavin\Documents\notes.txt)";
    std::println("identical: {}", escaped == raw);

    // Multi-line: line breaks are simply part of the string.
    std::string json = R"({
  "name": "modern-cpp-docs",
  "phase": 2,
  "escaped quote for JSON": "she said \"hi\""
})";
    std::println("{}", json);
}
```

Read that JSON example carefully — it shows the *point*. The `\"` sequences reach the string untouched, which is exactly what valid JSON needs: the backslashes belong to JSON's escaping layer, not C++'s. With a regular literal you'd write `\\\"` and review it wrong twice.

Raw strings combine with every encoding prefix: `u8R"(...)"`, `LR"(...)"`, `uR"(...)"`, `UR"(...)"`.

## Custom delimiters: when the text contains )"

The close sequence `)"` might legitimately appear in your content. The fix is built into the grammar: put up to 16 characters of your choosing between the quote and the parenthesis, and the literal only ends at `)yourdelimiter"`:

```cpp run
#include <print>

int main() {
    // This content contains )" - so pick a delimiter it can't contain:
    const char* snippet = R"cpp(std::println("{}", R"(nested!)");)cpp";

    std::println("{}", snippet);
}
```

Conventional delimiters double as documentation: `R"cpp(...)cpp"`, `R"sql(...)sql"`, `R"json(...)json"` tell the reader what language they're looking at before they parse a character of it.

## The flagship customer: regular expressions

Regex is the reason this feature exists. The pattern language uses `\d`, `\w`, `\.` — every one of which needs doubling in a normal C++ literal, producing write-only code:

```cpp
// A date pattern, escaped: is that a regex \d or a C++ escape? Count slashes.
std::regex date_escaped("(\\d{4})-(\\d{2})-(\\d{2})");

// The same pattern, raw: reads exactly like a regex reference manual.
std::regex date(R"((\d{4})-(\d{2})-(\d{2}))");
```

Every pattern on the [regex parsing](/numbers-strings/regex-parsing/) and [regex replacing](/numbers-strings/regex-replacing/) pages uses raw strings; after a week of the habit, escaped patterns look like a code smell — because they are: each `\\` is a chance to ship `\\d` where `\d` was meant, and the failure mode is a pattern that silently matches nothing.

## Multi-line text: two gotchas

Raw strings are C++'s answer to heredocs, with two behaviors to know rather than fight:

```cpp
std::string help = R"(usage: tool [options] <input>
  -v   verbose output
  -o   output file)";
```

**Gotcha 1 — the leading newline.** If you open the literal and then start your text on the next line, the string *begins with* `\n`. Either start text immediately after `R"(` (as above), or plan for the newline.

**Gotcha 2 — indentation is content.** Indenting continuation lines to match your code indents the *string*. There is no standard "strip common indentation" (no `dedent`); either left-align raw string bodies at column zero (the common convention, ugly but honest) or run a small trim helper over it at startup.

And the inverse limitation: **no escapes means no escapes** — you can't write `π` or `\n` *inside* a raw string and have it interpreted. Paste the real character, or concatenate: adjacent literals of mixed kinds merge at compile time (`R"(pi: )" "π"` works fine).

## Where raw strings earn their keep

- **Regex patterns** — always, no exceptions.
- **Windows paths** in tests and tools (`R"(C:\temp\out)"`) — though `std::filesystem::path` with forward slashes is the better fix where possible.
- **Embedded languages**: SQL queries, JSON fixtures, HTML fragments, GLSL shaders, code generators generating C++ (delimiters shine here).
- **Test data**: expected multi-line outputs compared verbatim.

## Guidelines

- Any literal that would contain `\\` is a raw string candidate; two or more and it's a defect waiting for review to miss.
- Name your delimiters after the embedded language: `R"sql( ... )sql"`.
- Start multi-line content immediately after `R"(` unless a leading newline is intended, and keep bodies left-aligned.
- Need escapes *and* rawness? Concatenate adjacent literals; don't give up rawness for one special character.
