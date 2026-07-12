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

- Use `std::fill_n()` to assign a value to a number of elements in a range; the range begins at the first iterator and contains the specified count of elements:

```cpp run
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> v(10);

    std::fill_n(v.begin(), 5, 42);
    // v = { 42, 42, 42, 42, 42, 0, 0, 0, 0, 0 }
}
```

- Use `std::generate()` to assign a value returned by a function to the elements of a range; the range is defined by the first and last forward iterators, and the function is invoked once for each element in the range:

```cpp run
#include <algorithm>
#include <random>
#include <vector>

int main() {
    std::random_device rd;
    std::mt19937 mt(rd());
    std::uniform_int_distribution<int> dist(1, 10);
    std::vector<int> v(5);

    std::generate(v.begin(), v.end(), [&]() { return dist(mt); });
}
```
