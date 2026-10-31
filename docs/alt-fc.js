// Alternatives for sections 1, 2 and 5 of the dk-forecast page, made by projects-b4 on 30 Oct 2026 for Bo to choose from.
// Uses $, el, tipOn, tipOff, W, ENERGY, mode, v and bars() from the page script, and d3 for axis ticks.

const PK = {storm: "a", s1: "c", s2: "b", s3: "c", s4: "b", s5: "b", p5: "d"};
const OP = {
  storm: [["cur", "Now", "the coloured particle map"], ["a", "A", "the anatomy track map, greyscale wind, IFS against DKcast at the stations"],
    ["b", "B", "Denmark only, greyscale wind, each station marked by whether DKcast or IFS was closer"]],
  s3: [["cur", "Now", "four numbered steps"], ["a", "A", "a fixed diagram: public models in, DKcast learns against the stations, forecast with range out"],
    ["b", "B", "the steps plus one storm day at a station you pick: IFS, DKcast and the measurements"], ["c", "C", "a timeline of learn, test once and live, then the steps"]],
  s4: [["cur", "Now", "the static figure"], ["a", "A", "an interactive chart with J4catDK's switch-off stage next to my first model"],
    ["b", "B", "two aligned panels: the station wind was right, the power was wrong"]],
  p5: [["cur", "Now", "text only"], ["a", "A", "tomorrow near four cities, a small table"], ["b", "B", "a small map of tomorrow's highs"], ["c", "C", "tomorrow's temperature and sun for one place you pick"], ["d", "D", "a phone weather widget for Aarhus"]],
  s1: [["cur", "Now", "bars from zero, one variable at a time"], ["a", "A", "skill bars: how much less error DKcast has than each model"],
    ["b", "B", "dot plot: the public models as one pack, DKcast outside it"], ["c", "C", "every variable on one chart, each against its best public forecast"]],
  s2: [["cur", "Now", "seven tiles"], ["a", "A", "a table: variables down, yr.no and DMI across"],
    ["b", "B", "dumbbells: DKcast, yr.no and DMI on each variable's own scale"], ["c", "C", "two scorecards, one per competitor"]],
  s5: [["cur", "Now", "the small line chart"], ["a", "A", "a bigger chart with axes, a now line and today's score so far"], ["b", "B", "today's ranking so far, with a sparkline"]]
};
const GN = {storm: "Storm map", s1: "Section 1 chart", s2: "Section 2 numbers", s3: "Section 3", s4: "Section 4", s5: "Section 5 live chart", p5: "Section 5 DKcast preview"};
const VARS = [["wind", "Wind speed"], ["temp", "Temperature"], ["sun", "Sunshine"], ["rain", "Rain"]];
const isMe = r => r.ours || r.name == "DKcast";
const meName = r => r.name == "DKcast" ? "DKcast" : "My power model";
const fmtv = (x, u) => u == "Brier" ? x.toFixed(4) : x.toFixed(u == "min/h" ? 1 : 2);
const unitTxt = u => u == "Brier" ? "Brier score" : u;
const narrow = node => node.parentNode.clientWidth < 560;
function hoverRow(S, x, y, w, h, html) {
  const r = el("rect", {x, y, width: w, height: h, fill: "transparent"}, S);
  r.addEventListener("pointermove", e => tipOn(e, html)); r.addEventListener("pointerleave", tipOff);
}

// ---------- section 1, A: skill bars ----------
function s1A() {
  const S = $("#s1A"); S.innerHTML = ""; if (!W) return;
  const d = mode == "energy" ? ENERGY : W[v], me = d.rows.find(isMe), u = d.unit;
  const rows = d.rows.filter(r => !isMe(r)).map(r => ({...r, sk: 100 * (1 - me.val / r.val)})).sort((a, b) => a.sk - b.sk);
  const sm = narrow(S), VW = sm ? 380 : 640, L = sm ? 150 : 214, R = VW - 46, h = 28, top = 34, H = top + rows.length * h + 22;
  const mx = Math.max(5, Math.ceil(Math.max(...rows.map(r => r.sk)) / 5) * 5), x = s => L + (R - L) * Math.max(0, s) / mx;
  S.setAttribute("viewBox", `0 0 ${VW} ${H}`);
  el("text", {x: sm ? 4 : L, y: 14, "font-size": sm ? 11.5 : 13, fill: "#1a1d21", "font-weight": 600}, S, `How much less error ${meName(me)} has than each model`);
  for (let s = 0; s <= mx; s += mx > 25 ? 10 : 5) {
    el("line", {x1: x(s), x2: x(s), y1: top - 6, y2: H - 18, stroke: "#eceae6"}, S);
    el("text", {x: x(s), y: H - 4, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S, s + "%");
  }
  rows.forEach((r, i) => {
    const y = top + i * h, ref = r.name == "ECMWF IFS";
    el("text", {x: L - 10, y: y + 15, "font-size": sm ? 12 : 14, "text-anchor": "end", fill: "#1a1d21", "font-weight": ref ? 600 : 400}, S, r.name);
    el("rect", {x: L, y: y + 2, width: Math.max(1, x(r.sk) - L), height: 18, rx: 4, fill: ref ? "var(--ref)" : "var(--bar)"}, S);
    el("text", {x: x(r.sk) + 6, y: y + 16, "font-size": sm ? 11.5 : 13, fill: "#1a1d21", "font-family": "IBM Plex Mono"}, S, r.sk.toFixed(0) + "%");
    hoverRow(S, 0, y, VW, h, `${r.name}: ${fmtv(r.val, u)} ${unitTxt(u)}<br>${meName(me)}: ${fmtv(me.val, u)} ${unitTxt(u)}<br>${r.sk.toFixed(1)}% less error`);
  });
}

// ---------- section 1, B: dot plot with the pack ----------
function s1B() {
  const S = $("#s1B"); S.innerHTML = ""; if (!W) return;
  const d = mode == "energy" ? ENERGY : W[v], rows = [...d.rows].sort((a, b) => a.val - b.val), u = d.unit, me = rows.find(isMe);
  const pub = rows.filter(r => !isMe(r)), best = pub[0], worst = pub[pub.length - 1];
  const sm = narrow(S), VW = sm ? 380 : 640, L = sm ? 150 : 214, R = VW - (sm ? 46 : 64), h = 26, top = 44, H = top + rows.length * h + 44;
  const span = worst.val - me.val, x = d3.scaleLinear().domain([me.val - span * .12, worst.val + span * .06]).nice().range([L, R]);
  const yc = i => top + i * h + 10;
  S.setAttribute("viewBox", `0 0 ${VW} ${H}`);
  const i0 = rows.indexOf(best), i1 = rows.indexOf(worst);
  el("rect", {x: x(best.val) - 9, y: yc(i0) - 13, width: x(worst.val) - x(best.val) + 18, height: yc(i1) - yc(i0) + 26, rx: 10, fill: "#eef2f6"}, S);
  el("text", {x: x(worst.val) + 9, y: yc(i1) + 30, "text-anchor": "end", "font-size": 12, fill: "#5b6470"}, S,
    `the public models: ${fmtv(best.val, u)} to ${fmtv(worst.val, u)} ${u == "Brier" ? "" : u}`);
  for (const t of x.ticks(5)) {
    el("line", {x1: x(t), x2: x(t), y1: top - 4, y2: H - 28, stroke: "#eceae6"}, S);
    el("text", {x: x(t), y: H - 4, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S, u == "Brier" ? t.toFixed(3) : String(+t.toFixed(2)));
  }
  const sk = 100 * (1 - me.val / best.val), im = rows.indexOf(me);
  el("line", {x1: x(me.val) + 9, x2: x(best.val) - 9, y1: yc(im), y2: yc(im), stroke: "#c2410c", "stroke-dasharray": "4 3", "stroke-width": 1.5}, S);
  el("text", {x: sm ? 4 : x(me.val), y: yc(im) - 16, "font-size": sm ? 11.5 : 13, fill: "#c2410c", "font-weight": 600}, S, `${sk.toFixed(0)}% less error than the best public model`);
  rows.forEach((r, i) => {
    const y = yc(i), mine = isMe(r), ref = r.name == "ECMWF IFS";
    el("text", {x: L - 12, y: y + 5, "font-size": sm ? 12 : 14, "text-anchor": "end", fill: "#1a1d21", "font-weight": mine || ref ? 600 : 400}, S, r.name);
    el("circle", {cx: x(r.val), cy: y, r: mine ? 8 : 6, fill: mine ? "#c2410c" : ref ? "#2a78d6" : "#8b95a1", stroke: "#fff", "stroke-width": 1.5}, S);
    hoverRow(S, 0, y - h / 2, VW, h, `${r.name}: ${fmtv(r.val, u)} ${unitTxt(u)}` + (mine ? "" : `<br>${meName(me)} has ${(100 * (1 - me.val / r.val)).toFixed(1)}% less error`));
  });
}

// ---------- section 1, C: every variable against its best public forecast ----------
function s1C() {
  const S = $("#s1C"); S.innerHTML = ""; if (!W) return;
  const specs = VARS.map(([k, nm]) => ({nm, d: W[k]})).concat([{nm: "Wind power", d: ENERGY}]);
  const sm = narrow(S), VW = sm ? 380 : 640, L = sm ? 96 : 150, R = VW - (sm ? 68 : 76), h = 56, top = 50, lo = .8, hi = 1.45;
  const H = top + specs.length * h + 34, x = q => L + (Math.min(hi, Math.max(lo, q)) - lo) / (hi - lo) * (R - L);
  S.setAttribute("viewBox", `0 0 ${VW} ${H}`);
  el("text", {x: sm ? 4 : L, y: 14, "font-size": sm ? 11.5 : 13, "font-weight": 600, fill: "#1a1d21"}, S, "Error, as a % of the best public forecast's error");
  el("text", {x: sm ? 4 : L, y: 31, "font-size": 11.5, fill: "#5b6470"}, S, "left of the dashed line means better than every public model");
  for (let q = .8; q <= 1.401; q += .1) {
    el("line", {x1: x(q), x2: x(q), y1: top - 8, y2: H - 26, stroke: "#eceae6"}, S);
    el("text", {x: x(q), y: H - 10, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S, Math.round(q * 100) + "%");
  }
  el("line", {x1: x(1), x2: x(1), y1: top - 8, y2: H - 26, stroke: "#1a1d21", "stroke-dasharray": "4 3"}, S);
  const sk = [];
  specs.forEach((sp, i) => {
    const d = sp.d, u = d.unit, yc = top + i * h + h / 2 - 4, me = d.rows.find(isMe);
    const ref = d.rows.filter(r => !isMe(r) && !/my first model/.test(r.name)).sort((a, b) => a.val - b.val)[0];
    el("text", {x: L - 14, y: yc - 1, "font-size": sm ? 12.5 : 14, "font-weight": 600, "text-anchor": "end", fill: "#1a1d21"}, S, sp.nm);
    el("text", {x: L - 14, y: yc + 14, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, u == "Brier" ? "Brier score" : u == "% of capacity" ? "% of capacity" : "RMSE, " + u);
    el("line", {x1: L, x2: R, y1: yc, y2: yc, stroke: "#e2e0dc"}, S);
    d.rows.filter(r => !isMe(r)).forEach(r => {
      const q = r.val / ref.val, mine = /my first model/.test(r.name), c = el("circle", {cx: x(q), cy: yc, r: 5.5,
        fill: mine ? "#fff" : r.name == "ECMWF IFS" ? "#2a78d6" : "#8b95a1", stroke: mine ? "#c2410c" : "#fff", "stroke-width": mine ? 2 : 1, opacity: .9}, S);
      c.addEventListener("pointermove", e => tipOn(e, `${r.name}: ${fmtv(r.val, u)} ${unitTxt(u)}<br>${(q * 100).toFixed(0)}% of ${ref.name}'s error${q > hi ? " (off the scale)" : ""}`));
      c.addEventListener("pointerleave", tipOff);
    });
    const qm = me.val / ref.val, s = Math.round(100 * (1 - qm)); sk.push(s);
    const m = el("circle", {cx: x(qm), cy: yc, r: 8, fill: "#c2410c", stroke: "#fff", "stroke-width": 1.5}, S);
    m.addEventListener("pointermove", e => tipOn(e, `${meName(me)}: ${fmtv(me.val, u)} ${unitTxt(u)}<br>best public, ${ref.name}: ${fmtv(ref.val, u)}<br>${(100 * (1 - qm)).toFixed(1)}% less error`));
    m.addEventListener("pointerleave", tipOff);
    el("text", {x: R + 10, y: yc + 5, "font-size": sm ? 12 : 13.5, "font-weight": 600, fill: "#c2410c"}, S, `${s}% less`);
  });
  const w = sk.slice(0, 4), en = ENERGY.rows.find(r => r.name == "Energinet day-ahead"), mp = ENERGY.rows.find(isMe);
  $("#s1Cans").innerHTML = `DKcast was <b>${Math.min(...w)} to ${Math.max(...w)}% better than the best public model</b> on all four variables (less error on wind, temperature and sunshine; better at calling rain or no rain), and my power ` +
    `model fed by it had ${Math.round(100 * (1 - mp.val / en.val))}% less than Energinet's day-ahead forecast.`;
  $("#s1Ccap").textContent = "Each row is one variable. The dashed line is the best public forecast for that variable, set to 100%; grey dots are the other " +
    "public models, the blue one is ECMWF IFS and the orange one is DKcast, all scored on the same hours from 1 January to 18 October 2026. " +
    "In the wind power row the hollow dot is my first power model, the 4-model average. Hover a dot for its exact error.";
}

// ---------- section 2 helpers ----------
const errOf = (vk, who) => { const r = W[vk].rows.find(x => x.name == who); return r ? r.val : null; };
const pctLess = (vk, who) => { const a = errOf(vk, "DKcast"), b = errOf(vk, who); return b == null ? null : Math.round(100 * (1 - a / b)); };
const COMP = [["yr.no (MET Nordic)", "yr.no", "MET Norway's 1 km forecast, as issued on yr.no"], ["DMI HARMONIE", "DMI", "DMI's own HARMONIE model"]];
const rawTxt = (vk, who) => { const u = W[vk].unit; return `DKcast ${fmtv(errOf(vk, "DKcast"), u)} against ${fmtv(errOf(vk, who), u)} ${unitTxt(u)}`; };

// ---------- section 2, A: table ----------
function s2A() {
  if (!W) return;
  const cell = (vk, c) => { const p = pctLess(vk, c[0]);
    if (p == null) return `<td><span class="none">${c[1]} publishes no ${vk == "sun" ? "sunshine " : ""}forecast</span></td>`;
    return `<td data-h="${rawTxt(vk, c[0])}"><div class="pct">${p}%<span>less error</span></div><div class="bar"><i style="width:${(p / 35 * 100).toFixed(0)}%"></i></div>` +
      `<div class="raw">${fmtv(errOf(vk, "DKcast"), W[vk].unit)} against ${fmtv(errOf(vk, c[0]), W[vk].unit)}</div></td>`; };
  $("#s2A").innerHTML = `<table class="mx"><thead><tr><th></th>${COMP.map(c => `<th>Against ${c[1]}<small>${c[2]}</small></th>`).join("")}</tr></thead><tbody>` +
    VARS.map(([vk, nm]) => `<tr><th>${nm}<small>${W[vk].unit == "Brier" ? "Brier score" : "RMSE, " + W[vk].unit}</small></th>${COMP.map(c => cell(vk, c)).join("")}</tr>`).join("") +
    `</tbody></table>`;
}

// ---------- section 2, B: dumbbells ----------
function s2B() {
  const S = $("#s2B"); S.innerHTML = ""; if (!W) return;
  const sm = narrow(S), VW = sm ? 380 : 640, L = sm ? 92 : 140, R = VW - (sm ? 92 : 168), h = 64, top = 36, H = top + VARS.length * h;
  S.setAttribute("viewBox", `0 0 ${VW} ${H}`);
  const C = {DKcast: "#c2410c", "yr.no (MET Nordic)": "#0f766e", "DMI HARMONIE": "#475569"}, SH = {DKcast: "DKcast", "yr.no (MET Nordic)": "yr.no", "DMI HARMONIE": "DMI"};
  [["DKcast", "DKcast"], ["yr.no (MET Nordic)", "yr.no"], ["DMI HARMONIE", "DMI HARMONIE"]].forEach(([k, nm], j) => {
    el("circle", {cx: L + j * (sm ? 80 : 110) + 6, cy: 12, r: 6, fill: C[k]}, S);
    el("text", {x: L + j * (sm ? 80 : 110) + 16, y: 16, "font-size": 12, fill: "#1a1d21"}, S, nm);
  });
  VARS.forEach(([vk, nm], i) => {
    const u = W[vk].unit, yc = top + i * h + 30, who = Object.keys(C).filter(k => errOf(vk, k) != null), vals = who.map(k => errOf(vk, k));
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = (hi - lo) * .15, x = q => L + (q - lo + pad) / (hi - lo + 2 * pad) * (R - L);
    el("text", {x: L - 14, y: yc - 1, "font-size": sm ? 12.5 : 14, "font-weight": 600, "text-anchor": "end", fill: "#1a1d21"}, S, nm);
    el("text", {x: L - 14, y: yc + 14, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, u == "Brier" ? "Brier score" : "RMSE, " + u);
    el("line", {x1: x(lo), x2: x(hi), y1: yc, y2: yc, stroke: "#d7dbe0", "stroke-width": 4, "stroke-linecap": "round"}, S);
    who.forEach(k => {
      const q = errOf(vk, k), below = k == "DMI HARMONIE";
      const c = el("circle", {cx: x(q), cy: yc, r: k == "DKcast" ? 8 : 6.5, fill: C[k], stroke: "#fff", "stroke-width": 1.5}, S);
      c.addEventListener("pointermove", e => tipOn(e, `${k} on ${nm.toLowerCase()}: ${fmtv(q, u)} ${unitTxt(u)}`)); c.addEventListener("pointerleave", tipOff);
      el("text", {x: x(q), y: below ? yc + 24 : yc - 13, "font-size": 11.5, "text-anchor": "middle", fill: C[k], "font-family": "IBM Plex Mono"}, S, fmtv(q, u));
    });
    COMP.forEach((c, j) => { const p = pctLess(vk, c[0]);
      el("text", {x: R + 18, y: yc - 4 + j * 17, "font-size": sm ? 11 : 12.5, fill: p == null ? "#8b95a1" : "#c2410c", "font-weight": p == null ? 400 : 600}, S,
        p == null ? (sm ? `${c[1]}: none` : `${c[1]}: no forecast`) : sm ? `${p}% vs ${c[1]}` : `${p}% less than ${c[1]}`); });
  });
  $("#s2Bcap").textContent = "Each row is one variable on its own scale, stretched to fit its three values, so read the distances within a row, not between rows. " +
    "The orange dot is DKcast's typical hourly miss at DMI stations; the further left of the others, the bigger the improvement. yr.no has no sunshine forecast. " +
    "Hover a dot for its exact value.";
}

// ---------- section 2, C: two scorecards ----------
function s2C() {
  if (!W) return;
  $("#s2C").innerHTML = `<div class="cards2">${COMP.map(c => `<div class="sc"><h3>Against ${c[1]}</h3><p class="who">${c[2]}</p>` +
    VARS.map(([vk, nm]) => { const p = pctLess(vk, c[0]);
      return p == null ? `<div class="row"><span>${nm}</span><span class="none">no ${nm.toLowerCase()} forecast published</span></div>`
        : `<div class="row" data-h="${nm}: ${rawTxt(vk, c[0])}"><span>${nm}</span><span class="tr"><i style="width:${(p / 35 * 100).toFixed(0)}%"></i></span><b>${p}%</b></div>`; }).join("") +
    `</div>`).join("")}</div><p class="cap" style="margin-top:-4px">Bars show how much less error DKcast had, on one shared scale from 0 to 35%. Hover a row for the exact errors.</p>`;
}

// ---------- section 5 ----------
const cph = t => new Date(t + ":00Z").toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen"});
const ord = n => n + (n % 10 == 1 && n != 11 ? "st" : n % 10 == 2 && n != 12 ? "nd" : n % 10 == 3 && n != 13 ? "rd" : "th");
function liveRows(t) {
  const me = t.ranking.find(r => r.name == t.line_name) || t.ranking.find(r => r.source == "j4catdk") || t.ranking[0];
  return {me, en: t.ranking.find(r => r.source == "energinet")};
}
function s5A(t) {
  const S = $("#s5A"); S.innerHTML = ""; const ser = t.series, n = ser.length - 1, {me, en} = liveRows(t);
  $("#s5Ahead").innerHTML = `So far today, ${t.hours_measured} of ${t.hours_total} hours measured: ${t.line_name} <b>${me.nmae.toFixed(2)}%</b> of capacity` +
    (en ? `, Energinet ${en.nmae.toFixed(2)}%` : "") + `, ranked ${ord(me.rank)} of ${t.ranking.length}.`;
  const L = 42, R = 392, top = 22, bot = 162, vals = ser.flatMap(x => [x.p, x.a, x.hi]).filter(q => q != null);
  const step = Math.max(...vals) > 4500 ? 2000 : 1000, mx = Math.ceil(Math.max(...vals) * 1.05 / step) * step;
  const X = i => L + i * (R - L) / n, Y = q => bot - q / mx * (bot - top);
  for (let q = 0; q <= mx; q += step) {
    el("line", {x1: L, x2: R, y1: Y(q), y2: Y(q), stroke: "#eceae6"}, S);
    el("text", {x: L - 6, y: Y(q) + 4, "font-size": 10, "text-anchor": "end", fill: "#5b6470"}, S, q.toLocaleString("en-GB"));
  }
  el("text", {x: L - 6, y: 10, "font-size": 10, fill: "#5b6470", "text-anchor": "end"}, S, "MW");
  if (ser.every(x => x.lo != null)) el("path", {d: "M" + ser.map((x, i) => `${X(i)},${Y(x.hi)}`).join("L") + "L" + ser.map((x, i) => `${X(i)},${Y(x.lo)}`).reverse().join("L") + "Z", fill: "#c2410c", opacity: .14}, S);
  el("path", {d: "M" + ser.map((x, i) => x.p == null ? "" : X(i) + "," + Y(x.p)).filter(Boolean).join("L"), fill: "none", stroke: "#c2410c", "stroke-width": 2.5}, S);
  const m = t.hours_measured;
  if (m > 0 && m < ser.length) {
    el("line", {x1: X(m - .5), x2: X(m - .5), y1: top, y2: bot, stroke: "#1a1d21", "stroke-dasharray": "3 3"}, S);
    el("text", {x: X(m - .5) + 4, y: top + 9, "font-size": 10, fill: "#1a1d21"}, S, "now");
  }
  ser.forEach((x, i) => {
    if (x.a != null) el("circle", {cx: X(i), cy: Y(x.a), r: 3.2, fill: "#1a1d21"}, S);
    if (i % 6 == 0) el("text", {x: X(i), y: bot + 15, "font-size": 10, fill: "#5b6470", "text-anchor": "middle"}, S, cph(x.t));
    hoverRow(S, X(i) - (R - L) / n / 2, top, (R - L) / n, bot - top, `${cph(x.t)} Copenhagen<br>forecast ${x.p != null ? x.p.toLocaleString("en-GB") + " MW" : "n/a"}` +
      `<br>measured ${x.a != null ? x.a.toLocaleString("en-GB") + " MW" : "not yet"}` + (x.a != null && x.p != null ? `<br>miss ${Math.abs(x.p - x.a).toLocaleString("en-GB")} MW` : ""));
  });
  el("line", {x1: L + 6, x2: L + 22, y1: 184, y2: 184, stroke: "#c2410c", "stroke-width": 2.5}, S);
  el("text", {x: L + 26, y: 188, "font-size": 10.5, fill: "#5b6470"}, S, `forecast, ${t.line_name}`);
  el("circle", {cx: L + 190, cy: 184, r: 3.2, fill: "#1a1d21"}, S);
  el("text", {x: L + 198, y: 188, "font-size": 10.5, fill: "#5b6470"}, S, "measured by Energinet");
}
function s5B(t) {
  const {me} = liveRows(t), mx = Math.max(...t.ranking.map(r => r.nmae));
  const ser = t.series, n = ser.length - 1, vals = ser.flatMap(x => [x.p, x.a]).filter(q => q != null), top = Math.max(...vals) * 1.08;
  const X = i => 4 + i * 392 / n, Y = q => 56 - q / top * 50;
  const spark = `<svg viewBox="0 0 400 62" aria-label="today's forecast and measured output"><path d="M${ser.map((x, i) => x.p == null ? "" : X(i) + "," + Y(x.p)).filter(Boolean).join("L")}" fill="none" stroke="#c2410c" stroke-width="2"/>` +
    ser.map((x, i) => x.a == null ? "" : `<circle cx="${X(i)}" cy="${Y(x.a)}" r="2.6" fill="#1a1d21"/>`).join("") + `</svg>`;
  $("#s5B").innerHTML = `<div class="board"><div class="big">${ord(me.rank)} of ${t.ranking.length}<span>so far today, ${t.hours_measured} of ${t.hours_total} hours measured</span></div>
    <ol>${t.ranking.map(r => `<li class="${r === me ? "me" : r.source == "energinet" ? "en" : ""}" data-h="${r.name}: error so far ${r.nmae.toFixed(2)}% of capacity">` +
      `<span>${r.rank}</span><span>${r.name}</span><span class="tr"><i style="width:${(r.nmae / mx * 100).toFixed(0)}%"></i></span><span>${r.nmae.toFixed(2)}%</span></li>`).join("")}</ol>
    ${spark}<p class="cap" style="margin:2px 0 8px">Error so far as a % of installed capacity, lower is better; the final ranking is computed at 01:30 the night after. The line is ${t.line_name}'s forecast, the dots are measured output.</p></div>`;
}

// ---------- wiring ----------
function fcAll() { s1A(); s1B(); s1C(); s2A(); s2B(); s2C(); if (FC_T) { s5A(FC_T); s5B(FC_T); } fc2All(); }
let FC_T = null;
function fcApply() {
  document.querySelectorAll("[data-group]").forEach(e => e.hidden = !e.dataset.opt.split(" ").includes(PK[e.dataset.group]));
  document.querySelectorAll("#picker button[data-g]").forEach(b => b.setAttribute("aria-pressed", PK[b.dataset.g] == b.dataset.k));
  $("#tagsbtn").setAttribute("aria-pressed", !document.body.classList.contains("notags"));
  history.replaceState(null, "", "?" + new URLSearchParams(PK));
  fcAll();
}
(function fcInit() {
  const q = new URLSearchParams(location.search);
  for (const g in PK) if (OP[g].some(o => o[0] == q.get(g))) PK[g] = q.get(g);
  const _bars = bars; bars = function () { _bars(); s1A(); s1B(); s1C(); };
  document.querySelectorAll("div[data-group]:not(.seg):not([data-notag])").forEach(e => {
    const k = e.dataset.opt.split(" ")[0], o = OP[e.dataset.group].find(z => z[0] == k), t = document.createElement("div");
    t.className = "opt-tag"; t.textContent = `${GN[e.dataset.group]}: ${k == "cur" ? "now, as the page is" : "option " + o[1] + ", " + o[2]}`; e.prepend(t);
  });
  const P = document.createElement("div"); P.id = "picker";
  P.innerHTML = Object.keys(OP).map(g => `<div class="grp"><span>${GN[g]}</span>` + OP[g].map(([k, lab, t]) => `<button data-g="${g}" data-k="${k}" title="${t}">${lab}</button>`).join("") + `</div>`).join("") +
    `<button id="tagsbtn" title="show or hide the option labels on the page">Labels</button>`;
  document.body.appendChild(P);
  P.addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return;
    if (b.id == "tagsbtn") document.body.classList.toggle("notags"); else PK[b.dataset.g] = b.dataset.k; fcApply(); });
  document.addEventListener("pointermove", e => { const n = e.target.closest && e.target.closest("[data-h]"); if (n) tipOn(e, n.dataset.h); });
  document.addEventListener("pointerout", e => { if (e.target.closest && e.target.closest("[data-h]")) tipOff(); });
  fetch("https://bolgacg.github.io/dk-wind-live/summary.json", {cache: "no-store"}).then(r => r.json()).then(s => { if (s.today && s.today.series) { FC_T = s.today; s5A(FC_T); s5B(FC_T); } }).catch(() => {});
  const wait = setInterval(() => { if (W) { clearInterval(wait); fcApply(); } }, 100);
  let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(fcAll, 200); });
  fcApply();
})();
