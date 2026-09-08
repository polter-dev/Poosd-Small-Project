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
		let resultSpan = document.getElementById("searchResult");

		showLoadingSkeletons();
		resultSpan.textContent = "Searching…";

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

			resultSpan.textContent = (results.length === 0 && searchTerm !== "") ? "No contacts found" : "";
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
	document.getElementById("searchResult").textContent = message;
	updateResultsHeader();
	// "0 of 24 match" next to an error message would be reporting a result
	// we never actually got.
	document.getElementById("resultCount").textContent = "";
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

// Keeps Tab/Shift+Tab from leaving `panelEl` while it's open. Both panels and
// the delete dialog declare role="dialog" aria-modal="true", which asserts
// that background content is unreachable -- without this, Tab from the last
// field still walks straight into the cards behind the backdrop, since
// aria-modal is just an ARIA attribute, not a browser behavior; nothing
// enforces it unless this does.
function trapFocusWithinPanel(event, panelEl)
{
	if (event.key !== "Tab")
	{
		return;
	}

	let focusable = panelEl.querySelectorAll(
		'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
	);
	if (focusable.length === 0)
	{
		return;
	}

	let first = focusable[0];
	let last = focusable[focusable.length - 1];

	if (event.shiftKey && document.activeElement === first)
	{
		event.preventDefault();
		last.focus();
	}
	else if (!event.shiftKey && document.activeElement === last)
	{
		event.preventDefault();
		first.focus();
	}
}

// The modal overlay shows/hides via a CSS class that transitions
// opacity/visibility (styles.css .modal-overlay/.modal-overlay.open),
// unlike the old display:none-based hidden panel. Calling .focus() in the
// same synchronous tick as classList.add("open") silently no-ops -- the
// browser hasn't committed the style recalc that makes the target
// focusable yet, and focus() doesn't retry once it fails. A double rAF
// defers the call until after that recalc has actually happened.
function focusOnceVisible(el)
{
	requestAnimationFrame(function()
	{
		requestAnimationFrame(function()
		{
			el.focus();
		});
	});
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

	addReturnFocusEl = triggerEl || document.activeElement;
	focusOnceVisible(document.getElementById("addFirstName"));
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

	if (returnFocus !== false && addReturnFocusEl)
	{
		addReturnFocusEl.focus();
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
		closeAddContact(false);
	}
}

function addContact()
{
	let resultSpan = document.getElementById("addContactResult");
	resultSpan.textContent = "";

	let payload = {
		userId: currentSession.userId,
		firstName: document.getElementById("addFirstName").value,
		lastName: document.getElementById("addLastName").value,
		phone: document.getElementById("addPhone").value,
		email: document.getElementById("addEmail").value
	};

	callApi("AddContact", payload, function(response)
	{
		if (!response.id || response.id < 1)
		{
			resultSpan.textContent = response.error || "Could not add contact";
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
		resultSpan.textContent = errorMessage;
	});
}

// ---- Edit Contact panel (modal overlay) ----

let editReturnFocusEl = null;

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
	editReturnFocusEl = triggerEl || document.activeElement;
	focusOnceVisible(document.getElementById("editFirstName"));
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

	if (returnFocus !== false && editReturnFocusEl)
	{
		editReturnFocusEl.focus();
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
		closeEditContact(false);
	}
}

function saveEditContact()
{
	let resultSpan = document.getElementById("editContactResult");
	resultSpan.textContent = "";

	let payload = {
		userId: currentSession.userId,
		id: document.getElementById("editContactId").value,
		firstName: document.getElementById("editFirstName").value,
		lastName: document.getElementById("editLastName").value,
		phone: document.getElementById("editPhone").value,
		email: document.getElementById("editEmail").value
	};

	callApi("EditContact", payload, function(response)
	{
		if (response.error)
		{
			resultSpan.textContent = response.error;
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
		resultSpan.textContent = errorMessage;
	});
}

// ---- Delete confirmation dialog (replaces confirm()) --------------------

let pendingDeleteContact = null;
let deleteReturnFocusEl = null;
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

	focusOnceVisible(document.getElementById("deleteKeepButton"));
}

function closeDeleteDialog(returnFocus)
{
	let overlay = document.getElementById("deleteOverlay");
	if (!overlay.classList.contains("open"))
	{
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
		return;
	}

	if (cameFromEdit && contact)
	{
		// Back to the edit panel the user was in, focus on the button that
		// opened the dialog.
		editContact(contact, null);
		focusOnceVisible(document.getElementById("deleteFromEditButton"));
	}
	else if (deleteReturnFocusEl)
	{
		deleteReturnFocusEl.focus();
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
	if (!pendingDeleteContact)
	{
		return;
	}

	let payload = { userId: currentSession.userId, id: pendingDeleteContact.id };

	// The card that opened the dialog is about to disappear, so focus has to
	// land somewhere that will still exist after the re-render.
	pendingDeleteContact = null;
	deleteCameFromEditPanel = false;
	deleteReturnFocusEl = null;
	closeDeleteDialog(false);
	document.getElementById("searchText").focus();

	callApi("DeleteContact", payload, function(response)
	{
		if (response.error)
		{
			document.getElementById("searchResult").textContent = response.error;
			return;
		}

		showToast("Contact deleted");
		searchContacts(); // refresh list from server
		refreshTotalCount();
	},
	function(errorMessage)
	{
		document.getElementById("searchResult").textContent = errorMessage;
	});
}
