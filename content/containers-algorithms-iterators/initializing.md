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

- Use `std::generate_n()` to assign the value returned by a function to a number of elements of a range; the range is defined by the first forward iterator and a counter that indicates how many elements should be assigned a value from the function that is invoked for each element:

```cpp run
#include <algorithm>
#include <vector>

int main() {
    std::vector<int> v(5);

    auto i = 0;
    std::generate_n(v.begin(), v.size(), [&]() { ++i; return i * i; });
    // v = { 1, 4, 9, 16, 25 }, the squares of 1, 2, 3, 4, 5
}
```

- Use `std::iota()` to assign sequentially increasing values to the elements of a range; the range is defined by the first and last forward iterators, and the values are incremented using the prefix `operator++` from the initial specified value:

```cpp run
#include <numeric>
#include <vector>

int main() {
    std::vector<int> v(5);

    std::iota(v.begin(), v.end(), 1);
    // v = { 1, 2, 3, 4, 5 }
}
```

## How it works

- `std::fill()` assigns the specified value to every element in the range defined by the first and last forward iterators. It assigns to existing elements rather than inserting new ones, which is why the destination container must already have the proper size.
- `std::fill_n()` is similar to `std::fill()`, but the range is defined by the first iterator and a count instead of a last iterator, so it assigns the value to the specified number of elements. It returns an iterator one past the last assigned element, or the first iterator if the count is not positive.
- `std::generate()` assigns the values returned by a function to the elements in the range defined by the first and last forward iterators, invoking the function once for each element. The generating function takes no arguments, so it cannot read the elements' current values; if the new values need to be computed from the existing ones, use `std::transform()` instead.
- `std::generate_n()` relates to `std::generate()` the same way `std::fill_n()` relates to `std::fill()`: the range is defined by the first iterator and a count instead of a last iterator. It assigns the value returned by the function to the specified number of elements and returns an iterator one past the last assigned element.
- `std::iota()` assigns sequentially increasing values to the elements in the range defined by the first and last forward iterators, starting from the specified initial value and incrementing it with the prefix `operator++` for each element. It takes its name from the ⍳ (iota) function of the APL programming language, which generates a sequence of consecutive integers, and unlike the other algorithms on this page it lives in the `<numeric>` header rather than `<algorithm>`.

> STL stands for Standard Template Library. It is a software library designed by Alexander Stepanov and Meng Lee, initially for C++ before the standardization of the C++ language. It was later used to model the C++ Standard Library, providing containers, iterators, algorithms, and functions. It should not be confused with the C++ Standard Library, as these two are distinct entities.

## There is more...

In the examples in the previous documentation, we used integers so they could be easy to follow. However, now we are going to implement some real-life examples for a deeper and better understanding of how these algorithms can be used in real-life scenarios.

Let's consider a function that is given a series of intermediate points representing a gradient. A color object has three values, one each for the red, green, and blue channels. We can model it as follows:

```cpp
struct color {
    unsigned char red;
    unsigned char green;
    unsigned char blue;
};
```

We can use the function as follows:

```cpp
color white {255, 255, 255};
color black {0, 0, 0};

std::vector<color> greyscale = make_gradient(white, black, 256);

std::for_each(
    greyscale.begin(), greyscale.end(),
    [](color const& c) {
        std::cout
            << static_cast<int>(c.red) << ","
            << static_cast<int>(c.green) << ","
            << static_cast<int>(c.blue) << '\n';
    });
```

Although the output of this snippet has 256 lines (one for each point), we can show an excerpt of it:

```text
255,255,255
254,254,254
253,253,253
...
1,1,1
0,0,0
```
