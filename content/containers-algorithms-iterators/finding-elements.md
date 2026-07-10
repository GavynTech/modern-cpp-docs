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

- To find the minimum and maximum of elements in a range, we use `std::min_element()` for the minimum, `std::max_element()` for the maximum, and `std::minmax_element()` for both the minimum and the maximum:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 5, -2, 9, 6};

    auto minit = std::min_element(v.cbegin(), v.cend());
    std::cout << "min: " << *minit << '\n';  // prints min: -2

    auto maxit = std::max_element(v.cbegin(), v.cend());
    std::cout << "max: " << *maxit << '\n';  // prints max: 9

    auto [mn, mx] = std::minmax_element(v.cbegin(), v.cend());
    std::cout << "min: " << *mn << ", max: " << *mx << '\n';  // prints min: -2, max: 9
}
```

- Use `std::search()` to find the *first* occurrence of a subrange of elements in a range; this algorithm returns an iterator to the first element of the first subrange:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v1{1, 1, 0, 1, 0, 1, 0, 1, 1};
    std::vector<int> v2{1, 0, 1};

    auto it = std::search(v1.cbegin(), v1.cend()
                          , v2.cbegin(), v2.cend());

    if (it != v1.cend())
        std::cout << "found at index "
                  << std::distance(v1.cbegin(), it) << '\n';  // prints found at index 1
}
```

- Use `std::search()` with a *searcher*, a class that implements a searching algorithm and meets some predefined criteria; the standard library provides `std::default_searcher`, `std::boyer_moore_searcher`, and `std::boyer_moore_horspool_searcher` in `<functional>`:

```cpp run
#include <algorithm>
#include <functional>
#include <iostream>
#include <iterator>
#include <string>

int main() {
    std::string text{"trying to find a needle in a haystack"};
    std::string word{"needle"};

    auto it = std::search(text.cbegin(), text.cend()
                          , std::boyer_moore_searcher(word.cbegin(), word.cend()));

    if (it != text.cend())
        std::cout << "found at index "
                  << std::distance(text.cbegin(), it) << '\n';  // prints found at index 17
}
```

- Use `std::search_n()` to search for N consecutive occurrences of a value in a range; this algorithm returns an iterator to the first element of the found sequence:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{0, 1, 1, 0, 1, 1, 1, 0};

    auto it = std::search_n(v.cbegin(), v.cend()
                            , 3, 1);  // three consecutive 1s

    if (it != v.cend())
        std::cout << "found at index "
                  << std::distance(v.cbegin(), it) << '\n';  // prints found at index 4
}
```
