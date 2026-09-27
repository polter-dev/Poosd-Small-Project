# AI Assistance Log — Alex Kemper

- **Tool**: Claude Sonnet 5 (Anthropic), accessed via Claude Code (CLI)
- **Date**: August 30, 2026
- **Scope**: Built the floating accessibility widget (`frontend/js/accessibility.js`, `frontend/css/accessibility.css`) used on both pages — high contrast, text zoom, and read-aloud — then fixed two real bugs in the read-aloud feature that I found by actually using it, not by reading the code.
- **Nature of use**: Code generation for a new feature, followed by two rounds of debugging driven by my own testing.

---

## Prompt

The first ask was open-ended, roughly:

> I'm on the front end team. I need to add accessibility to the website — a little icon in the bottom right that can do high contrast, zoom, and text to speech. What other accessibility do you suggest?

I picked which of its extra suggestions to actually do (labels on inputs, `aria-live` regions, table semantics, focus management on the edit panel) before anything got built.

A day later, after screen-recording myself using it, I came back with:

> The screen reader works, but it reads stuff that isn't on the screen until you're registering.

and after that was fixed:

> Does it need to indicate there's a username and password field? It probably needs a delay between each thing it reads, otherwise it's just a mess of words.

## Response

**The widget itself.** A single self-contained JS/CSS pair that injects its own markup — nothing had to be hand-added to either HTML page beyond the two `<link>`/`<script>` tags. High contrast works by overriding the same CSS custom properties (`--color-*`) the rest of the stylesheet already reads, so it didn't need to duplicate every existing rule. Text zoom uses the CSS `zoom` property rather than scaling the root font size, because the site's CSS is almost entirely fixed pixel sizes, not `rem`/`em` — scaling the root font would have done nothing to headings or buttons.

**Bug 1 — reading hidden content.** I'd noticed via my own screen recording that clicking "Read Page Aloud" while on the Login screen kept going into content from the Register form, which was supposed to be hidden. The cause traced to `getReadableText()` cloning `document.body` with `cloneNode(true)` and reading `.innerText` off the detached copy. That's a real browser quirk I didn't know existed: `.innerText` needs an attached, rendered layout box to know what's `display:none`; a detached clone has no render tree, so the browser silently falls back to something closer to `textContent` — including hidden sections. The fix was to read from the live, attached DOM instead (temporarily hiding just the widget's own panel so it doesn't narrate itself), which is a one-property-check away from the bug but was not something I'd have diagnosed myself — I know what `cloneNode` does, I didn't know it broke `.innerText`'s visibility awareness specifically.

**Bug 2 — no field announcements, no pacing.** This one I caught by ear: I noticed the reader never said "Username" or "Password" at all, and everything ran together with no gaps. The reason turned out to be structural, not cosmetic: `<input>` elements are void elements with no text content, so a plain `.innerText`-style traversal skips them entirely — an empty text field simply isn't "there" as far as that API is concerned. The rewrite replaces the single-string approach with a DOM walk that builds a list of short chunks — for a form control it synthesizes a screen-reader-style description ("Username, text field") from its `aria-label`/`placeholder` and tag/type, and for everything else takes only the element's own direct text (not its descendants', to avoid reading nested text twice). Those chunks are then spoken as separate utterances chained together with a real pause between each, instead of one giant string.

I also had it fix two WCAG contrast failures it found while doing this work (button text on the accent color measured 4.47:1, error text measured 3.74:1, both under the 4.5:1 minimum) — it computed the actual contrast ratios with a small script rather than eyeballing the colors, and picked replacement shades that cleared 4.5:1 with margin while staying close to the original palette. I reviewed and approved the specific new hex values before they went in.

All of this was reviewed by me in the browser (including a second screen recording to confirm the fixes) before it was committed.
