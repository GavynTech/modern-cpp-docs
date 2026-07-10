---
title: Finding elements in a range
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

Finding an element in a range is one of the most common operations a software engineer performs — most applications spend their lives searching through data, asking "is it there, and where?" It is not surprising, then, that the standard library provides many generic algorithms for the job, and not just for the standard containers: they search *anything* that can represent a range, defined by a first iterator and a past-the-end iterator.

One note before we start learning and coding: every algorithm on this page comes in multiple overloads — iterator pairs, versions taking an execution policy, the `std::ranges` counterparts with their projections. Showing them all would bury the ideas, so each section focuses on the few particular overloads that best show how the algorithm is used. For the complete and authoritative listing of every overload, see a dedicated reference such as [cppreference's algorithms library](https://en.cppreference.com/w/cpp/algorithm).

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    // use std::find to find a value in a range; this algorithm returns
    // an iterator to the first element equal to a value:
    std::vector<int> v{13, 1, 5, 3, 2, 8, 1};
    auto it = std::find(v.cbegin(), v.cend(), 3);
    if (it != v.cend()) std::cout << *it << '\n';  // prints 3
}
```

- Use `std::find_if()` to find a value in a range that satisfies a predicate; this algorithm returns an iterator to the first element the predicate returns true for:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{13, 1, 5, 3, 2, 8, 1};
    auto it = std::find_if(v.cbegin(), v.cend(),
                           [](int n) { return n % 2 == 0; });  // the first even number
    if (it != v.cend()) std::cout << *it << '\n';  // prints 2
}
```

- Use `std::find_first_of()` to search a range for the first occurrence of *any* value from a second range; this algorithm returns an iterator to the first element of the searched range that matches one of the candidates:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{13, 1, 5, 3, 2, 8, 1};
    std::vector<int> candidates{8, 2, 4};
    auto it = std::find_first_of(v.cbegin(), v.cend(),
                                 candidates.cbegin(), candidates.cend());
    if (it != v.cend())
        std::cout << *it << " at index "
                  << std::distance(v.cbegin(), it) << '\n';  // prints 2 at index 4
}
```

- Use `std::find_end()` to find the last occurrence of a subrange of elements in a range; this algorithm returns an iterator to the first element of the last subrange:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v1{1, 1, 0, 1, 0, 1, 0, 1, 1};
    std::vector<int> v2{1, 0, 1};

    auto it = std::find_end(v1.cbegin(), v1.cend()
                            , v2.cbegin(), v2.cend());

    if (it != v1.cend())
        std::cout << "found at index "
                  << std::distance(v1.cbegin(), it) << '\n';  // prints found at index 5
}
```
