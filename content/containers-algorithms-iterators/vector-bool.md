---
title: Using vector<bool> for variable-size sequences of bits
description: The packed vector specialization as a run-time-sized bitset - what the proxy reference changes, spelling bitset's verbs with algorithms, the sieve sized at run time, and when real bools serve better.
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

<span class="std">C++11: hash</span> <span class="std">C++20: constexpr</span> <span class="std">C++23: range formatting, append_range</span>

The [vector page](/containers-algorithms-iterators/vector/) ended on a warning — `std::vector<bool>` is not a vector of `bool` — and the [bitset page](/containers-algorithms-iterators/bitset/) ended on a promise: when the number of bits is a run-time value, the standard has a container for that too. Both were pointing here. `std::vector<bool>` is a mandated *specialization* of `std::vector` that packs its elements into individual bits, one eighth the memory of a `bool` per byte, while keeping vector's growable interface: `push_back`, `resize`, `insert`, `reserve`, and a size that is an ordinary run-time number rather than a template parameter.

The price is the contract. A single bit has no address, so the specialization cannot hand out real `bool&` references — and several things every other vector guarantees quietly stop working. The honest way to think about it: not as a `vector` at all, but as a dynamic `bitset` wearing vector's clothes. This page covers the payoff first, then the fine print.

## A vector-shaped container of bits

Everything from the vector page applies on the surface — construction, growth, amortized `push_back`, `reserve`, the invalidation rules. What changes is the storage: bits packed into machine words, so a million flags cost about 122 KiB instead of a megabyte, and `capacity()` (measured in bits, like `size()`) lands on word multiples:

```cpp run
#include <cstddef>
#include <print>
#include <vector>

int main() {
    std::size_t n = 10;                     // any run-time value - not a template parameter
    std::vector<bool> flags(n);             // n bits, all false

    flags[2] = true;
    flags[3] = true;
    flags.push_back(true);                  // grows - the thing bitset can never do
    flags.resize(16);                       // in bulk, too; new bits arrive false

    std::println("{}", flags);              // C++23 range formatting prints it directly
    std::println("{} bits, room for {} before reallocating", flags.size(), flags.capacity());
}
```

Notice the printing: where `bitset` never got a `std::formatter`, `vector<bool>` *is* a range, so <span class="std">C++23</span> range formatting handles it out of the box — the standard even specified a formatter for its proxy reference type so that elements format like the `bool`s they represent.

## Where the vector contract breaks

For every other element type, `v[i]` returns a `T&`. Here there is no `bool&` to return, so `operator[]` on a non-const `vector<bool>` returns `std::vector<bool>::reference` — a proxy object that remembers which bit it stands for. Reads convert to `bool`; writes reach through to the packed word. The proxy is what makes the container work, and it is also the source of every surprise it is famous for:

```cpp run
#include <print>
#include <vector>

int main() {
    std::vector<bool> v{true, false, true};

    auto grabbed = v[0];              // not a bool: a proxy still tied to bit 0
    grabbed = false;                  // ... so this writes into the vector
    std::println("after auto:  {}", v);

    bool copy = v[2];                 // say bool to actually copy the value
    copy = false;                     // the vector doesn't notice
    std::println("copy {}, vector {}", copy, v);

    // for (bool& b : v) {}           // compile error: no bool& into packed bits
    for (auto&& bit : v) bit = !bit;  // the proxy mutates elements fine
    std::println("all flipped: {}", v);
}
```

With a real vector, `auto x = v[0]` copies the element; here it captures a live proxy, and assigning to it mutates the container — the exact inverse of what the same line does everywhere else. The rules that keep you safe: write `bool b = v[i]` (or `for (bool b : v)`) when you mean a copy, and `auto&&` when you mean to write through. Two more casualties of packing: there is **no `data()` member** — no `bool*` exists, so nothing here can feed a C API — and generic code written for "any `std::vector<T>`" breaks when `T` is `bool` if it takes addresses or `T&` references of elements. That genericity trap is why the committee has regretted specializing the primary `vector` template; as a *deliberately chosen* bit container, though, it does its job well.

## bitset's verbs, spelled as algorithms

The specialization kept exactly one of bitset's named operations — `flip()` — and none of the rest: no `count`, `any`, `none`, `all`, `set`, `reset`, `test`, `to_string`. But unlike `bitset` it is a real range with real iterators, so the algorithm library provides every one of those verbs:

```cpp run
#include <algorithm>
#include <functional>
#include <print>
#include <vector>

int main() {
    std::vector<bool> v{true, false, true, true, false, false, true, false};

    std::println("count: {}", std::ranges::count(v, true));
    std::println("any {}  all {}  none {}",
                 std::ranges::any_of(v, std::identity{}),   // the elements are the booleans
                 std::ranges::all_of(v, std::identity{}),
                 std::ranges::none_of(v, std::identity{}));

    v.flip();                                    // the one bitset verb it kept
    std::println("flipped: {}", v);

    std::ranges::fill(v, false);                 // reset()
    v.at(6) = true;                              // set(6), bounds-checked like test
    std::println("rebuilt: {}", v);
}
```

The packed layout helps the algorithms, not just the memory bill: libstdc++ specializes `count` and `find` for these iterators to work a word at a time, so counting set bits compiles down to popcounts, just like `bitset::count()`. And as with `bitset`, <span class="std">C++11</span> gave the whole container a `std::hash` specialization, so a `vector<bool>` can key an `unordered_map` — with the freedom that differently-sized keys coexist.

## The sieve, sized at run time

The bitset page closed by computing a `constexpr` sieve of Eratosthenes over a size fixed at compile time. When the limit arrives at run time — a program argument, a config value — the same algorithm moves here unchanged:

```cpp run
#include <cstddef>
#include <print>
#include <vector>

std::vector<bool> prime_sieve(std::size_t n) {      // n is a run-time value
    std::vector<bool> is_prime(n, true);
    if (n > 0) is_prime[0] = false;
    if (n > 1) is_prime[1] = false;
    for (std::size_t i = 2; i * i < n; ++i)
        if (is_prime[i])
            for (std::size_t j = i * i; j < n; j += i)
                is_prime[j] = false;
    return is_prime;
}

int main() {
    auto primes = prime_sieve(50);
    for (std::size_t i = 0; i < primes.size(); ++i)
        if (primes[i]) std::print("{} ", i);
    std::println("");
    std::println("{} flags stored in roughly {} bytes", primes.size(), primes.capacity() / 8);
}
```

This is the container's home ground: a large, growable field of yes/no facts — sieves, visited sets, occupancy grids, bloom-filter-adjacent structures — where the eight-fold density decides whether the working set fits in cache.

## The fine print

- **Two threads, one word.** Distinct elements of every other standard container can be written concurrently without synchronization. Here, neighboring elements share a machine word, so writing `v[i]` and `v[j]` from two threads is a **data race even when `i != j`**. Any concurrent mutation needs external locking — or a different container.
- **Per-bit access does arithmetic.** Every read is a shift-and-mask, every write a read-modify-write of the containing word. Code dominated by single random accesses can be slower than `vector<char>`; code that scans or bulk-counts usually wins on density. When it matters, measure both.
- **Random-access, but not contiguous.** The iterators satisfy random access, and C++20's iterator model (which learned to describe proxy references) treats them honestly — but there is no contiguous buffer of `bool` behind them, and code assuming `&*it` is a `bool*` is wrong.

## When something else is the right bit bag

- **The size is fixed at compile time.** Then the [bitset page](/containers-algorithms-iterators/bitset/) already covered your container — named operations, no proxy surprises, `constexpr` all the way down.
- **You need real, addressable bools.** `std::deque<bool>` is *not* specialized — it stores genuine `bool` objects and hands out genuine `bool&` — and `std::vector<char>` adds `data()` for C interop. Either restores the contract at byte-per-value cost.
- **You want bitset's API at run-time size.** `boost::dynamic_bitset` offers `count`/`set`/`test`/`to_string` and friends over a growable bit array — the standard has no equivalent, and this page's algorithm spellings are the standard-library answer.

## Guidelines

- Treat `vector<bool>` as a dynamic `bitset`, not as a vector of `bool`: choose it deliberately for large run-time-sized bit sequences, never arrive at it by accident of element type.
- Write `bool b = v[i]` or `for (bool b : v)` to copy a value; `auto` captures a live proxy that writes back into the container.
- Mutate through `auto&&` in loops — `bool&` does not compile.
- Spell bitset's queries with algorithms: `ranges::count`, `any_of` / `all_of` / `none_of`, `ranges::fill`; `flip()` is the one member it kept.
- There is no `data()`: when a `bool*` or `char*` must leave the program, use `vector<char>`.
- Never write to a `vector<bool>` from multiple threads without synchronization — even writes to *different* elements race.
- Generic code over `std::vector<T>` must either handle the `T = bool` proxy or document that it refuses it.
