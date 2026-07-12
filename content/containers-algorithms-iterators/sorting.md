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
        { 10, "task1" }, { 40, "task2" }, { 25, "task3" },
        { 10, "task4" }, { 80, "task5" }, { 10, "task6" }
    };

    std::stable_sort(v.begin(), v.end());
    // v = { 10, "task1" }, { 10, "task4" }, { 10, "task6" },
    //     { 25, "task3" }, { 40, "task2" }, { 80, "task5" }
}
```

- Use `std::partial_sort()` to sort only part of a range; the middle iterator marks the end of the sorted part, and the remaining elements are left in an unspecified order:

```cpp run
#include <algorithm>
#include <functional>
#include <vector>

int main() {
    std::vector<int> v{3, 13, 5, 8, 2, 1, 1};

    std::partial_sort(v.begin(), v.begin() + 4, v.end());
    // v = {1, 1, 2, 3, ?, ?, ?}

    std::partial_sort(v.begin(), v.begin() + 4, v.end(), std::greater<int>());
    // v = {13, 8, 5, 3, ?, ?, ?}
}
```

- Use `std::partial_sort_copy()` to sort a part of a range by copying the sorted elements to a second range, leaving the original unchanged:

```cpp run
#include <algorithm>
#include <functional>
#include <vector>

int main() {
    std::vector<int> v{3, 13, 5, 8, 2, 1, 1};
    std::vector<int> vc(4);

    std::partial_sort_copy(v.begin(), v.end(), vc.begin(), vc.end());
    // v is unchanged
    // vc = {1, 1, 2, 3}

    std::partial_sort_copy(v.begin(), v.end(), vc.begin(), vc.end(), std::greater<int>());
    // vc = {13, 8, 5, 3}
}
```

- Use `std::nth_element()` to rearrange a range so that the element at the given position is the one that would be there if the range were fully sorted; the elements before it are not greater than it and the elements after it are not less, both in unspecified order:

```cpp run
#include <algorithm>
#include <functional>
#include <vector>

int main() {
    std::vector<int> v{3, 13, 5, 8, 2, 1, 1};

    std::nth_element(v.begin(), v.begin() + 3, v.end());
    // v = {1, 1, 2, 3, 5, 8, 13}

    std::nth_element(v.begin(), v.begin() + 1, v.end(), std::greater<int>());
    // v = {13, 8, 3, 5, 1, 2, 1}
}
```

- Use `std::is_sorted()` to check whether a range is sorted; by default it checks for ascending order, and an overload takes a comparison function such as `std::greater<int>()`:

```cpp run
#include <algorithm>
#include <functional>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 5, 8, 13};

    auto sorted = std::is_sorted(v.begin(), v.end());
    // sorted = true

    sorted = std::is_sorted(v.begin(), v.end(), std::greater<int>());
    // sorted = false
}
```

- Use `std::is_sorted_until()` to find the sorted subrange from the beginning of a range; it returns an iterator one past the end of that subrange:

```cpp run
#include <algorithm>
#include <functional>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 13, 8, 5};

    auto it = std::is_sorted_until(v.begin(), v.end());
    auto length = std::distance(v.begin(), it);

    it = std::is_sorted_until(v.begin(), v.end(), std::greater<int>());
}
```

## How it works

All of the general algorithms take random access iterators as arguments to define the range to be sorted. Some of them also take an output range. They all have overloads: one that requires a comparison function for sorting the elements, and one that does not and uses `operator<` for comparing the elements.

- `std::sort()` modifies the input range so that its elements are sorted according to the default or the specified comparison function; the actual algorithm for sorting is an implementation detail.
- `std::stable_sort()` is similar to `std::sort()`, but it guarantees to preserve the original order of the elements that are equal.
- `std::partial_sort()` takes three iterator arguments indicating the first, middle, and last elements in a range, where middle can be any element, not just the one at the natural middle position. The result is a partially sorted range so that the first `middle - first` smallest elements from the original range, that is `[first, last)`, are found in the `[first, middle)` subrange, and the rest of the elements are in an unspecified order in the `[middle, last)` subrange.
- `std::partial_sort_copy()` is, despite its name, not a variant of `std::partial_sort()` but of `std::sort()`; it sorts the elements the same way, but writes the result to an output range and leaves the input range unchanged. The size of the output range determines how many elements are copied: if it is at least as large as the input range, the entire input is sorted into it. If it is smaller, only the smallest elements that fit are copied, so an output range of N elements receives the first N elements of the fully sorted input.
- `std::nth_element()` is an implementation of a selection algorithm, that is, an algorithm for finding the Nth smallest element of a range. It takes three iterator arguments representing the first, nth, and last elements, and rearranges the range so that the nth element is exactly the one that would be there if the whole range were sorted. All the elements before it are not greater than it and all the elements after it are not less than it, but the order within those two groups is unspecified, which is what makes it cheaper than a full sort.
