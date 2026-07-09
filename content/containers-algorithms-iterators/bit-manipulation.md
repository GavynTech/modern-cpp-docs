---
title: Using the bit manipulation utilities
description: The C++20 <bit> header's integer utilities - counting and visiting set bits, the power-of-two helpers, rotations without undefined edges, endian and byteswap, and type punning with bit_cast.
section: Standard library containers, algorithms, and iterators
section_href: /#standard-library-containers-algorithms-and-iterators
---

<span class="std">C++20: the &lt;bit&gt; header</span> <span class="std">C++23: byteswap</span>

The [bitset page](/containers-algorithms-iterators/bitset/) closed its operator tour with a pointer: for bit tricks on actual *integers* — rotates included — C++20's `<bit>` header is the modern toolkit. This page opens the toolbox. Before C++20, this territory ran on folklore and vendor intrinsics: shift-and-mask recipes copied from [Bit Twiddling Hacks](https://graphics.stanford.edu/~seander/bithacks.html), `__builtin_popcount` and `__builtin_clz` on GCC and Clang, `_BitScanForward` on MSVC — each naming the right machine instruction, none portable, and some undefined exactly where inputs get interesting (`__builtin_clz(0)` is undefined behavior). The header standardizes the kit as ordinary named functions: every one `constexpr` and `noexcept`, every edge case defined, and each compiling down to the single instruction the intrinsic named where the hardware has one — `popcnt`, `lzcnt`, `tzcnt`, `rol`, `bswap` on x86; `clz`, `rbit`, `rev` on Arm — with a correct fallback where it doesn't.

One signature rule shapes everything until the last two sections: the functions accept **unsigned integer types only** — `unsigned int`, `unsigned long long`, the fixed-width aliases like `std::uint32_t` ([numeric types](/numbers-strings/numeric-types/)) — and reject `bool`, the character types, and every signed type at compile time. Plain literals bite first: `std::popcount(42)` does not compile, because `42` is an `int`; write `std::popcount(42u)`. The strictness is deliberate. On a signed type, half of these questions would quietly hinge on the sign bit, so the library makes you convert first — the question is then visibly about a bit pattern, not a quantity.

## Counting bits

Five functions count. `std::popcount(x)` — *population count*, after the instruction — is the number of set bits, the same operation `bitset::count()` compiles down to. The other four read like coordinates: `countl_zero` and `countl_one` count *consecutive* zeros or ones from the left (the most significant end), `countr_zero` and `countr_one` from the right. All five return a plain `int`:

```cpp run
#include <bit>
#include <cstdint>
#include <print>

int main() {
    std::uint8_t b{0b1110'0110};

    std::println("bits         {:#010b}", b);
    std::println("popcount     {}", std::popcount(b));     // 5 ones in total
    std::println("countl_one   {}", std::countl_one(b));   // 3 ones from the left
    std::println("countr_zero  {}", std::countr_zero(b));  // 1 zero from the right
    std::println("countl_zero  {}  countr_one {}", std::countl_zero(b), std::countr_one(b));

    // zeros counted from the left (most significant bit) and from the right
    for (std::uint8_t n : {0b0000'0000, 0b1111'1111, 0b0001'1010})
        std::println("{:#010b}   countl_zero {}  countr_zero {}", n,
                     std::countl_zero(n), std::countr_zero(n));

    std::uint32_t wide = b;                                // same value, wider type
    std::println("countl_zero  {} in a uint32_t", std::countl_zero(wide));

    // std::popcount(230);      // compile error: 230 is an int, not unsigned
    std::println("popcount     {} for 230u", std::popcount(230u));
}
```

Two lessons in the sample. **The width belongs to the type, not the value.** `countl_zero` answers "how many of the type's leading bits are zero," so the same value scores 0 in a `std::uint8_t` and 24 in a `std::uint32_t` — the left-anchored counts move when the type widens; the right-anchored ones don't. The all-zeros row makes the sharpest version of the point: `countl_zero(0b0000'0000u)` would print **32**, because that innocent literal is a 32-bit `unsigned int` — the loop's `std::uint8_t` is what makes the answer 8. When a leading-zero count feeds an algorithm, a fixed-width type keeps the question stable. **Promotion is fenced out.** Arithmetic on small unsigned types produces `int`, so `std::popcount(b << 1)` refuses to compile until the result is cast back to an unsigned type — a classic silently-wrong-answer turned into a loud compile error. And the all-zeros input, the one that broke the intrinsics, is simply defined from both ends: the full width, whichever direction you count from.

## Visiting the set bits

Half the time, a counting function is really an *indexing* function. `countr_zero(x)` is the index of the lowest set bit (for nonzero `x`), and the classic expression `x & (x - 1)` clears exactly that bit — subtracting one borrows through the trailing zeros and turns the lowest one off. Pair them and an integer becomes a tiny sorted container of indices:

```cpp run
#include <bit>
#include <cstdint>
#include <print>

int main() {
    std::uint32_t ready{0b1010'0110};            // bit i set = worker i has work queued

    std::println("{} of 32 workers ready", std::popcount(ready));
    while (ready != 0) {
        int id = std::countr_zero(ready);        // index of the lowest set bit
        std::print("dispatching {}  ", id);
        ready &= ready - 1;                      // clear exactly that bit
    }
    std::println("");
}
```

The loop runs once per *set* bit, not once per bit — the cost tracks the popcount, not the width. This idiom is the engine inside chess-engine bitboards, allocators' free maps, and readiness masks in event loops; it is the [`vector<bool>`](/containers-algorithms-iterators/vector-bool/) density argument taken to its limit — thirty-two booleans in one register, iterated by arithmetic. The mirror question, the index of the *highest* set bit, belongs to the next section: it is `bit_width(x) - 1`.

## Powers of two

Four functions handle the power-of-two questions every allocator, hash table, and ring buffer asks. `has_single_bit(x)` is the honest name for "is `x` a power of two" — exactly one bit set. The other three:

- If you need to find the smallest power of two that is greater than or equal to a given number, use `std::bit_ceil<T>()`.
- On the other hand, if you need to find the largest power of two that is smaller than or equal to a given number, use `std::bit_floor<T>()`.
- If you need to determine the smallest number of bits needed to represent a number, use `std::bit_width<T>()`:

```cpp run
#include <bit>
#include <iostream>

int main() {
    // right-anchored, so the literals' 32-bit width doesn't change the answers
    std::cout << std::bit_width(0u) << '\n';     // 0
    std::cout << std::bit_width(2u) << '\n';     // 2
    std::cout << std::bit_width(15u) << '\n';    // 4
    std::cout << std::bit_width(16u) << '\n';    // 5
    std::cout << std::bit_width(1000u) << '\n';  // 10
}
```

Capacity math is where all four earn their keep — power-of-two capacities turn `index % capacity` into `index & (capacity - 1)`:

```cpp run
#include <bit>
#include <cstddef>
#include <cstdint>
#include <print>

constexpr std::size_t next_capacity(std::size_t needed) {
    return std::bit_ceil(needed);                 // smallest power of two >= needed
}
static_assert(next_capacity(1000) == 1024);
static_assert(next_capacity(1024) == 1024);       // already a power of two: unchanged
static_assert(next_capacity(0) == 1);             // the empty case lands somewhere useful

int main() {
    std::println("     n  has_single_bit  bit_floor  bit_ceil  bit_width");
    for (std::uint32_t n : {0u, 1u, 5u, 64u, 1000u})
        std::println("{:>6}  {:>14}  {:>9}  {:>8}  {:>9}", n, std::has_single_bit(n),
                     std::bit_floor(n), std::bit_ceil(n), std::bit_width(n));
}
```

The zero row is all edge cases, all defined: no power of two is less than or equal to 0, so `bit_floor(0)` is 0; the smallest power of two of all is 1, so `bit_ceil(0)` is 1 — conveniently the capacity an empty table should grow to; representing zero takes no bits, so `bit_width(0)` is 0. The header's one genuine hazard also lives here: `bit_ceil` is **undefined** when the answer doesn't fit the type — `bit_ceil(std::uint8_t{200})` wants 256 — and in a constant expression that undefined behavior turns into a compile error, in the header's honest style. `bit_width` moonlights as integer log2: the highest set bit of nonzero `x` sits at index `bit_width(x) - 1`, and `bit_width(63u) == 6` says a 64-entry table is addressed by six bits. And `has_single_bit` is the alignment validator: every valid alignment is a power of two ([alignment](/core-language/alignment/)), so vetting an `aligned_alloc` argument is one call.

If you need to find whether a number is a power of two, use `std::has_single_bit<T>()`. One printing note when the answer flows through iostreams instead of [`std::print`](/numbers-strings/format-print/): `operator<<` writes a bare `bool` as `1` or `0`, and the `std::boolalpha` manipulator switches it to words — `std::print`'s `{}` needs no such help, which is why the table above said `true` and `false` on its own:

```cpp run
#include <bit>
#include <cstdint>
#include <iostream>
#include <print>

int main() {
    std::cout << std::boolalpha;    // switch operator<< from 1/0 to true/false

    std::cout << std::has_single_bit(std::uint8_t{0b0000'0001}) << '\n';  // true: 2^0
    std::cout << std::has_single_bit(std::uint8_t{0b0000'0100}) << '\n';  // true: 2^2
    std::cout << std::has_single_bit(std::uint8_t{0b0000'0101}) << '\n';  // false: two bits set
    std::cout << std::has_single_bit(std::uint8_t{0b0000'0000}) << '\n';  // false: zero isn't one

    std::println("{}", std::has_single_bit(0b0000'0100u));   // print needs no manipulator
}
```

The manipulator is sticky — it sets a format flag on the stream that stays until `std::noboolalpha` clears it — so setting it once at the top covers every line.

## Rotations

A shift discards: bits pushed past the end are gone, and zeros arrive to replace them. A *rotation* conserves. When you need a circular shift, `std::rotl<T>()` rotates left — toward the high end — and `std::rotr<T>()` rotates right, and whatever falls off one end reappears at the other. The count is a plain `int`, and **every** value of it is defined: zero is a no-op, counts at or past the width wrap modulo the width, and a negative count rotates the other way:

```cpp run
#include <bit>
#include <cstdint>
#include <print>

int main() {
    std::uint8_t n{0b0011'1100};

    std::println("n            {:#010b}", n);
    std::println("rotl(n, 0)   {:#010b}", std::rotl(n, 0));   // zero: a defined no-op
    std::println("rotl(n, 1)   {:#010b}", std::rotl(n, 1));
    std::println("rotl(n, 3)   {:#010b}", std::rotl(n, 3));
    std::println("rotl(n, 9)   {:#010b}", std::rotl(n, 9));   // 9 mod 8: same as 1
    std::println("rotl(n, -2)  {:#010b}", std::rotl(n, -2));  // negative: rotates right

    std::println("rotr(n, 0)   {:#010b}", std::rotr(n, 0));
    std::println("rotr(n, 1)   {:#010b}", std::rotr(n, 1));
    std::println("rotr(n, 3)   {:#010b}", std::rotr(n, 3));
    std::println("rotr(n, 9)   {:#010b}", std::rotr(n, 9));   // 9 mod 8: same as 1
    std::println("rotr(n, -2)  {:#010b}", std::rotr(n, -2));  // negative: rotates left

    std::println("n << 3       {:#010b}", static_cast<std::uint8_t>(n << 3));
}
```

The last line is the whole argument: all ten rotations preserved the popcount — the same four bits, circling — while the shift pushed one off the end. The width comes from the argument's type by deduction, no explicit template argument needed, and that deduced width is what the counts wrap against: 8 here, because `n` is a `std::uint8_t`. The definedness matters as much as the conservation. The pre-C++20 idiom `(x << n) | (x >> (32 - n))` is undefined at exactly `n == 0` — a right shift by the full width — so "safe" versions needed masking gymnastics that compilers then pattern-matched back into a `rol` instruction. `std::rotl` says it directly and is correct at every count. Rotations are the R in ARX ciphers (add–rotate–xor, the family ChaCha20 belongs to), the mixing step in hash finalizers, and the cheap way to cycle a fixed-size schedule mask.

## Byte order: endian and byteswap

The header also settles a question C++ programs asked with macros for decades: which end of a multi-byte integer lives at the lowest address. `std::endian` is a scoped enumeration ([scoped enums](/core-language/scoped-enums/)) with three values — `little`, `big`, and `native` — and `native` equals one of the first two on any machine you are likely to meet (the standard leaves room for mixed-endian museum pieces, where it equals neither). It is a compile-time constant, so the test is [`if constexpr`](/preprocessing-compilation/constexpr-if/) and the untaken branch evaporates. Its partner `std::byteswap` <span class="std">(C++23)</span> reverses an integer's bytes. Together they make the portable read of a wire format:

```cpp run
#include <bit>
#include <cstdint>
#include <cstring>
#include <print>

// The length field of a PNG chunk: four bytes on the wire, most significant first.
constexpr unsigned char wire[]{0x00, 0x00, 0x01, 0x00};

int main() {
    std::println("native order: {}",
                 std::endian::native == std::endian::little ? "little-endian"
                 : std::endian::native == std::endian::big  ? "big-endian"
                                                            : "mixed");

    std::uint32_t length;
    std::memcpy(&length, wire, sizeof length);          // raw bytes, in native order
    if constexpr (std::endian::native == std::endian::little)
        length = std::byteswap(length);                 // C++23: reverse the bytes
    std::println("chunk length: {} bytes", length);     // 256 on every platform

    std::println("{:#010x} byteswapped is {:#010x}",
                 0x1234'5678u, std::byteswap(0x1234'5678u));
}
```

This is `htonl`/`ntohl`, standardized and `constexpr`. Two details. First, `byteswap` is deliberately the header's odd one out on signatures: byte order is a property of the *representation*, so it accepts **any** integer type, signed included (a one-byte type swaps to itself). Second, the `memcpy`-then-swap pair costs nothing: with optimization on, GCC folds it into a single byte-reversing load (`movbe` where x86 has it, `mov` plus `bswap` where it doesn't). Write the honest bytes-in, swap-if-needed sequence and let the compiler see through it.

## Type punning with bit_cast

Everything so far rearranged bits *within* a type. `std::bit_cast<To>(from)` — same header, easy to forget — crosses between types: it returns a `To` whose object representation is a byte-for-byte copy of `from`'s. The requirements are exactly the honest ones — `To` and `From` the same size, both trivially copyable — and unlike every historical spelling of this operation, the behavior is defined. `reinterpret_cast<std::uint32_t&>(f)` violates strict aliasing; writing one union member and reading another is undefined in C++ (C folklore that never became C++ law); `memcpy` into a fresh object was the one blessed route, but three lines and never `constexpr`. `bit_cast` is one expression, works in constant expressions, and compiles to nothing — the bytes were already right:

```cpp run
#include <bit>
#include <cstdint>
#include <print>

static_assert(std::bit_cast<std::uint32_t>(1.0f) == 0x3F80'0000);  // IEEE 754, proven

int main() {
    float f = -6.25f;
    auto bits = std::bit_cast<std::uint32_t>(f);       // the same four bytes, as an integer

    std::println("float     {}", f);
    std::println("bits      {:#034b}", bits);
    std::println("sign      {}", bits >> 31);
    std::println("exponent  {:#010b} (biased)", (bits >> 23) & 0xFFu);
    std::println("fraction  {:#025b}", bits & 0x7F'FFFFu);

    bits ^= 0x8000'0000u;                              // flip one bit ...
    std::println("flipped   {}", std::bit_cast<float>(bits));   // ... and -6.25 negates
}
```

The `static_assert` at the top is quietly remarkable: it *proves* the platform's float layout at compile time — the guard a serializer or a GPU buffer packer wants pinned down ([static_assert](/preprocessing-compilation/static-assert/)). Once a float's bits are an integer, the rest of the header applies, and the trip runs in reverse: `bit_cast<float>(bits)` builds a float from forged bits, which makes Quake III's legendary fast inverse square root (`0x5f3759df`) finally writable without undefined behavior. The same trick in ordinary clothes: hashing a `double` means hashing its `bit_cast<std::uint64_t>` (mind that `0.0` and `-0.0` compare equal but differ in bits). One boundary: in constant expressions `bit_cast` refuses pointers, unions, and `volatile` members, so `bit_cast<std::uintptr_t>(p)` is a run-time-only tool.

## When `<bit>` isn't the tool

- **The bits have names, or outgrow a register.** A fixed set of labeled flags reads better as a `bitset` driven by an enum ([the bitset page](/containers-algorithms-iterators/bitset/)); a bit sequence sized at run time is [`std::vector<bool>`'s job](/containers-algorithms-iterators/vector-bool/). This header takes over when the integer itself is the data structure — a mask, a hash state, a wire field — and one machine word is enough.
- **The value is signed.** Nothing here (`byteswap` aside) will touch it. Convert explicitly — `static_cast<std::uint32_t>(i)`, or `std::make_unsigned_t<T>` in generic code — and read the answer as a statement about the two's-complement representation: `popcount(static_cast<unsigned>(-1))` is 32, the right answer about bits and a strange one about numbers.
- **The bit work is arithmetic in costume.** `x * 8`, `x / 32`, `x % 16` on unsigned types compile to shifts and masks without help. Reach for `<bit>` when the question is genuinely about representation — "next power of two," "which bits are set" — not to hand-optimize arithmetic the optimizer already owns.

## Guidelines

- Prefer `<bit>` to vendor intrinsics and hand-derived twiddling: the same instructions, on every compiler, `constexpr`, and defined at zero and every other edge.
- The header speaks unsigned. Plain `int` literals (`popcount(42)`) and promoted arithmetic (`popcount(b << 1)`) fail to compile — write `42u`, cast small-type arithmetic back, and convert signed values deliberately.
- Left-anchored counts (`countl_zero`, `countl_one`) depend on the type's width; use fixed-width types when the count feeds an algorithm.
- Visit set bits with `countr_zero` plus `x &= x - 1` — cost proportional to the popcount, not the width.
- Size with `bit_ceil`, test with `has_single_bit`, measure with `bit_width` (highest set bit: `bit_width(x) - 1`). The zero cases are defined — `bit_ceil(0) == 1`, `bit_floor(0) == 0`, `bit_width(0) == 0` — but `bit_ceil` is undefined when the result overflows the type.
- Rotate with `rotl`/`rotr`: every count is defined, and negatives reverse direction. Retire `(x << n) | (x >> (w - n))`, which is undefined at `n == 0`.
- Branch on `std::endian::native` with `if constexpr` and swap with `byteswap` (C++23) — the standard spelling of `htonl` and friends.
- If you need to reinterpret an object representation of the type `F` as that of a type `T`, then use `std::bit_cast<T, F>()`.
- Type-pun only with `bit_cast` — same size, trivially copyable, `constexpr` — never with `reinterpret_cast` or a union, which are undefined for this job.

> [Using bitset for fixed-size sequences of bits](/containers-algorithms-iterators/bitset/), to learn about the standard container for handling bit sequences of fixed sizes.
