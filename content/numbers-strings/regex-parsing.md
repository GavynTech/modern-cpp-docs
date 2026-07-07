---
title: Parsing the content of a string using regular expressions
description: regex_match vs regex_search, capture groups, iterating all matches, flags - and the performance honesty every std::regex user deserves.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Replacing the content of a string using regular expressions
  href: /numbers-strings/regex-replacing/
---

<span class="std">C++11</span>

`<regex>` brings pattern matching to standard C++: compile a pattern into a `std::regex`, then ask whether a string matches it entirely, contains it somewhere, and what the capture groups grabbed. The API has three verbs — `regex_match`, `regex_search`, and iteration — and one big caveat about performance saved for the end, because you should learn the tool before its limits.

## Match vs search: the distinction that bites first

`regex_match` succeeds only if the **entire** string fits the pattern; `regex_search` finds the pattern **anywhere**. Mixing them up produces "my regex works on regex101 but not in C++":

```cpp
static const std::regex digits(R"(\d+)");

std::regex_match("42", digits);       // true  - whole string is digits
std::regex_match("id: 42", digits);   // FALSE - the whole string isn't
std::regex_search("id: 42", digits);  // true  - found digits inside
```

(Every pattern here is a [raw string literal](/numbers-strings/raw-strings/) — `\d` stays `\d`. Write regex any other way and you're debugging backslashes, not patterns.)

## Capture groups: pulling data out

Parentheses capture; `std::smatch` holds the results. Group 0 is the whole match, groups 1+ are the parenthesized pieces in order:

```cpp run
#include <print>
#include <regex>
#include <string>

int main() {
    // "key = value" lines: group 1 = key, group 2 = value.
    static const std::regex kv(R"(^\s*(\w+)\s*=\s*(.+?)\s*$)");

    for (const std::string line : {"port = 8080", "host=example.com  ", "# comment"}) {
        std::smatch m;
        if (std::regex_match(line, m, kv)) {
            std::println("key '{}' value '{}'", m[1].str(), m[2].str());
        } else {
            std::println("skipped: '{}'", line);
        }
    }
}
```

Details that matter in that little program:

- **`static const` on the regex.** Constructing a `std::regex` *compiles* the pattern — it is by far the expensive step. Build once, match many.
- **The lazy `(.+?)`** plus trailing `\s*$` trims the value's whitespace inside the pattern itself.
- **`m[1].str()`** copies the group out. `m[1]` itself (a `std::ssub_match`) points *into the searched string* — which is why matching against a **temporary** string with `smatch` is a dangling-reference bug the API won't stop you from writing. Match named variables.
- No named groups: standard C++ regex has ECMAScript *syntax* but predates `(?<name>...)` captures — number your groups and comment them.

## All matches: sregex_iterator

One `regex_search` finds the first hit. To harvest a whole document, iterate:

```cpp run
#include <print>
#include <regex>
#include <string>

int main() {
    static const std::regex date(R"((\d{4})-(\d{2})-(\d{2}))");
    const std::string log = "released 2023-10-14, patched 2024-01-09, EOL 2026-10-14";

    for (auto it = std::sregex_iterator(log.begin(), log.end(), date);
         it != std::sregex_iterator{}; ++it) {
        const std::smatch& m = *it;
        std::println("{}  (year {}, month {}, day {}, at offset {})",
                     m.str(), m[1].str(), m[2].str(), m[3].str(), m.position());
    }
}
```

`sregex_iterator` is a normal forward iterator (default-constructed = end), so it composes with algorithms and — via the [custom-range protocol](/core-language/range-for-custom-types/) — can be wrapped into a range-for-able view in a dozen lines. Its cousin `sregex_token_iterator` walks *pieces* of matches: give it `-1` as the selector and it iterates the text *between* matches, i.e., regex-powered split.

## Syntax flags you'll actually use

```cpp
using std::regex_constants::icase;
using std::regex_constants::multiline;

static const std::regex header(R"(^from:\s*(.+)$)", icase | multiline);
```

- `icase` — case-insensitive matching.
- `multiline` <span class="std">C++17</span> — `^`/`$` match at every line boundary, not just string edges. Without it, line-oriented parsing of a whole file's text quietly matches nothing past line one.
- The grammar default is ECMAScript (JavaScript-style), which is the one regex dialect you already know; ignore the `basic`/`extended`/`awk` alternates unless migrating ancient POSIX patterns.

## The honesty section: performance

`std::regex` is, notoriously, one of the slowest regex engines in mainstream use — often 10–100× behind RE2 or PCRE2 on the same patterns, and its ABI-frozen implementations can't be fixed. The practical rules:

- **Fine:** config parsing, CLI input validation, tests, tooling — anywhere per-call cost is irrelevant.
- **Construct once** (`static const`), because pattern compilation dwarfs matching.
- **Not fine:** per-request parsing in servers, hot log-ingestion loops, large-scale text mining. Reach for CTRE (compile-time regex, header-only, delightful in modern C++), RE2, or PCRE2 — or notice that many "regex" jobs are really `find`/`starts_with`/[`split`](/numbers-strings/string-helpers/) wearing a costume.
- **Untrusted patterns are a denial-of-service vector** (catastrophic backtracking); never compile user-supplied regex server-side without timeouts.

## Guidelines

- `regex_match` validates a whole string; `regex_search` finds within one — pick consciously, it's the #1 beginner trap.
- Patterns are raw strings, compiled once into `static const std::regex`, with groups documented by comment (no named groups in std).
- Never bind `smatch` results from a temporary string; submatches are views into the input.
- Add `multiline` the moment `^`/`$` mean "line", and `icase` instead of lowercasing inputs.
- Respect the engine's weight class: fine for tools and config, wrong for hot paths — CTRE/RE2 are the upgrades.
