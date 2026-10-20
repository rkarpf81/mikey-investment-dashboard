function easterSundayUTC(year) {
  const a = year % 19,
    b = Math.floor(year / 100),
    c = year % 100,
    d = Math.floor(b / 4),
    e = b % 4,
    f = Math.floor((b + 8) / 25),
    g = Math.floor((b - f + 1) / 3),
    h = (19 * a + b - d - g + 15) % 30,
    i = Math.floor(c / 4),
    k = c % 4,
    l = (32 + 2 * e + 2 * i - h - k) % 7,
    m = Math.floor((a + 11 * h + 22 * l) / 451),
    month = Math.floor((h + l - 7 * m + 114) / 31),
    day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}
function nthWeekdayUTC(year, month, weekday, n) {
  const d = new Date(Date.UTC(year, month, 1));
  return 1 + ((weekday - d.getUTCDay() + 7) % 7) + 7 * (n - 1);
}
function lastWeekdayUTC(year, month, weekday) {
  const d = new Date(Date.UTC(year, month + 1, 0));
  return d.getUTCDate() - ((d.getUTCDay() - weekday + 7) % 7);
}
function nyseHolidayMap(year) {
  const map = new Map(),
    add = (d, name) => map.set(d.toISOString().slice(0, 10), name),
    observed = (m, day, name) => {
      const d = new Date(Date.UTC(year, m - 1, day));
      if (d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() - 1);
      else if (d.getUTCDay() === 0) d.setUTCDate(d.getUTCDate() + 1);
      add(d, name);
    };
  observed(1, 1, "New Year's Day");
  const nextNewYear = new Date(Date.UTC(year + 1, 0, 1));
  if (nextNewYear.getUTCDay() === 6)
    add(new Date(Date.UTC(year, 11, 31)), "New Year's Day");
  observed(6, 19, "Juneteenth");
  observed(7, 4, "Independence Day");
  observed(12, 25, "Christmas Day");
  for (const [m, n, label] of [
    [1, 3, "Martin Luther King Jr. Day"],
    [2, 3, "Washington's Birthday"],
    [9, 1, "Labor Day"],
    [11, 4, "Thanksgiving Day"],
  ])
    add(
      new Date(
        Date.UTC(year, m - 1, nthWeekdayUTC(year, m - 1, m === 11 ? 4 : 1, n)),
      ),
      label,
    );
  add(new Date(Date.UTC(year, 4, lastWeekdayUTC(year, 4, 1))), "Memorial Day");
  const easter = easterSundayUTC(year);
  easter.setUTCDate(easter.getUTCDate() - 2);
  add(easter, "Good Friday");
  return map;
}
function etParts(date) {
  const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date),
    out = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}
function earlyCloseMap(year) {
  const map = new Map(),
    set = (d, label) => {
      const key = d.toISOString().slice(0, 10);
      if (!nyseHolidayMap(year).has(key)) map.set(key, label);
    },
    previousWeekday = (d) => {
      const x = new Date(d);
      do {
        x.setUTCDate(x.getUTCDate() - 1);
      } while (x.getUTCDay() === 0 || x.getUTCDay() === 6);
      return x;
    };
  const thanksgiving = new Date(
    Date.UTC(year, 10, nthWeekdayUTC(year, 10, 4, 4)),
  );
  const friday = new Date(thanksgiving);
  friday.setUTCDate(friday.getUTCDate() + 1);
  set(friday, "Day after Thanksgiving");
  set(
    previousWeekday(new Date(Date.UTC(year, 6, 4))),
    "Before Independence Day",
  );
  set(previousWeekday(new Date(Date.UTC(year, 11, 25))), "Christmas Eve");
  return map;
}
function renderMarketStatus(now = new Date()) {
  const el = document.getElementById("marketStatus");
  if (!el) return;
  const p = etParts(now),
    ymd = p.year + "-" + p.month + "-" + p.day,
    minute = +p.hour * 60 + +p.minute,
    weekday = p.weekday,
    holiday = nyseHolidayMap(+p.year).get(ymd),
    earlyClose = earlyCloseMap(+p.year).has(ymd),
    closeAt = earlyClose ? 13 * 60 : 16 * 60,
    isTradingDay = weekday !== "Sat" && weekday !== "Sun" && !holiday,
    isOpen = isTradingDay && minute >= 570 && minute < closeAt;
  let title, detail;
  if (isOpen) {
    title = "Market is open";
    detail =
      "Regular session: 9:30 AM–" + (earlyClose ? "1:00" : "4:00") + " PM ET";
  } else if (holiday) {
    title = "Market is closed";
    detail = holiday + " · Regular hours are 9:30 AM–4:00 PM ET";
  } else if (weekday === "Sat" || weekday === "Sun") {
    title = "Market is closed";
    detail = "Weekend · Regular hours are 9:30 AM–4:00 PM ET";
  } else if (earlyClose && minute >= closeAt) {
    title = "Market is closed";
    detail =
      "Early close today at 1:00 PM ET · Regular hours are 9:30 AM–4:00 PM ET";
  } else if (minute < 570) {
    title = "Market is closed";
    detail =
      "Opens today at 9:30 AM ET · Closes at " +
      (earlyClose ? "1:00" : "4:00") +
      " PM ET";
  } else {
    title = "Market is closed";
    detail = "Closed for today · Regular hours are 9:30 AM–4:00 PM ET";
  }
  el.classList.toggle("is-open", isOpen);
  el.classList.toggle("is-closed", !isOpen);
  el.innerHTML =
    '<span class="market-dot" aria-hidden="true"></span><strong>' +
    title +
    '</strong><span class="market-hours">' +
    detail +
    "</span>";
}
if (new URLSearchParams(location.search).has("dashboard_build")) {
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete("dashboard_build");
  history.replaceState(
    history.state,
    "",
    cleanUrl.pathname + cleanUrl.search + cleanUrl.hash,
  );
}
window.renderMarketStatus = renderMarketStatus;
renderMarketStatus();
setInterval(() => renderMarketStatus(), 60000);
