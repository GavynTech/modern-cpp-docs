---
title: Virtual methods with override and final
description: Making the compiler verify your overrides, sealing hierarchies, and the silent bugs these two words eliminate.
section: Core language features
section_href: /#core-language-features
next:
  title: Iterating with range-based for loops
  href: /core-language/range-based-for/
---

<span class="std">C++11</span>

To override a virtual function, a derived class must declare a function with the *exact* same name, parameter types, const/ref qualification, and a compatible return type. Miss by a character and C++ does not complain — it quietly gives you a brand-new, unrelated function, and every virtual call keeps dispatching to the base version. `override` turns that entire bug class into compile errors; `final` closes a virtual function or a whole class to further overriding.

## The silent non-override

Every one of these compiles without `override`, and every one is a bug:

```cpp
class Base {
public:
    virtual ~Base() = default;
    virtual void handle(int event);
    virtual void render() const;
    virtual void resize(unsigned w, unsigned h);
};

class Derived : public Base {
public:
    void handle(long event);        // wrong parameter: new overload, not an override
    void render();                  // missing const: new function, not an override
    void resize(unsigned w);        // wrong arity: new function
    void handel(int event);         // typo: obviously new, silently accepted
};
```

`Derived d; Base& b = d; b.render();` calls `Base::render` — no warning, no error, just wrong behavior at a distance. Now add the keyword:

```cpp
class Derived : public Base {
public:
    void handle(long event) override;  // error: does not override anything
    void render() override;           // error: missing const
    void handel(int event) override;  // error: no 'handel' in any base
};
```

All four mistakes become compile errors at the declaration itself. Just as important: when someone later *changes the base class* signature, every derived class marked `override` fails to compile instead of silently detaching — the compiler enumerates every call site of your refactoring for free.

## A correct hierarchy

```cpp run
#include <memory>
#include <numbers>
#include <print>
#include <string_view>

class Shape {
public:
    virtual ~Shape() = default;                 // virtual dtor: mandatory for base classes
    virtual double area() const = 0;
    virtual std::string_view name() const { return "shape"; }
};

class Circle : public Shape {
public:
    explicit Circle(double r) : radius_{r} {}
    double area() const override { return std::numbers::pi * radius_ * radius_; }
    std::string_view name() const override { return "circle"; }
private:
    double radius_;
};

// 'final' on the class: nothing may derive from UnitCircle.
class UnitCircle final : public Circle {
public:
    UnitCircle() : Circle(1.0) {}
    std::string_view name() const override { return "unit circle"; }
};

int main() {
    std::unique_ptr<Shape> s = std::make_unique<UnitCircle>();
    std::println("{}: area = {:.4f}", s->name(), s->area());
}
```

Style detail: the derived declarations say `override` but not `virtual`. A function that overrides is virtual automatically; repeating `virtual` adds noise and lets the two keywords drift apart. One keyword, the meaningful one.

`override` and `final` are *contextual* keywords — special only in this position — so ancient code using them as identifiers keeps compiling. This is why they appear after the declaration instead of before it.

## final: closing things down

`final` comes in two strengths:

```cpp
class Renderer {
public:
    virtual void draw() final;     // no derived class may override draw()
};

class VulkanRenderer final : public Renderer { /* ... */ };
                     // ^ no class may derive from VulkanRenderer at all
```

Use it for two reasons:

- **Design enforcement.** A template-method skeleton whose steps may vary but whose driver must not; a class not written to be a base (most concrete classes). `final` documents and enforces the boundary.
- **Devirtualization.** A virtual call through a pointer to a `final` class (or to a `final` function) has exactly one possible target, so the compiler is allowed to replace indirect dispatch with a direct — even inlined — call. On hot paths with tight loops over `final` types, this is measurable.

Don't seal casually, though: a `final` on a library class is a promise you cannot walk back without breaking downstream code, and it blocks legitimate test doubles that derive from the class. Seal for a reason you can state.

## Interaction with destructors

The rule that predates both keywords still applies: **a class intended as a polymorphic base needs a virtual destructor** (`virtual ~Base() = default;`), or `delete`-through-base is undefined behavior. `override` extends its protection here too — marking a derived destructor `override` verifies the base one is actually virtual:

```cpp
class Widget : public Base {
public:
    ~Widget() override = default;   // compile error if ~Base() isn't virtual
};
```

## Guidelines

- Every function that overrides gets `override`, no exceptions — enable `-Wsuggest-override` (GCC/Clang) to have the compiler audit the codebase.
- Write `override` *instead of* `virtual` in derived classes, not alongside it.
- Give every polymorphic base a virtual destructor; consider `~Derived() override` as a cheap assertion that it stayed virtual.
- Apply `final` deliberately: sealed steps in a fixed protocol, concrete leaf classes on hot paths — and be able to say why.
