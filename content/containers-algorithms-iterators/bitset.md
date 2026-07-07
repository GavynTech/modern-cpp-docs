---
title: Using bitset for fixed-size sequences of bits
description: Exactly N bits with named operations - building bitsets from integers and strings, testing and flipping bits, the bitwise operators, conversions out, and replacing hand-rolled flag masks.
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
next:
  title: Using vector<bool> for variable-size sequences of bits
  href: /containers-algorithms-iterators/vector-bool/
---

<span class="std">C++11: all, to_ullong, hash</span> <span class="std">C++23: constexpr</span>

Some data is naturally a row of switches: the permission bits on a file, the feature flags of a session, the days of the week a job runs, the *visited* marks of a graph traversal. The C tradition packs those switches into an unsigned integer and works them with `|`, `&`, `~`, and hand-written mask constants — compact and fast, famously easy to get subtly wrong, and capped at 64 flags. When the number of bits is known at compile time, the standard library has a purpose-built type: `std::bitset<N>` from `<bitset>`, in the library since C++98. A bitset holds exactly `N` bits with a named member function for every bit operation, checked access where you want it, and conversions in and out of integers and strings.

Unlike `vector`, a bitset never allocates — the bits live inside the object, rounded up to whole machine words. On 64-bit libstdc++, `sizeof(std::bitset<8>)` is 8 bytes (one word) and `std::bitset<1000>` is 128. Copying one copies words, comparing one compares words; it is a value type through and through.

One printing note before the samples: `bitset` predates [`std::format` and `std::print`](/numbers-strings/format-print/) and has not been taught to them — there is no `std::formatter` for it, so `std::println("{}", b)` does not compile. Every sample below prints through `to_string()`; the classic stream `operator<<` also still works.

## Creating bitsets

A default-constructed bitset is all zeros. Beyond that, bits come from an integer — bit for bit — or from a string of `'0'` and `'1'` characters, read the way you'd read a binary literal:

```cpp run
#include <bitset>
#include <print>

int main() {
    std::bitset<8> empty;                            // 00000000
    std::bitset<8> answer{42};                       // 00101010 - the bits of 42
    std::bitset<8> from_str{"11010010"};             // exactly the bits written
    std::bitset<8> low_bits{"1011"};                 // 00001011 - short strings fill the low end
    std::bitset<8> custom{"xooxxoox", 8, 'o', 'x'};  // x reads as 1, o as 0
    std::bitset<4> truncated{0xFEDC};                // 1100 - only the low 4 bits are kept

    std::println("empty     {}", empty.to_string());
    std::println("answer    {}", answer.to_string());
    std::println("from_str  {}", from_str.to_string());
    std::println("low_bits  {}", low_bits.to_string());
    std::println("custom    {}", custom.to_string());
    std::println("truncated {}", truncated.to_string());
}
```

The indexing convention matters more than anything else on this page: **bit 0 is the least significant bit** — the *rightmost* character of the string form. `from_str[0]` above is `0`, the last character written, not the first. Strings and integers agree with each other: `bitset<8>{42}` and `bitset<8>{"00101010"}` are the same object.

The edges behave predictably. An integer with more bits than the bitset is silently truncated to the low `N` bits. A string shorter than `N` fills the low bits and leaves the high bits zero; a string containing any character that isn't the zero or one character throws `std::invalid_argument`. And [brace initialization](/core-language/uniform-initialization/) does its usual narrowing service: `std::bitset<8> b{-1}` refuses to compile, while `std::bitset<8> b(-1)` converts −1 to all-ones and keeps the low eight — though `b.set()` says *every bit on* more clearly.

## Reading bits

`count()` is the number of set bits — a hardware popcount, at any width. `size()` is always `N`; it's the template parameter, not a measurement. For single bits there are two spellings with the same trade-off as `vector`: `b[i]` is unchecked (out of range is undefined behavior), `b.test(i)` is checked and throws `std::out_of_range`. Three whole-set queries round it out — `any()`, `all()` <span class="std">(C++11)</span>, and `none()`:

```cpp run
#include <bitset>
#include <print>
#include <stdexcept>

int main() {
    const std::bitset<8> b{"10110010"};

    std::println("{} of {} bits are set", b.count(), b.size());
    std::println("bit 0: {}  bit 1: {}", b[0], b[1]);   // unchecked
    std::println("bit 7: {}", b.test(7));               // checked

    std::println("any {}  all {}  none {}", b.any(), b.all(), b.none());

    try {
        [[maybe_unused]] bool oops = b.test(8);         // past the end ...
    } catch (const std::out_of_range&) {
        std::println("test(8) threw out_of_range");     // ... throws, never UB
    }
}
```

On a `const` bitset, `b[i]` returns a plain `bool`, which is why the sample above prints it directly. On a *non-const* bitset it returns `std::bitset<N>::reference`, a proxy object that stands in for the unaddressable bit — so `auto bit = b[1]` on a mutable bitset captures the proxy, not a boolean, and the proxy has no formatter either. The same proxy design returns in [`std::vector<bool>`](/containers-algorithms-iterators/vector-bool/); here its useful face is the next section's `b[i] = true`.

## Setting, clearing, and flipping

`set(i)` turns a bit on (or to an explicit second argument), `reset(i)` turns it off, `flip(i)` inverts it — and each, called with no argument, does the same to *every* bit. All of them return the bitset itself, so calls chain:

```cpp run
#include <bitset>
#include <print>

int main() {
    std::bitset<8> b;
    b.set(1).set(3).set(5);                // set/reset/flip return b, so calls chain
    std::println("set bits  {}", b.to_string());

    b[7] = true;                           // non-const operator[] is assignable
    b.reset(1);
    b.flip(0);
    std::println("adjusted  {}", b.to_string());

    b.flip();                              // no argument: every bit at once
    std::println("flipped   {}", b.to_string());

    b.set();                               // all on
    b.reset();                             // all off
    std::println("cleared   {}", b.to_string());
}
```

Like `test`, the indexed forms throw `std::out_of_range` for a bad position — a mutation can't silently scribble past the end.

## The bitwise operators

The operators an unsigned integer offers all work on bitsets of the same size, element-wise across the whole set: `&`, `|`, `^`, `~`, the shifts, their compound forms, and `==`:

```cpp run
#include <bitset>
#include <print>

int main() {
    std::bitset<8> a{"00111100"};
    std::bitset<8> mask{"01010101"};

    std::println("a & mask  {}", (a & mask).to_string());
    std::println("a | mask  {}", (a | mask).to_string());
    std::println("a ^ mask  {}", (a ^ mask).to_string());
    std::println("~a        {}", (~a).to_string());
    std::println("a << 2    {}", (a << 2).to_string());   // toward the high end
    std::println("a >> 2    {}", (a >> 2).to_string());
    std::println("a == mask: {}", a == mask);
}
```

Shifts move bits toward higher or lower positions; bits pushed past either end are discarded and zeros shift in — there is no rotate. Two details make these operators better than their integer ancestors. First, they are width-safe: `bitset<8> & bitset<16>` simply doesn't compile, where mixing `uint8_t` and `uint32_t` masks silently promotes and carries on. Second, they scale: the operations run whole words at a time, so an `&` over `bitset<1000>` is sixteen 64-bit ANDs, and `count()` compiles down to popcount instructions. (For bit tricks on actual *integers* — rotates included — C++20's `<bit>` header is the modern toolkit; `bitset` is the container-shaped answer.)

## Converting out: strings and integers

`to_string()` renders the bits most-significant first, with optional custom characters for zero and one. `to_ulong()` and `to_ullong()` <span class="std">(C++11)</span> convert back to an integer — and throw `std::overflow_error` if any set bit lies beyond what the destination type can hold:

```cpp run
#include <bitset>
#include <print>
#include <stdexcept>

int main() {
    std::bitset<8> b{"11010010"};

    std::println("{}", b.to_string());              // "11010010"
    std::println("{}", b.to_string('.', '#'));      // "##.#..#."
    std::println("{}", b.to_ulong());               // 210
    std::println("{:#x}", b.to_ullong());           // 0xd2

    std::bitset<80> wide;                           // more bits than any integer
    wide.set(70);
    try {
        [[maybe_unused]] auto v = wide.to_ullong(); // a bit beyond 64 is set ...
    } catch (const std::overflow_error&) {
        std::println("to_ullong: does not fit");    // ... so this throws
    }
}
```

The throw is the honest part of the design: a `bitset<80>` whose set bits all sit below bit 64 converts fine, so the failure depends on the *value*, not the type — always guard the call or keep integer-round-tripping bitsets at 64 bits or fewer. Going the other way makes a handy debugging trick: `std::bitset<64>{x}.to_string()` shows any integer's exact bits. <span class="std">C++11</span> also gave bitset a `std::hash` specialization, so a bitset can key an `unordered_map` directly — natural when a combination of flags identifies a configuration.

## Replacing C-style flag masks

Here is the payoff in ordinary code. The integer idiom needs a mask constant per flag, two operators to clear, three to test readably — and it prints as a meaningless decimal:

```cpp run
#include <bitset>
#include <cstddef>
#include <print>

// The C tradition: mask constants, combined and cleared by hand.
constexpr unsigned OLD_READ = 1u << 0, OLD_WRITE = 1u << 1;

enum Permission : std::size_t { Read, Write, Exec, Count };   // bit positions

int main() {
    unsigned old_style = OLD_READ | OLD_WRITE;
    old_style &= ~OLD_WRITE;                        // clearing takes two operators
    std::println("old style: {:#b}", old_style);

    std::bitset<Permission::Count> perms;
    perms.set(Read).set(Write);
    perms.reset(Write);
    perms.flip(Exec);
    std::println("read {}  write {}  exec {}",
                 perms.test(Read), perms.test(Write), perms.test(Exec));
    std::println("{} of {} permissions granted", perms.count(), perms.size());
}
```

Two things carry this pattern. The enum names **positions** (0, 1, 2, …), not masks (1, 2, 4, …) — mixing the two conventions is *the* classic bug when migrating integer-flag code, because `set(OLD_WRITE)` happily sets bit 2. And this is one of the few places a plain enum beats an `enum class`: the implicit conversion to `size_t` that makes unscoped enums risky elsewhere ([scoped enumerations](/core-language/scoped-enums/)) is exactly what lets `perms.set(Read)` read like a sentence. The sized bitset also grows honestly — a 65th flag is a one-line change that would break every `unsigned long long` version of this code.

## bitset at compile time

Two members were `constexpr` as far back as C++11 — the integer constructor and the `const` subscript — enough for mask constants. <span class="std">C++23</span> made the *entire* class constexpr: construct from strings, `set`, `flip`, `count`, even `to_string`, all usable in constant expressions. And because a bitset never allocates, a `constexpr` bitset **variable** is perfectly fine — the very thing that remains off the table for `constexpr std::vector`:

```cpp run
#include <bitset>
#include <cstddef>
#include <print>

constexpr std::bitset<100> prime_sieve() {
    std::bitset<100> is_prime;
    is_prime.set();                              // start from "everything is prime"
    is_prime.reset(0).reset(1);
    for (std::size_t i = 2; i * i < is_prime.size(); ++i)
        if (is_prime[i])
            for (std::size_t j = i * i; j < is_prime.size(); j += i)
                is_prime.reset(j);
    return is_prime;
}

constexpr auto primes = prime_sieve();           // a constexpr bitset variable is fine
static_assert(primes.count() == 25);             // 25 primes below 100 - proven
static_assert(primes.test(97) && !primes.test(51));

int main() {
    for (std::size_t i = 0; i < primes.size(); ++i)
        if (primes[i]) std::print("{} ", i);
    std::println("");
}
```

The sieve lives in the executable as 16 precomputed words; `main` only reads it. Any fixed lookup table of booleans — opcode properties, character classes, allowed state transitions — can be built and *proven* this way.

## When bitset isn't the tool

- **The size is a run-time value.** `N` is a template parameter; there is no growing, shrinking, or "about 1000" about it. A bit sequence sized at run time is [`std::vector<bool>`'s job](/containers-algorithms-iterators/vector-bool/) — the next page. (Outside the standard, `boost::dynamic_bitset` covers the same ground with more bitset-flavored API.)
- **You need iteration or algorithms.** For all its container manners, `bitset` is not a range: no `begin()`, no `end()`, no range-based `for`, no `std::ranges` anything. Walking one is an index loop from `0` to `size()`.
- **The flags cross a boundary.** A syscall, file format, or hardware register that specifies an integer wants the integer; keep the established masks at that edge, or convert with `to_ullong()` on the way out, and let `bitset` improve the code on the inside.

## Guidelines

- Reach for `bitset` whenever a fixed collection of on/off flags travels together — it names what an integer full of masks only implies.
- Name bit positions with an enum, and remember they are positions (0, 1, 2, …), not masks (1, 2, 4, …).
- Bit 0 is the least significant bit — the rightmost character of the string form.
- Use `operator[]` when the index is correct by construction (a loop bounded by `size()`); use `test()` when it arrives from elsewhere — one is undefined out of range, the other throws.
- `set`, `reset`, and `flip` return the bitset: chain them.
- Round-trip through `to_ullong()` only when every set bit fits in 64 bits — it throws `std::overflow_error` otherwise.
- Print through `to_string()`; there is no `std::formatter` for `bitset`.
