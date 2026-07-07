---
title: Documentation
description: Deep, code-first documentation for modern C++, from C++11 through C++23.
home: true
---

Modern C++ is a collection of deep, code-first documentation for the C++ language as it exists today — C++11 through C++23. Every page is built around complete, working programs. Samples marked with a *Run in Compiler Explorer* link open directly in [Compiler Explorer](https://godbolt.org/) with the right flags already set, so you can run and modify them in one click. Everything on this site compiles cleanly with `-std=c++23 -Wall -Wextra`.

Features are labeled with the standard that introduced them, like this: <span class="std">C++23</span>. If a page covers a feature that changed across standards, each refinement is labeled where it appears.

## Core language features

How to write today's C++ at the language level: type deduction, initialization, enumerations, iteration, conversions, namespaces, and the deduction machinery that removes boilerplate.

<ul class="doc-list">
  <li><a href="/core-language/auto/">Using auto whenever possible</a>
    <p>Deduce types instead of spelling them: locals, qualifiers, return types, generic lambdas — and the cases where auto surprises you.</p></li>
  <li><a href="/core-language/type-aliases/">Creating type aliases and alias templates</a>
    <p>The using declaration as the full replacement for typedef, and alias templates for parameterized names.</p></li>
  <li><a href="/core-language/uniform-initialization/">Understanding uniform initialization</a>
    <p>Brace initialization for every kind of object, narrowing protection, the initializer_list trap, and designated initializers.</p></li>
  <li><a href="/core-language/member-initialization/">Non-static member initialization</a>
    <p>Default member initializers, constructor initializer lists, initialization order, and which form to use when.</p></li>
  <li><a href="/core-language/alignment/">Controlling and querying object alignment</a>
    <p>alignas and alignof, why alignment exists, over-aligned types, and cache-line-aware layout.</p></li>
  <li><a href="/core-language/scoped-enums/">Using scoped enumerations</a>
    <p>enum class: real scoping, no implicit conversions, chosen underlying types, using enum, and std::to_underlying.</p></li>
  <li><a href="/core-language/override-final/">Virtual methods with override and final</a>
    <p>Making the compiler verify your overrides, sealing hierarchies, and the bugs these two words eliminate.</p></li>
  <li><a href="/core-language/range-based-for/">Iterating with range-based for loops</a>
    <p>What the loop actually expands to, choosing the right element binding, init-statements, and C++23's temporary-lifetime fix.</p></li>
  <li><a href="/core-language/range-for-custom-types/">Enabling range-based for on your own types</a>
    <p>The exact protocol the compiler looks for, writing a minimal iterator, and sentinel-terminated ranges.</p></li>
  <li><a href="/core-language/explicit/">Avoiding implicit conversion with explicit</a>
    <p>Converting constructors, conversion operators, the bugs implicit conversions cause, and conditional explicit(bool).</p></li>
  <li><a href="/core-language/unnamed-namespaces/">Unnamed namespaces instead of static globals</a>
    <p>Internal linkage done right: per-file helpers, ODR safety, and why static at namespace scope is the weaker tool.</p></li>
  <li><a href="/core-language/inline-namespaces/">Inline namespaces and symbol versioning</a>
    <p>Publishing versioned APIs under one name, how the standard library uses them, and ABI-safe evolution.</p></li>
  <li><a href="/core-language/structured-bindings/">Structured bindings and multiple return values</a>
    <p>Decomposing pairs, tuples, structs, and arrays; returning multiple values without out-parameters.</p></li>
  <li><a href="/core-language/ctad/">Class template argument deduction</a>
    <p>Letting the compiler deduce class template arguments, writing your own deduction guides, and knowing when to opt out.</p></li>
  <li><a href="/core-language/subscript/">The subscript operator, from operator[] to C++23</a>
    <p>Writing correct subscript access for your own collections, const and non-const pairs, multidimensional operator[], and deducing this.</p></li>
</ul>

## Numbers and strings

Working with data's two most common shapes: numeric types and their properties, text in all its encodings, randomness done right, user-defined literals, regular expressions, and the modern formatting stack.

<ul class="doc-list">
  <li><a href="/numbers-strings/numeric-types/">Understanding the various numeric types</a>
    <p>Fundamental integers and floats, fixed-width aliases, mixed-sign traps, and modern literal syntax.</p></li>
  <li><a href="/numbers-strings/numeric-limits/">Limits and other properties of numeric types</a>
    <p>std::numeric_limits: min, max, lowest, epsilon, precision digits — and putting each to work correctly.</p></li>
  <li><a href="/numbers-strings/string-types/">Understanding the various character and string types</a>
    <p>char through char32_t, five literal encodings, code units vs characters, and which string to actually use.</p></li>
  <li><a href="/numbers-strings/unicode-output/">Printing Unicode characters to the console</a>
    <p>Getting UTF-8 from source to terminal intact, platform setup, escapes, and normalization surprises.</p></li>
  <li><a href="/numbers-strings/random-numbers/">Generating pseudo-random numbers</a>
    <p>The engine-plus-distribution design of &lt;random&gt;, choosing each, and why rand() is never the answer.</p></li>
  <li><a href="/numbers-strings/random-seeding/">Properly initializing a pseudo-random number generator</a>
    <p>random_device, seed_seq, full-state seeding, and treating seeds as reproducibility data.</p></li>
  <li><a href="/numbers-strings/cooked-literals/">Creating cooked user-defined literals</a>
    <p>Literal operators that attach units to values — 64_KiB, 90.0_deg — with compile-time validation.</p></li>
  <li><a href="/numbers-strings/raw-literals/">Creating raw user-defined literals</a>
    <p>Operators that see the literal's original spelling: exact decimals, other bases, per-digit validation.</p></li>
  <li><a href="/numbers-strings/raw-strings/">Using raw string literals to avoid escaping characters</a>
    <p>R"(...)" syntax, custom delimiters, multi-line text, and why every regex belongs in one.</p></li>
  <li><a href="/numbers-strings/string-helpers/">Creating a library of string helpers</a>
    <p>trim, case mapping, split, join, replace_all — the missing std::string utilities, built correctly once.</p></li>
  <li><a href="/numbers-strings/regex-parsing/">Parsing the content of a string using regular expressions</a>
    <p>regex_match vs regex_search, capture groups, iterating matches, and honest performance guidance.</p></li>
  <li><a href="/numbers-strings/regex-replacing/">Replacing content of a string using regular expressions</a>
    <p>regex_replace, backreferences, format flags, and the callback pattern the standard forgot.</p></li>
  <li><a href="/numbers-strings/string-view/">Using std::string_view instead of constant string references</a>
    <p>The non-owning parameter type, allocation-free parsing, and the lifetime rules that keep it safe.</p></li>
  <li><a href="/numbers-strings/format-print/">Formatting and printing text with std::format and std::print</a>
    <p>The {} mini-language, compile-time checked format strings, and C++23's print family.</p></li>
  <li><a href="/numbers-strings/format-udt/">Using std::format with user-defined types</a>
    <p>Specializing std::formatter: the delegation shortcut, custom specs, and range formatting.</p></li>
</ul>

## Coming soon

Phases 1 and 2 cover core language features and working with numbers and strings. Future phases will go equally deep on the standard library containers and algorithms, ranges, general-purpose utilities, and threading and concurrency.

## External references

<ul class="doc-list">
  <li><a href="https://en.cppreference.com/">cppreference.com</a>
    <p>The community reference for the C++ language and standard library.</p></li>
  <li><a href="https://en.cppreference.com/w/cpp/compiler_support">Compiler support tables</a>
    <p>Which compiler versions implement each C++20/C++23 feature.</p></li>
  <li><a href="https://eel.is/c++draft/">Working draft of the C++ standard</a>
    <p>The language, straight from the source.</p></li>
</ul>
