// Contact CRUD + server-side search for contacts.html.
// Backend endpoints expected: SearchContacts.php, AddContact.php, EditContact.php, DeleteContact.php.
//
// Important: this file never keeps a full local copy of the contact list to
// filter against. Every search re-queries SearchContacts.php with the current
// text (partial match, server-side) and re-renders whatever comes back.
// `currentResults` below holds ONLY the result set the server just returned,
// so the sort toggle can reorder it without a round trip -- it is never used
// to answer a search.

let currentSession = null;
let searchDebounceTimer = null;

// Responses can arrive out of order (a slow query issued first can land after
// a fast one issued later), which would repaint the grid with results the
// user has already typed past. Only the newest request is allowed to render.
let latestSearchRequestId = 0;

// The result set the server returned for the query that is currently on
// screen. Used by the sort toggle and by the phone "tap a card to edit"
// path; never filtered to answer a search.
let currentResults = [];

// "first" | "last" -- which segment of the sort toggle is active.
let sortMode = "first";

// Total number of contacts this user has, as last reported by an empty
// search. This is a number, not a list: it only feeds the
// "2 of 24 contacts match" copy in the results header.
let totalContactCount = 0;

// The search term the rendered results belong to (not necessarily what is
// in the box right now, if a request is still in flight).
let renderedSearchTerm = "";

const phoneQuery = window.matchMedia("(max-width: 599px)");

function onContactsLoad()
{
	currentSession = requireLogin();
	if (!currentSession)
	{
		return; // requireLogin already redirected to index.html
	}

	wireSortToggle();
	wireCopyButtons();
	wireDeleteDialog();

	// Below 600px the per-card edit/delete buttons are hidden and the whole
	// card becomes the edit affordance, so the cards have to be rebuilt when
	// the viewport crosses that breakpoint.
	if (phoneQuery.addEventListener)
	{
		phoneQuery.addEventListener("change", function()
		{
			renderContacts(currentResults);
		});
	}

	searchContacts(); // initial load = search with empty term
}

// ---- Search + results header -------------------------------------------

function searchContacts()
{
	clearTimeout(searchDebounceTimer);
	searchDebounceTimer = setTimeout(function()
	{
		let searchTerm = document.getElementById("searchText").value;

		showLoadingSkeletons();
		setSearchResultText("Searching…", false);
		announce("Searching…");

		let payload = { userId: currentSession.userId, search: searchTerm };
		let requestId = ++latestSearchRequestId;

		callApi("SearchContacts", payload, function(response)
		{
			if (requestId !== latestSearchRequestId)
			{
				return; // a newer search has already been issued
			}

			renderedSearchTerm = searchTerm;

			// The API answers 200 with an `error` field rather than an HTTP
			// status, so callApi's success path is where it has to be caught;
			// otherwise a failed search renders as "No contacts found" and
			// looks like the user simply has none.
			if (response.error)
			{
				showRequestError(response.error);
				return;
			}

			let results = response.results || [];

			// An empty search returns everything, so it doubles as a free
			// refresh of the total used by the "n of N" copy.
			if (searchTerm === "")
			{
				totalContactCount = results.length;
			}

			setSearchResultText((results.length === 0 && searchTerm !== "") ? "No contacts found" : "", false);
			renderContacts(results);
		},
		function(errorMessage)
		{
			if (requestId !== latestSearchRequestId)
			{
				return;
			}

			renderedSearchTerm = searchTerm;
			showRequestError(errorMessage);
		});
	}, 250); // small debounce so we're not hitting the API on every keystroke
}

// A failed search leaves neither cards nor the "no contacts yet" empty state:
// we do not know what the user has, only that we could not ask.
function showRequestError(message)
{
	currentResults = [];
	document.getElementById("contactsTableBody").textContent = "";
	document.getElementById("contactsListDiv").classList.remove("hidden");
	document.getElementById("emptyState").classList.add("hidden");
	// DESIGN_GUIDE 1 reserves --danger for failures: `is-error` is what
	// styles.css colors, so a server error can never be mistaken for the
	// benign "No contacts found" (both live in this same span).
	setSearchResultText(message, true);
	updateResultsHeader();
	// "0 of 24 match" next to an error message would be reporting a result
	// we never actually got.
	document.getElementById("resultCount").textContent = "";
	announce(message);
}

// The only writer of #searchResult. `isError` toggles the class styles.css
// colors with --danger; every non-error render clears it again.
function setSearchResultText(message, isError)
{
	let el = document.getElementById("searchResult");
	el.textContent = message;
	el.classList.toggle("is-error", isError === true);
}

// ---- Result announcements ------------------------------------------------
// #resultsHeading and #resultCount are plain text outside any live region, so
// narrowing a search to a non-zero count used to be silent for a screen-reader
// user. Rather than making each of them live (which would fire two or three
// separate announcements per render), a single visually-hidden live region
// carries one composed sentence, and #searchResult is not live itself.

let lastAnnouncement = "";

function announce(message)
{
	let region = document.getElementById("resultsAnnouncement");
	if (!region || message === lastAnnouncement)
	{
		return; // repeating identical text would just be chatter
	}

	lastAnnouncement = message;
	region.textContent = message;
}

function announceResults()
{
	// "No contacts found" already says everything; otherwise announce the
	// heading plus the count ("Results, 2 of 24 contacts match ...").
	let note = document.getElementById("searchResult").textContent;
	if (note)
	{
		announce(note);
		return;
	}

	let heading = document.getElementById("resultsHeading").textContent;
	let count = document.getElementById("resultCount").textContent;
	announce(count ? heading + ", " + count : heading);
}

// After a mutation the total can be stale while a search term is active
// (that search only returns matches). Ask the server for the full count
// again -- the returned rows are discarded, only the length is kept.
function refreshTotalCount()
{
	if (document.getElementById("searchText").value === "")
	{
		return; // the pending searchContacts() call already refreshes it
	}

	callApi("SearchContacts", { userId: currentSession.userId, search: "" }, function(response)
	{
		if (response.error)
		{
			return;
		}

		totalContactCount = (response.results || []).length;
		updateResultsHeader();
	},
	function()
	{
		// A stale count is not worth surfacing an error for.
	});
}

function updateResultsHeader()
{
	let heading = document.getElementById("resultsHeading");
	let count = document.getElementById("resultCount");
	let term = renderedSearchTerm;

	if (term === "")
	{
		heading.textContent = "All contacts";
		// The empty state already says "no contacts yet"; a "0 contacts"
		// count next to it is just noise.
		count.textContent = totalContactCount === 0 ? "" : pluralizeContacts(totalContactCount);
		return;
	}

	heading.textContent = "Results";
	// textContent, not innerHTML: the search term is user input and the
	// curly quotes are literal characters here (issue #82).
	count.textContent = currentResults.length + " of " + totalContactCount + " " +
		(totalContactCount === 1 ? "contact" : "contacts") +
		" match “" + term + "”";
}

function pluralizeContacts(n)
{
	return n + (n === 1 ? " contact" : " contacts");
}

// ---- Rendering ----------------------------------------------------------

function initialsFor(contact)
{
	let first = Array.from(String(contact.firstName || "").trim());
	let last = Array.from(String(contact.lastName || "").trim());
	let initials = (first.length ? first[0] : "") + (last.length ? last[0] : "");
	return initials.toUpperCase() || "?";
}

function fullNameFor(contact)
{
	return (String(contact.firstName || "") + " " + String(contact.lastName || "")).trim();
}

function sortResults(results)
{
	let sorted = results.slice(); // never reorder the array the caller handed us
	sorted.sort(function(a, b)
	{
		let aPrimary = String((sortMode === "last" ? a.lastName : a.firstName) || "");
		let bPrimary = String((sortMode === "last" ? b.lastName : b.firstName) || "");
		let primary = aPrimary.localeCompare(bPrimary, undefined, { sensitivity: "base" });
		if (primary !== 0)
		{
			return primary;
		}

		let aSecondary = String((sortMode === "last" ? a.firstName : a.lastName) || "");
		let bSecondary = String((sortMode === "last" ? b.firstName : b.lastName) || "");
		return aSecondary.localeCompare(bSecondary, undefined, { sensitivity: "base" });
	});
	return sorted;
}

// Builds the card grid. Every contact-derived value goes in via textContent
// or setAttribute -- a contact named `<b>x</b>` or containing a `"` must be
// literal text, never markup and never an attribute break-out (issue #82).
// The markup itself comes from the inert #cardTemplate in contacts.html.
function renderContacts(contacts)
{
	currentResults = contacts || [];

	let grid = document.getElementById("contactsTableBody");
	let listDiv = document.getElementById("contactsListDiv");
	let emptyState = document.getElementById("emptyState");
	let sortToggle = document.querySelector(".results-head .seg");

	grid.textContent = "";

	// "No contacts at all" (not "no matches") is the only case that swaps the
	// grid out for the empty state.
	let showEmptyState = currentResults.length === 0 && renderedSearchTerm === "";
	listDiv.classList.toggle("hidden", showEmptyState);
	emptyState.classList.toggle("hidden", !showEmptyState);
	if (sortToggle)
	{
		sortToggle.classList.toggle("hidden", showEmptyState);
	}

	let template = document.getElementById("cardTemplate");
	let onPhone = phoneQuery.matches;
	let sorted = sortResults(currentResults);

	for (let i = 0; i < sorted.length; i++)
	{
		grid.appendChild(buildContactCard(sorted[i], template, onPhone));
	}

	updateResultsHeader();
	announceResults();
}

function buildContactCard(contact, template, onPhone)
{
	let card = template.content.firstElementChild.cloneNode(true);
	let fullName = fullNameFor(contact);

	card.querySelector(".avatar").textContent = initialsFor(contact);
	card.querySelector(".card-name").textContent = fullName;
	card.querySelector(".card-name").title = fullName;
	card.querySelector(".card-phone").textContent = String(contact.phone || "");
	card.querySelector(".card-email").textContent = String(contact.email || "");

	let editButton = card.querySelector(".edit-btn");
	editButton.setAttribute("aria-label", "Edit " + fullName);
	editButton.addEventListener("click", function(event)
	{
		event.stopPropagation();
		editContact(contact, editButton);
	});

	let deleteButton = card.querySelector(".delete-btn");
	deleteButton.setAttribute("aria-label", "Delete " + fullName);
	deleteButton.addEventListener("click", function(event)
	{
		event.stopPropagation();
		deleteContact(contact, deleteButton);
	});

	if (onPhone)
	{
		// The two icon buttons are display:none below 600px (so they are not
		// focusable either); the card itself takes over as the edit control
		// and has to be reachable by keyboard and announced as a button.
		card.setAttribute("role", "button");
		card.setAttribute("tabindex", "0");
		card.setAttribute("aria-label", "Edit " + fullName);
		card.classList.add("tappable");
		card.addEventListener("click", function()
		{
			editContact(contact, card);
		});
		card.addEventListener("keydown", function(event)
		{
			if (event.key === "Enter" || event.key === " ")
			{
				event.preventDefault();
				editContact(contact, card);
			}
		});
	}

	return card;
}

function showLoadingSkeletons()
{
	let grid = document.getElementById("contactsTableBody");
	let template = document.getElementById("skeletonTemplate");
	if (!grid || !template)
	{
		return;
	}

	document.getElementById("contactsListDiv").classList.remove("hidden");
	document.getElementById("emptyState").classList.add("hidden");
	grid.textContent = "";

	// Roughly as many placeholders as the rows they are standing in for,
	// clamped to the 2-6 the design guide asks for.
	let count = Math.min(6, Math.max(2, currentResults.length || 4));
	for (let i = 0; i < count; i++)
	{
		grid.appendChild(template.content.firstElementChild.cloneNode(true));
	}
}

// ---- Sort toggle --------------------------------------------------------
// Client-side reorder of the result set already on screen. It never runs a
// query and never touches anything the server has not just returned.

function wireSortToggle()
{
	let firstButton = document.getElementById("sortFirstButton");
	let lastButton = document.getElementById("sortLastButton");
	if (!firstButton || !lastButton)
	{
		return;
	}

	firstButton.addEventListener("click", function() { setSortMode("first"); });
	lastButton.addEventListener("click", function() { setSortMode("last"); });
	setSortMode(sortMode, true); // reflect the default state without rendering an empty grid first
}

function setSortMode(mode, skipRender)
{
	sortMode = (mode === "last") ? "last" : "first";

	let firstButton = document.getElementById("sortFirstButton");
	let lastButton = document.getElementById("sortLastButton");
	firstButton.setAttribute("aria-pressed", sortMode === "first" ? "true" : "false");
	lastButton.setAttribute("aria-pressed", sortMode === "last" ? "true" : "false");
	firstButton.classList.toggle("active", sortMode === "first");
	lastButton.classList.toggle("active", sortMode === "last");

	if (skipRender !== true)
	{
		renderContacts(currentResults);
	}
}

// ---- Toast --------------------------------------------------------------

let toastTimer = null;

function showToast(message)
{
	let toast = document.getElementById("toast");
	let text = document.getElementById("toastText");
	if (!toast || !text)
	{
		return;
	}

	clearTimeout(toastTimer);
	text.textContent = message;
	toast.hidden = false;

	toastTimer = setTimeout(function()
	{
		toast.hidden = true;
	}, 2500);
}

// ---- Copy buttons -------------------------------------------------------

function wireCopyButtons()
{
	let buttons = document.querySelectorAll(".icon-btn.lg[data-copy]");
	for (let i = 0; i < buttons.length; i++)
	{
		(function(button)
		{
			button.addEventListener("click", function()
			{
				copyFieldValue(button.getAttribute("data-copy"), button.getAttribute("aria-label"));
			});
		})(buttons[i]);
	}
}

function copyFieldValue(inputId, label)
{
	let input = document.getElementById(inputId);
	if (!input)
	{
		return;
	}

	// "Copy phone" -> "phone". The toast has to name the field: two copy
	// buttons sit in the same panel and a bare "Copied" tells a screen-reader
	// user nothing about which one fired.
	let fieldName = String(label || "Copy value").replace(/^Copy\s*/i, "").toLowerCase() || "value";
	let value = input.value;

	if (!value)
	{
		showToast("Nothing to copy");
		return;
	}

	// navigator.clipboard is undefined on insecure origins and the promise
	// rejects when the page lacks permission -- neither may throw past here.
	if (!navigator.clipboard || !navigator.clipboard.writeText)
	{
		showToast("Could not copy " + fieldName);
		return;
	}

	navigator.clipboard.writeText(value).then(function()
	{
		showToast("Copied " + fieldName);
	},
	function()
	{
		showToast("Could not copy " + fieldName);
	});
}

// ---- Focus plumbing shared by the panels and the dialog -----------------

function focusableWithinPanel(panelEl)
{
	let candidates = panelEl.querySelectorAll(
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
	);
	let out = [];
	for (let i = 0; i < candidates.length; i++)
	{
		// Drops <input type="hidden"> (display:none in the UA sheet) and any
		// control the panel is currently hiding, so the cycle below matches
		// what the browser would actually tab through.
		if (isElementFocusable(candidates[i]))
		{
			out.push(candidates[i]);
		}
	}
	return out;
}

// Keeps Tab/Shift+Tab from leaving `panelEl` while it's open. Both panels and
// the delete dialog declare role="dialog" aria-modal="true", which asserts
// that background content is unreachable -- without this, Tab from the last
// field still walks straight into the cards behind the backdrop, since
// aria-modal is just an ARIA attribute, not a browser behavior; nothing
// enforces it unless this does.
function trapFocusWithinPanel(event, panelEl)
{
	if (event.key !== "Tab" || !panelEl)
	{
		return;
	}

	let focusable = focusableWithinPanel(panelEl);

	// Every control inside is disabled -- this is the delete dialog while the
	// delete is in flight. Returning here (as this used to) hands the keypress
	// to the browser, whose native walk starts from the container and lands in
	// the page behind the scrim. Confine focus to the container instead.
	if (focusable.length === 0)
	{
		event.preventDefault();
		panelEl.focus();
		return;
	}

	// Drive every Tab explicitly rather than only correcting the two edges.
	// The old first/last-only check silently no-opped whenever activeElement
	// was not one of those two nodes -- in particular when setButtonBusy had
	// parked focus on the container itself, which carries tabindex="-1" and is
	// therefore never in `focusable`. Computing the next index ourselves makes
	// the trap independent of which elements happen to be enabled.
	let index = focusable.indexOf(document.activeElement);
	event.preventDefault();

	if (index === -1)
	{
		// Focus is on the container (or otherwise outside the cycle): enter it
		// from whichever end the user is tabbing towards.
		focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
		return;
	}

	let next = event.shiftKey ? index - 1 : index + 1;
	if (next < 0)
	{
		next = focusable.length - 1;
	}
	else if (next >= focusable.length)
	{
		next = 0;
	}

	focusable[next].focus();
}

// The modal overlay shows/hides via a CSS class that transitions
// opacity/visibility (styles.css .modal-overlay/.modal-overlay.open),
// unlike the old display:none-based hidden panel. Calling .focus() while the
// overlay still computes visibility:hidden is a silent no-op -- focus() never
// retries, so the panel opens with focus left on the trigger OUTSIDE it, and
// trapFocusWithinPanel (which only acts when activeElement is the trap's
// first/last node) then does nothing and Tab walks into the background,
// contradicting aria-modal="true".
//
// A fixed number of rAFs is a race: it happened to be enough for the panels
// that do several synchronous DOM writes first and not enough for the Add
// panel. So poll instead: retry across frames until the element is actually
// focusable, then verify focus really landed inside the panel before giving
// up the loop.

let focusAttemptToken = 0;
const FOCUS_MAX_ATTEMPTS = 90; // ~1.5s at 60fps, then give up rather than spin

function isElementFocusable(el)
{
	if (!el || !el.isConnected || el.disabled)
	{
		return false;
	}

	// visibility is inherited, so this catches the closed overlay above it.
	// offsetParent is null for a display:none subtree (fixed-positioned
	// elements report null too, hence the position check).
	let styles = window.getComputedStyle(el);
	if (styles.visibility === "hidden" || styles.display === "none")
	{
		return false;
	}

	return el.offsetParent !== null || styles.position === "fixed";
}

// `containerEl` is the panel focus is supposed to end up inside; when given,
// the loop keeps retrying until document.activeElement is actually in there.
function focusOnceVisible(el, containerEl)
{
	if (!el)
	{
		return;
	}

	let token = ++focusAttemptToken; // a newer open cancels this loop
	let attempts = 0;

	function attempt()
	{
		if (token !== focusAttemptToken)
		{
			return;
		}

		attempts++;

		if (isElementFocusable(el))
		{
			el.focus();

			let landed = containerEl
				? containerEl.contains(document.activeElement)
				: document.activeElement === el;
			if (landed)
			{
				return;
			}
		}

		if (attempts < FOCUS_MAX_ATTEMPTS)
		{
			requestAnimationFrame(attempt);
		}
	}

	requestAnimationFrame(attempt);
}

// An overlay that has just lost its "open" class still computes
// visibility:visible for the length of the CSS transition
// (styles.css: `transition: opacity .25s ease, visibility .25s ease`), so
// isElementFocusable() alone cannot tell that a button inside a closing
// overlay is on its way out. Ask the overlay instead.
function isInsideClosedOverlay(el)
{
	if (!el || !el.closest)
	{
		return false;
	}

	let overlay = el.closest(".modal-overlay, .dialog-overlay");
	return !!overlay && !overlay.classList.contains("open");
}

// The element focus should return to when a panel/dialog closes. A remembered
// trigger that has since been removed, disabled, hidden, or left behind inside
// an overlay that is itself closing cannot take focus -- .focus() on it is a
// silent no-op and focus stays wherever it was (usually <body>, which restarts
// the user's next Tab at the top of the page). Fall back to the search box,
// which is always present and focusable.
function resolveReturnFocusEl(preferredEl)
{
	if (preferredEl && !isInsideClosedOverlay(preferredEl) && isElementFocusable(preferredEl))
	{
		return preferredEl;
	}

	let active = document.activeElement;
	if (active && active !== document.body && !isInsideClosedOverlay(active) && isElementFocusable(active))
	{
		return active;
	}

	return document.getElementById("searchText");
}

// Second half of the same guarantee: the target resolved at open time may have
// gone stale by the time the panel closes (its card was re-rendered by a
// refresh, say), so re-check right before handing focus over, and verify focus
// actually landed rather than trusting .focus() to have worked.
function restoreFocusTo(el)
{
	let target = el;
	if (!target || isInsideClosedOverlay(target) || !isElementFocusable(target))
	{
		target = document.getElementById("searchText");
	}

	if (!target)
	{
		return;
	}

	target.focus();

	if (document.activeElement !== target)
	{
		let fallback = document.getElementById("searchText");
		if (fallback && fallback !== target)
		{
			fallback.focus();
		}
	}
}

// Disabling the in-flight button would drop focus to <body> if it is the
// focused element, which silently defeats the panel's focus trap. Park focus
// on the panel itself (tabindex="-1") for the duration instead.
function setButtonBusy(button, busy, panelEl)
{
	if (!button)
	{
		return;
	}

	if (busy)
	{
		let hadFocus = document.activeElement === button;
		button.disabled = true;
		button.setAttribute("aria-busy", "true");
		if (hadFocus && panelEl)
		{
			panelEl.focus();
		}
		return;
	}

	button.disabled = false;
	button.removeAttribute("aria-busy");
}

// ---- Add Contact panel (modal overlay) ----
// Same open/close idiom as the profile menu in js/auth.js and the
// accessibility widget in js/accessibility.js: Escape and click-outside are
// wired up only while the panel is actually open, via a document-level
// capture-phase click listener.

let addReturnFocusEl = null;

function openAddContact(triggerEl)
{
	closeEditContact(false); // only one form visible at a time

	document.getElementById("addContactResult").textContent = "";
	document.getElementById("addContactOverlay").classList.add("open");
	document.getElementById("openAddContactBtn").setAttribute("aria-expanded", "true");
	document.addEventListener("keydown", onAddContactKeydown);
	document.addEventListener("click", onAddContactOutsideClick, true);

	addReturnFocusEl = resolveReturnFocusEl(triggerEl);
	focusOnceVisible(document.getElementById("addFirstName"), document.getElementById("addContactDiv"));
}

function closeAddContact(returnFocus)
{
	let overlay = document.getElementById("addContactOverlay");
	if (!overlay.classList.contains("open"))
	{
		return;
	}

	overlay.classList.remove("open");
	document.getElementById("openAddContactBtn").setAttribute("aria-expanded", "false");
	document.removeEventListener("keydown", onAddContactKeydown);
	document.removeEventListener("click", onAddContactOutsideClick, true);

	if (returnFocus !== false)
	{
		restoreFocusTo(addReturnFocusEl);
	}
	addReturnFocusEl = null;
}

function onAddContactKeydown(event)
{
	if (event.key === "Escape")
	{
		closeAddContact();
		return;
	}

	trapFocusWithinPanel(event, document.getElementById("addContactDiv"));
}

function onAddContactOutsideClick(event)
{
	let panel = document.getElementById("addContactDiv");
	if (panel && !panel.contains(event.target))
	{
		// Same as Escape: dismissing the panel must not strand focus on
		// <body>, or a keyboard user's next Tab restarts at the top of the page.
		closeAddContact(true);
	}
}

// js/api.js is the shared request helper for every page and deliberately has
// no timeout, so a request that never resolves (mobile dead zone, hung proxy,
// a stalled route) leaves the in-flight latch set forever: the button stays
// disabled, the delete dialog refuses to close, and the only way out is a page
// reload. Rather than change the shared helper, every mutating call on this
// page goes through this wrapper, which owns a client-side deadline and a
// one-shot settle flag. The flag matters as much as the timer: once the
// deadline has fired and the user has been given the controls back, a late
// response must NOT run the success path -- it would re-close a dialog the
// user has already reopened, toast a delete that also errored, and re-render
// the grid twice.
const REQUEST_DEADLINE_MS = 15000;
const REQUEST_TIMEOUT_MESSAGE = "The server did not respond. Please try again.";

function callApiWithDeadline(endpointName, payload, onSuccess, onError)
{
	let settled = false;

	let timer = window.setTimeout(function()
	{
		if (settled)
		{
			return;
		}
		settled = true;
		onError(REQUEST_TIMEOUT_MESSAGE);
	}, REQUEST_DEADLINE_MS);

	function settle(run, arg)
	{
		if (settled)
		{
			return; // deadline already released the UI; this answer is stale
		}
		settled = true;
		window.clearTimeout(timer);
		run(arg);
	}

	callApi(endpointName, payload, function(response)
	{
		settle(onSuccess, response);
	},
	function(message)
	{
		settle(onError, message);
	});
}

// A double-click (or double-tap on a slow connection) used to fire two
// AddContact calls and create two rows. Guard the handler and disable the
// button for the duration; both are re-enabled on success and on error.
let addContactInFlight = false;

function addContact()
{
	if (addContactInFlight)
	{
		return;
	}

	let resultSpan = document.getElementById("addContactResult");
	let button = document.getElementById("addContactButton");
	let panel = document.getElementById("addContactDiv");
	resultSpan.textContent = "";

	addContactInFlight = true;
	setButtonBusy(button, true, panel);

	function finish()
	{
		addContactInFlight = false;
		setButtonBusy(button, false);
	}

	let payload = {
		userId: currentSession.userId,
		firstName: document.getElementById("addFirstName").value,
		lastName: document.getElementById("addLastName").value,
		phone: document.getElementById("addPhone").value,
		email: document.getElementById("addEmail").value
	};

	callApiWithDeadline("AddContact", payload, function(response)
	{
		finish();

		if (!response.id || response.id < 1)
		{
			resultSpan.textContent = response.error || "Could not add contact";
			button.focus();
			return;
		}

		document.getElementById("addFirstName").value = "";
		document.getElementById("addLastName").value = "";
		document.getElementById("addPhone").value = "";
		document.getElementById("addEmail").value = "";

		// The panel closing on its own isn't feedback a screen-reader user
		// (or a sighted one who blinks) can rely on -- the toast is
		// aria-live="polite", so it announces the result either way.
		closeAddContact();
		showToast("Contact added");
		searchContacts(); // refresh list from server
		refreshTotalCount();
	},
	function(errorMessage)
	{
		finish();
		resultSpan.textContent = errorMessage;
		button.focus();
	});
}

// ---- Edit Contact panel (modal overlay) ----

let editReturnFocusEl = null;

// Where focus has to go when the edit panel closes after a round trip through
// the delete dialog. "Delete this contact" closes the edit panel (two stacked
// focus traps cannot both own Escape), which used to throw the panel's return
// target away; "Keep" then reopened the panel with no trigger and the fallback
// picked up #deleteKeepButton -- a button inside an overlay that was closing.
// Focus was restored onto an unfocusable node and ended up on <body>.
let editReturnFocusBeforeDelete = null;

// The contact currently loaded into the edit panel, so "Delete this contact"
// knows whose name belongs in the dialog title.
let editingContact = null;

function editContact(contact, triggerEl)
{
	editingContact = contact;

	document.getElementById("editContactId").value = contact.id;
	document.getElementById("editFirstName").value = contact.firstName || "";
	document.getElementById("editLastName").value = contact.lastName || "";
	document.getElementById("editPhone").value = contact.phone || "";
	document.getElementById("editEmail").value = contact.email || "";
	document.getElementById("editContactResult").textContent = "";

	// Identity row: initials + "Contact #id", both as literal text.
	document.getElementById("editContactAvatar").textContent = initialsFor(contact);
	document.getElementById("editContactIdLabel").textContent = "Contact #" + contact.id;

	openEditContact(triggerEl);
}

function openEditContact(triggerEl)
{
	closeAddContact(false); // only one form visible at a time

	document.getElementById("editContactOverlay").classList.add("open");
	document.addEventListener("keydown", onEditContactKeydown);
	document.addEventListener("click", onEditContactOutsideClick, true);

	// Without an explicit focus move a keyboard/screen-reader user has no
	// indication the panel opened. Remember what had focus so Cancel/Save
	// can put it back afterward.
	editReturnFocusEl = resolveReturnFocusEl(triggerEl);
	focusOnceVisible(document.getElementById("editFirstName"), document.getElementById("editContactDiv"));
}

function closeEditContact(returnFocus)
{
	let overlay = document.getElementById("editContactOverlay");
	if (!overlay.classList.contains("open"))
	{
		return;
	}

	overlay.classList.remove("open");
	document.getElementById("editContactResult").textContent = "";
	document.removeEventListener("keydown", onEditContactKeydown);
	document.removeEventListener("click", onEditContactOutsideClick, true);

	if (returnFocus !== false)
	{
		restoreFocusTo(editReturnFocusEl);
	}
	editReturnFocusEl = null;
}

function cancelEditContact()
{
	closeEditContact(true);
}

function onEditContactKeydown(event)
{
	if (event.key === "Escape")
	{
		closeEditContact(true);
		return;
	}

	trapFocusWithinPanel(event, document.getElementById("editContactDiv"));
}

function onEditContactOutsideClick(event)
{
	let panel = document.getElementById("editContactDiv");
	if (panel && !panel.contains(event.target))
	{
		// Same as Escape: restore focus to whatever opened the panel.
		closeEditContact(true);
	}
}

// Same in-flight guard as addContact(): EditContact is idempotent, but a
// double-click still fires two requests and leaves the button live during both.
let saveEditInFlight = false;

function saveEditContact()
{
	if (saveEditInFlight)
	{
		return;
	}

	let resultSpan = document.getElementById("editContactResult");
	let button = document.getElementById("saveEditButton");
	let panel = document.getElementById("editContactDiv");
	resultSpan.textContent = "";

	saveEditInFlight = true;
	setButtonBusy(button, true, panel);

	function finish()
	{
		saveEditInFlight = false;
		setButtonBusy(button, false);
	}

	let payload = {
		userId: currentSession.userId,
		id: document.getElementById("editContactId").value,
		firstName: document.getElementById("editFirstName").value,
		lastName: document.getElementById("editLastName").value,
		phone: document.getElementById("editPhone").value,
		email: document.getElementById("editEmail").value
	};

	callApiWithDeadline("EditContact", payload, function(response)
	{
		finish();

		if (response.error)
		{
			resultSpan.textContent = response.error;
			button.focus();
			return;
		}

		// The card (and its Edit button) is about to be rebuilt by
		// searchContacts(), so returning focus to that stale button would
		// just lose focus a moment later -- land on the search box instead.
		editReturnFocusEl = null;
		closeEditContact(false);
		document.getElementById("searchText").focus();
		showToast("Changes saved");
		searchContacts(); // refresh list from server
	},
	function(errorMessage)
	{
		finish();
		resultSpan.textContent = errorMessage;
		button.focus();
	});
}

// ---- Delete confirmation dialog (replaces confirm()) --------------------

let pendingDeleteContact = null;
let deleteReturnFocusEl = null;
// True while DeleteContact is in flight: the dialog stays open and both of its
// buttons stay disabled so the row cannot be deleted twice.
let deleteInFlight = false;
// Set when the dialog was opened from inside the edit panel: "Keep" then puts
// the user back where they were instead of dropping them on the bare grid.
let deleteCameFromEditPanel = false;

function wireDeleteDialog()
{
	document.getElementById("deleteKeepButton").addEventListener("click", function()
	{
		closeDeleteDialog(true);
	});

	document.getElementById("deleteConfirmButton").addEventListener("click", function()
	{
		confirmDeleteContact();
	});

	document.getElementById("deleteFromEditButton").addEventListener("click", function()
	{
		if (!editingContact)
		{
			return;
		}

		// Close the edit panel first: two overlapping focus traps and two
		// Escape handlers on the same keypress is not something either can
		// resolve sensibly. "Keep" reopens it.
		let contact = editingContact;
		editReturnFocusBeforeDelete = editReturnFocusEl;
		editReturnFocusEl = null;
		closeEditContact(false);
		deleteCameFromEditPanel = true;
		openDeleteDialog(contact, null);
	});
}

function deleteContact(contact, triggerEl)
{
	deleteCameFromEditPanel = false;
	openDeleteDialog(contact, triggerEl);
}

function openDeleteDialog(contact, triggerEl)
{
	pendingDeleteContact = contact;
	deleteReturnFocusEl = triggerEl || null;

	// textContent so a contact named `<b>x</b>` stays literal text in the
	// dialog title (issue #82). The name goes in the title only -- the body
	// copy is fixed.
	document.getElementById("deleteTitle").textContent = "Delete " + fullNameFor(contact) + "?";
	document.getElementById("deleteOverlay").classList.add("open");
	document.addEventListener("keydown", onDeleteDialogKeydown);
	document.addEventListener("click", onDeleteDialogOutsideClick, true);

	document.getElementById("deleteResult").textContent = "";
	document.getElementById("deleteResult").hidden = true;

	focusOnceVisible(document.getElementById("deleteKeepButton"), document.getElementById("deleteDialog"));
}

function closeDeleteDialog(returnFocus)
{
	let overlay = document.getElementById("deleteOverlay");
	if (!overlay.classList.contains("open"))
	{
		return;
	}

	if (deleteInFlight)
	{
		// The dialog stays up until the delete resolves -- but the swallowed
		// dismissal must not leave focus wherever it ended up. A scrim click
		// puts it on <body>, outside a dialog that is still modal; pull it
		// back inside so the trap has something to cycle from.
		let dialogEl = document.getElementById("deleteDialog");
		if (dialogEl && !dialogEl.contains(document.activeElement))
		{
			dialogEl.focus();
		}
		return;
	}

	overlay.classList.remove("open");
	document.removeEventListener("keydown", onDeleteDialogKeydown);
	document.removeEventListener("click", onDeleteDialogOutsideClick, true);

	let contact = pendingDeleteContact;
	let cameFromEdit = deleteCameFromEditPanel;
	pendingDeleteContact = null;
	deleteCameFromEditPanel = false;

	if (returnFocus === false)
	{
		deleteReturnFocusEl = null;
		editReturnFocusBeforeDelete = null;
		return;
	}

	if (cameFromEdit && contact)
	{
		// Back to the edit panel the user was in, focus on the button that
		// opened the dialog -- and hand the panel the trigger it had BEFORE
		// the dialog took over, so closing it later returns focus to the card
		// the user actually came from instead of a hidden dialog button.
		let editTrigger = editReturnFocusBeforeDelete;
		editReturnFocusBeforeDelete = null;
		editContact(contact, editTrigger);
		focusOnceVisible(document.getElementById("deleteFromEditButton"), document.getElementById("editContactDiv"));
	}
	else
	{
		restoreFocusTo(deleteReturnFocusEl);
	}

	deleteReturnFocusEl = null;
}

function onDeleteDialogKeydown(event)
{
	if (event.key === "Escape")
	{
		closeDeleteDialog(true);
		return;
	}

	trapFocusWithinPanel(event, document.getElementById("deleteDialog"));
}

function onDeleteDialogOutsideClick(event)
{
	let dialog = document.getElementById("deleteDialog");
	if (dialog && !dialog.contains(event.target))
	{
		closeDeleteDialog(true);
	}
}

function confirmDeleteContact()
{
	if (!pendingDeleteContact || deleteInFlight)
	{
		return;
	}

	let payload = { userId: currentSession.userId, id: pendingDeleteContact.id };
	let dialog = document.getElementById("deleteDialog");
	let confirmButton = document.getElementById("deleteConfirmButton");
	let keepButton = document.getElementById("deleteKeepButton");
	let resultSpan = document.getElementById("deleteResult");

	resultSpan.textContent = "";
	resultSpan.hidden = true;

	// The dialog stays open until the server answers. Writing the failure into
	// #searchResult (as this used to) put it in the results header, above 24
	// cards that had not changed, long after focus had moved to the search box
	// -- where the next keystroke wiped it. Failures belong on the control the
	// user pressed.
	deleteInFlight = true;
	setButtonBusy(confirmButton, true, dialog);
	setButtonBusy(keepButton, true, dialog);

	function failed(message)
	{
		deleteInFlight = false;
		setButtonBusy(confirmButton, false);
		setButtonBusy(keepButton, false);
		// #deleteResult is role="alert" (contacts.html): unhide it BEFORE
		// writing the text, so the message lands in a live region that is
		// already in the accessibility tree and actually gets announced.
		resultSpan.hidden = false;
		resultSpan.textContent = message;
		focusOnceVisible(confirmButton, dialog);
	}

	callApiWithDeadline("DeleteContact", payload, function(response)
	{
		deleteInFlight = false;
		setButtonBusy(confirmButton, false);
		setButtonBusy(keepButton, false);

		if (response.error)
		{
			failed(response.error);
			return;
		}

		// The card that opened the dialog is about to disappear, so focus has
		// to land somewhere that will still exist after the re-render.
		pendingDeleteContact = null;
		deleteCameFromEditPanel = false;
		deleteReturnFocusEl = null;
		closeDeleteDialog(false);
		document.getElementById("searchText").focus();

		showToast("Contact deleted");
		searchContacts(); // refresh list from server
		refreshTotalCount();
	},
	function(errorMessage)
	{
		failed(errorMessage);
	});
}
