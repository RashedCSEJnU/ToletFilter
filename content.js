(function () {
	const MONTHS = [
		"January",
		"February",
		"March",
		"April",
		"May",
		"June",
		"July",
		"August",
		"September",
		"October",
		"November",
		"December",
	];

	function injectStyles() {
		const css = `
#rentsearch-panel {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 2147483647;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 10px;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  box-shadow: 0 4px 12px rgba(0,0,0,.15);
  width: 260px;
}
#rentsearch-panel h4 { margin: 0 0 8px; font-size: 14px; }
#rentsearch-panel label { display:block; margin: 4px 0 2px; font-weight: 600; }
#rentsearch-panel select, #rentsearch-panel button { width: 100%; padding: 6px; margin-top: 4px; }
.rs-hidden { display: none !important; }
.rs-badge { outline: 3px solid #22c55e; }`;
		const style = document.createElement("style");
		style.textContent = css;
		document.head.appendChild(style);
	}

	injectStyles();

	function parseRent(card) {
		const p = card.querySelector(".property-card p, .card-body p");
		const txt = (p ? p.textContent : "") || card.textContent;
		const m = txt.match(/Rent\s*:\s*([\d,]+)/i);
		return m ? parseInt(m[1].replace(/,/g, ""), 10) : 0;
	}

	function parseBed(card) {
		const p = card.querySelector(".property-card p, .card-body p");
		const txt = (p ? p.textContent : "") || card.textContent;
		const m = txt.match(/Bed\s*:\s*(\d+)/i);
		return m ? parseInt(m[1], 10) : 0;
	}

	function parseMonth(card) {
		const badge = card.querySelector('[title^="to-let from"]');
		if (badge) {
			const t = badge.getAttribute("title") || badge.textContent;
			const m = t.match(/to-let from\s*:\s*(\w+)/i);
			if (m) return m[1];
			return badge.textContent.trim();
		}
		// fallback: search text
		for (const mn of MONTHS) {
			if (new RegExp("\\b" + mn + "\\b").test(card.textContent))
				return mn;
		}
		return "";
	}

	function findCards() {
		const all = Array.from(document.querySelectorAll(".card"));
		return all.filter((c) => /Rent\s*:/i.test(c.textContent));
	}

	function monthIndex(m) {
		return MONTHS.indexOf(m);
	}

	function inMonthRange(cardMonth, fromIdx, toIdx) {
		const mi = monthIndex(cardMonth);
		if (mi === -1) return true; // no month info, keep
		if (fromIdx <= toIdx) return mi >= fromIdx && mi <= toIdx;
		return mi >= fromIdx || mi <= toIdx; // wraps year end
	}

	function buildPanel() {
		if (document.getElementById("rentsearch-panel")) return;
		const panel = document.createElement("div");
		panel.id = "rentsearch-panel";
		panel.innerHTML = `
      <h4>RentSearch Filter</h4>
      <div style="display:flex;flex-direction:column;gap:6px;">
        <div>
          <label>Start month</label>
          <select id="rs-from">${MONTHS.map((m) => `<option value="${m}">${m}</option>`).join("")}</select>
        </div>
        <div>
          <label>End month</label>
          <select id="rs-to">${MONTHS.map((m) => `<option value="${m}">${m}</option>`).join("")}</select>
        </div>
        <div>
          <label>Highest rent (max BDT)</label>
          <input type="number" id="rs-max-rent" placeholder="e.g. 10000" min="0" step="100" style="width:100%;padding:6px;box-sizing:border-box;">
        </div>
        <div>
          <label>Max bedrooms</label>
          <select id="rs-bed" style="width:100%;padding:6px;box-sizing:border-box;">
            <option value="">Any</option>
            ${[1, 2, 3, 4, 5, 6].map((b) => `<option value="${b}">${b}</option>`).join("")}
          </select>
        </div>
        <div style="display:flex;gap:6px;margin-top:4px;">
          <button id="rs-apply" style="flex:1;padding:8px;">Apply Filter</button>
          <button id="rs-reset" style="flex:1;padding:8px;">Reset</button>
        </div>
        <div id="rs-count" style="color:#555;font-size:12px;"></div>
      </div>
    `;
		document.body.appendChild(panel);

		// defaults
		panel.querySelector("#rs-from").value = "January";
		panel.querySelector("#rs-to").value = "March";

		panel.querySelector("#rs-apply").addEventListener("click", apply);
		panel.querySelector("#rs-reset").addEventListener("click", reset);
	}

	function apply() {
		const from = document.getElementById("rs-from").value;
		const to = document.getElementById("rs-to").value;
		const maxRent = parseInt(
			document.getElementById("rs-max-rent").value,
			10,
		);
		const bedVal = document.getElementById("rs-bed").value;
		const bedFilter = bedVal ? parseInt(bedVal, 10) : null;
		const fi = monthIndex(from),
			ti = monthIndex(to);

		const cards = findCards();

		cards.forEach((c) => {
			const cardMonth = parseMonth(c);
			const rent = parseRent(c);
			const bed = parseBed(c);

			const monthOk = inMonthRange(cardMonth, fi, ti);
			const rentOk = maxRent ? rent <= maxRent : true;
			const bedOk = bedFilter === null || bed <= bedFilter;

			c.classList.toggle("rs-hidden", !(monthOk && rentOk && bedOk));
		});

		// sort visible by rent desc then bed desc within each row container
		const wrappers = new Set();
		cards.forEach((c) => {
			if (c.parentElement) wrappers.add(c.parentElement);
		});
		wrappers.forEach((w) => {
			const cols = Array.from(w.children).filter(
				(n) => n.querySelector && n.querySelector(".card"),
			);
			const visible = cols.filter((col) => {
				const card = col.querySelector(".card");
				return card && !card.classList.contains("rs-hidden");
			});
			const hidden = cols.filter((col) => {
				const card = col.querySelector(".card");
				return card && card.classList.contains("rs-hidden");
			});
			visible.sort((a, b) => {
				const ca = a.querySelector(".card"),
					cb = b.querySelector(".card");
				const ra = parseRent(ca),
					rb = parseRent(cb);
				if (rb !== ra) return rb - ra;
				return parseBed(cb) - parseBed(ca);
			});
			visible.concat(hidden).forEach((col) => w.appendChild(col));
		});

		const shown = cards.filter(
			(c) => !c.classList.contains("rs-hidden"),
		).length;
		document.getElementById("rs-count").textContent =
			`Showing ${shown} of ${cards.length}`;
	}

	function reset() {
		findCards().forEach((c) => c.classList.remove("rs-hidden"));
		document.getElementById("rs-max-rent").value = "";
		document.getElementById("rs-bed").value = "";
		document.getElementById("rs-from").value = "January";
		document.getElementById("rs-to").value = "March";
		document.getElementById("rs-count").textContent = "";
	}

	function init() {
		buildPanel();
	}
	if (document.readyState === "loading")
		document.addEventListener("DOMContentLoaded", init);
	else init();
	const obs = new MutationObserver(() => {
		if (!document.getElementById("rentsearch-panel")) buildPanel();
	});
	obs.observe(document.body, { childList: true, subtree: true });
})();
