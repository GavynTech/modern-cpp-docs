---
title: Properly initializing a pseudo-random number generator
description: Why single-value seeding underfills big engines, std::random_device, seed_seq, full-state seeding, and reproducibility discipline.
section: Numbers and strings
section_href: /#numbers-and-strings
next:
  title: Creating cooked user-defined literals
  href: /numbers-strings/cooked-literals/
---

<span class="std">C++11</span>

An engine's output stream is completely determined by its starting state, so *seeding* — establishing that state — decides everything about the randomness you get. The two classic mistakes are seeding from the clock (predictable, and identical across processes started in the same second) and stuffing a 32-bit value into an engine with kilobytes of state. Both have standard fixes.

## Where entropy comes from: std::random_device

`std::random_device` asks the operating system for *non-deterministic* bits (on Linux, the same pool behind `/dev/urandom`):

```cpp run
#include <print>
#include <random>

int main() {
    std::random_device entropy;

    std::println("three draws: {} {} {}", entropy(), entropy(), entropy());
    std::println("entropy estimate: {}", entropy.entropy());
}
```

It's the right *source* but the wrong *workhorse*: each call may be a system call (slow), and it isn't seedable or reproducible. The pattern is always `random_device` → seed an engine → engine does the fast work. One historical caveat: ancient MinGW builds made `random_device` deterministic (same sequence every run!); `entropy() > 0` is the runtime sniff test, and any toolchain from the last decade is fine.

## The under-seeding problem

Here's the mistake almost every codebase makes:

```cpp
std::random_device rd;
std::mt19937 engine{rd()};   // one 32-bit value into 19,968 bits of state
```

It compiles, runs, and *looks* random. But mt19937's state is 624 words; seeding from a single `unsigned int` means the engine can only ever begin in 2³² of its ~2¹⁹⁹³⁷ possible states. Consequences that matter in practice: some outputs are simply unreachable from any single-word seed (famously, certain first draws can never occur), and two runs colliding on a seed — a real risk at scale, by birthday math, after ~65,000 runs — replay identical streams.

For a game's loot drops, nobody will sue. For a Monte Carlo simulation, a fuzzer, or anything whose statistics you'll defend, seed the whole state:

```cpp run
#include <array>
#include <print>
#include <random>

std::mt19937 make_seeded_engine() {
    std::random_device entropy;

    // One word of entropy per word of engine state...
    std::array<std::mt19937::result_type, std::mt19937::state_size> noise;
    for (auto& word : noise) word = entropy();

    // ...mixed through seed_seq, which also guards against weak/correlated input.
    std::seed_seq seq(noise.begin(), noise.end());
    return std::mt19937{seq};
}

int main() {
    auto engine = make_seeded_engine();
    std::uniform_int_distribution<int> d{0, 999};

    std::println("{} {} {}", d(engine), d(engine), d(engine));
}
```

`std::seed_seq` is the mixing stage: it whitens whatever you feed it across the engine's full state, so even partially-correlated inputs (timestamps, thread IDs) can be *added* to the mix without weakening it. `state_size` is mt19937's own published constant — the code stays correct if you switch to `mt19937_64`.

## Reproducibility is a feature: treat seeds like inputs

Deterministic replay is the other half of seeding discipline. The rule: **every run should be reproducible after the fact**, which means the seed is data, not vapor:

```cpp run
#include <print>
#include <random>
#include <string>

int main(int argc, char** argv) {
    // Accept a seed for replay; otherwise draw one - but LOG it either way.
    std::mt19937::result_type seed =
        argc > 1 ? static_cast<std::mt19937::result_type>(std::stoul(argv[1]))
                 : std::random_device{}();

    std::println("--seed {}   (rerun with this value to replay)", seed);

    std::mt19937 engine{seed};
    std::uniform_int_distribution<int> d{1, 100};
    std::println("run: {} {} {}", d(engine), d(engine), d(engine));
}
```

This is the pattern fuzzers, property-based test frameworks, and simulation codes converge on: a failing run prints its seed, and the bug report contains one number instead of "happens sometimes." (Single-value seeding is fine *here* — the goal of a replay seed is compactness; full-state seeding is for statistical quality when no one needs to retype it.)

Two related rules: seed engines **once**, at construction — re-seeding per call ("for freshness") destroys the statistical guarantees and usually *reduces* variability; and give **each thread its own engine with its own seed** (mix a thread index into the `seed_seq` input) rather than cloning one seeded engine, which would give every thread the same stream.

## What not to do, collected

```cpp
std::mt19937 e1{static_cast<unsigned>(time(nullptr))};
// Predictable (attacker knows the clock), collides across same-second starts.

std::mt19937 e2;            // default-constructed: SAME fixed seed, every run
srand(time(nullptr));       // all of rand()'s problems, plus the above

auto worker = engine;       // copied engine: two identical "random" streams
```

The default-constructed trap deserves a highlight: `std::mt19937 e;` uses a *documented constant* (5489). Handy for quick tests, catastrophic when it silently ships because seeding code got refactored away.

## Guidelines

- Seed from `std::random_device`, never the clock; use the clock only as *extra* material in a `seed_seq`.
- Full-state seeding (`state_size` words through `seed_seq`) for anything whose statistics matter; single-word seeds only as loggable replay handles.
- Print or persist the seed of every non-reproducible run; accept a seed as input for replay.
- Seed once per engine, one engine per thread, never copy a seeded engine into workers.
- Watch for `std::mt19937 e;` with no seed at all — it's the same stream every run, by specification.
