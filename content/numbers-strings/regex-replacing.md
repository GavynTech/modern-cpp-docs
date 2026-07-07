---
title: Replacing content of a string using regular expressions
description: regex_replace, backreferences, format flags, and the callback-replacement pattern the standard forgot.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Using std::string_view instead of constant string references
  href: /numbers-strings/string-view/
---

<span class="std">C++11</span>

`std::regex_replace` rewrites every match of a pattern using a *format string* that can splice in the captured groups. Between backreferences, a pair of behavior flags, and one well-known workaround for the missing callback form, it covers the whole "transform text by pattern" category.

## Backreferences: reusing what you captured

In the replacement string, `$1`…`$9` insert capture groups, `$&` the whole match, `$$` a literal dollar:

```cpp run
#include <print>
#include <regex>
#include <string>

int main() {
    // ISO dates -> US order, by reordering the groups.
    static const std::regex date(R"((\d{4})-(\d{2})-(\d{2}))");
    std::string log = "released 2023-10-14, patched 2024-01-09";
    std::println("{}", std::regex_replace(log, date, "$2/$3/$1"));

    // Redaction that KEEPS structure: local part goes, domain stays.
    static const std::regex email(R"(([\w.]+)@([\w.]+))");
    std::string contacts = "reach alice@example.com or bob@test.org";
    std::println("{}", std::regex_replace(contacts, email, "<redacted>@$2"));

    // Wrap every match using $&:
    static const std::regex number(R"(\d+)");
    std::println("{}", std::regex_replace("scores 87 and 92", number, "[$&]"));
}
```

Unmatched text passes through untouched; matches are replaced — that's the default contract. The date example is the idiom to internalize: **capture everything, reassemble in the new order**. It turns "parse, restructure, reprint" pipelines into one line.

## The two flags worth knowing

```cpp run
#include <print>
#include <regex>
#include <string>

int main() {
    static const std::regex digits(R"(\d+)");
    const std::string s = "a1 b22 c333";

    using std::regex_constants::format_first_only;
    using std::regex_constants::format_no_copy;

    // Replace only the first hit:
    std::println("{}", std::regex_replace(s, digits, "#", format_first_only));

    // Emit ONLY the (formatted) matches - the inverse of replacement,
    // i.e., regex-powered extraction:
    std::println("{}", std::regex_replace(s, digits, "[$&] ", format_no_copy));
}
```

`format_no_copy` flips `regex_replace` into an *extraction* tool: drop everything that didn't match, keep a formatted rendering of everything that did. Combined with backreferences it's a surprisingly capable report generator for one function call.

## The missing piece: replacement callbacks

Every scripting language lets the replacement be a *function* of the match; `std::regex_replace` only accepts a format string, so computed replacements (arithmetic on the matched number, lookups, escaping) need the standard workaround — walk matches with `sregex_iterator`, copy the gaps, transform the hits:

```cpp run
#include <print>
#include <regex>
#include <string>

// regex_replace with a callable instead of a format string.
template <typename F>
std::string replace_with(const std::string& input, const std::regex& re, F transform) {
    std::string out;
    std::size_t last = 0;
    for (auto it = std::sregex_iterator(input.begin(), input.end(), re);
         it != std::sregex_iterator{}; ++it) {
        out += input.substr(last, static_cast<std::size_t>(it->position()) - last);
        out += transform(*it);
        last = static_cast<std::size_t>(it->position() + it->length());
    }
    out += input.substr(last);
    return out;
}

int main() {
    static const std::regex num(R"(\d+)");
    const std::string s = "prices: 5, 12, 40";

    auto doubled = replace_with(s, num, [](const std::smatch& m) {
        return std::to_string(std::stoi(m.str()) * 2);
    });
    std::println("{}", doubled);
}
```

Twenty lines, write it once, and the whole "replacement needs logic" category opens up: incrementing version numbers, normalizing units, HTML-escaping only the matched segments. (It also sidesteps a subtle `regex_replace` limitation — format strings can't express conditional output.)

## Knowing when it's not a regex job

Two reality checks before reaching for `regex_replace`:

- **Fixed-string replacement doesn't need a pattern.** `replace_all(text, "-", "::")` from the [string helpers page](/numbers-strings/string-helpers/) is simpler, faster, and can't misfire on regex metacharacters in the needle. Escaping user input into a pattern just to do literal replacement is a classic self-inflicted wound.
- **The performance caveats** from [the parsing page](/numbers-strings/regex-parsing/) apply doubly here, since `regex_replace` allocates and copies the whole output: fine for tools and config rewriting, wrong for hot request paths. Same escalation path — CTRE or RE2 when profiling says so.

## Guidelines

- Capture groups and reassemble with `$n` — restructuring beats splicing substrings by hand every time.
- Remember `$$` when the output needs a literal `$` (currency in templates is the classic collision).
- `format_no_copy` turns replacement into extraction; `format_first_only` for at-most-once edits.
- Keep one `replace_with` helper in your toolkit for computed replacements; don't contort format strings.
- Literal needle? Use plain string replacement — regex is for *patterns*.
