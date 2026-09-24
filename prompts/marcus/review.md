# AI Assistance Log — Marcus Ruth

- **Tool**: Claude Opus 5 (1M context) (Anthropic), accessed via Claude Code (CLI). Single session, no subagents.
- **Date**: September 4, 2026
- **Scope**: One CSS fix — a WCAG AA contrast failure on the contacts table header in high contrast mode (`frontend/css/accessibility.css`). Part of issue #69 (Lighthouse accessibility audit). Opened PR #90.
- **Nature of use**: I diagnosed the bug myself and dictated both the cause and the fix; the assistant implemented the one-line change, then verified it in a real browser and wrote the PR. Two lines of CSS in total.
- **Testing**: Verified in-browser. Header contrast measured at **1.43:1 before → 14.67:1 after**; the normal theme measured 4.92:1 both before and after, confirming it was untouched. See "Testing" below.

---

## Prompt

> Found a contrast bug in the accessibility theme. When you turn on high contrast mode, the contacts table header goes white text on a yellow background — basically unreadable, way under the WCAG minimum.
>
> The cause is that `#contactsTable th` in `frontend/css/styles.css` uses `var(--color-accent)` for the background and `var(--color-light)` for the text, and in high contrast those become yellow and white. `accessibility.css` already overrides the buttons, inputs and links for this, but table headers got missed.
>
> Can you add an override in `frontend/css/accessibility.css` near the other `html.a11y-high-contrast` rules so the header text goes black? Keep the comment style consistent with the rest of that file. Don't touch the normal theme — that one already passes contrast and the colors were picked carefully.
>
> Check it by toggling high contrast on `contacts.html` with some rows loaded, then open a PR. Worth mentioning in the description that it's a WCAG AA failure tied to the Lighthouse item (#69).

---

## Response

### The change

Two lines, in `frontend/css/accessibility.css`. `accessibility.css` already had a rule collecting the elements that keep a yellow (`--color-accent`) background in high contrast mode and forcing black text on them, so the fix was to add the table header to that existing group rather than write a new rule:

```css
html.a11y-high-contrast .buttons,
html.a11y-high-contrast #a11yToggleBtn,
html.a11y-high-contrast .a11y-toggle[aria-pressed="true"],
html.a11y-high-contrast #contactsTable th
{
	color: #000000;
}
```

Two things worth recording about that choice:

- **No new comment was written.** The comment already sitting above that rule ("Only elements that keep a yellow `--color-accent` background in high contrast mode need black text…") describes this case exactly. Adding a second comment saying the same thing would have been noise. That satisfied the "keep the comment style consistent" instruction better than adding to it would have.
- **No `!important`.** The selector contains an ID, so it scores higher on specificity than the `#contactsTable th` rule in `styles.css` and wins on the cascade by itself. Reaching for `!important` here would have worked but would have been the wrong tool.

The normal theme is byte-for-byte untouched, as instructed — `styles.css` was read but never edited.

### One thing I got wrong along the way

The first screenshot I looked at showed the table body cells rendering **blank**. That was not a bug in the project: my test harness fed the renderer fake contacts with PascalCase keys (`FirstName`) while `renderContacts` in `frontend/js/contacts.js:64` reads camelCase (`firstName`). I fixed the harness and re-ran. Worth noting because a screenshot that looks broken is not automatically evidence of a broken page — in this case the harness was the broken part, and the element actually under test (the `<th>` row, which is static markup in `contacts.html`) had been rendering correctly the whole time.

### Result

One commit (`768d67e`) on branch `fix/high-contrast-table-header`, PR #90 opened against `main`. The PR description names the specific success criterion (WCAG 2.1 AA, 1.4.3 Contrast (Minimum), 4.5:1 for body text) and links it to #69. Issue #69 is a multi-item Lighthouse audit and stays open — this PR fixes one finding under it, not the whole issue.

---

## Testing

**The Chrome MCP was unavailable** — Google Chrome is not installed on this machine, and the MCP server failed with `Could not find Google Chrome executable`. Rather than skip the verification or fall back to eyeballing a screenshot, the assistant drove **Brave 151.1.93.138** (Chromium-based, already installed) headless through **puppeteer-core 23** on Node 22.23.1. The harness lives in the session scratchpad, not in the repo — nothing was added to the project to make this testable.

The page needs a logged-in session and a live PHP backend, neither of which was running, so the harness set the `userId`/`firstName`/`lastName` cookies that `readSession()` in `frontend/js/config.js` reads, and stubbed `XMLHttpRequest` to return three fake contacts. The rest of the page was the real thing: real `contacts.html`, real CSS, real `contacts.js` rendering the rows, and high contrast switched on by **clicking the actual High Contrast button in the accessibility widget** rather than by setting the class directly — so the toggle path itself was exercised, not just the stylesheet.

The check was a measurement, not a look: the harness read the computed `color` and the resolved background of `#contactsTable th` and calculated the WCAG relative-luminance contrast ratio. It was run once with the fix and once with the fix stashed (`git stash`), to get a real before-number rather than an assumed one.

| | Before | After |
|---|---|---|
| High contrast | `#ffffff` on `#ffd400` — **1.43:1 FAIL** | `#000000` on `#ffd400` — **14.67:1 PASS** |
| Normal theme | 4.92:1 PASS | 4.92:1 PASS (unchanged) |

The normal-theme row is the one that matters for the "don't touch the normal theme" instruction: it is identical before and after, measured rather than assumed. Screenshots of both states were reviewed as well — the pre-fix one shows the header effectively invisible, the post-fix one shows it plainly readable.

**Not deployed.** PR #90 is open and unmerged; `main` does not contain it. It has not been checked on the live course server.

**Still unverified:**
- **Only Brave/Chromium was tested.** This is a plain `color` declaration with no vendor-specific behavior, so cross-browser risk is close to zero, but Safari and Firefox were not opened.
- **Lighthouse was not re-run.** The specific contrast ratio was measured directly, which is the stronger evidence for this one finding, but the audit in #69 as a whole still needs a fresh run to see what else it flags.
- **Only `#contactsTable th` was fixed.** No sweep was done for other elements that might inherit a yellow background in high contrast mode. If more turn up, they belong in the same rule group.

---

## For the README disclosure

The README does not yet have an "AI Assistance" section. Worth flagging: **issue #73 ("Write the README and the AI Assistance Disclosure") is already closed, but `README.md` is still a two-line stub** — so either the disclosure lives somewhere outside the repo, or #73 was closed early and needs reopening. When the section is written, this session does **not** warrant a per-file or inline citation: the change is two lines of CSS, the diagnosis and the fix were both mine, and the template explicitly says not to over-cite. What is worth folding into the section's summary is the **nature of use** — AI used for implementation of a fix I had already diagnosed, and for in-browser verification of it.

The disclosure-worthy contribution from this session is really the **verification method**, not the code: the before/after contrast numbers in PR #90 were produced by an AI-written browser harness, and anyone re-checking that claim should know it came from an automated measurement in Brave rather than from a human reading a screenshot.
