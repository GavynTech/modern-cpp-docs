---
title: Initializing a range
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

In the previous pages, [Finding elements in a range](/containers-algorithms-iterators/finding-elements/) and [Sorting a range](/containers-algorithms-iterators/sorting/), we explored the general standard algorithms for searching in a range and sorting a range. The algorithm library provides many general algorithms, and among them are several that are intended for filling a range with values. On this page, you will learn what these algorithms are intended for and how they should be implemented.

- Use `std::fill()` to assign a value to a range; the range is defined by the first and last iterators:

```cpp run
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> v(5);

    std::fill(v.begin(), v.end(), 42);
    // v = { 42, 42, 42, 42, 42 }
}
```
