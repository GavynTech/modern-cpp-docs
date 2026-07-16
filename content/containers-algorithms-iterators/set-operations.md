---
title: Using set operations on a range
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

The standard library provides several algorithms for set operations and enables us to do the union, intersection, or difference of sorted ranges. On this page, we will see what these are and how they work.

```cpp
#include <algorithm>
#include <iterator>
#include <vector>

std::vector<int> v1 {1, 2, 3, 4, 4, 5};
std::vector<int> v2 {2, 3, 3, 4, 6, 8};
std::vector<int> v3;
```

- Use `std::merge()` to merge the content of two ranges into a third one; this is similar to `std::set_union()` except that it copies the entire content of the input ranges into the output one, not just their union:

```cpp
std::merge(v1.cbegin(), v1.cend(),
           v2.cbegin(), v2.cend(),
           std::back_inserter(v3));
// v3 = {1, 2, 2, 3, 3, 3, 4, 4, 4, 5, 6, 8}
```

- Use `std::set_intersection()` to compute the intersection of two ranges into a third range:

```cpp
std::set_intersection(v1.cbegin(), v1.cend(),
                      v2.cbegin(), v2.cend(),
                      std::back_inserter(v3));
// v3 = {2, 3, 4}
```

- Use `std::set_difference()` to compute the difference of two ranges into a third range; the output range will contain elements from the first range that are not present in the second range:

```cpp
std::set_difference(v1.cbegin(), v1.cend(),
                    v2.cbegin(), v2.cend(),
                    std::back_inserter(v3));
// v3 = {1, 4, 5}
```
