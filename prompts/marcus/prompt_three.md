## AI Assistance Disclosure

This project was developed with assistance from generative AI tools:

- **Tool**: Claude (Anthropic), accessed via Anthropic's Claude design tool
- **Dates**: September 8, 2026
- **Scope**: Frontend UI design for the contacts web app — exploration of
  layout directions, color palettes and button systems; design of the
  contacts page (card grid, search/results header, sort toggle, edit/add
  side panel, delete confirmation dialog, empty/loading/success states,
  phone layout); a written design guide (`DESIGN_GUIDE.md`); and a static
  reference HTML/CSS sample (`contacts-sample.html`) implementing the
  chosen design.
- **Use**: Design generation and iteration. The AI read the existing
  `frontend/` HTML, CSS and JS and the API contract to keep element ids
  and behavior compatible, produced visual mockups for the team to choose
  between, then generated the design guide and the reference CSS/markup.
  No backend (PHP/MySQL) code or API logic was generated. The reference
  sample contains only presentational markup, CSS and a few lines of
  demo-only click handlers; it is a specification for the team to
  implement, not a drop-in replacement for `js/contacts.js` or
  `js/auth.js`.

Inline attribution: CSS and markup adapted from `contacts-sample.html`
into `frontend/css/styles.css` / `frontend/contacts.html` should carry a
one-line comment at the top of the adapted block:

```css
/* AI-assisted: styles adapted from Claude-generated design reference (contacts-sample.html), modified for project */
```

All AI-generated design assets were reviewed by the team and selected
from multiple options. 
