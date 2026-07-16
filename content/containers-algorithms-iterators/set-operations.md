---
title: Using set operations on a range
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

The standard library provides several algorithms for set operations and enables us to do the union, intersection, or difference of sorted ranges. On this page, we will see what these are and how they work.

```cpp
#include <algorithm>
#include <vector>

std::vector<int> v1 {1, 2, 3, 4, 4, 5};
std::vector<int> v2 {2, 3, 3, 4, 6, 8};
std::vector<int> v3;
```
