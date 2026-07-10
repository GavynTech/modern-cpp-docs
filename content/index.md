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
    <p>Fundamental integers and floats, fixed-width aliases, overflow and underflow at the edges, mixed-sign traps, and modern literal syntax.</p></li>
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

## Exploring functions

Everything callable: explicit control of the special member functions, lambdas from first principles through recursion, templates over any number of arguments, fold expressions, and the higher-order patterns — map, fold, composition, uniform invocation — that turn functions into building blocks.

<ul class="doc-list">
  <li><a href="/functions/default-delete/">Defaulted and deleted functions</a>
    <p>= default and = delete: restoring suppressed special members, preserving triviality, non-copyable types, and rejecting the wrong overloads.</p></li>
  <li><a href="/functions/lambdas-algorithms/">Using lambdas with standard algorithms</a>
    <p>Capture semantics, init captures for move-only state, and the lambda patterns that make the algorithm library click — including C++20 projections.</p></li>
  <li><a href="/functions/generic-lambdas/">Using generic and template lambdas</a>
    <p>auto parameters as invisible templates, C++20 template heads on lambdas, constraining parameters with concepts, and forwarding inside a closure.</p></li>
  <li><a href="/functions/recursive-lambda/">Writing a recursive lambda</a>
    <p>Why a lambda can't name itself, the std::function and self-passing workarounds, and C++23's deducing this that solves it cleanly.</p></li>
  <li><a href="/functions/function-templates/">Writing function templates</a>
    <p>Deduction and what it does to your arguments, non-type parameters, overloading versus specialization, and constraining with concepts.</p></li>
  <li><a href="/functions/variadic-templates/">Writing a function template with a variable number of arguments</a>
    <p>Parameter packs, sizeof..., the recursive expansion pattern, if constexpr base cases, and perfect forwarding through a pack.</p></li>
  <li><a href="/functions/fold-expressions/">Using fold expressions to simplify variadic function templates</a>
    <p>All four fold forms and their exact expansions, the 32 supported operators, empty-pack rules, and folds that replace whole overload sets.</p></li>
  <li><a href="/functions/map-fold/">Implementing the higher-order functions map and fold</a>
    <p>Building map and fold generically with invoke_result and inserters, then their standard names: transform, accumulate, and C++23's fold_left.</p></li>
  <li><a href="/functions/composing-functions/">Composing functions into a higher-order function</a>
    <p>A variadic compose() from lambdas, pipeline direction, bind_front and bind_back, and how range adaptors made composition a core idiom.</p></li>
  <li><a href="/functions/invoke/">Uniformly invoking anything callable</a>
    <p>std::invoke's unified call rules for functions, members, and functors; member pointers as projections; invoke_r; and the invocation traits.</p></li>
</ul>

## Preprocessing and compilation

What happens before and during compilation, and how to steer it: conditional compilation, the preprocessor's token machinery, assertions the compiler evaluates, templates that filter themselves out of overload resolution, branches selected at compile time, and the metadata attributes that make the compiler catch your callers' mistakes.

<ul class="doc-list">
  <li><a href="/preprocessing-compilation/conditional-compilation/">Conditionally compiling your source code</a>
    <p>The #if family, platform and compiler detection, NDEBUG, __has_include, feature-test macros, and C++23's #elifdef.</p></li>
  <li><a href="/preprocessing-compilation/stringification/">Using the indirection pattern for stringification and concatenation</a>
    <p>Why # and ## refuse to expand their arguments, the two-level fix, version strings, unique names, and assertion messages.</p></li>
  <li><a href="/preprocessing-compilation/static-assert/">Performing compile-time assertion checks with static_assert</a>
    <p>Layout and ABI guards, template preconditions, the dependent-false idiom, and choosing between static_assert, assert, and concepts.</p></li>
  <li><a href="/preprocessing-compilation/enable-if/">Conditionally compiling classes and functions with enable_if</a>
    <p>SFINAE from first principles, the placement idioms and the redefinition trap, constraining class templates, and what replaced it all.</p></li>
  <li><a href="/preprocessing-compilation/constexpr-if/">Selecting branches at compile time with constexpr if</a>
    <p>The discard rule and its limits, recursion without base cases, different return types per branch, and C++23's if consteval.</p></li>
  <li><a href="/preprocessing-compilation/attributes/">Providing metadata to the compiler with attributes</a>
    <p>Every standard attribute from [[noreturn]] to C++23's [[assume]] - what each is for and how to use it honestly.</p></li>
</ul>

## Standard library containers, algorithms, and iterators

The standard library's working core: the containers that own your data, the algorithms that transform it, and the iterators that connect the two. This chapter is in progress — pages land as they are finished.

<ul class="doc-list">
  <li><a href="/containers-algorithms-iterators/vector/">Using vector as a default container</a>
    <p>Why contiguous storage wins by default: every way to create one, size vs capacity, adding and removing elements, the invalidation rules, and lending the buffer to C APIs.</p></li>
  <li><a href="/containers-algorithms-iterators/bitset/">Using bitset for fixed-size sequences of bits</a>
    <p>Exactly N bits with named operations: building bitsets from integers and strings, testing and flipping bits, the bitwise operators, conversions out, and replacing hand-rolled flag masks.</p></li>
  <li><a href="/containers-algorithms-iterators/vector-bool/">Using vector&lt;bool&gt; for variable-size sequences of bits</a>
    <p>The packed vector specialization as a run-time-sized bitset: what the proxy reference changes, spelling bitset's verbs with algorithms, the sieve sized at run time, and when real bools serve better.</p></li>
  <li><a href="/containers-algorithms-iterators/bit-manipulation/">Using the bit manipulation utilities</a>
    <p>The C++20 &lt;bit&gt; header's integer utilities: counting and visiting set bits, the power-of-two helpers, rotations without undefined edges, endian and byteswap, and type punning with bit_cast.</p></li>
  <li><a href="/containers-algorithms-iterators/finding-elements/">Finding elements in a range</a></li>
  <li><a href="/containers-algorithms-iterators/sorting/">Sorting a range</a>
    <p>Page in progress.</p></li>
</ul>

## Coming soon

Phases 1 through 4 cover core language features, working with numbers and strings, exploring functions, and preprocessing and compilation; phase 5 — the standard library's containers, algorithms, and iterators — is underway above. Future phases will go equally deep on ranges, general-purpose utilities, and threading and concurrency.

## External references

<ul class="doc-list">
  <li><a href="https://en.cppreference.com/">cppreference.com</a>
    <p>The community reference for the C++ language and standard library.</p></li>
  <li><a href="https://en.cppreference.com/w/cpp/compiler_support">Compiler support tables</a>
    <p>Which compiler versions implement each C++20/C++23 feature.</p></li>
  <li><a href="https://eel.is/c++draft/">Working draft of the C++ standard</a>
    <p>The language, straight from the source.</p></li>
</ul>
