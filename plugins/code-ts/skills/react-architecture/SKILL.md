---
name: react-architecture
description: >-
  React standard for TypeScript apps: `.tsx` only for components and hooks, one component
  declaration (`const Button: React.FC<Props>` plus its `displayName`), props named `Props`,
  components that only render while effects and subscriptions live in named hooks, hooks that return
  stable values, screens in feature folders with their own hooks, shared building blocks in
  `components/ui/`, state read through one typed selector hook and changed through named requests,
  real-time streams written past React's render, and styling and state through the repository's own
  libraries. Use when writing, reviewing, or restructuring React components, hooks, or a React app's
  folders.
---

# React Architecture

React code follows `code-standards` and `code-architecture`; this skill adds what React decides. The
repository's state library and styling system stay: each rule below names a role, and the
repository's own tool fills it. A library is named only where it makes a rule concrete.

## When to use

**MUST** apply when writing, changing, reviewing, or planning React components, hooks, or the folder
layout of a React app.

## Scope

- `**/*.tsx`, and the `.ts` modules beside them in a React app

## Repository facts

- **Its state library and styling system**, read from `package.json` and the existing components.
  Follow them. Never add a store, a query library, or a styling system to a repository that has its
  own; when a new app has none yet, ask the user which to use.
- **Its file naming and its import alias**, from its existing modules.

## Files and folders

- **`.tsx` is for components and hooks only.** A module with neither (a client, a helper, the mount
  function, types) is `.ts`, and a component or hook never sits in a `.ts` file. Lint can check both
  directions.
- **A component's file is its PascalCase name** (`SettingsScreen.tsx`, `ui/Button.tsx`), a hook's
  file is the hook (`useServerDraft.tsx`), and every other module follows the repository's naming.
- **Folders follow screens.** A screen is whatever the app shows as one unit: a page, a route, a
  window, a panel.

  ```text
  common/                   what every screen uses
    components/ui/          building blocks: Button, Row, Section
    hooks/                  hooks every screen uses
    <client>/               the typed client to the server or the state's owner
    mount-screen.ts         the one mount function
  screens/<screen>/
    <Name>Screen.tsx
    sections/               the screen's parts
    hooks/                  the screen's own hooks
  ```

  Code moves to `common/` only when every screen uses it.

- **Components are named exports** (`export const Button`), which React's tooling and its readers
  expect; a component library built as a package follows `code-architecture` § Packages, namespaces,
  barrels for its entry.

## Components

- **One declaration form.** A component is a PascalCase const typed `React.FC`, followed by its name
  for React's devtools and error messages:

  ```tsx
  type Props = Omit<React.ComponentProps<"button">, "type">;

  /** A plain push button; never submits a form. */
  export const Button: React.FC<Props> = ({ className, ...buttonProps }) => (
    <button type="button" className={mergeClasses(BUTTON_CLASSES, className)} {...buttonProps} />
  );

  Button.displayName = "Button";
  ```

- **The props type is `Props`** when it is the module's only type, and `<Component>Props` when other
  types sit beside it. A component that wraps an element extends that element's props
  (`React.ComponentProps<"button">`) and omits what it fixes.
- **A component renders.** It reads state, derives values, and returns markup. An effect
  (`useEffect`, `useLayoutEffect`) or a subscription lives in a hook, never in a component file;
  lint can refuse both there.
- **A small part used by one parent** stays a private component in the parent's module, declared the
  same way.
- **A request that takes no arguments is passed as is** (`onClick={client.actions.sendShowLogs}`),
  and one with arguments is an inline arrow building them.
- **Every control has a label** and each section is labelled by its heading (`aria-labelledby` with
  `useId`); a live message is a `role="status"` region. The repository's accessibility skill, when
  it has one, decides the rest.

## Hooks

- **A hook is named for what it gives** (`useServerDraft`, `useRealtimeUpdateStatus`) and lives in
  its screen's `hooks/`; `common/hooks/` holds only what every screen uses.
- **What a hook returns stays stable.** Each callback is a `useCallback`, and a returned object is a
  `useMemo` over them, so a caller can pass it on or depend on it.
- **A generic hook is a function declaration** (`export function useAppSelector<T>(…)`): an arrow
  needs `<T,>` in a `.tsx` file, which Prettier and lint disagree on.
- **An effect undoes what it starts**: its cleanup unsubscribes, cancels, and marks a read still on
  its way stale. When an effect both subscribes and reads once, it subscribes first and lets a push
  mark the read stale, so an older answer never overwrites a newer one.

## State

- **Components never fetch.** Where one side owns the state (`code-architecture` § State with one
  owner), components read their copy through one typed selector hook
  (`useAppSelector(settingsSelectors.watch)`) and change it through named requests; they never
  dispatch to the copy or write it. Where the app talks to a server itself, the repository's data
  layer does the fetching, and components reach it through hooks.
- **Local state holds what no one else needs**: an open menu, text the person is typing until they
  apply it. A value someone else owns is never mirrored into local state.
- **Real-time streams go past React's render.** Progress and other values that change many times a
  second go neither through the store nor through a hook every screen shares: the screen that shows
  one takes it in a `useRealtime<What>` hook, which writes each value into its element through a
  ref, or into local state only when the kind of state changes, so the screen renders again on a
  change of kind, not on every tick.

## Styling

The repository's styling system decides the mechanism; these rules hold in any of them:

- **A style sits with the element it styles**, in the system's own way: utility classes in the
  markup, a CSS module beside the component, a styled component.
- **A style used in several places becomes a component** in `components/ui/` (`Section`, `Row`,
  `Button`), never a shared class or mixin copied into each place (`@apply`).
- **Theme values are named for their role** (`canvas`, `control`, `ink-muted`), never a raw colour
  in a component.
- **Variants are declared once** (a variant map such as `cva`, or the system's equivalent), and
  classes that change with state or are overridden merge through one helper (with Tailwind, one
  `clsx` plus `tailwind-merge` function).

## Mounting

Every screen mounts through one function in `common/`: strict mode, the providers, the root element,
and, when the state comes from an owner, only after the copy holds its snapshot, so every component
renders real state from its first render.

## Tests

Logic leaves components for hooks and helpers, which suites test per `code-unit-tests-architecture`;
a screen's behaviour is checked by a real run.

## Review checklist

- Only components and hooks are `.tsx`; component files are PascalCase, hook files are the hook.
- Each component is a `React.FC` const with its `displayName`; its props type is `Props`, or
  `<Component>Props` beside other types.
- No effect or subscription in a component file; hooks sit in their screen's `hooks/` and return
  stable values; generic hooks are function declarations.
- Components read state through the selector hook and change it through named requests; no fetch in
  a component; local state holds only what no one else needs.
- Real-time values are written through a ref in a `useRealtime<What>` hook, not through the store.
- Styling uses the repository's system; repeated styles are `components/ui/` components; theme
  values are named for their role.
- Every screen mounts through the one function; every control has a label.
