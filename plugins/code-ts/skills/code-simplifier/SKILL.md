---
name: code-simplifier
description: >-
  Simplifies and refines recently modified code for clarity, consistency, and maintainability while
  preserving all functionality. Use when reviewing, refactoring, or cleaning up code after
  implementation.
---

# Code Simplifier

## When to use

Apply after implementing changes to refine recently modified code. Focuses on the current session's
changes unless instructed to review a broader scope.

## Refinement principles

1. **Preserve functionality** — never change what the code does, only how it's written.
2. **Apply project standards** — follow the repository's `AGENTS.md` and the coding-standards skills
   it names.
3. **Enhance clarity** — reduce unnecessary complexity and nesting, eliminate redundant
   abstractions, improve naming, consolidate related logic, remove comments that describe obvious
   code.
4. **Avoid nested ternaries** — prefer `if`/`else` chains or early returns for multiple conditions.
5. **Clarity over brevity** — explicit, readable code is better than dense one-liners.

## Avoid over-simplification

- Do not create overly clever solutions that are hard to understand
- Do not combine too many concerns into single functions or components
- Do not remove helpful abstractions that improve code organization
- Do not prioritize "fewer lines" over readability

## Process

1. Identify recently modified code sections
2. Analyze for clarity, consistency, and redundancy
3. Apply project-specific standards from matching skills
4. Verify all functionality remains unchanged
5. Run `code-linter` skill after changes
