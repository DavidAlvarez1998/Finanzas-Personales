# Theme System Specification

## Purpose

Defines behavioral requirements for the dual dark/light theme system. Covers OS preference detection, user persistence, flash prevention, toggle visibility, complete light-theme coverage, dark-theme preservation, and SSR hydration safety.

---

## Requirements

### Requirement: OS Preference Detection

On a user's first visit with no stored preference, the active theme MUST match the OS `prefers-color-scheme` media query. When the OS reports `dark`, the dark theme MUST be applied. When the OS reports `light`, the light theme MUST be applied.

#### Scenario: First visit — OS is dark

- GIVEN the user has no stored theme preference in localStorage
- AND the OS `prefers-color-scheme` is `dark`
- WHEN the page loads
- THEN the dark theme is applied without any manual user action

#### Scenario: First visit — OS is light

- GIVEN the user has no stored theme preference in localStorage
- AND the OS `prefers-color-scheme` is `light`
- WHEN the page loads
- THEN the light theme is applied without any manual user action

---

### Requirement: Theme Persistence

After the user toggles the theme, the chosen theme MUST be saved to localStorage and MUST be restored on subsequent page loads and new sessions. The localStorage preference MUST override the OS default.

#### Scenario: Preference survives page reload

- GIVEN the user toggled to light theme
- WHEN the user reloads the page
- THEN the light theme is active without re-toggling

#### Scenario: Preference survives new session

- GIVEN the user previously chose dark theme in a prior session
- WHEN the user opens a new browser tab to the app
- THEN the dark theme is active immediately on load

#### Scenario: Stored preference overrides OS

- GIVEN the user stored "light" preference
- AND the OS `prefers-color-scheme` is `dark`
- WHEN the page loads
- THEN the light theme is applied (stored preference wins)

---

### Requirement: No Flash on Load

The page MUST NOT display the wrong theme between initial render and hydration. There MUST be no visible flash of an incorrect theme on any load scenario (first visit, reload, or new session).

#### Scenario: No flash — stored preference

- GIVEN the user has a stored theme preference
- WHEN the page is loaded (including full server render + hydration)
- THEN the correct theme is visible from the very first painted frame

#### Scenario: No flash — OS preference

- GIVEN the user has no stored preference
- WHEN the page is loaded for the first time
- THEN the OS-matched theme is visible from the very first painted frame with no flicker

---

### Requirement: Toggle Button Visibility

A theme toggle button with sun/moon icon MUST be visible in the dashboard header. The toggle MUST NOT be visible on the login page or any unauthenticated route.

#### Scenario: Toggle present on dashboard

- GIVEN the user is authenticated and on the dashboard
- WHEN the page renders
- THEN a sun or moon icon button is visible in the header

#### Scenario: Toggle absent on login

- GIVEN the user is on the login page
- WHEN the page renders
- THEN no theme toggle button is present in the page

#### Scenario: Toggle switches theme

- GIVEN the dashboard is active with the dark theme
- WHEN the user clicks the toggle button
- THEN the theme switches to light immediately

#### Scenario: Toggle switches back

- GIVEN the dashboard is active with the light theme
- WHEN the user clicks the toggle button
- THEN the theme switches back to dark immediately

---

### Requirement: Complete Light Theme Coverage

Every UI surface in the app — backgrounds, cards, inputs, modals, borders, and text — MUST render using the designated light palette when the light theme is active. No raw dark token (e.g. `zinc-900`, `zinc-800`, `zinc-700`, `zinc-950`) MAY appear without a `dark:` prefix in any component's className.

#### Scenario: Dashboard surfaces in light mode

- GIVEN the light theme is active
- WHEN the user views the dashboard
- THEN background, card surfaces, borders, and text all use the defined light palette tokens

#### Scenario: Form inputs in light mode

- GIVEN the light theme is active
- WHEN the user opens the transaction form or login form
- THEN all inputs, labels, and container backgrounds use light palette tokens

#### Scenario: No dark bleed

- GIVEN the light theme is active
- WHEN any component renders
- THEN no element displays a dark-mode color (zinc-950/900/800/700 range) that is not wrapped in `dark:`

---

### Requirement: Dark Theme Preserved

The existing dark theme appearance MUST be maintained. All components that currently render in dark mode MUST continue to render identically or improved after the migration to `dark:` variant classes.

#### Scenario: Dark theme visually unchanged

- GIVEN the dark theme is active
- WHEN the user views the dashboard, forms, debt section, and summary cards
- THEN the visual appearance matches the pre-migration dark theme exactly (or is an intentional improvement per the defined dark palette)

---

### Requirement: Static Class Literals for Tailwind Purge Safety

Dynamic color class composition using string concatenation or computed keys MUST NOT be used. All Tailwind color class names — including `dark:` variants — MUST appear as full static string literals in source code so the Tailwind build step does not purge them.

#### Scenario: Dynamic ternary replaced with full literals

- GIVEN `SummaryCards.tsx` or `AmountInput.tsx` uses a runtime-computed class key
- WHEN the production Tailwind build runs
- THEN all referenced color classes appear in the output CSS (no class is missing)

#### Scenario: No split string construction

- GIVEN any component file
- WHEN inspected for class name composition
- THEN no class name is built by concatenating partial strings at runtime (e.g. `` `text-${color}-500` ``)

---

### Requirement: SSR Hydration Safety

The application MUST produce no React hydration warnings in the browser console related to theme. The `ThemeToggle` component MUST use a mounted guard so it renders a consistent placeholder on the server and only reveals the true icon after client hydration.

#### Scenario: No hydration warning on first load

- GIVEN the app is rendered server-side and then hydrated on the client
- WHEN the browser console is inspected
- THEN no warnings containing "hydration", "did not match", or "server rendered HTML" are present

#### Scenario: ThemeToggle mounted guard

- GIVEN the server renders the page
- WHEN `ThemeToggle` renders before client hydration
- THEN it outputs a neutral/blank placeholder (or null) instead of a theme-dependent icon

#### Scenario: ThemeToggle reveals correct icon after mount

- GIVEN the client has fully hydrated
- WHEN `ThemeToggle` reads the active theme
- THEN the correct icon (sun for light, moon for dark) is displayed

---

## Color Token Reference

| Token | Dark | Light |
|-------|------|-------|
| Background | zinc-950 | zinc-100 |
| Surface | zinc-900 | white |
| Surface raised | zinc-800 | zinc-100 |
| Border | zinc-700 | zinc-300 |
| Border subtle | zinc-800 | zinc-200 |
| Text primary | zinc-50 | zinc-950 |
| Text secondary | zinc-400 | zinc-600 |
| Text muted | zinc-500 | zinc-500 |
| Income accent | emerald-500 | emerald-600 |
| Expense accent | rose-500 | rose-600 |
| Primary accent | sky-500 | sky-600 |
| Debt accent | amber-500 | amber-600 |
