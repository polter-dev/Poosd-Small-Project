// Every endpoint this calls (request/response shape, expected behavior) is
// spec'd in docs/api-contract.md -- check there before wiring up a new call
// or building the PHP side of one.
//
// TODO: point this at the deployed API once it's hosted, e.g. "https://api.yourdomain.com/API"
const urlBase = 'http://localhost/API';
const extension = 'php';

// Session is stored client-side only as a pointer (userId + display name).
// The server is always the source of truth for which contacts belong to this user.
const SESSION_COOKIE_MINUTES = 30;

function saveSession(userId, firstName, lastName)
{
	let date = new Date();
	date.setTime(date.getTime() + (SESSION_COOKIE_MINUTES * 60 * 1000));
	document.cookie = "userId=" + userId + ";expires=" + date.toGMTString() + ";path=/";
	document.cookie = "firstName=" + firstName + ";expires=" + date.toGMTString() + ";path=/";
	document.cookie = "lastName=" + lastName + ";expires=" + date.toGMTString() + ";path=/";
}

function readSession()
{
	let session = { userId: -1, firstName: "", lastName: "" };
	let splits = document.cookie.split(";");

	for (let i = 0; i < splits.length; i++)
	{
		let tokens = splits[i].trim().split("=");
		if (tokens[0] === "userId")
		{
			session.userId = parseInt(tokens[1]);
		}
		else if (tokens[0] === "firstName")
		{
			session.firstName = tokens[1];
		}
		else if (tokens[0] === "lastName")
		{
			session.lastName = tokens[1];
		}
	}

	return session;
}

function clearSession()
{
	document.cookie = "userId=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	document.cookie = "firstName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
	document.cookie = "lastName=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
}
