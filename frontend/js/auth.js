// Handles both forms on index.html (login + register) and the session guard
// that contacts.html relies on. Backend endpoints expected: Login.php, Register.php.

function onIndexLoad()
{
	// If we already have a valid-looking session, skip straight to the app.
	let session = readSession();
	if (session.userId > 0)
	{
		window.location.href = "contacts.html";
	}
}

function showRegisterForm()
{
	document.getElementById("loginDiv").style.display = "none";
	document.getElementById("registerDiv").style.display = "block";
}

function showLoginForm()
{
	document.getElementById("registerDiv").style.display = "none";
	document.getElementById("loginDiv").style.display = "block";
}

function doLogin()
{
	let username = document.getElementById("loginUsername").value;
	let password = document.getElementById("loginPassword").value;
	let resultSpan = document.getElementById("loginResult");
	resultSpan.innerHTML = "";

	// TODO: hash password client-side (e.g. with a bundled md5/sha256 lib) to
	// match whatever the backend expects before comparing against the DB.
	let payload = { username: username, password: password };

	callApi("Login", payload, function(response)
	{
		if (!response.id || response.id < 1)
		{
			resultSpan.innerHTML = response.error || "Username/password combination incorrect";
			return;
		}

		saveSession(response.id, response.firstName, response.lastName);
		window.location.href = "contacts.html";
	},
	function(errorMessage)
	{
		resultSpan.innerHTML = errorMessage;
	});
}

function doRegister()
{
	let firstName = document.getElementById("registerFirstName").value;
	let lastName = document.getElementById("registerLastName").value;
	let username = document.getElementById("registerUsername").value;
	let password = document.getElementById("registerPassword").value;
	let confirmPassword = document.getElementById("registerConfirmPassword").value;
	let resultSpan = document.getElementById("registerResult");
	resultSpan.innerHTML = "";

	if (password !== confirmPassword)
	{
		resultSpan.innerHTML = "Passwords do not match";
		return;
	}

	let payload = {
		firstName: firstName,
		lastName: lastName,
		username: username,
		password: password
	};

	callApi("Register", payload, function(response)
	{
		if (!response.id || response.id < 1)
		{
			resultSpan.innerHTML = response.error || "Could not create account";
			return;
		}

		saveSession(response.id, response.firstName, response.lastName);
		window.location.href = "contacts.html";
	},
	function(errorMessage)
	{
		resultSpan.innerHTML = errorMessage;
	});
}

function doLogout()
{
	clearSession();
	window.location.href = "index.html";
}

// Call at the top of any page that requires a logged-in user.
// Returns the session object so callers can use userId without re-reading cookies.
function requireLogin()
{
	let session = readSession();
	if (session.userId < 1)
	{
		window.location.href = "index.html";
		return null;
	}

	let userNameSpan = document.getElementById("userName");
	if (userNameSpan)
	{
		userNameSpan.innerHTML = "Logged in as " + session.firstName + " " + session.lastName;
	}

	return session;
}
