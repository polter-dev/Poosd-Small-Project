// Every endpoint this calls (request/response shape, expected behavior) is
// spec'd in docs/api-contract.md -- check there before wiring up a new call
// or building the PHP side of one.
const urlBase = '/API';
const extension = 'php';

// Session is stored client-side only as a pointer (userId + display name).
// The server is always the source of truth for which contacts belong to this user.
const SESSION_COOKIE_MINUTES = 30;

// Secure is only added when actually served over HTTPS, so local http://
// development (see docs/api-contract.md) doesn't have its cookies silently
// dropped by the browser. Cookies are never cross-site (SameSite=Lax).
const SESSION_COOKIE_ATTRS = ";path=/;SameSite=Lax" + (location.protocol === "https:" ? ";Secure" : "");

function saveSession(userId, firstName, lastName)
{
	let date = new Date();
	date.setTime(date.getTime() + (SESSION_COOKIE_MINUTES * 60 * 1000));
	let expires = ";expires=" + date.toGMTString() + SESSION_COOKIE_ATTRS;
	document.cookie = "userId=" + encodeURIComponent(userId) + expires;
	document.cookie = "firstName=" + encodeURIComponent(firstName) + expires;
	document.cookie = "lastName=" + encodeURIComponent(lastName) + expires;
}

function readSession()
{
	let session = { userId: -1, firstName: "", lastName: "" };
	let splits = document.cookie.split(";");

	for (let i = 0; i < splits.length; i++)
	{
		let cookie = splits[i].trim();
		let separatorIndex = cookie.indexOf("=");
		if (separatorIndex === -1)
		{
			continue;
		}

		let name = cookie.slice(0, separatorIndex);
		if (name !== "userId" && name !== "firstName" && name !== "lastName")
		{
			continue;
		}

		let rawValue = cookie.slice(separatorIndex + 1);
		let value;
		try
		{
			value = decodeURIComponent(rawValue);
		}
		catch (e)
		{
			value = rawValue;
		}

		if (name === "userId")
		{
			session.userId = parseInt(value);
		}
		else if (name === "firstName")
		{
			session.firstName = value;
		}
		else if (name === "lastName")
		{
			session.lastName = value;
		}
	}

	return session;
}

function clearSession()
{
	let expired = ";expires=Thu, 01 Jan 1970 00:00:00 GMT" + SESSION_COOKIE_ATTRS;
	document.cookie = "userId=" + expired;
	document.cookie = "firstName=" + expired;
	document.cookie = "lastName=" + expired;
}
