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

- To find two adjacent elements in a range that are equal or satisfy a binary predicate, we use `std::adjacent_find()`; this algorithm returns an iterator to the first of the two elements:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 5, 8, 13};

    auto it = std::adjacent_find(v.cbegin(), v.cend());
    if (it != v.cend())
        std::cout << "equal pair at index "
                  << std::distance(v.cbegin(), it) << '\n';  // prints equal pair at index 0

    auto it2 = std::adjacent_find(v.cbegin(), v.cend()
                                  , [](int a, int b) { return a + b > 10; });
    if (it2 != v.cend())
        std::cout << "pair summing over 10 at index "
                  << std::distance(v.cbegin(), it2) << '\n';  // prints pair summing over 10 at index 4
}
```

- To find whether an element exists in a sorted range, we use `std::binary_search()`; this algorithm returns a boolean value to indicate whether it was found or not:

```cpp run
#include <algorithm>
#include <iostream>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 5, 8, 13};  // must be sorted

    bool found = std::binary_search(v.cbegin(), v.cend(), 8);
    std::cout << std::boolalpha << found << '\n';  // prints true

    found = std::binary_search(v.cbegin(), v.cend(), 4);
    std::cout << std::boolalpha << found << '\n';  // prints false
}
```

- Use `std::lower_bound()` to find the first element in a sorted range that is not less than a value; this algorithm returns an iterator to that element:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 5, 8, 13};  // must be sorted

    auto it = std::lower_bound(v.cbegin(), v.cend(), 3);
    if (it != v.cend())
        std::cout << "first element not less than 3 at index "
                  << std::distance(v.cbegin(), it) << '\n';  // prints first element not less than 3 at index 3
}
```

- Use `std::upper_bound()` to find the first element in a sorted range that is greater than a value; this algorithm returns an iterator to that element:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 5, 8, 13};  // must be sorted

    auto it = std::upper_bound(v.cbegin(), v.cend(), 3);
    if (it != v.cend())
        std::cout << "first element greater than 3 at index "
                  << std::distance(v.cbegin(), it) << '\n';  // prints first element greater than 3 at index 4
}
```

- Use `std::equal_range()` to find the subrange whose values are equal to a specified value; this algorithm returns a pair of iterators defining that subrange, the first one being the iterator `std::lower_bound()` returns and the second the iterator `std::upper_bound()` returns:

```cpp run
#include <algorithm>
#include <iostream>
#include <iterator>
#include <vector>

int main() {
    std::vector<int> v{1, 1, 2, 3, 5, 8, 13};

    auto [first, last] = std::equal_range(v.cbegin(), v.cend(), 1);
    std::cout << std::distance(v.cbegin(), first) << '\n';
    std::cout << std::distance(v.cbegin(), last) << '\n';
}
```

## How it works

The plain finding algorithms, `std::find()`, `std::find_if()`, and `std::find_first_of()`, perform a linear search: they start at the first iterator, apply `operator==` or your predicate to each element in turn, and stop at the first element that matches, returning an iterator to it. If the walk reaches the past-the-end iterator without a hit, that iterator itself is returned, which is why every sample on this page guards the result with `if (it != v.cend())` before dereferencing it; dereferencing the end iterator is undefined behavior. `std::adjacent_find()` follows the same plan but compares each element with its neighbor as it walks. The cost of all of them grows linearly with the range, at most one comparison or predicate call per element.

The subrange searches follow the same plan with a loop inside the loop. `std::search()` slides the subrange along the searched range one position at a time and compares element by element until every element matches; `std::find_end()` keeps searching after a success and remembers the most recent one, which is how it ends up holding the last occurrence; `std::search_n()` counts consecutive elements equal to the value and resets the count on every mismatch. In the worst case the work is proportional to the product of the two lengths, because each starting position may be checked almost to the full depth of the subrange before failing.

Searchers exist to beat that one-step slide. Constructed once from the pattern, `std::boyer_moore_searcher` and `std::boyer_moore_horspool_searcher` preprocess it into lookup tables that record how far the pattern can safely jump forward when a comparison fails, without any risk of skipping over a match. The scan then advances several positions at a time, and on typical text it never even reads a large fraction of the elements, which is what makes these searchers the tool for fast substring search. The preprocessing costs time and memory of its own, so a searcher pays off when the pattern is long, the searched text is large, or the same searcher object is reused across many calls; for a tiny pattern the plain overload is usually just as fast.

The minimum and maximum algorithms are single-pass scans that carry a running answer. `std::min_element()` remembers the smallest element seen so far and replaces that candidate whenever a smaller one appears, one comparison per element; `std::max_element()` mirrors it exactly. `std::minmax_element()` is smarter than calling the other two in sequence: it takes elements in pairs, compares the two against each other first, then tests only the smaller against the minimum candidate and only the larger against the maximum candidate, about three comparisons for every two elements instead of four. Ties are resolved differently too: `std::min_element()` and `std::max_element()` return the first of several equal elements, while `std::minmax_element()` returns the first minimum but the last maximum.

The sorted-range algorithms trade a precondition for speed. Because the range is sorted, comparing the value against the middle element decides which half could contain it, and the other half is discarded without ever being looked at; repeating the halving pins down the answer in a logarithmic number of comparisons, so a million-element vector is resolved in about twenty steps rather than a million. Within that scheme, `std::lower_bound()` converges on the first element not less than the value, `std::upper_bound()` on the first element greater than it, `std::equal_range()` effectively runs both, and `std::binary_search()` runs a lower bound and then tests whether the element found there equals the value. Hand these algorithms an unsorted range and they still return an iterator, but the halving logic no longer reflects where elements actually are and the result is meaningless; that is why the samples keep the vector sorted.
