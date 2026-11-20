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
    // fallback: search text
    for (const mn of MONTHS) {
      if (new RegExp("\\b" + mn + "\\b").test(card.textContent)) return mn;
    }
    return "";
  }

  function findCards() {
    // cards are .card inside #post-data or any .card.mb-3 / .card-link
    const all = Array.from(document.querySelectorAll(".card"));
    // filter to property cards that contain a rent
    return all.filter(c => /Rent\s*:/i.test(c.textContent));
  }

  function buildPanel() {
    if (document.getElementById("rentsearch-panel")) return;
    const panel = document.createElement("div");
    panel.id = "rentsearch-panel";
    panel.innerHTML = `
      <h4>RentSearch Filter</h4>
      <label>From month</label>
      <select id="rs-from">${MONTHS.map(m=>`<option value="${m}">${m}</option>`).join("")}</select>
      <label>To month</label>
      <select id="rs-to">${MONTHS.map(m=>`<option value="${m}">${m}</option>`).join("")}</select>
      <div class="rs-row" style="margin-top:6px;">
        <button id="rs-apply">Apply Filter</button>
      </div>
      <div class="rs-row" style="margin-top:6px;">
        <button id="rs-reset">Reset</button>
      </div>
      <div id="rs-count" style="margin-top:6px;color:#555;"></div>
    `;
    document.body.appendChild(panel);

    // default from January to February
    panel.querySelector("#rs-from").value = "January";
    panel.querySelector("#rs-to").value = "February";

    panel.querySelector("#rs-apply").addEventListener("click", apply);
    panel.querySelector("#rs-reset").addEventListener("click", reset);
  }

  function monthIndex(m){ return MONTHS.indexOf(m); }

  function apply() {
    const from = document.getElementById("rs-from").value;
    const to = document.getElementById("rs-to").value;
    const fi = monthIndex(from), ti = monthIndex(to);
    const cards = findCards();
    // show/hide
    cards.forEach(c => {
      const m = parseMonth(c);
      const mi = monthIndex(m);
      let inRange = false;
      if (fi <= ti) inRange = mi >= fi && mi <= ti;
      else inRange = mi >= fi || mi <= ti;
      c.classList.toggle("rs-hidden", !inRange);
    });
    // sort visible by rent desc then bed desc within their container
    const containers = new Set(cards.map(c => c.parentElement));
    containers.forEach(cont => {
      const kids = Array.from(cont.children).filter(n => n.classList && n.classList.contains("card") || n.querySelector && n.querySelector(".card"));
      // We sort the card elements (or their wrappers col-*)
    });
    // Sort wrappers: find parent column wrappers
    const wrappers = new Set();
    cards.forEach(c => { if (c.parentElement) wrappers.add(c.parentElement); });
    wrappers.forEach(w => {
      const cols = Array.from(w.children).filter(n => n.querySelector && n.querySelector(".card"));
      const visible = cols.filter(col => {
        const card = col.querySelector(".card");
        return card && !card.classList.contains("rs-hidden");
      });
      const hidden = cols.filter(col => {
        const card = col.querySelector(".card");
        return card && card.classList.contains("rs-hidden");
      });
      visible.sort((a,b) => {
        const ca = a.querySelector(".card"), cb = b.querySelector(".card");
        const ra = parseRent(ca), rb = parseRent(cb);
        if (rb !== ra) return rb - ra;
        return parseBed(cb) - parseBed(ca);
      });
      // reorder: visible first sorted, then hidden
      visible.concat(hidden).forEach(col => w.appendChild(col));
    });

    const shown = cards.filter(c => !c.classList.contains("rs-hidden")).length;
    document.getElementById("rs-count").textContent = `Showing ${shown} of ${cards.length}`;
  }

  function reset() {
    findCards().forEach(c => c.classList.remove("rs-hidden"));
    document.getElementById("rs-count").textContent = "";
  }

  // init
  function init() {
    buildPanel();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
  // re-init on dynamic loads
  const obs = new MutationObserver(() => { if (!document.getElementById("rentsearch-panel")) buildPanel(); });
  obs.observe(document.body, { childList: true, subtree: true });
})();
