(function () {
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

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
    for (const mn of MONTHS) {
      if (new RegExp("\\b" + mn + "\\b").test(card.textContent)) return mn;
    }
    return "";
  }

  function findCards() {
    const all = Array.from(document.querySelectorAll(".card"));
    return all.filter(c => /Rent\s*:/i.test(c.textContent));
  }

  function monthIndex(m){ return MONTHS.indexOf(m); }

  function inMonthRange(cardMonth, fromIdx, toIdx) {
    const mi = monthIndex(cardMonth);
    if (mi === -1) return true;
    if (fromIdx <= toIdx) return mi >= fromIdx && mi <= toIdx;
    return mi >= fromIdx || mi <= toIdx;
  }

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
#rentsearch-panel select, #rentsearch-panel input, #rentsearch-panel button { width: 100%; padding: 6px; margin-top: 4px; box-sizing: border-box; }
.rs-hidden { display: none !important; }
.rs-badge { outline: 3px solid #22c55e; }`;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
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
          <select id="rs-from">${MONTHS.map(m=>`<option value="${m}">${m}</option>`).join("")}</select>
        </div>
        <div>
          <label>End month</label>
          <select id="rs-to">${MONTHS.map(m=>`<option value="${m}">${m}</option>`).join("")}</select>
        </div>
        <div>
          <label>Highest rent (max BDT)</label>
          <input type="number" id="rs-max-rent" placeholder="e.g. 10000" min="0" step="100">
        </div>
        <div>
          <label>Max bedrooms</label>
          <select id="rs-bed">
            <option value="">Any</option>
            ${[1,2,3,4,5,6].map(b=>`<option value="${b}">${b}</option>`).join("")}
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

    panel.querySelector("#rs-from").value = "January";
    panel.querySelector("#rs-to").value = "March";

    panel.querySelector("#rs-apply").addEventListener("click", apply);
    panel.querySelector("#rs-reset").addEventListener("click", reset);
  }

  function apply() {
    const from = document.getElementById("rs-from").value;
    const to = document.getElementById("rs-to").value;
    const maxRent = parseInt(document.getElementById("rs-max-rent").value, 10);
    const bedVal = document.getElementById("rs-bed").value;
    const bedFilter = bedVal ? parseInt(bedVal, 10) : null;
    const fi = monthIndex(from), ti = monthIndex(to);

    const cards = findCards();

    // Determine which cards match
    const matched = [];
    const unmatched = [];
    cards.forEach(c => {
      const cardMonth = parseMonth(c);
      const rent = parseRent(c);
      const bed = parseBed(c);

      const monthOk = inMonthRange(cardMonth, fi, ti);
      const rentOk = maxRent ? rent <= maxRent : true;
      const bedOk = bedFilter === null || bed <= bedFilter;

      if (monthOk && rentOk && bedOk) matched.push(c);
      else unmatched.push(c);
    });

    // Reorder within each parent container: matched first (original order), then unmatched (original order)
    const containers = new Map();
    [...matched, ...unmatched].forEach(c => {
      const parent = c.parentElement;
      if (parent) {
        if (!containers.has(parent)) containers.set(parent, { matched: [], unmatched: [] });
        const bucket = (matched.includes(c) ? containers.get(parent).matched : containers.get(parent).unmatched);
        bucket.push(c);
      }
    });

    containers.forEach(({ matched: m, unmatched: u }, parent) => {
      // Remove all cards from parent
      [...m, ...u].forEach(c => c.remove());
      // Re-append in order: matched then unmatched
      m.forEach(c => parent.appendChild(c));
      u.forEach(c => parent.appendChild(c));
    });

    document.getElementById("rs-count").textContent = `Showing ${matched.length} of ${cards.length} (filtered first)`;
  }

  function reset() {
    // Reload page to restore original order, or we could store original order
    location.reload();
  }

  function init() {
    injectStyles();
    buildPanel();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  const obs = new MutationObserver(() => { if (!document.getElementById("rentsearch-panel")) buildPanel(); });
  obs.observe(document.body, { childList: true, subtree: true });
})();