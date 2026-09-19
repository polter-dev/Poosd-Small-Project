// Generic AJAX helper shared by every page. Every API call in this app should
// go through here so we get one consistent JSON-over-POST pattern (matches
// the LAMP Stack demo's XMLHttpRequest style) instead of each feature file
// re-implementing request/response handling.
//
// endpointName: PHP file name on the server, no extension, e.g. "Login", "SearchContacts"
// payload: plain JS object, gets JSON.stringify'd as the POST body
// onSuccess(jsonObject): called with the parsed JSON response on HTTP 200
// onError(message): called on network failure or non-200 status
function callApi(endpointName, payload, onSuccess, onError)
{
	let url = urlBase + '/' + endpointName + '.' + extension;
	let xhr = new XMLHttpRequest();
	xhr.open("POST", url, true);
	xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");

	xhr.onreadystatechange = function()
	{
		if (this.readyState !== 4)
		{
			return;
		}

		if (this.status === 200)
		{
			try
			{
				let jsonObject = JSON.parse(xhr.responseText);
				onSuccess(jsonObject);
			}
			catch (err)
			{
				onError("Unexpected response from server: " + err.message);
			}
		}
		else
		{
			onError("Request failed with status " + this.status);
		}
	};

	xhr.onerror = function()
	{
		onError("Network error contacting server");
	};

	xhr.send(JSON.stringify(payload));
}

// callApi has no timeout, so a request that never resolves leaves the UI
// stuck (e.g. a submit button disabled forever). This wrapper adds a
// deadline; the settle flag stops a late response from firing after that.
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
