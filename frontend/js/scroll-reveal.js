// Fades/slides ".reveal" panels in as they enter the viewport.
// Include this file (plus the .reveal styles in css/styles.css) on any page;
// it finds whatever ".reveal" elements exist on that page, so nothing else
// needs to change per-page.
//
// Progressive enhancement, not a requirement: css/styles.css shows every
// .reveal element at full opacity by default. This script only switches
// them into the animated hidden/reveal state (via the js-reveal-enabled
// class on <html>) once it confirms JS is running and the user hasn't asked
// for reduced motion -- so a no-JS visitor or a reduced-motion visitor never
// has content whose visibility depends on this script firing.

(function()
{
	if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)
	{
		return;
	}

	document.documentElement.classList.add("js-reveal-enabled");

	function revealAll(targets)
	{
		targets.forEach(function(el)
		{
			el.classList.add("is-visible");
		});
	}

	function init()
	{
		var targets = document.querySelectorAll(".reveal");
		if (targets.length === 0)
		{
			return;
		}

		if (!("IntersectionObserver" in window))
		{
			revealAll(targets); // no observer support -- just show everything
			return;
		}

		var observer = new IntersectionObserver(function(entries)
		{
			entries.forEach(function(entry)
			{
				if (entry.isIntersecting)
				{
					entry.target.classList.add("is-visible");
					observer.unobserve(entry.target);
				}
			});
		}, { threshold: 0.15 });

		targets.forEach(function(el)
		{
			observer.observe(el);
		});
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
