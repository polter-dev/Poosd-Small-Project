// Floating accessibility widget: high contrast, page zoom, and read-aloud.
// Self-contained -- include this file (plus css/accessibility.css) on any
// page and it builds its own markup, so nothing needs to be hand-added to
// index.html/contacts.html beyond the two <link>/<script> tags.
//
// Preferences persist in localStorage so they survive navigation between
// pages and page reloads.

(function()
{
	var STORAGE_CONTRAST = "a11yHighContrast";
	var STORAGE_ZOOM = "a11yZoom";
	var ZOOM_STEPS = [100, 110, 125, 140, 160, 180];
	var DEFAULT_ZOOM_INDEX = 0;

	var zoomIndex = DEFAULT_ZOOM_INDEX;
	var speaking = false;
	var speechChunks = [];
	var speechIndex = 0;
	var speechToken = 0; // bumped on every stop/start so stale timers/callbacks from a previous read no-op
	var SPEECH_PAUSE_MS = 350; // gap between each announced item, so it doesn't run on as one wall of words

	function applyContrast(enabled)
	{
		document.documentElement.classList.toggle("a11y-high-contrast", enabled);
		localStorage.setItem(STORAGE_CONTRAST, enabled ? "1" : "0");

		var btn = document.getElementById("a11yContrastBtn");
		if (btn)
		{
			btn.setAttribute("aria-pressed", enabled ? "true" : "false");
		}
	}

	function applyZoom(index)
	{
		zoomIndex = Math.max(0, Math.min(ZOOM_STEPS.length - 1, index));
		var percent = ZOOM_STEPS[zoomIndex];

		// "zoom" (not font-size) because most of this site's CSS uses fixed
		// px sizes rather than rem/em, so scaling the root font-size alone
		// would leave headings, panels, and buttons completely unaffected.
		document.documentElement.style.zoom = percent + "%";
		localStorage.setItem(STORAGE_ZOOM, String(percent));

		var label = document.getElementById("a11yZoomLevel");
		if (label)
		{
			label.textContent = percent + "%";
		}
	}

	function isElementVisible(el, widget)
	{
		if (el === widget || (widget && widget.contains(el)))
		{
			return false; // never read the widget's own panel back to the user
		}

		var style = window.getComputedStyle(el);
		return style.display !== "none" && style.visibility !== "hidden";
	}

	// <input>/<button>/<a> carry their meaning in attributes, not rendered
	// text content, so plain .innerText traversal skips them entirely (an
	// empty text field just isn't there as far as .innerText is concerned).
	// Describe each one explicitly, the way a screen reader announces a
	// name + role, e.g. "Username, text field" or "Log In, button".
	function describeControl(el)
	{
		var tag = el.tagName.toLowerCase();

		if (tag === "input")
		{
			var type = (el.getAttribute("type") || "text").toLowerCase();
			if (type === "hidden")
			{
				return null;
			}

			var name = (el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").trim();
			var roleWord = type === "password" ? "password field" : "text field";
			return (name ? name + ", " : "") + roleWord;
		}

		if (tag === "button")
		{
			var label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
			return label ? label + ", button" : null;
		}

		if (tag === "a")
		{
			var linkLabel = (el.textContent || "").replace(/\s+/g, " ").trim();
			return linkLabel ? linkLabel + ", link" : null;
		}

		return null;
	}

	// Text nodes that belong directly to this element, ignoring text that
	// belongs to descendant elements (those are visited separately) --
	// otherwise the same words would be read twice, once per ancestor.
	function ownText(el)
	{
		var parts = [];
		el.childNodes.forEach(function(node)
		{
			if (node.nodeType === Node.TEXT_NODE)
			{
				var text = node.textContent.replace(/\s+/g, " ").trim();
				if (text)
				{
					parts.push(text);
				}
			}
		});

		return parts.join(" ");
	}

	// Walks the live, rendered DOM (not a cloneNode(true) copy -- a detached
	// clone has no layout/render tree, so it can't tell what's display:none
	// and ends up including hidden sections, like the Register form while
	// still on the Login screen, or the closed Edit panel).
	function buildSpeechChunks()
	{
		var widget = document.getElementById("a11y-widget");
		var chunks = [];

		var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT, {
			acceptNode: function(node)
			{
				if (!isElementVisible(node, widget))
				{
					return NodeFilter.FILTER_REJECT; // skip node AND its subtree
				}

				var control = node.closest("input, button, a");
				if (control && control !== node)
				{
					return NodeFilter.FILTER_REJECT; // already described via its control ancestor
				}

				return NodeFilter.FILTER_ACCEPT;
			}
		});

		while (walker.nextNode())
		{
			var el = walker.currentNode;
			var tag = el.tagName.toLowerCase();

			if (tag === "input" || tag === "button" || tag === "a")
			{
				var described = describeControl(el);
				if (described)
				{
					chunks.push(described);
				}
				continue;
			}

			var text = ownText(el);
			if (text)
			{
				chunks.push(text);
			}
		}

		return chunks;
	}

	function setReadingState(isSpeaking)
	{
		speaking = isSpeaking;
		var btn = document.getElementById("a11yReadBtn");
		if (!btn)
		{
			return;
		}

		btn.setAttribute("aria-pressed", isSpeaking ? "true" : "false");
		btn.textContent = isSpeaking ? "Stop Reading" : "Read Page Aloud";
	}

	// Speaks speechChunks one at a time (rather than one big joined string)
	// with a real pause between each, so it reads as a list of distinct
	// items instead of a run-on wall of words. `token` guards against a
	// stray queued continuation firing after the user hit Stop or started
	// a fresh read.
	function speakNextChunk(token)
	{
		if (token !== speechToken || speechIndex >= speechChunks.length)
		{
			if (token === speechToken)
			{
				setReadingState(false);
			}
			return;
		}

		var utterance = new SpeechSynthesisUtterance(speechChunks[speechIndex]);
		speechIndex++;

		utterance.onend = function()
		{
			if (token === speechToken)
			{
				setTimeout(function() { speakNextChunk(token); }, SPEECH_PAUSE_MS);
			}
		};
		utterance.onerror = utterance.onend;

		window.speechSynthesis.speak(utterance);
	}

	function toggleReadAloud()
	{
		if (!("speechSynthesis" in window))
		{
			return;
		}

		speechToken++; // invalidates any pending continuation from a previous read

		if (speaking)
		{
			window.speechSynthesis.cancel();
			setReadingState(false);
			return;
		}

		speechChunks = buildSpeechChunks();
		speechIndex = 0;
		if (!speechChunks.length)
		{
			return;
		}

		setReadingState(true);
		speakNextChunk(speechToken);
	}

	function openPanel()
	{
		var panel = document.getElementById("a11yPanel");
		var toggleBtn = document.getElementById("a11yToggleBtn");
		panel.hidden = false;
		toggleBtn.setAttribute("aria-expanded", "true");
		document.getElementById("a11yCloseBtn").focus();
		document.addEventListener("keydown", onPanelKeydown);
		document.addEventListener("click", onOutsideClick, true);
	}

	function closePanel(returnFocus)
	{
		var panel = document.getElementById("a11yPanel");
		var toggleBtn = document.getElementById("a11yToggleBtn");
		panel.hidden = true;
		toggleBtn.setAttribute("aria-expanded", "false");
		document.removeEventListener("keydown", onPanelKeydown);
		document.removeEventListener("click", onOutsideClick, true);

		if (returnFocus !== false)
		{
			toggleBtn.focus();
		}
	}

	function onPanelKeydown(event)
	{
		if (event.key === "Escape")
		{
			closePanel(true);
		}
	}

	function onOutsideClick(event)
	{
		var widget = document.getElementById("a11y-widget");
		if (widget && !widget.contains(event.target))
		{
			closePanel(false);
		}
	}

	function buildWidget()
	{
		var container = document.createElement("div");
		container.id = "a11y-widget";
		container.innerHTML =
			'<button type="button" id="a11yToggleBtn" aria-haspopup="true" aria-expanded="false" ' +
				'aria-controls="a11yPanel" aria-label="Accessibility options">' +
				'<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
					'<path d="M12 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm8.5 6.5-6 1.2V12l2 7.3-1.9.5-2-6-2 6-1.9-.5 2-7.3V9.7l-6-1.2.4-1.9L12 8l7-1.4z"/>' +
				'</svg>' +
			'</button>' +
			'<div id="a11yPanel" role="region" aria-label="Accessibility options" hidden>' +
				'<div class="a11y-panel-header">' +
					'<span class="a11y-panel-title" id="a11yPanelTitle">Accessibility</span>' +
					'<button type="button" id="a11yCloseBtn" aria-label="Close accessibility options">&times;</button>' +
				'</div>' +
				'<div class="a11y-section">' +
					'<span class="a11y-section-label" id="a11yZoomLabel">Text Size (<span id="a11yZoomLevel">100%</span>)</span>' +
					'<div class="a11y-btn-row" role="group" aria-labelledby="a11yZoomLabel">' +
						'<button type="button" id="a11yZoomOut" aria-label="Decrease text size">A&minus;</button>' +
						'<button type="button" id="a11yZoomReset" aria-label="Reset text size">Reset</button>' +
						'<button type="button" id="a11yZoomIn" aria-label="Increase text size">A+</button>' +
					'</div>' +
				'</div>' +
				'<div class="a11y-section">' +
					'<button type="button" id="a11yContrastBtn" class="a11y-toggle" aria-pressed="false">High Contrast</button>' +
				'</div>' +
				'<div class="a11y-section">' +
					'<button type="button" id="a11yReadBtn" class="a11y-toggle" aria-pressed="false">Read Page Aloud</button>' +
				'</div>' +
			'</div>';

		document.body.appendChild(container);

		document.getElementById("a11yToggleBtn").addEventListener("click", function()
		{
			var panel = document.getElementById("a11yPanel");
			if (panel.hidden)
			{
				openPanel();
			}
			else
			{
				closePanel(false);
			}
		});

		document.getElementById("a11yCloseBtn").addEventListener("click", function()
		{
			closePanel(true);
		});

		document.getElementById("a11yContrastBtn").addEventListener("click", function()
		{
			applyContrast(!document.documentElement.classList.contains("a11y-high-contrast"));
		});

		document.getElementById("a11yZoomIn").addEventListener("click", function()
		{
			applyZoom(zoomIndex + 1);
		});

		document.getElementById("a11yZoomOut").addEventListener("click", function()
		{
			applyZoom(zoomIndex - 1);
		});

		document.getElementById("a11yZoomReset").addEventListener("click", function()
		{
			applyZoom(DEFAULT_ZOOM_INDEX);
		});

		var readBtn = document.getElementById("a11yReadBtn");
		if ("speechSynthesis" in window)
		{
			readBtn.addEventListener("click", toggleReadAloud);
		}
		else
		{
			readBtn.disabled = true;
			readBtn.title = "Text-to-speech is not supported in this browser";
		}

		window.addEventListener("beforeunload", function()
		{
			if ("speechSynthesis" in window)
			{
				window.speechSynthesis.cancel();
			}
		});
	}

	function init()
	{
		buildWidget();

		// Restore persisted preferences.
		applyContrast(localStorage.getItem(STORAGE_CONTRAST) === "1");

		var savedZoom = parseInt(localStorage.getItem(STORAGE_ZOOM), 10);
		var savedIndex = ZOOM_STEPS.indexOf(savedZoom);
		applyZoom(savedIndex >= 0 ? savedIndex : DEFAULT_ZOOM_INDEX);
	}

	if (document.readyState === "loading")
	{
		document.addEventListener("DOMContentLoaded", init);
	}
	else
	{
		init();
	}
})();
