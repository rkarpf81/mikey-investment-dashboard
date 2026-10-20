const stockNames = {
  FXAIX: "Fidelity 500 Index Fund",
  AVGO: "Broadcom",
  BABA: "Alibaba Group",
  CLG: "Collegium Pharmaceutical",
  CLSK: "CleanSpark",
  CRWV: "CoreWeave",
  EBAY: "eBay",
  FSELX: "Fidelity Select Semiconductors Portfolio",
  FSKAX: "Fidelity Total Market Index Fund",
  GCT: "GigaCloud Technology",
  GME: "GameStop",
  MARA: "MARA Holdings",
  META: "Meta Platforms",
  MRVL: "Marvell Technology",
  MSFT: "Microsoft",
  MU: "Micron Technology",
  NBIS: "Nebius Group",
  NVDA: "NVIDIA",
  ONDS: "Ondas Holdings",
  PLNT: "Planet Fitness",
  RBRK: "Rubrik",
  RIG: "Transocean",
  RIOT: "Riot Platforms",
  SOUN: "SoundHound AI",
  SPIR: "Spire Global",
  TTWO: "Take-Two Interactive Software",
  VIST: "Vista Energy",
  VRT: "Vertiv Holdings",
  WULF: "TeraWulf",
  YEXT: "Yext",
};
const initial = () => ({
  holdings: [],
  watch: [],
  goal: {
    startDate: new Date().toISOString().slice(0, 10),
    startBalance: 0,
    weeklyContribution: 100,
    annualReturn: 7,
    goalAmount: 185000,
    goalDate: "2034-05-30",
    actuals: {},
  },
});
let data;
let loadWarning = "";
try {
  const raw = localStorage.getItem("mikey-dashboard-v1");
  const saved = raw ? JSON.parse(raw) : null;
  if (saved && typeof saved === "object" && Array.isArray(saved.holdings)) {
    data = saved;
    if (!Array.isArray(data.watch)) data.watch = [];
    if (!data.goal)
      data.goal = {
        startDate: new Date().toISOString().slice(0, 10),
        startBalance: data.holdings.reduce(
          (a, h) => a + (Number(h.value) || 0),
          0,
        ),
        weeklyContribution: 100,
        annualReturn: 7,
        goalAmount: 185000,
        actuals: {},
      };
    if (!data.goal.actuals) data.goal.actuals = {};
    data.holdings = data.holdings
      .filter((h) => h && typeof h === "object" && typeof h.ticker === "string")
      .map((h) => ({
        ...h,
        value: Number(h.value) || 0,
        shares: Number(h.shares) || 0,
        cost: Number(h.cost) || 0,
        price: Number(h.price) || 0,
        target: Number(h.target) || 0,
        avgCostTarget: Number(h.avgCostTarget) || 0,
        priority: h.priority || "Later",
      }));
    if (!data.holdings.length)
      loadWarning =
        "Your saved holdings list is empty. Your original browser storage has not been overwritten.";
  } else {
    data = initial();
    if (raw)
      loadWarning =
        "Saved data uses an unexpected format. Original browser storage was preserved; showing an empty portfolio temporarily.";
  }
} catch (e) {
  data = initial();
  loadWarning =
    "Saved browser data could not be read. Original storage was preserved; showing an empty portfolio temporarily.";
}
if (!data.goal || typeof data.goal !== "object")
  data.goal = {
    startDate: new Date().toISOString().slice(0, 10),
    startBalance: data.holdings.reduce((a, h) => a + (Number(h.value) || 0), 0),
    weeklyContribution: 100,
    annualReturn: 7,
    goalAmount: 185000,
    goalDate: "2034-05-30",
    actuals: {},
  };
if (!data.goal.actuals) data.goal.actuals = {};
const money = (x) =>
    Number(x || 0).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    }),
  esc = (x) =>
    String(x ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    ),
  save = () => localStorage.setItem("mikey-dashboard-v1", JSON.stringify(data));
function update(i, key, v) {
  data.holdings[i][key] =
    key === "priority"
      ? v
      : Math.max(0, Number(String(v).replace(/[^0-9.]/g, "")) || 0);
  save();
  render();
}
function numbers() {
  let total = data.holdings.reduce((s, h) => s + h.value, 0),
    fx = data.holdings.find((h) => h.ticker === "FXAIX")?.value || 0;
  return { total, fx, gap: Math.max(0, 9 * (total - fx) - fx) };
}
function proposed() {
  if (!data.holdings.length)
    return { fx: 0, stock: 0, budget: 0, ticker: "", items: [] };
  let n = numbers(),
    budget = Math.max(0, Number(document.getElementById("budget").value) || 0),
    mode = document.getElementById("strategy").value,
    fx =
      mode === "core"
        ? Math.min(budget, n.gap) + Math.max(0, budget - n.gap) * 0.9
        : mode === "split" || mode === "priority"
          ? budget * 0.9
          : 0,
    items = [];
  if (fx > 0) items.push(["FXAIX", fx]);
  let left = budget - fx,
    ticker = document.getElementById("selected").value;
  if (mode === "priority") {
    for (const priority of ["Now", "Next"]) {
      for (const h of data.holdings.filter(
        (h) =>
          h.ticker !== "FXAIX" && h.priority === priority && h.target > h.value,
      )) {
        if (left <= 0) break;
        const amount = Math.min(left, h.target - h.value);
        items.push([h.ticker, amount]);
        left -= amount;
      }
    }
  }
  if (left > 0 && ticker) items.push([ticker, left]);
  return { fx, stock: budget - fx, budget, ticker, items };
}
function render(full = true) {
  let n = numbers();
  const source = document.getElementById("portfolioStatus");
  if (source) {
    source.textContent = data.accountImportAt
      ? "Holdings imported from a Fidelity CSV on " +
        new Date(data.accountImportAt).toLocaleString() +
        ". This is local to this browser, not a live Fidelity connection."
      : data.holdings.length
        ? "Showing data saved in this browser. It may include older manual values; import a current Fidelity positions CSV to replace them."
        : "No holdings loaded. Import a current Fidelity positions CSV to load holdings, shares, and cost basis.";
  }
  const empty = document.getElementById("holdingsEmpty");
  if (empty) empty.hidden = data.holdings.length > 0;
  document.getElementById("total").textContent = money(n.total);
  document.getElementById("allocation").textContent =
    (n.total ? (100 * n.fx) / n.total : 0).toFixed(1) + "%";
  document.getElementById("bar").style.width =
    (n.total ? (100 * n.fx) / n.total : 0) + "%";
  document.getElementById("gap").textContent =
    "FXAIX-only purchases needed for 90%: " + money(n.gap);
  let s = document.getElementById("selected"),
    old = s.value;
  s.innerHTML = data.holdings
    .filter((h) => h.ticker !== "FXAIX")
    .map((h) => "<option>" + esc(h.ticker) + "</option>")
    .join("");
  if (old && data.holdings.some((h) => h.ticker === old)) s.value = old;
  let p = proposed();
  const recordButton = document.querySelector('button[onclick="record()"]');
  if (!data.holdings.length) {
    document.getElementById("plan").textContent =
      "Load holdings before creating a purchase plan.";
    if (recordButton) recordButton.disabled = true;
  } else {
    document.getElementById("plan").innerHTML =
      "<p>" +
      p.items
        .map(([t, a]) => "Buy " + esc(t) + ": <b>" + money(a) + "</b>")
        .join("<br>") +
      "</p><p>After purchase FXAIX share: " +
      (n.total + p.budget
        ? (100 * (n.fx + p.fx)) / (n.total + p.budget)
        : 0
      ).toFixed(1) +
      "%</p>";
    if (recordButton) recordButton.disabled = false;
  }
  if (full) {
    document.getElementById("holdings").innerHTML = data.holdings
      .map(
        (h, i) =>
          "<tr><td><b>" +
          esc(h.ticker) +
          '</b><span class="stock-name">' +
          (stockNames[h.ticker] ? " · " + esc(stockNames[h.ticker]) : "") +
          "</span></td>" +
          ["value", "shares", "cost", "price"]
            .map(
              (k) =>
                '<td><span class="market-value">' +
                (k === "shares"
                  ? String(h.shares)
                  : k === "cost"
                    ? money(h.cost)
                    : money(h[k])) +
                "</span></td>",
            )
            .join("") +
          "<td>" +
          (n.total ? (100 * h.value) / n.total : 0).toFixed(1) +
          '%</td><td><select onchange="update(' +
          i +
          ",'priority',this.value)\">" +
          ["Now", "Next", "Later", "At limit", "Hold"]
            .map(
              (x) =>
                "<option " +
                (x ===
                (h.target > 0 && h.value >= h.target ? "At limit" : h.priority)
                  ? "selected"
                  : "") +
                ">" +
                x +
                "</option>",
            )
            .join("") +
          '</select><button type="button" class="remove-holding" aria-label="Remove ' +
          esc(h.ticker) +
          ' from holdings" title="Remove ' +
          esc(h.ticker) +
          '" onclick="removeHolding(' +
          i +
          ')">×</button></td></tr>',
      )
      .join("");
    document.getElementById("watch").innerHTML = data.watch
      .map(
        (w, i) =>
          "<tr><td>" +
          esc(w.name) +
          '</td><td><input value="' +
          esc(w.note) +
          '" onchange="data.watch[' +
          i +
          '].note=this.value;save()"></td><td><select onchange="data.watch[' +
          i +
          '].decision=this.value;save()">' +
          ["Later", "Research", "Yes", "No"]
            .map(
              (x) =>
                "<option " +
                (x === w.decision ? "selected" : "") +
                ">" +
                x +
                "</option>",
            )
            .join("") +
          '</select></td><td><button onclick="data.watch.splice(' +
          i +
          ',1);save();render()">Remove</button></td></tr>',
      )
      .join("");
  }
  document.getElementById("priorities").innerHTML =
    data.holdings
      .filter((h) => h.priority === "Now" || h.priority === "Next")
      .map(
        (h) =>
          "<p><b>" +
          esc(h.ticker) +
          "</b> • " +
          esc(h.priority) +
          " • " +
          money(Math.max(0, h.target - h.value)) +
          " to goal</p>",
      )
      .join("") ||
    '<p class="small">Set priorities to Now or Next in the holdings table.</p>';
}
function removeHolding(i) {
  const h = data.holdings[i];
  if (!h) return;
  if (!confirm("Remove " + h.ticker + " from this dashboard?")) return;
  data.holdings.splice(i, 1);
  save();
  render();
}
async function add() {
  let ticker = document.getElementById("newTicker").value.trim().toUpperCase();
  if (
    !/^[A-Z0-9.-]{1,12}$/.test(ticker) ||
    data.holdings.some((h) => h.ticker === ticker)
  )
    return alert("Enter a new valid ticker");
  if (!Object.keys(publishedQuotes).length) {
    try {
      const response = await fetch("./quotes.json?at=" + Date.now(), {
        cache: "no-store",
      });
      if (response.ok) publishedQuotes = (await response.json()).quotes || {};
    } catch {}
  }
  const quote = publishedQuotes[ticker];
  const quoteTime = Date.parse(quote?.asOf || "");
  const price =
    Number.isFinite(quoteTime) && Date.now() - quoteTime <= 36 * 60 * 60 * 1000
      ? Number(quote.price) || 0
      : 0;
  data.holdings.push({
    ticker,
    value: 0,
    shares: 0,
    cost: 0,
    price,
    target: 0,
    priority: "Later",
  });
  save();
  render();
  document.getElementById("newTicker").value = "";
  if (!price)
    alert(
      "Added " +
        ticker +
        ". A quote is not available in the published symbol list yet; import a Fidelity CSV to populate the position.",
    );
}
function addWatch() {
  let name = document.getElementById("watchName").value.trim();
  if (!name) return;
  data.watch.push({
    name,
    note: document.getElementById("watchNote").value,
    decision: "Later",
  });
  save();
  render();
}
function record() {
  let p = proposed(),
    items = p.items;
  for (let [ticker, amount] of items) {
    let h = data.holdings.find((h) => h.ticker === ticker);
    if (!h || !h.price) return alert("Enter current price for " + ticker);
  }
  if (
    !items.length ||
    !confirm(
      "Record these simulated purchases? No brokerage trades will be placed.",
    )
  )
    return;
  for (let [ticker, amount] of items) {
    let h = data.holdings.find((h) => h.ticker === ticker),
      newShares = amount / h.price;
    h.cost = (h.shares * h.cost + amount) / (h.shares + newShares);
    h.shares += newShares;
    h.value += amount;
  }
  save();
  render();
}
function openGoals() {
  let d = data.goal;
  document.getElementById("goalStartBalance").value = d.startBalance || 0;
  document.getElementById("goalWeekly").value = d.weeklyContribution || 100;
  document.getElementById("goalReturn").value = d.annualReturn || 7;
  document.getElementById("goalAmount").value = d.goalAmount || 185000;
  renderGoalTables();
  document.getElementById("goalDialog").showModal();
}
function closeGoals() {
  document.getElementById("goalDialog").close();
}
function saveGoalSettings() {
  data.goal.startBalance =
    +document.getElementById("goalStartBalance").value || 0;
  data.goal.weeklyContribution =
    +document.getElementById("goalWeekly").value || 0;
  data.goal.annualReturn = Math.min(
    50,
    +document.getElementById("goalReturn").value || 0,
  );
  data.goal.goalAmount = +document.getElementById("goalAmount").value || 185000;
  save();
  renderGoalTables();
  render();
}
function setGoalActual(date, value) {
  if (value === "") delete data.goal.actuals[date];
  else data.goal.actuals[date] = Math.max(0, +value || 0);
  save();
  renderGoalTables();
}
function updateTarget(i, key, value) {
  data.holdings[i][key] = Math.max(0, +value || 0);
  save();
  renderGoalTables();
  render();
}
function goalForecast(date) {
  let end = new Date(date + "T00:00:00Z"),
    anchor = new Date(
      (data.goal.startDate || new Date().toISOString().slice(0, 10)) +
        "T00:00:00Z",
    ),
    balance = +data.goal.startBalance || 0;
  for (const [d, v] of Object.entries(data.goal.actuals).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    let day = new Date(d + "T00:00:00Z");
    if (day < end && day >= anchor) {
      anchor = day;
      balance = +v || 0;
    }
  }
  let weeks = Math.max(0, (end - anchor) / 604800000),
    rate = Math.pow(1 + (+data.goal.annualReturn || 0) / 100, 1 / 52) - 1,
    whole = Math.floor(weeks);
  for (let i = 0; i < whole; i++)
    balance = balance * (1 + rate) + (+data.goal.weeklyContribution || 0);
  return balance * Math.pow(1 + rate, weeks - whole);
}
function renderGoalTables() {
  let start = new Date(
      (data.goal.startDate || new Date().toISOString().slice(0, 10)) +
        "T00:00:00Z",
    ),
    stop = new Date("2034-05-30T00:00:00Z"),
    months = [],
    d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
  while (d <= stop) {
    months.push(d.toISOString().slice(0, 10));
    d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 2, 0));
  }
  if (!months.includes("2034-05-30")) months.push("2034-05-30");
  document.getElementById("monthlyGoals").innerHTML = months
    .map((date) => {
      let a = data.goal.actuals[date],
        f = goalForecast(date),
        diff = a == null ? null : +a - f;
      return (
        "<tr><td>" +
        new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }) +
        "</td><td>" +
        money(f) +
        "</td><td><input type='number' min='0' step='0.01' aria-label='Actual " +
        date +
        "' value='" +
        (a ?? "") +
        "' onchange=\"setGoalActual('" +
        date +
        "',this.value)\"></td><td>" +
        (diff == null ? "—" : (diff >= 0 ? "+" : "") + money(diff)) +
        "</td><td>" +
        (diff == null ? "Not entered" : diff >= 0 ? "On track" : "Behind") +
        "</td></tr>"
      );
    })
    .join("");
  let years = [...new Set(months.map((x) => x.slice(0, 4)))];
  document.getElementById("yearlyGoals").innerHTML = years
    .map((y) => {
      let ds = Object.keys(data.goal.actuals)
          .filter((x) => x.startsWith(y) && x <= y + "-12-31")
          .sort(),
        a = ds.length ? data.goal.actuals[ds[ds.length - 1]] : null,
        date = y === "2034" ? "2034-05-30" : y + "-12-31",
        f = goalForecast(date),
        diff = a == null ? null : +a - f;
      return (
        "<tr><td>" +
        (y === "2034" ? "May 30, 2034" : y) +
        "</td><td>" +
        money(f) +
        "</td><td>" +
        (a == null ? "—" : money(a)) +
        "</td><td>" +
        (diff == null ? "—" : (diff >= 0 ? "+" : "") + money(diff)) +
        "</td><td>" +
        (diff == null ? "Not entered" : diff >= 0 ? "On track" : "Behind") +
        "</td></tr>"
      );
    })
    .join("");
  document.getElementById("stockTargets").innerHTML = data.holdings
    .filter((h) => h.ticker !== "FXAIX")
    .map((h) => {
      let i = data.holdings.indexOf(h),
        buy =
          h.shares > 0 &&
          h.price > 0 &&
          h.avgCostTarget > h.price &&
          h.avgCostTarget < h.cost
            ? ((h.shares * (h.cost - h.avgCostTarget)) /
                (h.avgCostTarget - h.price)) *
              h.price
            : 0;
      return (
        "<tr><td>" +
        esc(h.ticker) +
        '</td><td><select onchange="update(' +
        i +
        ",'priority',this.value)\">" +
        ["Now", "Next", "Later", "Hold"]
          .map(
            (x) =>
              "<option " +
              (x === h.priority ? "selected" : "") +
              ">" +
              x +
              "</option>",
          )
          .join("") +
        "</select></td><td><input aria-label='Target value " +
        esc(h.ticker) +
        "' type='number' min='0' value='" +
        (h.target || 0) +
        "' onchange=\"updateTarget(" +
        i +
        ",'target',this.value)\"></td><td>" +
        money(h.value) +
        "</td><td>" +
        money(Math.max(0, h.target - h.value)) +
        "</td><td><input aria-label='Average cost goal " +
        esc(h.ticker) +
        "' type='number' min='0' step='0.01' value='" +
        (h.avgCostTarget || 0) +
        "' onchange=\"updateTarget(" +
        i +
        ",'avgCostTarget',this.value)\"></td><td>" +
        (buy ? money(buy) : "—") +
        "</td></tr>"
      );
    })
    .join("");
}
function backup() {
  let a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
  a.href = url;
  a.download = "mikey-investments.json";
  a.click();
  URL.revokeObjectURL(url);
}
function restore(e) {
  let f = e.target.files[0];
  if (!f) return;
  f.text().then((t) => {
    try {
      let d = JSON.parse(t);
      if (!Array.isArray(d.holdings) || !Array.isArray(d.watch)) throw Error();
      if (confirm("Replace locally saved data?")) {
        data = d;
        if (!data.goal)
          data.goal = {
            startDate: new Date().toISOString().slice(0, 10),
            startBalance: data.holdings.reduce(
              (a, h) => a + (Number(h.value) || 0),
              0,
            ),
            weeklyContribution: 100,
            annualReturn: 7,
            goalAmount: 185000,
            goalDate: "2034-05-30",
            actuals: {},
          };
        if (!data.goal.actuals) data.goal.actuals = {};
        for (const h of data.holdings)
          if (h.avgCostTarget == null) h.avgCostTarget = 0;
        save();
        render();
      }
    } catch {
      alert("Invalid backup");
    }
  });
}

function renderPerformance() {
  const total = data.holdings.reduce((s, h) => s + (Number(h.value) || 0), 0);
  const basis = data.holdings.reduce(
    (s, h) => s + (Number(h.shares) || 0) * (Number(h.cost) || 0),
    0,
  );
  const gain = total - basis,
    pct = basis ? (100 * gain) / basis : 0,
    todayAvailable = data.holdings.some((h) => Number(h.previousClose) > 0),
    today = data.holdings.reduce(
      (sum, h) =>
        sum +
        (Number(h.previousClose) > 0
          ? (Number(h.shares) || 0) *
            ((Number(h.price) || 0) - Number(h.previousClose))
          : 0),
      0,
    );
  const cards = document.querySelector(".cards");
  if (!document.getElementById("basisCard")) {
    cards.insertAdjacentHTML(
      "beforeend",
      '<section class="card" id="basisCard"><div>Total cost basis</div><div class="number" id="basisTotal"></div><div class="metric-note">Shares × average cost</div></section><section class="card"><div>Total unrealized gain / loss</div><div class="number" id="gainTotal"></div><div class="metric-note" id="gainPct"></div></section><section class="card"><div>Today\'s gain / loss</div><div class="number muted" id="todayTotal">—</div><div class="metric-note" id="todayNote">Previous close data not connected</div></section>',
    );
  }
  document.getElementById("basisTotal").textContent = money(basis);
  const todayEl = document.getElementById("todayTotal"),
    todayNote = document.getElementById("todayNote");
  todayEl.textContent = todayAvailable
    ? (today >= 0 ? "+" : "") + money(today)
    : "—";
  todayEl.className =
    "number " +
    (todayAvailable ? (today >= 0 ? "positive" : "negative") : "muted");
  todayNote.textContent = todayAvailable
    ? "Based on available previous-close quotes"
    : "Previous close data not connected";
  const g = document.getElementById("gainTotal");
  g.textContent = (gain >= 0 ? "+" : "") + money(gain);
  g.className = "number " + (gain >= 0 ? "positive" : "negative");
  document.getElementById("gainPct").textContent =
    (pct >= 0 ? "+" : "") + pct.toFixed(2) + "% total unrealized return";
  document.getElementById("goaltext").textContent =
    ((100 * total) / (Number(data.goal.goalAmount) || 185000)).toFixed(1) +
    "% complete";
  document.getElementById("goalfill").style.width =
    Math.min(100, (100 * total) / (Number(data.goal.goalAmount) || 185000)) +
    "%";
  const table = document.querySelector("#holdings").closest("table");
  const tr = table.querySelector("thead tr");
  if (!tr.dataset.extended) {
    tr.insertAdjacentHTML(
      "beforeend",
      "<th>Basis</th><th>Gain/Loss</th><th>Return</th><th>Today</th>",
    );
    const headerCells = [...tr.cells];
    [0, 1, 10, 8, 9, 7, 2, 3, 4, 5, 6].forEach((i) =>
      tr.appendChild(headerCells[i]),
    );
    const labels = [
        "Ticker",
        "Value",
        "Today",
        "Gain/Loss",
        "Return",
        "Basis",
        "Shares",
        "Avg Cost",
        "Price",
        "Weight",
        "",
      ],
      details = [
        "Stock symbol",
        "Current holding value in dollars",
        "Today’s change in holding value in dollars",
        "Unrealized gain or loss in dollars",
        "Total return as a percentage",
        "Cost basis in dollars",
        "Number of shares",
        "Average cost per share in dollars",
        "Last price in dollars",
        "Portfolio allocation percentage",
        "Priority and removal actions",
      ];
    [...tr.cells].forEach((cell, i) => {
      cell.textContent = labels[i];
      cell.title = labels[i] ? details[i] : "";
      cell.setAttribute("aria-label", details[i]);
    });
    tr.dataset.extended = "1";
  }
  [...table.querySelectorAll("tbody tr")].forEach((row, i) => {
    const hold = data.holdings[i];
    if (!hold) return;
    const b = (Number(hold.shares) || 0) * (Number(hold.cost) || 0),
      v = Number(hold.value) || 0,
      g = v - b,
      p = b ? (100 * g) / b : 0,
      w = total ? (100 * v) / total : 0;
    const cells = row.querySelectorAll("td");
    while (row.cells.length > 7) row.deleteCell(-1);
    row.insertAdjacentHTML(
      "beforeend",
      "<td>" +
        money(b) +
        '</td><td class="' +
        (g >= 0 ? "positive" : "negative") +
        '">' +
        (g >= 0 ? "+" : "") +
        money(g) +
        '</td><td class="' +
        (p >= 0 ? "positive" : "negative") +
        '">' +
        (p >= 0 ? "+" : "") +
        p.toFixed(1) +
        '%</td><td class="' +
        (Number(hold.previousClose) > 0
          ? hold.price >= hold.previousClose
            ? "positive"
            : "negative"
          : "muted") +
        '">' +
        (Number(hold.previousClose) > 0
          ? (hold.price >= hold.previousClose ? "+" : "") +
            money(hold.shares * (hold.price - hold.previousClose))
          : "—") +
        "</td>",
    );
    const rowCells = [...row.cells];
    [0, 1, 10, 8, 9, 7, 2, 3, 4, 5, 6].forEach((i) =>
      row.appendChild(rowCells[i]),
    );
  });
}
// All market quotes are read from a published, timestamped snapshot.
// User-entered shares, average cost, watchlist and priorities are never replaced.
let publishedQuotes = {};
async function loadPublishedQuotes() {
  const response = await fetch("./quotes.json?at=" + Date.now(), {
    cache: "no-store",
  });
  if (!response.ok)
    throw Error("Quote snapshot unavailable (HTTP " + response.status + ")");
  const payload = await response.json();
  if (!payload || typeof payload.quotes !== "object" || !payload.updatedAt)
    throw Error("Invalid quote snapshot");
  const updated = Date.parse(payload.updatedAt);
  if (!Number.isFinite(updated)) throw Error("Invalid quote timestamp");
  publishedQuotes = payload.quotes;
  let changed = 0,
    stale = 0,
    missing = 0;
  for (const holding of data.holdings) {
    const quote = payload.quotes[holding.ticker];
    if (!quote) {
      missing++;
      continue;
    }
    const price = Number(quote.price),
      quoteTime = Date.parse(quote.asOf || payload.updatedAt);
    if (!Number.isFinite(price) || price <= 0) continue;
    if (
      !Number.isFinite(quoteTime) ||
      Date.now() - quoteTime > 36 * 60 * 60 * 1000
    ) {
      stale++;
      continue;
    }
    holding.price = price;
    holding.value = Number((Number(holding.shares || 0) * price).toFixed(4));
    const previous = Number(quote.previousClose);
    holding.previousClose =
      Number.isFinite(previous) && previous > 0 ? previous : null;
    holding.quoteTime = quote.asOf || payload.updatedAt;
    holding.quoteSource = quote.source || "Published quote snapshot";
    changed++;
  }
  if (changed) {
    data.lastMarketRefresh = payload.updatedAt;
    save();
    render();
  }
  return {
    changed,
    total: data.holdings.length,
    stale,
    missing,
    updatedAt: payload.updatedAt,
  };
}
let refreshInProgress = false;
async function refreshDashboardAndSite() {
  if (refreshInProgress) return;
  refreshInProgress = true;
  const button = document.getElementById("refreshBtn");
  const status = document.getElementById("refreshStatus");
  const show = (message) => {
    if (status) status.textContent = message;
  };
  if (button) button.disabled = true;
  try {
    show("Checking published dashboard version…");
    let versionCheckError = null;
    try {
      // Fetch the actual published HTML, not a manifest that can lag behind deployment.
      const response = await fetch("./?dashboard_check=" + Date.now(), {
        cache: "no-store",
      });
      if (!response.ok) throw Error("HTML HTTP " + response.status);
      const html = await response.text();
      const publishedBuild = html.match(
        /<meta\s+name=["']dashboard-build["']\s+content=["']([^"']+)["']/i,
      )?.[1];
      if (!publishedBuild) throw Error("Published HTML has no build marker");
      const current = document.querySelector(
        'meta[name="dashboard-build"]',
      )?.content;
      if (current !== publishedBuild) {
        show("New dashboard version available. Loading latest dashboard…");
        const url = new URL(location.href);
        url.searchParams.set("dashboard_build", publishedBuild);
        location.replace(url.href);
        return;
      }
    } catch (e) {
      versionCheckError = "Dashboard version check failed: " + e.message;
    }
    show("Checking published price snapshot…");
    try {
      const q = await loadPublishedQuotes();
      const stale = Date.now() - Date.parse(q.updatedAt) > 36 * 60 * 60 * 1000;
      show(
        (versionCheckError ? versionCheckError + "; " : "") +
          "Yahoo Finance snapshot updated " +
          new Date(q.updatedAt).toLocaleString() +
          " · may be delayed" +
          (stale || q.stale ? " · some quotes may be stale" : "") +
          (q.missing ? " · no quote for " + q.missing + " holdings" : ""),
      );
    } catch (e) {
      show(
        (versionCheckError ? versionCheckError + "; " : "") +
          "Price snapshot unavailable: " +
          e.message +
          ". Saved investment data is unchanged.",
      );
    }
  } finally {
    refreshInProgress = false;
    if (button) button.disabled = false;
  }
}
const originalRender = render;
render = function (full = true) {
  originalRender(full);
  renderPerformance();
};
try {
  render();
  if (loadWarning) {
    const notice = document.createElement("div");
    notice.setAttribute("role", "alert");
    notice.style.cssText =
      "background:#fff3cd;color:#6c4d00;padding:14px;border-radius:9px;margin:10px 0";
    notice.textContent = loadWarning;
    document.querySelector(".cards").before(notice);
  }
} catch (error) {
  const notice = document.createElement("div");
  notice.setAttribute("role", "alert");
  notice.style.cssText =
    "background:#fff0f0;color:#a12222;padding:16px;border-radius:9px;margin:12px 0";
  notice.textContent =
    "Dashboard rendering error: " +
    (error && error.message ? error.message : String(error)) +
    ". Your saved browser data has not been cleared.";
  document.querySelector(".cards").before(notice);
  console.error("Dashboard initialization failed", error);
}

// Read a Fidelity positions export locally. Only normalized positions are saved;
// the CSV file and account identifiers are never uploaded or retained.
function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => String(v).trim()));
}
function csvNumber(value) {
  let s = String(value ?? "").trim();
  if (!s || s === "—" || s === "-") return 0;
  const negative = /^\(.*\)$/.test(s);
  s = s.replace(/[,$%()\s]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : 0;
}
async function importFidelityCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const rows = parseCsv(await file.text());
    if (rows.length < 2) throw Error("The file has no position rows.");
    const norm = (s) =>
      String(s)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
    const headerIndex = rows.findIndex((r) => {
      const names = r.map(norm);
      return names.includes("symbol") && names.includes("quantity");
    });
    if (headerIndex < 0) throw Error("Could not find a positions header row.");
    const headers = rows[headerIndex].map(norm),
      find = (...names) => headers.findIndex((h) => names.includes(h));
    const si = find("symbol", "ticker"),
      qi = find("quantity", "shares"),
      pi = find("lastprice", "price"),
      vi = find("currentvalue", "marketvalue"),
      bi = find("costbasistotal", "totalcostbasis", "costbasis");
    if (si < 0 || qi < 0)
      throw Error("Could not find Symbol and Quantity columns.");
    const grouped = new Map();
    for (const row of rows.slice(headerIndex + 1)) {
      const ticker = String(row[si] || "")
        .trim()
        .toUpperCase();
      if (!/^[A-Z0-9.-]{1,12}$/.test(ticker)) continue;
      const shares = csvNumber(row[qi]),
        price = pi >= 0 ? csvNumber(row[pi]) : 0,
        value = vi >= 0 ? csvNumber(row[vi]) : shares * price,
        basis = bi >= 0 ? csvNumber(row[bi]) : 0;
      if (!shares && !value) continue;
      const h = grouped.get(ticker) || {
        ticker,
        shares: 0,
        value: 0,
        basis: 0,
        price: 0,
      };
      h.shares += shares;
      h.value += value;
      h.basis += basis;
      h.price = price || h.price;
      grouped.set(ticker, h);
    }
    if (!grouped.size)
      throw Error("No stock or fund positions were found in the file.");
    if (
      !confirm(
        "Replace this browser's holdings with " +
          grouped.size +
          " positions from the Fidelity CSV? Goal settings, priorities, and research notes will be kept. Export a JSON backup first if you want to keep the current holdings.",
      )
    )
      return;
    const prior = new Map(data.holdings.map((h) => [h.ticker, h]));
    data.holdings = [...grouped.values()].map((h) => {
      const old = prior.get(h.ticker) || {};
      return {
        ...h,
        cost: h.shares && h.basis ? h.basis / h.shares : old.cost || 0,
        target: old.target || 0,
        avgCostTarget: old.avgCostTarget || 0,
        priority: old.priority || "Later",
        previousClose: old.previousClose || null,
      };
    });
    if (
      !data.goal.startBalance &&
      !Object.keys(data.goal.actuals || {}).length
    ) {
      data.goal.startBalance = data.holdings.reduce(
        (sum, h) => sum + h.value,
        0,
      );
      data.goal.startDate = new Date().toISOString().slice(0, 10);
    }
    data.accountImportAt = new Date().toISOString();
    data.accountImportSource = "Fidelity CSV";
    save();
    render();
    alert(
      "Imported " +
        data.holdings.length +
        " positions. The CSV was read in this browser and was not uploaded.",
    );
  } catch (error) {
    alert("Fidelity CSV import failed: " + error.message);
  } finally {
    event.target.value = "";
  }
}
