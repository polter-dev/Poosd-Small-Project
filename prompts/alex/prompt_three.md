# AI Assistance Log — Alex Kemper

- **Tool**: Claude Sonnet 5 (Anthropic), accessed via Claude Code (CLI)
- **Date**: August 31, 2026
- **Scope**: Fixed a real XSS bug (issue #82), and closed out the remaining, incomplete acceptance criteria on three frontend issues (#51 login/register page, #59 contacts page layout, #64 styling/responsiveness).
- **Nature of use**: Code generation plus real functional and security bug fixing, verified in an actual browser rather than by inspection alone.

---

## Prompt

> Let's fix issue 82. [Escape user-entered contact fields before inserting into the page — XSS / broken attributes]

> Let's finish issue 51 as well.

> Go ahead and fix the #64 suggestion and commit it. [a "scroll to see more" hint for the contacts table on narrow screens]

## Response

**Issue #82 (XSS).** The contacts table was built by concatenating raw contact fields into an `innerHTML` string, so a contact named e.g. `<b>x</b>` would inject real markup, and a name containing a `"` would break out of an `aria-label` attribute entirely. The fix rebuilt row construction with `createElement`/`textContent`/`setAttribute`, none of which parse their input as HTML. Rather than just asserting this was fixed, it wrote a small throwaway script that actually renders a contact literally named `<b>bold</b>` / `O'Brien "Quoted"` and confirmed no real `<b>` element gets created and the attribute stays intact with the quote and apostrophe preserved literally. It also found and fixed the same bug in a spot the issue didn't mention — the "Logged in as First Last" banner, which used the same unsafe pattern with the user's own registered name.

**Issue #51 / #59.** These two pages were missing `<!DOCTYPE html>` entirely, used only `aria-label` instead of real `<label>` elements (the issue specifically required an associated `<label>`), and had no `<form>` wrapping at all — meaning pressing Enter in the username or password field did nothing. It fixed all three, and for the label change specifically kept the visual design unchanged by making the labels screen-reader-visible-only (same technique already used for the contacts table's caption) rather than changing how the page looks.

**Issue #64 (styling/responsiveness).** It found a real contrast failure I hadn't caught — placeholder text measured 2.79:1 against its background, using an `opacity: 0.6` fade to look intentionally muted, well under the 4.5:1 minimum — and fixed it. More notably, while testing the responsive layout it actually rendered both pages in a real headless browser at phone width instead of trusting the CSS by eye, and caught a genuine bug that way: the page title text was overflowing off the side of the screen at 375px wide instead of wrapping. It fixed that too.

For the follow-up "scroll to see more" hint specifically: rather than picking a screen-width breakpoint to show it at, it first measured, across a range of widths, exactly when the contacts table actually needed to scroll — and found the overflow point isn't a clean breakpoint at all, since it depends on how long the real contact data is, not the screen width alone. So it built the hint to check the table's actual measured overflow instead of guessing a pixel value, and verified the hint's visibility matched the real overflow state at every width it had tested, including the range where a fixed breakpoint would have gotten it wrong.

All of this was reviewed and, for the visual changes, checked by me in a browser before being pushed.
