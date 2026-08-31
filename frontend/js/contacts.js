// Contact CRUD + server-side search for contacts.html.
// Backend endpoints expected: SearchContacts.php, AddContact.php, EditContact.php, DeleteContact.php.
//
// Important: this file never keeps a full local copy of the contact list to
// filter against. Every search re-queries SearchContacts.php with the current
// text (partial match, server-side) and re-renders whatever comes back.

let currentSession = null;
let searchDebounceTimer = null;

function onContactsLoad()
{
	currentSession = requireLogin();
	if (!currentSession)
	{
		return; // requireLogin already redirected to index.html
	}

	searchContacts(); // initial load = search with empty term
}

function searchContacts()
{
	clearTimeout(searchDebounceTimer);
	searchDebounceTimer = setTimeout(function()
	{
		let searchTerm = document.getElementById("searchText").value;
		let resultSpan = document.getElementById("searchResult");
		resultSpan.textContent = "Searching...";

		let payload = { userId: currentSession.userId, search: searchTerm };

		callApi("SearchContacts", payload, function(response)
		{
			let results = response.results || [];
			resultSpan.textContent = results.length === 0 ? "No contacts found" : "";
			renderContacts(results);
		},
		function(errorMessage)
		{
			resultSpan.textContent = errorMessage;
		});
	}, 250); // small debounce so we're not hitting the API on every keystroke
}

// Appends a <td> holding `text` as literal text -- never HTML -- so a contact
// field can never inject markup into the page (see issue #82).
function appendTextCell(row, text)
{
	let cell = document.createElement("td");
	cell.textContent = text;
	row.appendChild(cell);
}

function renderContacts(contacts)
{
	let tbody = document.getElementById("contactsTableBody");
	tbody.innerHTML = "";

	for (let i = 0; i < contacts.length; i++)
	{
		let contact = contacts[i];
		let row = document.createElement("tr");

		appendTextCell(row, contact.firstName);
		appendTextCell(row, contact.lastName);
		appendTextCell(row, contact.phone);
		appendTextCell(row, contact.email);

		// Built with createElement/textContent/setAttribute rather than an
		// innerHTML string -- a contact named `<b>x</b>` or containing a `"`
		// used to inject markup or break out of the aria-label attribute
		// (issue #82). None of these APIs parse their input as HTML, so
		// arbitrary contact text is always treated as literal text/attribute
		// value, never as markup.
		let actionsCell = document.createElement("td");

		// Distinct aria-labels per row -- otherwise a screen reader user
		// tabbing through the table hears "Edit... Edit... Edit..." with no
		// way to tell which contact's button they're on.
		let fullName = contact.firstName + " " + contact.lastName;

		let editButton = document.createElement("button");
		editButton.type = "button";
		editButton.className = "buttons small";
		editButton.textContent = "Edit";
		editButton.setAttribute("aria-label", "Edit " + fullName);
		editButton.addEventListener("click", function()
		{
			editContact(contact.id, editButton);
		});

		let deleteButton = document.createElement("button");
		deleteButton.type = "button";
		deleteButton.className = "buttons small";
		deleteButton.textContent = "Delete";
		deleteButton.setAttribute("aria-label", "Delete " + fullName);
		deleteButton.addEventListener("click", function()
		{
			deleteContact(contact.id);
		});

		actionsCell.appendChild(editButton);
		actionsCell.appendChild(deleteButton);
		row.appendChild(actionsCell);

		row.dataset.contact = JSON.stringify(contact);
		tbody.appendChild(row);
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

		resultSpan.textContent = "Contact added";
		document.getElementById("addFirstName").value = "";
		document.getElementById("addLastName").value = "";
		document.getElementById("addPhone").value = "";
		document.getElementById("addEmail").value = "";

		searchContacts(); // refresh list from server
	},
	function(errorMessage)
	{
		resultSpan.textContent = errorMessage;
	});
}

let editReturnFocusEl = null;

function editContact(contactId, buttonEl)
{
	let row = buttonEl.closest("tr");
	let contact = JSON.parse(row.dataset.contact);

	document.getElementById("editContactId").value = contact.id;
	document.getElementById("editFirstName").value = contact.firstName;
	document.getElementById("editLastName").value = contact.lastName;
	document.getElementById("editPhone").value = contact.phone;
	document.getElementById("editEmail").value = contact.email;

	document.getElementById("editContactDiv").classList.remove("hidden");

	// The panel is just a hidden-class toggle, so without an explicit
	// focus move a keyboard/screen-reader user has no indication it opened.
	// Remember what had focus so Cancel/Save can put it back afterward.
	editReturnFocusEl = buttonEl;
	document.getElementById("editFirstName").focus();
}

function cancelEditContact()
{
	document.getElementById("editContactDiv").classList.add("hidden");
	document.getElementById("editContactResult").textContent = "";

	if (editReturnFocusEl)
	{
		editReturnFocusEl.focus();
		editReturnFocusEl = null;
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

		// The row (and its Edit button) is about to be rebuilt by
		// searchContacts(), so returning focus to that stale button would
		// just lose focus a moment later -- land on the search box instead.
		editReturnFocusEl = null;
		cancelEditContact();
		document.getElementById("searchText").focus();
		searchContacts(); // refresh list from server
	},
	function(errorMessage)
	{
		resultSpan.textContent = errorMessage;
	});
}

function deleteContact(contactId)
{
	if (!confirm("Delete this contact?"))
	{
		return;
	}

	let payload = { userId: currentSession.userId, id: contactId };

	callApi("DeleteContact", payload, function(response)
	{
		if (response.error)
		{
			alert(response.error);
			return;
		}

		searchContacts(); // refresh list from server
	},
	function(errorMessage)
	{
		alert(errorMessage);
	});
}
