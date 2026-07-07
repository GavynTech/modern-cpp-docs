---
title: Using vector as a default container
description: Why contiguous storage makes vector the right first choice - every way to create one, size versus capacity, adding and removing elements, the invalidation rules, and handing the buffer to C APIs.
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
next:
  title: Using bitset for fixed-size sequences of bits
  href: /containers-algorithms-iterators/bitset/
---

<span class="std">C++11: emplace_back, data, shrink_to_fit</span> <span class="std">C++20: erase_if, constexpr</span> <span class="std">C++23: append_range, insert_range, ranges::to</span>

Every program that stores more than a fixed handful of objects needs a container, and the standard library offers more than a dozen. The right first answer is almost always `std::vector` — a dynamically-sized array that keeps its elements **contiguous**: side by side in one block of memory, no nodes, no pointers between them. That single design decision produces everything this page covers — the speed, the C compatibility, the growth strategy, and the one real hazard (invalidation). The [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines#slcon2-prefer-using-stl-vector-by-default-unless-you-have-a-reason-to-use-a-different-container) state it as a rule: prefer `vector` unless you have a reason to use a different container.

> Note that a vector is intended for storing object instances. If you're going to store pointers, do not store raw pointers but smart pointers. Otherwise, you need to handle the lifetime management of the pointed object.

## Why vector is the default

**Iteration is what CPUs are built for.** Walking a vector touches memory in a straight ascending line. Every cache line loaded carries the next several elements with it, and the hardware prefetcher recognizes the pattern and fetches ahead of you. A node-based container turns each step into a pointer chase to an unrelated address; for small elements, an order-of-magnitude difference is normal.

**One allocation, not one per element.** A `std::list<int>` node spends more memory on its two pointers and allocator bookkeeping than on the `int` it stores — and costs an allocator call per element. A vector of a million `int`s is a handful of allocations over its whole lifetime.

**Random access is one add.** `v[i]` is pointer arithmetic, so algorithms that need to jump — binary search, sorting, partitioning — run at full speed. That access is the fastest of any container, and only `std::array` matches it.

**Moving is O(1).** Moving a vector steals three pointers; a million elements change owner without a single element moving. Returning vectors by value is the normal, fast thing to do.

**No memory management falls on you.** A heap-allocated C array means `new[]`, `delete[]`, and every leak or double-free between them; a vector allocates, reallocates, and releases its storage internally, and its destructor cannot forget.

**It owns a C array.** The elements *are* a C array, reachable through `data()`, so a vector plugs directly into any API that takes a pointer and a length.

The classic objection — "I insert in the middle, so I should use `std::list`" — loses the benchmark almost every time. Before the list can insert cheaply it must *find* the position, and that walk (one cache miss per node) costs more than vector's contiguous shift until elements get very large or counts get enormous. When you believe another container will win, measure it against `vector` first; the upset is rarer than intuition says.

## Creating vectors

Every common starting point has a constructor — and C++23 added the last missing one, building a vector straight from a range:

```cpp run
#include <print>
#include <ranges>
#include <vector>

int main() {
    std::vector<int> empty;                 // size 0 - usually no allocation yet
    std::vector<int> zeros(4);              // four value-initialized elements
    std::vector<int> sevens(4, 7);          // four copies of 7
    std::vector<int> listed{4, 7};          // exactly the elements written
    std::vector deduced{2, 3, 5};           // CTAD deduces std::vector<int>

    int legacy[] = {10, 20, 30};
    std::vector<int> from_array(std::begin(legacy), std::end(legacy));

    auto squares = std::views::iota(1, 6)
                 | std::views::transform([](int x) { return x * x; })
                 | std::ranges::to<std::vector>();          // C++23

    std::println("zeros      {}", zeros);
    std::println("sevens     {}", sevens);
    std::println("listed     {}", listed);
    std::println("deduced    {}", deduced);
    std::println("from_array {}", from_array);
    std::println("squares    {}", squares);
    std::println("empty      {} (size {})", empty, empty.size());
}
```

The trap sits between parentheses and braces: `std::vector<int>(4, 7)` is *four sevens*, while `std::vector<int>{4, 7}` is *a 4 and a 7*. Braces hand the arguments to the `initializer_list` constructor whenever the elements could be a list of values — the preference explained on the [uniform initialization](/core-language/uniform-initialization/) page, meeting its most famous victim. Use braces to say "these exact elements" and parentheses to say "this many".

## Element access, and lending the buffer to C

`v[i]` is unchecked — out of range is undefined behavior. `v.at(i)` checks and throws `std::out_of_range`. `front()` and `back()` name the ends, and calling either on an empty vector is undefined, so an emptiness check comes first. For interop, `data()` and `size()` are the whole story: a vector is the standard way to *own* the array a C-style API fills or reads.

```cpp run
#include <cstddef>
#include <print>
#include <vector>

// A C-style interface: fills n values through a raw pointer.
void read_sensor(int* out, std::size_t n) {
    for (std::size_t i = 0; i < n; ++i) out[i] = static_cast<int>(i * 3);
}

int main() {
    std::vector<int> samples(6);                     // sized buffer, then hand it over
    read_sensor(samples.data(), samples.size());
    std::println("{}", samples);

    std::println("first {} last {}", samples.front(), samples.back());
    samples.at(2) = 99;                              // bounds-checked write
    std::println("{}", samples);
}
```

Prefer `data()` over the older `&v[0]`: on an empty vector `data()` is well-defined and `&v[0]` is not. And when a function should accept "any contiguous run of `int`s" rather than a vector specifically, C++20's `std::span<int>` is the parameter type built for exactly that — it accepts vectors, `std::array`, and C arrays alike.

## Size, capacity, and reserve

A vector tracks two numbers. `size()` is how many elements exist; `capacity()` is how many fit in the current block before it must reallocate. Appending past the capacity allocates a bigger block, moves every element across, and frees the old one. Growth is geometric (libstdc++ doubles, MSVC uses 1.5×), which is what makes `push_back` **amortized constant time** — a million appends trigger only a few dozen reallocations:

```cpp run
#include <cstddef>
#include <print>
#include <vector>

int main() {
    std::vector<int> organic;
    std::size_t seen = organic.capacity();
    for (int i = 0; i < 1000; ++i) {
        organic.push_back(i);
        if (organic.capacity() != seen) {
            seen = organic.capacity();
            std::print("{} ", seen);        // each value printed is one reallocation
        }
    }
    std::println("");

    std::vector<int> planned;
    planned.reserve(1000);                  // one allocation, up front
    for (int i = 0; i < 1000; ++i) planned.push_back(i);
    std::println("planned: size {} capacity {}", planned.size(), planned.capacity());
}
```

When you know the count in advance, `reserve(n)` buys the whole block once — and, as the next sections rely on, guarantees no reallocation until the size would exceed `n`. Don't confuse it with `resize(n)`, which changes the *size*, creating or destroying elements. Shrinking is the odd one out: `clear()` destroys the elements but typically keeps the capacity, and `shrink_to_fit()` is only a *non-binding request* to give memory back.

## Adding elements

`push_back` copies or moves an object you already have. `emplace_back` takes constructor arguments and builds the element directly inside the vector, skipping the temporary. Everything else is `insert` — which must shift the tail one slot right, so its cost is proportional to the distance from the end:

```cpp run
#include <print>
#include <string>
#include <vector>

struct Task {
    std::string name;
    int priority;
};

int main() {
    std::vector<Task> queue;
    Task backup{"backup", 2};
    queue.push_back(backup);              // copies the existing object
    queue.push_back({"deploy", 1});       // constructs a temporary, then moves it
    queue.emplace_back("cleanup", 3);     // constructs in place - no temporary
    for (const Task& t : queue) std::print("{} ", t.name);
    std::println("");

    std::vector<int> v{1, 2, 6};
    v.insert(v.begin() + 2, 3);           // 1 2 3 6 - shifts the tail right
    int more[] = {7, 8};
    v.append_range(more);                 // C++23: splice any range onto the end
    std::println("{}", v);
}
```

<span class="std">C++23</span> filled the range-shaped gaps: `append_range` extends the end, `insert_range` splices into the middle, and `assign_range` replaces the contents — each accepting any range, not just iterator pairs.

## Removing elements

`pop_back` is the cheap one: destroy the last element, done. `erase` closes the gap by shifting everything after it left, so erasing the front of a large vector is the most expensive single-element operation the container has. The pattern to unlearn is the loop that erases while iterating — one call does it better:

```cpp run
#include <print>
#include <vector>

int main() {
    std::vector<int> v{1, 2, 3, 4, 5, 6, 7, 8, 9, 10};

    v.pop_back();                    // remove the last element: O(1)
    v.erase(v.begin());              // remove the first: shifts all eight survivors
    std::println("{}", v);

    auto removed = std::erase_if(v, [](int x) { return x % 2 == 0; });   // C++20
    std::println("{} - removed {}", v, removed);
}
```

`std::erase_if` compacts the survivors in one left-to-right pass and truncates — linear time no matter how many elements match. Before C++20 the same operation was the *erase–remove idiom*, worth recognizing on sight in older code:

```cpp
v.erase(std::remove_if(v.begin(), v.end(), pred), v.end());   // the old spelling
```

One more trick earns its place: when element **order doesn't matter**, any element can be removed in O(1) by overwriting it with the last one — `v[i] = std::move(v.back()); v.pop_back();` — the *swap-and-pop*.

## The invalidation rules

The price of contiguity: elements move. When they do, every iterator, pointer, and reference that pointed at them is left dangling, and using one is undefined behavior. The rules are exact:

| Operation | What it invalidates |
|-----------|---------------------|
| Any insertion that pushes `size()` past `capacity()` | Every iterator, pointer, and reference |
| `insert` / `emplace` with room to spare | Everything from the insertion point to the end |
| `erase`, `erase_if` | Everything from the first erased element on, including `end()` |
| `pop_back` | The last element and `end()` |
| `reserve` / `shrink_to_fit`, when they move the buffer | Every iterator, pointer, and reference |

The classic bug is three innocent lines:

```cpp
std::vector<int> v{1, 2, 3};
int& first = v.front();
v.push_back(4);                  // may reallocate ...
std::println("{}", first);       // ... making this undefined behavior
```

And the same three lines become correct with the capacity guaranteed first:

```cpp
std::vector<int> v{1, 2, 3};
v.reserve(8);                    // no reallocation until size would pass 8, so ...
int& first = v.front();
v.push_back(4);
std::println("{}", first);       // ... first is still valid - guaranteed
```

When growth can't be bounded in advance, hold **indexes** across mutations instead of pointers or iterators — an index survives reallocation. One reassuring exception to end on: `v.push_back(v[0])` is required to work; the implementation must read the value before any reallocation frees it.

## vector at compile time

<span class="std">C++20</span> Since C++20 the entire class is usable in constant expressions: allocate, grow, read, destroy — provided the memory is freed before constant evaluation ends, so a `constexpr std::vector` *variable* is still off the table. What it enables is compile-time computation with a real, growable data structure:

```cpp run
#include <print>
#include <vector>

constexpr int triangle(int n) {
    std::vector<int> v;                  // allocates during constant evaluation
    for (int i = 1; i <= n; ++i) v.push_back(i);
    int total = 0;
    for (int x : v) total += x;
    return total;                        // memory is gone before the result escapes
}

static_assert(triangle(10) == 55);       // proven by the compiler

int main() {
    std::println("{}", triangle(100));   // the same function, at run time
}
```

## When something else earns its place

The default is a starting point, not a law. The honest reasons to move off `vector`:

- **Element addresses must survive growth.** References into a vector break on reallocation; `std::deque` keeps references (not iterators) valid when growing at either end, and node-based containers never move elements at all.
- **Cheap insertion at the front.** `push_front` on a vector doesn't exist for a reason — that's `std::deque`'s opening argument.
- **Lookup by key dominates.** That's the associative containers' territory, covered later in this chapter.

And one specialization to know about now: `std::vector<bool>` is not a vector of `bool`. It packs elements into bits, `operator[]` returns a proxy object rather than a `bool&`, and `auto b = v[0]` doesn't capture a boolean. It gets its own page later in this chapter.

## Guidelines

- Reach for `std::vector` first; make any other container justify itself with a measurement, not a hunch.
- Braces mean *these exact elements*, parentheses mean *this many* — `{4, 7}` and `(4, 7)` are different vectors.
- Call `reserve` whenever the element count is known or estimable; it removes both the reallocation cost and the invalidation hazard.
- Use `push_back` for objects you already have, `emplace_back` to construct from arguments.
- Delete by predicate with `std::erase_if`, and use swap-and-pop when order doesn't matter.
- Hand buffers to C APIs as `data()` and `size()`; never `&v[0]` on a possibly-empty vector.
- Know the invalidation table before storing any pointer or iterator into a vector; across growth, hold an index instead.
