# AI Assistance Log — Alex Kemper

- **Tool**: Claude Sonnet 5 (Anthropic), accessed via Claude Code (CLI)
- **Date**: September 8, 2026
- **Scope**: Reviewed a teammate's PR (#92) that redesigned the contacts page with modal dialogs for Add/Edit Contact, found several real regressions, and pushed fixes directly to that PR's branch.
- **Nature of use**: Code review and bug fixing on a teammate's code, verified with real browser automation rather than by reading the diff alone.

---

## Prompt

> Check current pull request and if all looks well, approve using my GitHub only, not marked as approved with Claude.

> Can we fix them, and push them to the same PR?

## Response

**The review.** It did not approve on request — it ran an actual review first and reported back that it did not look well, with specifics: the new "Add Contact" flow no longer told the user it had worked (the success message had been deleted, not moved, during the redesign); the new modals declared themselves `aria-modal="true"` but never actually trapped keyboard focus inside them, so Tab could still reach the contacts table hidden behind the dialog backdrop; and the read-aloud feature from my earlier session hadn't been updated for the new modal mechanism, so it would read the covered page behind an open dialog along with the dialog itself.

**The fix, and what testing it turned up.** I asked it to fix these and push to the same PR. While actually verifying the focus-trap fix in a real headless browser — not just reading its own new code — it found something more serious that none of us had caught: focus was never landing inside either dialog at all, ever, not as an edge case. It confirmed this by checking multiple times, including after an artificial delay, to rule out a timing fluke before concluding it was a real, permanent bug. The cause: the dialog's own existing code tried to move keyboard focus into it in the same instant the CSS class that makes it visible was applied, before the browser had actually finished the layout work that makes the target focusable — so the focus call was silently failing on every single open, with no error and no retry. It fixed that with a deferred focus call and re-verified.

Every one of these fixes was checked in an actual browser it drove itself with a temporary script (not added to the project) — confirming focus really lands on the first field without an artificial wait, that Tab and Shift+Tab correctly wrap at the true first/last focusable element inside the dialog, that the success message appears before the dialog auto-closes, and that the read-aloud feature no longer reads content behind an open dialog — rather than asserting the diff looked correct.

I did not have it approve the PR either before or after the fixes. A final look before merging a teammate's code is a judgment call I wanted to make myself, not something to automate away.
