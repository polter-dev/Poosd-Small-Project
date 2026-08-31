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
		resultSpan.innerHTML = "Searching...";

		let payload = { userId: currentSession.userId, search: searchTerm };

		callApi("SearchContacts", payload, function(response)
		{
			resultSpan.innerHTML = "";
			renderContacts(response.results || []);
		},
		function(errorMessage)
		{
			resultSpan.innerHTML = errorMessage;
		});
	}, 250); // small debounce so we're not hitting the API on every keystroke
}

function renderContacts(contacts)
{
	let tbody = document.getElementById("contactsTableBody");
	tbody.innerHTML = "";

	for (let i = 0; i < contacts.length; i++)
	{
		let contact = contacts[i];
		let row = document.createElement("tr");

		// Distinct aria-labels per row -- otherwise a screen reader user
		// tabbing through the table hears "Edit... Edit... Edit..." with no
		// way to tell which contact's button they're on.
		let fullName = contact.firstName + " " + contact.lastName;

		row.innerHTML =
			"<td>" + contact.firstName + "</td>" +
			"<td>" + contact.lastName + "</td>" +
			"<td>" + contact.phone + "</td>" +
			"<td>" + contact.email + "</td>" +
			"<td>" +
				"<button type=\"button\" class=\"buttons small\" aria-label=\"Edit " + fullName + "\" onclick=\"editContact(" + contact.id + ", this)\">Edit</button>" +
				"<button type=\"button\" class=\"buttons small\" aria-label=\"Delete " + fullName + "\" onclick=\"deleteContact(" + contact.id + ")\">Delete</button>" +
			"</td>";

		row.dataset.contact = JSON.stringify(contact);
		tbody.appendChild(row);
	}
}

function addContact()
{
	let resultSpan = document.getElementById("addContactResult");
	resultSpan.innerHTML = "";

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
			resultSpan.innerHTML = response.error || "Could not add contact";
			return;
		}

		resultSpan.innerHTML = "Contact added";
		document.getElementById("addFirstName").value = "";
		document.getElementById("addLastName").value = "";
		document.getElementById("addPhone").value = "";
		document.getElementById("addEmail").value = "";

		searchContacts(); // refresh list from server
	},
	function(errorMessage)
	{
		resultSpan.innerHTML = errorMessage;
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

	document.getElementById("editContactDiv").style.display = "block";

	// The panel is just a display:none/block toggle, so without an explicit
	// focus move a keyboard/screen-reader user has no indication it opened.
	// Remember what had focus so Cancel/Save can put it back afterward.
	editReturnFocusEl = buttonEl;
	document.getElementById("editFirstName").focus();
}

function cancelEditContact()
{
	document.getElementById("editContactDiv").style.display = "none";
	document.getElementById("editContactResult").innerHTML = "";

	if (editReturnFocusEl)
	{
		editReturnFocusEl.focus();
		editReturnFocusEl = null;
	}
}

function saveEditContact()
{
	let resultSpan = document.getElementById("editContactResult");
	resultSpan.innerHTML = "";

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
			resultSpan.innerHTML = response.error;
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
		resultSpan.innerHTML = errorMessage;
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
