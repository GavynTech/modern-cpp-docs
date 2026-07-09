---
title: Finding elements in a range
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

Finding an element in a range is one of the most common operations a software engineer performs — most applications spend their lives searching through data, asking "is it there, and where?" It is not surprising, then, that the standard library provides many generic algorithms for the job, and not just for the standard containers: they search *anything* that can represent a range, defined by a first iterator and a past-the-end iterator.

One note before we start learning and coding: every algorithm on this page comes in multiple overloads — iterator pairs, versions taking an execution policy, the `std::ranges` counterparts with their projections. Showing them all would bury the ideas, so each section focuses on the few particular overloads that best show how the algorithm is used. For the complete and authoritative listing of every overload, see a dedicated reference such as [cppreference's algorithms library](https://en.cppreference.com/w/cpp/algorithm).
