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

		row.innerHTML =
			"<td>" + contact.firstName + "</td>" +
			"<td>" + contact.lastName + "</td>" +
			"<td>" + contact.phone + "</td>" +
			"<td>" + contact.email + "</td>" +
			"<td>" +
				"<button type=\"button\" class=\"buttons small\" onclick=\"editContact(" + contact.id + ", this)\">Edit</button>" +
				"<button type=\"button\" class=\"buttons small\" onclick=\"deleteContact(" + contact.id + ")\">Delete</button>" +
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
}

function cancelEditContact()
{
	document.getElementById("editContactDiv").style.display = "none";
	document.getElementById("editContactResult").innerHTML = "";
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

		cancelEditContact();
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
