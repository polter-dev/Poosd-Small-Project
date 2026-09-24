# Contacts UI — Design Guide

Locked direction: dark neutral "Graphite + steel" palette, top-bar "Directory" layout, card grid, edit/add in a right side panel, styled delete dialog. Plain HTML/CSS/JS only (LAMP; no frameworks, no build step). Keep every existing element `id` from `frontend/contacts.html` / `frontend/index.html` so `js/auth.js`, `js/contacts.js`, `js/accessibility.js` keep working.

Reference implementation: `contacts-sample.html` (same folder). Copy its `<style>` block into `frontend/css/styles.css`.

---

## 1. Color tokens

Define once in `:root`. Never hard-code hex elsewhere.

| Token | Hex | Use |
|---|---|---|
| `--bg` | `#18181B` | Page background |
| `--surface` | `#232327` | Cards, top bar search, side panel, dialog |
| `--raised` | `#2E2E34` | Borders, avatar circles, secondary buttons, skeletons |
| `--raised-hover` | `#3A3A41` | Hover on secondary/ghost controls |
| `--border-hover` | `#4A4A55` | Card border on hover, menu borders |
| `--text` | `#E9E9EC` | Primary text |
| `--text-muted` | `#9A9AA5` | Labels, phone/email, counts, icons at rest |
| `--accent` | `#9DB0CC` | Primary buttons, initials text, focus ring, active caret |
| `--accent-hover` | `#B3C3DA` | Primary button hover |
| `--accent-soft` | `#C9D4E6` | Accent-tinted text on dark fills |
| `--danger` | `#E0A3A3` | Delete confirm button, "Delete this contact" text |
| `--danger-hover` | `#ECB8B8` | Delete button hover |
| `--on-accent` | `#18181B` | Text on accent / danger fills |
| `--scrim` | `rgba(24,24,27,.55)` | Backdrop behind panel and dialog |

Contrast: `--text` on `--bg` 14.6:1, `--text-muted` on `--surface` 5.3:1, `--on-accent` on `--accent` 9.1:1. Never place `--accent` as body text on `--bg` (4.9:1 is fine for 13px+ but use `--accent-soft` on `--raised`).

## 2. Typography

Google Fonts: `https://fonts.googleapis.com/css2?family=Caprasimo&family=Figtree:wght@400;600;700&display=swap` (replaces Ubuntu).

| Role | Font | Size / weight |
|---|---|---|
| Page title ("Contacts" in bar) | Caprasimo | 20px |
| Section heading ("All contacts" / "Results") | Caprasimo | 26px |
| Card name | Caprasimo | 17px, single line, `text-overflow: ellipsis` |
| Panel / dialog title | Caprasimo | 22px / 20px |
| Button labels (primary, cancel) | Caprasimo | 14px |
| Body, inputs | Figtree 400 | 14px |
| Card phone/email, counts, labels | Figtree 400 | 13px / 12px |
| Small buttons, sort toggle, toast | Figtree 600 | 12–13px |
| Initials | Figtree 700 | 13px (17px in panel) |

Body `line-height: 1.5`. Left-aligned text everywhere (drop the current `text-align:center`).

## 3. Shape, spacing, elevation

- Radius: pills `999px` for buttons, inputs, avatars, search; cards `24px`; dialog `28px`; menus `16px`; page-level panel corners square.
- Spacing scale: 4, 8, 12, 16, 20, 28px. Card padding `18px 20px`; page gutter `28px`; grid gap `14px`.
- Borders: `1px solid var(--raised)` on cards, search, inputs, panel edge. Hover → `--border-hover`.
- Shadows: only on floating things. Menu/dialog/toast/FAB `0 12px 32px rgba(0,0,0,.4)`; side panel `-12px 0 32px rgba(0,0,0,.4)`. Cards have no shadow.
- Focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }` on everything. Inputs: focused border `--accent`, no outline offset.
- Motion: 150ms ease on color/border; panel slides 250ms from right; respect `prefers-reduced-motion`.

## 4. Components

**Top bar** — full width, `padding 16px 28px`, `border-bottom 1px var(--raised)`. Left: title. Right (flex, gap 18px): search pill (max 420px, grows), `+ Add Contact` primary button, 40px account bubble (`#profileToggleBtn`, initials, `--raised` fill). Profile dropdown menu: `--raised` surface, 16px radius, 6px padding, items as full-width text buttons.

**Search** (`#searchText`) — pill, `--surface` fill, `--raised` border, search icon left (Lucide `search`, stroke 2.75, `--text-muted`). Server-side search on input stays as is (debounced).

**Results header** — heading + count (`#searchResult` may hold "No contacts found"). Copy: "All contacts · 24 contacts" when search is empty; "Results · 2 of 24 contacts match “oka”" otherwise. Right: sort segmented toggle (First A→Z | Last A→Z), pill outline, active segment `--raised` fill. Sort is client-side on the returned results only (never cache the full list).

**Card grid** — `grid-template-columns: repeat(3, minmax(0,1fr))` ≥ 960px, 2 columns 600–959px, 1 column below. Card: `--surface`, 24px radius, header row = 40px initials circle (`--raised` fill, `--accent` text) + name (flex 1, ellipsis) + two 32px icon buttons (Lucide `pencil`, `trash-2`; `--text-muted` at rest, `--raised` fill + `--text` on hover; `aria-label="Edit {name}"` / `"Delete {name}"`). Body: phone and email on separate lines, 13px `--text-muted`. No visible Edit/Delete text buttons.

**Side panel** (replaces `#addContactOverlay` / `#editContactOverlay` modals; keep those ids and the `.open` class toggle) — fixed right, 400px (100% below 480px), `--surface`, left border, scrim behind. Content: title ("Add contact" / "Edit contact") + 32px close button; 56px initials avatar + "Contact #id" (edit only); first/last in a 2-col grid; phone, email each with a 40px copy icon button (Lucide `copy`, `navigator.clipboard.writeText`); footer pinned bottom: `Save changes` primary (flex 1) + `Cancel` outline; below, `Delete this contact` as `--danger` text button (edit only). Field labels above inputs, 12px muted (replace placeholder-only labels). Focus trap, Escape, click-scrim-to-close already exist in `contacts.js`.

**Inputs** — pill, `--bg` fill inside the panel (`--surface` on login page), `--raised` border, `padding 10px 14px`, `--text`, caret `--accent`.

**Buttons**
- Primary: `--accent` fill, `--on-accent` text, Caprasimo 14px, `padding 10px 18px` (12px 22px in panel), hover `--accent-hover`.
- Outline (Cancel, Keep): transparent, `1px solid --raised-hover`, `--text`, hover `--raised` fill.
- Icon (32px / 40px): transparent, `--text-muted`, hover `--raised` fill + `--text`.
- Danger: `--danger` fill, `--on-accent` text (dialog confirm only).
- Small (sort segments, toast): Figtree 600 12px.
- Min tap target 40px; 44px on phone.

**Delete dialog** (replaces `confirm()`) — centered, max 380px, `--surface`, 28px radius, 26px padding. Title "Delete {First Last}?", body "This removes the contact from your list. There is no undo." Actions right-aligned: `Keep` outline, `Delete` danger. `role="dialog" aria-modal="true"`, focus lands on Keep.

**States**
- Empty (no contacts, empty search): centered 64px circle icon (Lucide `user`), "No contacts yet", "Add your first person and they'll show up here.", primary `+ Add Contact`.
- No search results: reuse `#searchResult` text "No contacts found" under the header; grid empty.
- Loading: 2–6 skeleton cards (`--raised` pills for avatar/lines), `#searchResult` = "Searching…".
- Success toast: bottom-center, `--text` fill, `--on-accent` text, check in a 20px `--accent` circle, "Contact added" / "Changes saved" / "Contact deleted"; auto-dismiss 2.5s; `aria-live="polite"`.

**Phone (< 600px)** — top bar stacks: title + bubble row, then full-width search, then count + sort row. One-column cards with a chevron (Lucide `chevron-right`) instead of icon buttons; tapping a card opens the panel as a bottom sheet (`border-radius 32px 32px 0 0`, drag handle 40×4 `--border-hover`). Floating 56px `+` button bottom-right, `--accent`.

## 5. Login page (index.html)

Same tokens. Centered card is fine here: max 420px, `--surface`, 24px radius, 40px padding. 48px `--accent` circle mark, Caprasimo 34px "Contacts", muted line "Log in to see your people.", labeled pill inputs, primary `Log In` full width, then "Don't have an account? Register here" (link `--accent-soft`, underline on hover). Register form identical with 5 fields and `Sign Up`. Error text (`#loginResult` etc.) `--danger`, 13px, 600 weight.

## 6. Icons

Lucide (https://lucide.dev), inline SVG, `stroke-width="2.75"`, `stroke-linecap="round"`, `fill="none"`, `stroke="currentColor"`. Set: `search`, `pencil`, `trash-2`, `copy`, `x`, `check`, `arrow-up-down`, `chevron-right`, `user`, `plus`.

## 7. Do / don't

- Do keep the JS contract: same ids, same `callApi` endpoints, no local full-list filtering.
- Do use `textContent` for every contact field (issue #82).
- Don't add gradients, glows, or colored backgrounds; the only hues are `--accent` and `--danger`.
- Don't center text or use `<br>` layout; use flex/grid with `gap`.
- Don't reintroduce visible Edit/Delete pill buttons on cards.
