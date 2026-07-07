---
title: Generating pseudo-random numbers
description: The engine-plus-distribution design of <random>, choosing an engine, choosing a distribution, and why rand() is never the answer.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Properly initializing a pseudo-random number generator
  href: /numbers-strings/random-seeding/
---

<span class="std">C++11</span>

`<random>` splits randomness into two orthogonal pieces: an **engine** produces a deterministic stream of raw uniform bits from a seed, and a **distribution** shapes those bits into the values you actually want — dice rolls, percentages, bell curves. Learn the split once and the whole library falls into place; ignore it and you end up back at `rand() % 6`, which is broken in more ways than it has characters.

## The two-piece pattern

```cpp run
#include <print>
#include <random>

int main() {
    std::mt19937 engine{42};   // fixed seed here = reproducible demo
                               // (real seeding is the next page)

    std::uniform_int_distribution<int>     d6{1, 6};       // BOTH ends inclusive
    std::uniform_real_distribution<double> unit{0.0, 1.0}; // [0, 1) - half open
    std::normal_distribution<double>       iq{100.0, 15.0};// mean, standard deviation
    std::bernoulli_distribution            coin{0.25};     // true 25% of the time

    for (int i = 0; i < 8; ++i) std::print("{} ", d6(engine));
    std::println("");
    std::println("unit: {:.4f}   iq: {:.1f}   rigged coin: {}",
                 unit(engine), iq(engine), coin(engine));
}
```

Note the asymmetry that trips everyone once: the *int* distribution includes both bounds (`{1, 6}` rolls sixes), the *real* one is half-open (`{0.0, 1.0}` never yields exactly 1.0).

Distributions are lightweight and cheap to construct; engines are the stateful, seed-once objects. One engine feeding many distributions is the normal shape of a program. Also — engines are deterministic *by design*: the same seed replays the same sequence, which is a feature (reproducible simulations, replayable game worlds, debuggable tests), not a flaw. Making the sequence unpredictable is a seeding question, covered [on the next page](/numbers-strings/random-seeding/).

## Why not rand()

`rand()` fails on every axis at once:

- **Range:** `RAND_MAX` may be as small as 32767 — 16 bits of randomness.
- **`rand() % 6` has modulo bias:** unless the range divides `RAND_MAX + 1` evenly, low values are more probable. For serious ranges the skew is measurable.
- **Quality:** typically a weak linear congruential generator; low bits are especially non-random on some implementations.
- **Global hidden state:** not thread-safe, not replayable per-component, and `srand` in one library stomps another's sequence.

`uniform_int_distribution` fixes the bias correctly (it redraws rather than taking a lazy modulo), the engine fixes the quality, and having engine *objects* fixes the global state. There is no situation in new code where `rand()` is the right call.

## Choosing an engine

| Engine | State | Character |
|--------|-------|-----------|
| `std::mt19937` / `mt19937_64` | ~2.5 KB | The default: excellent statistical quality, fast, enormous period (2^19937−1) |
| `std::minstd_rand` | 4 bytes | Tiny LCG: fits anywhere, weaker quality — embedded/per-particle use |
| `std::ranlux48` | ~few hundred B | Slow, strongest statistical guarantees — scientific niche |
| `std::default_random_engine` | ? | **Implementation-defined** — different streams per compiler; avoid when reproducibility matters |

Practical answer: `std::mt19937` (or `_64` if you consume 64-bit values), named explicitly so GCC, Clang, and MSVC replay identical sequences from identical seeds. One caveat worth knowing: **none of these are cryptographic**. An observer who sees enough mt19937 output can reconstruct its state and predict the rest. Tokens, session IDs, keys, shuffling for money — use the OS CSPRNG (`getrandom`, `BCryptGenRandom`), not `<random>` engines.

## The distribution catalog worth memorizing

`uniform_int_distribution`, `uniform_real_distribution`, `normal_distribution`, `bernoulli_distribution` cover 95% of application needs. The rest of the catalog is there when the model calls for it: `poisson_distribution` (events per interval), `exponential_distribution` (time between events), `discrete_distribution` (weighted choice among options — loot tables), `shuffle` (with `std::ranges::shuffle`) for permutations.

Seeing a distribution work makes it concrete — ten thousand normal samples, bucketed into a terminal histogram:

```cpp run
#include <cmath>
#include <map>
#include <print>
#include <random>
#include <string>

int main() {
    std::mt19937 engine{7};
    std::normal_distribution<double> gauss{0.0, 1.0};

    std::map<int, int> buckets;
    for (int i = 0; i < 10'000; ++i) {
        ++buckets[static_cast<int>(std::lround(gauss(engine)))];
    }

    for (const auto& [bucket, count] : buckets) {
        std::println("{:>3} | {}", bucket, std::string(count / 100, '*'));
    }
}
```

Run it — the bell curve draws itself. Swapping one line (`gauss` → `std::exponential_distribution<double>{1.0}`) reshapes the entire output; that's the engine/distribution split earning its keep.

## Passing engines around

Two details that keep multi-part programs sane:

- **Pass engines by reference** (`std::mt19937&`). Copying an engine duplicates its state — both copies then emit *identical* "random" sequences, a bug that looks like coincidence until it doesn't.
- **One engine per thread** (`thread_local std::mt19937` or explicit per-worker engines). Engines aren't thread-safe, and sharing one behind a mutex serializes your parallel simulation.

## Guidelines

- Always the pair: named engine + distribution. Never `engine() % n` — that reintroduces modulo bias past the front door.
- Default to `std::mt19937`, spelled out (not `default_random_engine`) for cross-compiler reproducibility.
- Fixed seeds for tests and demos; entropy-based seeding for everything else — [next page](/numbers-strings/random-seeding/).
- Engines by reference, one per thread, never copied casually.
- Anything an adversary must not predict: OS CSPRNG, not `<random>`.
