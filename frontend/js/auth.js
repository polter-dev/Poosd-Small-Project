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

// NOTE on display toggling: css/styles.css's .auth-card is `display:flex`,
// which -- being an author-origin rule -- always wins over the `hidden`
// attribute's user-agent-origin `display:none`, regardless of selector
// specificity. So the `hidden` property can't reliably hide these cards
// without a styles.css change (out of scope here; see PR notes). Instead we
// toggle inline style.display, which styles.css already accounts for via
// `.auth-card > * + * { margin-top }` instead of a flex `gap` -- that rule
// holds up whether the card renders as flex (default) or block (after JS
// sets style.display = "block"), so neither card is ever left with a
// display that clips or double-spaces its content.
function setCardVisible(card, visible)
{
	card.style.display = visible ? "block" : "none";
}

function showRegisterForm()
{
	setCardVisible(document.getElementById("loginDiv"), false);
	setCardVisible(document.getElementById("registerDiv"), true);

	// Don't let a stale error/success message from the other form linger
	// if the user switches back to it later.
	clearResult("loginResult");
	clearResult("registerResult");
}

function showLoginForm()
{
	setCardVisible(document.getElementById("registerDiv"), false);
	setCardVisible(document.getElementById("loginDiv"), true);

	clearResult("loginResult");
	clearResult("registerResult");
}

function clearResult(elementId)
{
	let el = document.getElementById(elementId);
	if (!el)
	{
		return;
	}

	el.textContent = "";
	el.classList.remove("is-success");
}

function setResultError(resultSpan, message)
{
	resultSpan.classList.remove("is-success");
	resultSpan.textContent = message;
}

// Success messages use a distinct class (is-success) so they can be styled
// differently from the default danger-red #loginResult/#registerResult
// text -- see report for the styles.css hook this still needs.
function setResultSuccess(resultSpan, message)
{
	resultSpan.classList.add("is-success");
	resultSpan.textContent = message;
}

function doLogin()
{
	let username = document.getElementById("loginUsername").value;
	let password = document.getElementById("loginPassword").value;
	let resultSpan = document.getElementById("loginResult");
	clearResult("loginResult");

	// TODO: hash password client-side (e.g. with a bundled md5/sha256 lib) to
	// match whatever the backend expects before comparing against the DB.
	let payload = { username: username, password: password };

	callApi("Login", payload, function(response)
	{
		if (!response.id || response.id < 1)
		{
			setResultError(resultSpan, response.error || "Username/password combination incorrect");
			return;
		}

		saveSession(response.id, response.firstName, response.lastName);
		window.location.href = "contacts.html";
	},
	function(errorMessage)
	{
		setResultError(resultSpan, errorMessage);
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
	clearResult("registerResult");

	if (!firstName || !lastName || !username || !password || !confirmPassword)
	{
		setResultError(resultSpan, "All fields are required");
		return;
	}

	if (password !== confirmPassword)
	{
		setResultError(resultSpan, "Passwords do not match");
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
			setResultError(resultSpan, response.error || "Could not create account");
			return;
		}

		// Distinct from the error path (no is-success class there) so a
		// screen reader / sighted user can tell success from failure via
		// the existing aria-live region, even though we redirect right
		// after -- see report for the styles.css hook this still needs.
		setResultSuccess(resultSpan, "Account created! Logging you in...");
		saveSession(response.id, response.firstName, response.lastName);
		window.location.href = "contacts.html";
	},
	function(errorMessage)
	{
		setResultError(resultSpan, errorMessage);
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
		// textContent, not innerHTML -- firstName/lastName are whatever the
		// user typed at registration, so this is the same class of bug as
		// issue #82 (a name like "<img src=x onerror=...>" would otherwise
		// execute on every page load).
		userNameSpan.textContent = "Logged in as " + session.firstName + " " + session.lastName;
	}

	let profileInitials = document.getElementById("profileInitials");
	if (profileInitials)
	{
		let initials = (session.firstName ? session.firstName.charAt(0) : "")
			+ (session.lastName ? session.lastName.charAt(0) : "");
		profileInitials.textContent = initials.toUpperCase();
	}

	return session;
}

// ---- Profile bubble dropdown (top-right, contacts.html) ----
// Same open/close idiom as the accessibility widget in js/accessibility.js:
// a document-level capture-phase click listener for "click outside to
// close", added/removed only while the menu is actually open.

function toggleProfileMenu()
{
	let menu = document.getElementById("profileMenu");
	if (!menu)
	{
		return;
	}

	if (menu.hidden)
	{
		openProfileMenu();
	}
	else
	{
		closeProfileMenu(false);
	}
}

function openProfileMenu()
{
	let menu = document.getElementById("profileMenu");
	let toggleBtn = document.getElementById("profileToggleBtn");
	menu.hidden = false;
	toggleBtn.setAttribute("aria-expanded", "true");
	document.addEventListener("keydown", onProfileMenuKeydown);
	document.addEventListener("click", onProfileMenuOutsideClick, true);
}

function closeProfileMenu(returnFocus)
{
	let menu = document.getElementById("profileMenu");
	let toggleBtn = document.getElementById("profileToggleBtn");
	if (!menu || menu.hidden)
	{
		return;
	}

	menu.hidden = true;
	toggleBtn.setAttribute("aria-expanded", "false");
	document.removeEventListener("keydown", onProfileMenuKeydown);
	document.removeEventListener("click", onProfileMenuOutsideClick, true);

	if (returnFocus !== false)
	{
		toggleBtn.focus();
	}
}

function onProfileMenuKeydown(event)
{
	if (event.key === "Escape")
	{
		closeProfileMenu(true);
	}
}

function onProfileMenuOutsideClick(event)
{
	let wrap = document.getElementById("profileBubbleWrap");
	if (wrap && !wrap.contains(event.target))
	{
		closeProfileMenu(false);
	}
}
