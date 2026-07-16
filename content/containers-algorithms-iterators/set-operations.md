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

- Use `std::set_symmetric_difference()` to compute the dual difference of two ranges:

```cpp
std::set_symmetric_difference(v1.cbegin(), v1.cend(),
                              v2.cbegin(), v2.cend(),
                              std::back_inserter(v3));
// v3 = {1, 3, 4, 5, 6, 8}
```

- Use `std::includes()` to check if one range is a subset of another range, that is, if all its elements are present in the other range:

```cpp
std::vector<int> v4 {1, 4, 5};

auto i1 = std::includes(v1.cbegin(), v1.cend(),
                        v2.cbegin(), v2.cend());
// i1 = false

auto i2 = std::includes(v1.cbegin(), v1.cend(),
                        v4.cbegin(), v4.cend());
// i2 = true
```

## How it works

- They take two input ranges, each defined by a first and last input iterator.
- They take an output iterator to the output range where the elements are inserted.
- They have an overload that takes an extra argument representing a comparison binary function object, which must return true if the first argument is less than the second.
- When a comparison function object is not specified, `operator<` is used.
- They return an iterator past the end of the constructed output range.
- The input ranges must be sorted, either using `operator<` or the provided comparison function object, depending on the overload that is used.
- The output range must not overlap the input ranges.

We will demonstrate the way they work with additional examples, using a vector of the POD type `task` from the previous documentation:

```cpp
struct task {
    int priority;
    std::string name;
};

bool operator<(const task& lhs, const task& rhs) {
    return lhs.priority < rhs.priority;
}

std::vector<task> v1 {
    { 10, "Task 1.1" },
    { 20, "Task 1.2" },
    { 20, "Task 1.3" },
    { 30, "Task 1.4" },
    { 30, "Task 1.5" },
    { 50, "Task 1.6" }
};

std::vector<task> v2 {
    { 10, "Task 2.1" },
    { 20, "Task 2.2" },
    { 20, "Task 2.3" },
    { 30, "Task 2.4" },
    { 30, "Task 2.5" },
    { 50, "Task 2.6" }
};
```
