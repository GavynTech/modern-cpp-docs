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

## Coming soon

This is phase 1 of the documentation, covering core language features. Future phases will go equally deep on numbers and strings, the standard library containers and algorithms, ranges, general-purpose utilities, and threading and concurrency.

## External references

<ul class="doc-list">
  <li><a href="https://en.cppreference.com/">cppreference.com</a>
    <p>The community reference for the C++ language and standard library.</p></li>
  <li><a href="https://en.cppreference.com/w/cpp/compiler_support">Compiler support tables</a>
    <p>Which compiler versions implement each C++20/C++23 feature.</p></li>
  <li><a href="https://eel.is/c++draft/">Working draft of the C++ standard</a>
    <p>The language, straight from the source.</p></li>
</ul>
