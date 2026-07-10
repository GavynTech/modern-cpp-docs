---
title: Sorting a range
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

In the previous page, [Finding elements in a range](/containers-algorithms-iterators/finding-elements/), we looked at the standard general algorithms for searching in a range. Another common operation we often need to discuss is sorting a range, because many routines, including some of the algorithms for searching, require a sorted range. The standard library provides algorithms for sorting ranges, and this page will open up your mind to what these algorithms are and how they can be used.

- Use `std::sort()` to sort a range; by default the elements are sorted in ascending order, and an overload takes a comparison function such as `std::greater<int>()` to sort them in descending order:

```cpp run
#include <algorithm>
#include <functional>
#include <vector>

int main() {
    std::vector<int> v{3, 13, 5, 8, 2, 1, 1};

    std::sort(v.begin(), v.end());
    // v = {1, 1, 2, 3, 5, 8, 13}

    std::sort(v.begin(), v.end(), std::greater<int>());
    // v = {13, 8, 5, 3, 2, 1, 1}
}
```

- Use `std::stable_sort()` to sort a range but keep the order of equal elements; the three tasks with equal priority below are still in their original relative order after the sort:

```cpp run
#include <algorithm>
#include <functional>
#include <string>
#include <vector>

struct task {
    int priority;
    std::string name;
};

bool operator<(const task& lhs, const task& rhs) {
    return lhs.priority < rhs.priority;
}

bool operator>(task const& lhs, task const& rhs) {
    return lhs.priority > rhs.priority;
}

int main() {
    std::vector<task> v{
        { 10, "task1" }, { 10, "task4" }, { 10, "task6" },
        { 25, "task3" }, { 40, "task2" }, { 80, "task5" }
    };

    std::stable_sort(v.begin(), v.end(), std::greater<task>());
    // v = { 80, "task5" }, { 40, "task2" }, { 25, "task3" },
    //     { 10, "task1" }, { 10, "task4" }, { 10, "task6" }
}
```
