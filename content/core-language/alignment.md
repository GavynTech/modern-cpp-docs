---
title: Controlling and querying object alignment
description: alignas and alignof, why alignment exists, structure padding, over-aligned types, and cache-line-aware layout.
section: Core language features
section_href: /#core-language-features
next:
  title: Using scoped enumerations
  href: /core-language/scoped-enums/
---

<span class="std">C++11</span> <span class="std">C++17: over-aligned new, interference sizes</span>

Every type has an *alignment*: a power of two that every object of that type's address must be a multiple of. An `int` with alignment 4 lives only at addresses divisible by 4. Hardware imposes this — misaligned access is slow on some processors, faults on others, and is a hard requirement for SIMD loads and atomics. C++11 gave the language first-class tools for it: `alignof` to query, `alignas` to control.

## Padding: alignment's visible consequence

The compiler inserts invisible padding bytes so every member of a struct lands on its required boundary, and so arrays of the struct keep working. Member *order* therefore changes object *size*:

```cpp run
#include <print>

// char(1) + 7 padding + double(8) + int(4) + 4 trailing padding = 24 bytes
struct Sensor {
    char   tag;
    double value;
    int    id;
};

// Same members, descending alignment: 8 + 4 + 1 + 3 trailing padding = 16 bytes
struct SensorPacked {
    double value;
    int    id;
    char   tag;
};

int main() {
    std::println("alignof: char={} int={} double={}",
                 alignof(char), alignof(int), alignof(double));
    std::println("Sensor:       size={} align={}", sizeof(Sensor), alignof(Sensor));
    std::println("SensorPacked: size={} align={}", sizeof(SensorPacked), alignof(SensorPacked));
}
```

A struct's alignment is the strictest alignment among its members, and its size is always a multiple of its alignment (so `Sensor[2]` keeps element 1 aligned). Sorting members from most- to least-aligned minimizes padding — an easy 33% saving above, which compounds across a vector of millions.

## Querying with alignof

`alignof(T)` is a compile-time constant, usable anywhere a constant expression is:

```cpp
static_assert(alignof(std::max_align_t) >= 8);
// max_align_t: the strictest alignment malloc/new guarantee by default (16 on x86-64)

template <typename T>
constexpr bool over_aligned = alignof(T) > alignof(std::max_align_t);
```

Anything with alignment above `alignof(std::max_align_t)` is *over-aligned* and needs the special handling described below.

## Controlling with alignas

`alignas(N)` strengthens the alignment of a type or a specific object. Two rules: `N` must be a power of two, and `alignas` can only *increase* alignment — requesting less than natural is ill-formed (compilers reject or ignore it).

```cpp run
#include <print>

// SIMD: 16-byte alignment lets the compiler use aligned vector loads.
struct alignas(16) Vec4 {
    float x, y, z, w;
};

// Concurrency: give a hot counter its own 64-byte cache line.
struct alignas(64) PaddedCounter {
    long value;
};

int main() {
    // alignas also applies to individual variables:
    alignas(64) static int hot_flag = 1;

    Vec4 v{1.0f, 2.0f, 3.0f, 4.0f};
    PaddedCounter c{42};

    std::println("Vec4: size={} align={}", sizeof(Vec4), alignof(Vec4));
    std::println("PaddedCounter: size={} align={}", sizeof(PaddedCounter), alignof(PaddedCounter));
    std::println("v.x={} c.value={} flag={}", v.x, c.value, hot_flag);
}
```

Note `sizeof(PaddedCounter)` is 64, not 8: size rounds up to alignment. That is the point — in an array, each counter occupies its own cache line.

You can also take an alignment *from* another type: `alignas(double) char buffer[sizeof(double)];` declares raw storage suitable for placement-`new`ing a `double` into.

## Why cache lines matter: false sharing

When two threads write two different variables that share a 64-byte cache line, the hardware ping-pongs the line between cores as if they were contending on one variable — *false sharing*, and it can erase the benefit of using two threads at all. The fix is alignment:

```cpp
#include <atomic>
#include <new>

struct Queues {
    // Each counter gets its own cache line; writers stop interfering.
    alignas(std::hardware_destructive_interference_size) std::atomic<long> produced{0};
    alignas(std::hardware_destructive_interference_size) std::atomic<long> consumed{0};
};
```

<span class="std">C++17</span> `std::hardware_destructive_interference_size` (in `<new>`) is the portable spelling of "cache line size" for this purpose; its companion `hardware_constructive_interference_size` is the largest size you can *keep together* to share a line on purpose. GCC warns when you use them in headers (their value can differ between compiler flags/versions, an ABI hazard) — in portable library headers, a project-defined constant like `constexpr std::size_t cacheline = 64;` is common instead.

## Over-aligned types and dynamic allocation

Historically, `new Vec4` only guaranteed `max_align_t` alignment — your `alignas(32)` AVX type could come back misaligned from the heap and crash on the first aligned load. <span class="std">C++17</span> fixed this: `new` on an over-aligned type automatically calls an alignment-aware allocation function:

```cpp
struct alignas(32) AvxBlock { float lanes[8]; };

auto* block  = new AvxBlock;       // C++17: guaranteed 32-byte aligned
auto* blocks = new AvxBlock[128];  // arrays too
delete[] blocks;
delete block;
```

Standard containers get this right as well: `std::vector<AvxBlock>` allocates aligned storage through `std::allocator`. What still does *not* respect over-alignment is raw `malloc` — pair it with `std::aligned_alloc` if you must stay in C-land.

## Guidelines

- Order struct members from most-aligned to least-aligned when object count is large; verify with `sizeof`/`static_assert` rather than assuming.
- Use `alignas` for the two real use cases: SIMD-width data and cache-line isolation of hot shared state.
- `static_assert(alignof(T) == expected)` next to any type whose layout is a contract (serialization, shared memory, hardware registers).
- Prefer C++17 `new`/containers over `malloc` for over-aligned types.
- Don't sprinkle alignment "for performance" without a measurement — padding trades memory and cache footprint for isolation, and the trade goes both ways.
