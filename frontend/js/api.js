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
