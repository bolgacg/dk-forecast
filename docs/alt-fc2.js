// Round 2 alternatives for dk-forecast (projects-b4, 30 Oct 2026): storm map frame, section 3, section 4, DKcast preview in section 5.
// Uses $, el, tipOn, tipOff, coast, storm, sample and d3 from the page script. Data built by alt-projects-b4/build/*.py into data_alt/.
const F2 = {tr: null, cw: null, st: null, pw: null, dk: null, land: null, T: 30, K: "era5", play: true, parts: {}, ok: false};
const F2BOX = [6, 53.5, 16, 58.5], F2WIDE = [-6, 50, 24, 65];
const f2j = u => fetch(u).then(r => r.json());
Promise.all([f2j("data_alt/tracks.json"), f2j("data_alt/coast_wide.json"), f2j("data_alt/easter_stations.json"), f2j("data_alt/easter_power.json"),
  f2j("https://bolgacg.github.io/dkcast/dkcast.json").catch(() => null), f2j("https://bolgacg.github.io/dkcast/dk.json").catch(() => null)])
  .then(([tr, cw, st, pw, dk, land]) => {
    const seen = new Set(); st.stations = st.stations.filter(s => !seen.has(s.id) && seen.add(s.id));
    Object.assign(F2, {tr: tr.easter2026, cw, st, pw, dk, land});
    const w = setInterval(() => { if (storm && coast) { clearInterval(w); F2.ok = true; fc2All(); requestAnimationFrame(f2Tick); } }, 100);
  });
const f2Mean = a => { const v = a.filter(x => x != null); return v.length ? v.reduce((p, q) => p + q, 0) / v.length : null; };
const f2Hour = t => { const d = new Date(t + ":00Z"); return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()] + " " + d.toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen"}); };

// ---------- storm map: shared drawing ----------
function f2Fit(c) { const r = c.getBoundingClientRect(), d = devicePixelRatio || 1; c.width = Math.max(1, r.width * d); c.height = Math.max(1, r.height * d);
  const x = c.getContext("2d"); x.setTransform(d, 0, 0, d, 0, 0); return [x, r.width, r.height]; }
const f2Proj = (b, W, H) => ({x: l => (l - b[0]) / (b[2] - b[0]) * W, y: a => (b[3] - a) / (b[3] - b[1]) * H, lon: p => b[0] + p / W * (b[2] - b[0]), lat: p => b[3] - p / H * (b[3] - b[1])});
function f2Coast(ctx, rings, P, fill, stroke) { ctx.lineWidth = .8; ctx.strokeStyle = stroke; ctx.fillStyle = fill;
  for (const r of rings) { ctx.beginPath(); r.forEach(([x, y], i) => i ? ctx.lineTo(P.x(x), P.y(y)) : ctx.moveTo(P.x(x), P.y(y))); ctx.closePath(); if (fill) ctx.fill(); ctx.stroke(); } }
function f2Grey(ctx, P, W, H) {
  // faint greyscale wind speed inside the Denmark box, 0 m/s clear, 28 m/s dark grey
  const m = storm.meta, u = storm[F2.K].u[F2.T], v = storm[F2.K].v[F2.T], x0 = P.x(F2BOX[0]), y0 = P.y(F2BOX[3]), x1 = P.x(F2BOX[2]), y1 = P.y(F2BOX[1]);
  const gw = 120, gh = Math.round(gw * (y1 - y0) / (x1 - x0)), img = ctx.createImageData(gw, gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const lon = F2BOX[0] + (i + .5) / gw * 10, lat = F2BOX[3] - (j + .5) / gh * 5, a = sample(u, lon, lat, m), b = sample(v, lon, lat, m);
    if (a == null) continue; const s = Math.min(1, Math.hypot(a, b) / 28); img.data.set([40, 40, 40, Math.round(s * 85)], (j * gw + i) * 4);
  }
  const off = document.createElement("canvas"); off.width = gw; off.height = gh; off.getContext("2d").putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true; ctx.drawImage(off, x0, y0, x1 - x0, y1 - y0);
}
function f2Iso(ctx, P, W, H, box, pArr, m) {
  const N = 90, M = Math.round(N * H / W), g = [];
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const lon = box[0] + i / (N - 1) * (box[2] - box[0]), lat = box[3] - j / (M - 1) * (box[3] - box[1]);
    g.push(f2Samp(pArr, lon, lat, m)); }
  const ok = g.filter(v => v != null), mean = f2Mean(ok); for (let k = 0; k < g.length; k++) if (g[k] == null) g[k] = mean;
  const lo = Math.floor(Math.min(...ok) / 4) * 4, hi = Math.ceil(Math.max(...ok) / 4) * 4, th = []; for (let q = lo; q <= hi; q += 4) th.push(q);
  const sx = W / (N - 1), sy = H / (M - 1); ctx.strokeStyle = "rgba(91,100,112,.7)"; ctx.lineWidth = .9; ctx.font = "10px IBM Plex Mono";
  for (const c of d3.contours().size([N, M]).thresholds(th)(g)) { let lab = null;
    for (const poly of c.coordinates) for (const ring of poly) { ctx.beginPath(); ring.forEach(([x, y], i) => { const X = (x - .5) * sx, Y = (y - .5) * sy; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      if (!lab && X > 30 && X < W - 30 && Y > 16 && Y < H - 16 && i % 50 == 25) lab = [X, Y]; }); ctx.stroke(); }
    if (lab) { ctx.fillStyle = "rgba(255,255,255,.85)"; ctx.fillRect(lab[0] - 14, lab[1] - 7, 28, 13); ctx.fillStyle = "#5b6470"; ctx.fillText(c.value, lab[0] - 12, lab[1] + 4); } }
}
function f2Samp(arr, lon, lat, m) { const dl = m.lon[1] - m.lon[0], nx = m.lon.length, ny = m.lat.length, x = (lon - m.lon[0]) / dl, y = (lat - m.lat[0]) / (m.lat[1] - m.lat[0]);
  if (x < 0 || y < 0 || x > nx - 1 || y > ny - 1) return null; const i = Math.min(Math.floor(x), nx - 2), j = Math.min(Math.floor(y), ny - 2), a = x - i, b = y - j;
  return (1 - a) * (1 - b) * arr[j * nx + i] + a * (1 - b) * arr[j * nx + i + 1] + (1 - a) * b * arr[(j + 1) * nx + i] + a * b * arr[(j + 1) * nx + i + 1]; }
function f2Once(id) { const c = document.getElementById(id), w = Math.round(c.getBoundingClientRect().width); if (c.dataset.w != w) { c.dataset.w = w; f2Fit(c); F2.parts[id] = null; } }
function f2Particles(id, P) {
  // one particle layer per map; trails fade; particles live inside the Denmark box
  const c = document.getElementById(id); if (!c || !c.width) return; const ctx = c.getContext("2d"), W = c.width / (devicePixelRatio || 1), H = c.height / (devicePixelRatio || 1);
  let ps = F2.parts[id]; const rnd = () => ({lon: F2BOX[0] + Math.random() * 10, lat: F2BOX[1] + Math.random() * 5, age: Math.random() * 80 | 0});
  if (!ps) ps = F2.parts[id] = Array.from({length: 700}, rnd);
  ctx.globalCompositeOperation = "destination-in"; ctx.fillStyle = "rgba(0,0,0,.92)"; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = "source-over";
  const m = storm.meta, u = storm[F2.K].u[F2.T], v = storm[F2.K].v[F2.T]; ctx.strokeStyle = "rgba(30,30,30,.4)"; ctx.lineWidth = .8; ctx.beginPath();
  for (const q of ps) { const a = sample(u, q.lon, q.lat, m), b = sample(v, q.lon, q.lat, m); if (a == null || q.age > 90) { Object.assign(q, rnd(), {age: 0}); continue; }
    const x0 = P.x(q.lon), y0 = P.y(q.lat); q.lon += a * .0022 / Math.cos(q.lat * Math.PI / 180); q.lat += b * .0022; q.age++; ctx.moveTo(x0, y0); ctx.lineTo(P.x(q.lon), P.y(q.lat)); }
  ctx.stroke();
}
function f2Track(ctx, P, W) {
  const d = F2.tr, m = d.meta, T = F2.T;
  for (const [k, col, main] of [["ifs", "#2a78d6", false], ["era5", "#1a1d21", true]]) { const tr = d[k].track; if (!tr.length) continue;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = main ? 5 : 4; ctx.beginPath(); tr.forEach((q, i) => i ? ctx.lineTo(P.x(q[1]), P.y(q[2])) : ctx.moveTo(P.x(q[1]), P.y(q[2]))); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = main ? 2.4 : 2; if (!main) ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    const labs = [];
    for (const q of tr) if (+m.time[q[0]].slice(11, 13) % 6 == 0) { ctx.beginPath(); ctx.arc(P.x(q[1]), P.y(q[2]), 2.8, 0, 7); ctx.fillStyle = col; ctx.fill();
      if (main && W > 420) { ctx.font = "10.5px IBM Plex Mono"; const t = f2Hour(m.time[q[0]]), tw = ctx.measureText(t).width, X = P.x(q[1]) + 6, Y = P.y(q[2]) + 15;
        if (labs.some(([a, b]) => Math.abs(a - X) < tw + 8 && Math.abs(b - Y) < 16)) continue; labs.push([X, Y]);
        ctx.fillStyle = "rgba(255,255,255,.88)"; ctx.fillRect(X - 2, Y - 10, tw + 4, 13); ctx.fillStyle = "#1a1d21"; ctx.fillText(t, X, Y); } }
    const q = tr.find(q => q[0] === T); if (q) { ctx.beginPath(); ctx.arc(P.x(q[1]), P.y(q[2]), main ? 8 : 6.5, 0, 7); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
      if (main) { ctx.fillStyle = "#fff"; ctx.font = "600 10px IBM Plex Sans"; ctx.fillText("L", P.x(q[1]) - 3, P.y(q[2]) + 3.5); } } }
}
function f2Strip(id) {
  // average miss at the stations, hour by hour, DKcast against ECMWF IFS; the slider hour is marked
  const S = document.getElementById(id); if (!S) return; S.innerHTML = ""; const st = F2.st, n = st.time.length;
  const err = k => st.time.map((_, i) => f2Mean(st.stations.map(s => s[k][i] != null && s.obs[i] != null ? Math.abs(s[k][i] - s.obs[i]) : null)));
  const dk = err("dk"), ifs = err("ifs"), mx = Math.ceil(Math.max(...dk, ...ifs)), VW = 640, L = 36, R = 630, top = 8, bot = 92, X = i => L + i * (R - L) / (n - 1), Y = v => bot - v / mx * (bot - top);
  S.setAttribute("viewBox", `0 0 ${VW} 132`);
  for (let v = 0; v <= mx; v++) { el("line", {x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: "#eceae6"}, S); el("text", {x: L - 6, y: Y(v) + 4, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, v); }
  el("text", {x: 2, y: 10, "font-size": 10, fill: "#5b6470"}, S, "m/s");
  for (const [a, c, w] of [[ifs, "#2a78d6", 2], [dk, "#c2410c", 2.6]]) el("path", {d: "M" + a.map((v, i) => `${X(i)},${Y(v)}`).join("L"), fill: "none", stroke: c, "stroke-width": w}, S);
  el("line", {x1: X(F2.T), x2: X(F2.T), y1: top, y2: bot, stroke: "#1a1d21", "stroke-dasharray": "3 3"}, S);
  st.time.forEach((t, i) => { if (i % 12 == 0) el("text", {x: X(i), y: bot + 14, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S, f2Hour(t));
    const r = el("rect", {x: X(i) - 4.5, y: top, width: 9, height: bot - top, fill: "transparent"}, S);
    r.addEventListener("pointermove", e => tipOn(e, `${f2Hour(t)}<br>average miss at ${st.stations.length} stations<br>DKcast ${dk[i].toFixed(2)} m/s<br>ECMWF IFS ${ifs[i].toFixed(2)} m/s`));
    r.addEventListener("pointerleave", tipOff); r.addEventListener("click", () => { F2.T = i; F2.play = false; fc2Storm(); }); });
  el("line", {x1: L, x2: L + 18, y1: 126, y2: 126, stroke: "#c2410c", "stroke-width": 2.6}, S); el("text", {x: L + 24, y: 130, "font-size": 11, fill: "#1a1d21"}, S, `DKcast, average miss ${f2Mean(dk).toFixed(1)} m/s`);
  el("line", {x1: L + 230, x2: L + 248, y1: 126, y2: 126, stroke: "#2a78d6", "stroke-width": 2}, S); el("text", {x: L + 254, y: 130, "font-size": 11, fill: "#1a1d21"}, S, `ECMWF IFS, average miss ${f2Mean(ifs).toFixed(1)} m/s`);
}
const f2Ctl = id => `<div class="controls"><div class="seg f2src" data-id="${id}"><button data-k="era5">Wind: what happened</button><button data-k="ifs">Wind: ECMWF IFS</button></div></div>
  <div class="controls"><button class="play f2play">Pause</button><input type="range" class="f2t" min="0" max="71" value="30" aria-label="Hour"><span class="readout f2when"></span></div>`;
function f2Wire(host) {
  host.querySelectorAll(".f2src button").forEach(b => { b.classList.toggle("on", b.dataset.k == F2.K); b.onclick = () => { F2.K = b.dataset.k; fc2Storm(); }; });
  const t = host.querySelector(".f2t"); t.value = F2.T; t.oninput = () => { F2.T = +t.value; F2.play = false; fc2Storm(); };
  const p = host.querySelector(".f2play"); p.textContent = F2.play ? "Pause" : "Play"; p.onclick = () => { F2.play = !F2.play; p.textContent = F2.play ? "Pause" : "Play"; };
  host.querySelector(".f2when").textContent = f2Hour(storm.meta.time[F2.T]) + " Copenhagen";
}

// ---------- storm A: the anatomy track map, greyscale wind, IFS against DKcast ----------
function stormA() {
  const host = document.getElementById("stormA"); if (!host.dataset.built) { host.dataset.built = 1;
    host.innerHTML = `<p class="ans" style="margin:0 0 10px">The Easter storm, 2026: ECMWF IFS put the low in nearly the right place, but at the weather stations DKcast came closer to the wind that was measured, missing by 1.0 m/s on average against 1.8 m/s for IFS.</p><div class="map-wrap" style="aspect-ratio:1.074"><canvas id="sAbase"></canvas><canvas id="sAparts"></canvas></div>${f2Ctl("A")}
    <p class="cap" style="margin:8px 0 4px">The Easter storm, 4 to 6 April 2026. The black line is where the low actually went (ERA5); the dashed blue line is ECMWF IFS, issued the day before. Inside the dashed box, the grey shading and the moving streaks are the wind at 100 m, darker for stronger. Grey lines are isobars every 4 hPa.</p>
    <svg id="sAstrip" style="width:100%"></svg><p class="cap" style="margin:2px 0 0">Below the map: how far each forecast was from the wind measured at ${F2.st.stations.length} DMI stations, hour by hour. Hover for values; click to jump the map to that hour.</p>`; }
  const c = document.getElementById("sAbase"), [ctx, W, H] = f2Fit(c), P = f2Proj(F2WIDE, W, H); f2Once("sAparts");
  ctx.fillStyle = "#eef0f2"; ctx.fillRect(0, 0, W, H); f2Coast(ctx, F2.cw, P, "#fbfaf7", "#9aa1a8"); f2Grey(ctx, P, W, H);
  f2Iso(ctx, P, W, H, F2WIDE, F2.tr.era5.p[F2.T], F2.tr.meta);
  ctx.save(); ctx.setLineDash([4, 3]); ctx.strokeStyle = "#5b6470"; ctx.strokeRect(P.x(6), P.y(58.5), P.x(16) - P.x(6), P.y(53.5) - P.y(58.5)); ctx.restore();
  f2Track(ctx, P, W);
  const key = [["#1a1d21", "ERA5, where the low actually went", false], ["#2a78d6", "ECMWF IFS, forecast the day before", true]];
  ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.fillRect(8, H - 34, Math.min(W - 16, 470), 26); ctx.font = "12px IBM Plex Sans";
  key.forEach(([c, t, dash], j) => { const x0 = 16 + j * 230; ctx.strokeStyle = c; ctx.lineWidth = 2.4; if (dash) ctx.setLineDash([5, 3]); ctx.beginPath(); ctx.moveTo(x0, H - 21); ctx.lineTo(x0 + 22, H - 21); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = "#1a1d21"; ctx.fillText(t, x0 + 28, H - 17); });
  F2.projA = P; f2Wire(host); f2Strip("sAstrip");
}
// ---------- storm B: Denmark only, greyscale wind, stations marked by who was closer ----------
function stormB() {
  const host = document.getElementById("stormB"); if (!host.dataset.built) { host.dataset.built = 1;
    host.innerHTML = `<div class="map-wrap" id="sBwrap"><canvas id="sBbase"></canvas><canvas id="sBparts"></canvas><canvas id="sBover"></canvas></div>${f2Ctl("B")}
    <p class="cap" style="margin:8px 0 4px">The Easter storm over Denmark. Grey shading and streaks are the wind at 100 m, darker for stronger. Each ring is a DMI station: <b style="color:#c2410c">orange</b> where DKcast was closer to the measured wind that hour, <b style="color:#2a78d6">blue</b> where ECMWF IFS was. Hover a station for the three numbers.</p>
    <svg id="sBstrip" style="width:100%"></svg>`;
    document.getElementById("sBwrap").addEventListener("pointermove", e => { const P = F2.projB; if (!P) return; const r = e.currentTarget.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      const s = F2.st.stations.find(s => Math.hypot(P.x(s.lon) - x, P.y(s.lat) - y) < 9); if (!s) { tipOff(); return; } const i = F2.T;
      tipOn(e, `${s.name}, ${f2Hour(F2.st.time[i])}<br>measured ${s.obs[i] ?? "n/a"} m/s<br>DKcast ${s.dk[i] ?? "n/a"} m/s<br>ECMWF IFS ${s.ifs[i] ?? "n/a"} m/s`); });
    document.getElementById("sBwrap").addEventListener("pointerleave", tipOff); }
  const c = document.getElementById("sBbase"), [ctx, W, H] = f2Fit(c), P = f2Proj(F2BOX, W, H); f2Once("sBparts");
  ctx.fillStyle = "#eef0f2"; ctx.fillRect(0, 0, W, H); f2Coast(ctx, coast, P, "#fbfaf7", "#9aa1a8"); f2Grey(ctx, P, W, H);
  f2Iso(ctx, P, W, H, F2BOX, storm[F2.K].p[F2.T], storm.meta);
  const [o] = f2Fit(document.getElementById("sBover")); let dkw = 0, n = 0;
  for (const s of F2.st.stations) { const i = F2.T, a = s.obs[i], d = s.dk[i], f = s.ifs[i]; if (a == null || d == null || f == null) continue;
    const win = Math.abs(d - a) <= Math.abs(f - a); dkw += win; n++;
    o.beginPath(); o.arc(P.x(s.lon), P.y(s.lat), 6.5, 0, 7); o.fillStyle = "#fff"; o.fill(); o.lineWidth = 3; o.strokeStyle = win ? "#c2410c" : "#2a78d6"; o.stroke(); }
  o.font = "600 12px IBM Plex Sans"; o.fillStyle = "rgba(255,255,255,.9)"; o.fillRect(8, 8, 250, 22); o.fillStyle = "#1a1d21"; o.fillText(`This hour: DKcast closer at ${dkw} of ${n} stations`, 14, 23);
  F2.projB = P; f2Wire(host); f2Strip("sBstrip");
}
function fc2Storm() { if (!F2.ok) return; if (!document.getElementById("stormA").closest("[data-group]").hidden) stormA(); if (!document.getElementById("stormB").closest("[data-group]").hidden) stormB(); }
let f2Last = 0;
function f2Tick(ts) {
  if (F2.play && ts - f2Last > 700) { f2Last = ts; F2.T = (F2.T + 1) % storm.meta.time.length; fc2Storm(); }
  if (F2.projA && !document.getElementById("stormA").closest("[data-group]").hidden) f2Particles("sAparts", F2.projA);
  if (F2.projB && !document.getElementById("stormB").closest("[data-group]").hidden) f2Particles("sBparts", F2.projB);
  requestAnimationFrame(f2Tick);
}

// ---------- section 3 ----------
function s3A() {
  const S = $("#s3A"); S.innerHTML = ""; S.setAttribute("viewBox", "0 0 640 300");
  const box = (x, y, w, h, fill, stroke) => el("rect", {x, y, width: w, height: h, rx: 12, fill, stroke, "stroke-width": 1.5}, S);
  const tx = (x, y, t, o = {}) => el("text", Object.assign({x, y, "font-size": 13, fill: "#1a1d21"}, o), S, t);
  box(10, 20, 190, 196, "#f3f1ed", "#e2e0dc"); tx(24, 44, "12 public forecasts", {"font-weight": 600}); tx(24, 62, "issued the day before", {fill: "#5b6470", "font-size": 12});
  ["ECMWF IFS and AIFS", "DWD ICON-EU and D2", "DMI HARMONIE", "KNMI HARMONIE", "MET Norway", "UK Met Office", "NOAA GFS, and others"].forEach((m, i) => tx(24, 88 + i * 18, m, {"font-size": 12}));
  box(250, 60, 160, 116, "#fff7ed", "#c2410c"); tx(330, 92, "DKcast", {"text-anchor": "middle", "font-weight": 600, fill: "#c2410c", "font-size": 16});
  ["a small neural network", "learns, station by station,", "which model to trust", "in which weather"].forEach((m, i) => tx(330, 114 + i * 15, m, {"text-anchor": "middle", "font-size": 11.5}));
  box(460, 60, 170, 116, "#fff", "#e2e0dc"); tx(545, 92, "A forecast", {"text-anchor": "middle", "font-weight": 600});
  ["for each hour at each station,", "with a range the real value", "lands in 8 times out of 10"].forEach((m, i) => tx(545, 114 + i * 15, m, {"text-anchor": "middle", "font-size": 11.5}));
  box(250, 214, 160, 62, "#fff", "#e2e0dc"); tx(330, 238, "The answer key", {"text-anchor": "middle", "font-weight": 600}); tx(330, 256, "what DMI's stations measured", {"text-anchor": "middle", "font-size": 11.5});
  for (const [x1, y1, x2, y2] of [[200, 118, 250, 118], [410, 118, 460, 118], [330, 214, 330, 176]]) { el("line", {x1, y1, x2, y2, stroke: "#5b6470", "stroke-width": 2}, S); el("circle", {cx: x2, cy: y2, r: 3.5, fill: "#5b6470"}, S); }
  tx(10, 296, "Trained on March to December 2025. Tested once on 1 January to 18 October 2026, with the script frozen first.", {"font-size": 12, fill: "#5b6470"});
}
function s3B() {
  const host = $("#s3B"), st = F2.st; if (!st) return;
  if (!host.dataset.built) { host.dataset.built = 1;
    const opts = st.stations.filter(s => s.obs.filter(v => v != null).length > 60).sort((a, b) => a.name.localeCompare(b.name));
    host.innerHTML = `<p class="ans" style="font-size:16px">Here is what that means on one storm day. Pick a station: the grey line is ECMWF IFS, the orange line is DKcast, and the dots are what the station measured.</p>
      <select id="s3Bst" style="font:inherit;padding:6px 10px;border-radius:8px;border:1px solid var(--rule);margin-bottom:8px">${opts.map(s => `<option value="${s.id}">${s.name}</option>`).join("")}</select>
      <svg id="s3Bsvg" style="width:100%"></svg><p class="cap" id="s3Bcap"></p>`;
    const sel = $("#s3Bst"), pref = opts.find(s => /Hvide|Sjælsmark|Skagen/.test(s.name)); if (pref) sel.value = pref.id; sel.onchange = s3B; }
  const s = st.stations.find(x => x.id == $("#s3Bst").value), S = $("#s3Bsvg"); S.innerHTML = ""; const n = st.time.length;
  const vals = [...s.obs, ...s.dk, ...s.ifs].filter(v => v != null), mx = Math.ceil(Math.max(...vals) / 5) * 5, L = 36, R = 630, top = 10, bot = 200, X = i => L + i * (R - L) / (n - 1), Y = v => bot - v / mx * (bot - top);
  S.setAttribute("viewBox", "0 0 640 226");
  for (let v = 0; v <= mx; v += 5) { el("line", {x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: "#eceae6"}, S); el("text", {x: L - 6, y: Y(v) + 4, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, v); }
  el("text", {x: 2, y: 10, "font-size": 10, fill: "#5b6470"}, S, "m/s");
  const line = (a, c, w) => el("path", {d: a.map((v, i) => v == null ? "" : `${i && a[i - 1] != null ? "L" : "M"}${X(i)},${Y(v)}`).join(""), fill: "none", stroke: c, "stroke-width": w}, S);
  line(s.ifs, "#9aa4b1", 2.2); line(s.dk, "#c2410c", 2.8);
  s.obs.forEach((v, i) => { if (v != null) el("circle", {cx: X(i), cy: Y(v), r: 2.6, fill: "#1a1d21"}, S); });
  st.time.forEach((t, i) => { if (i % 12 == 0) el("text", {x: X(i), y: bot + 18, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S, f2Hour(t));
    const r = el("rect", {x: X(i) - 4.5, y: top, width: 9, height: bot - top, fill: "transparent"}, S);
    r.addEventListener("pointermove", e => tipOn(e, `${s.name}, ${f2Hour(t)}<br>measured ${s.obs[i] ?? "n/a"} m/s<br>DKcast ${s.dk[i] ?? "n/a"} m/s<br>ECMWF IFS ${s.ifs[i] ?? "n/a"} m/s`)); r.addEventListener("pointerleave", tipOff); });
  const mae = k => f2Mean(s[k].map((v, i) => v != null && s.obs[i] != null ? Math.abs(v - s.obs[i]) : null));
  $("#s3Bcap").textContent = `${s.name}, 4 to 6 April 2026, 10 m wind. Average miss: DKcast ${mae("dk").toFixed(1)} m/s, ECMWF IFS ${mae("ifs").toFixed(1)} m/s. IFS is its 10 m wind at the nearest wind-farm forecast point, as issued the day before, without a station correction; DKcast's 2026 values come from a fit on 2025 only.`;
}
function s3C() {
  const S = $("#s3C"); S.innerHTML = ""; S.setAttribute("viewBox", "0 0 640 150");
  const m0 = new Date("2025-03-01"), m1 = new Date("2027-01-01"), L = 10, R = 630, X = d => L + (new Date(d) - m0) / (m1 - m0) * (R - L);
  const seg = (a, b, c, lab, sub) => { el("rect", {x: X(a), y: 40, width: X(b) - X(a), height: 34, rx: 6, fill: c}, S);
    el("text", {x: (X(a) + X(b)) / 2, y: 62, "font-size": 13, "font-weight": 600, fill: "#fff", "text-anchor": "middle"}, S, lab);
    el("text", {x: (X(a) + X(b)) / 2, y: 92, "font-size": 11.5, fill: "#5b6470", "text-anchor": "middle"}, S, sub); };
  seg("2025-03-01", "2025-12-31", "#8b95a1", "Learn", "March to December 2025");
  seg("2026-01-01", "2026-10-18", "#c2410c", "Test, once", "1 Jan to 18 Oct 2026");
  seg("2026-10-30", "2026-12-31", "#1a1d21", "Live", "daily, from 30 Oct");
  el("line", {x1: X("2026-01-01"), x2: X("2026-01-01"), y1: 28, y2: 80, stroke: "#1a1d21", "stroke-dasharray": "3 3"}, S);
  el("text", {x: X("2026-01-01"), y: 22, "font-size": 11.5, fill: "#1a1d21", "text-anchor": "middle"}, S, "script frozen and published here");
  ["2025-06-01", "2025-09-01", "2026-01-01", "2026-04-01", "2026-07-01", "2026-10-01"].forEach(d => el("text", {x: X(d), y: 120, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S,
    new Date(d).toLocaleDateString("en-GB", {month: "short", year: "numeric"})));
  el("text", {x: L, y: 144, "font-size": 12, fill: "#5b6470"}, S, "The test months were never used for learning or tuning; every public model got the same per-station correction.");
}

// ---------- section 4 ----------
function f2PowerChart(S, from, to, series, opts) {
  const pw = F2.pw, idx = pw.time.map((t, i) => [t, i]).filter(([t]) => t >= from && t < to).map(([, i]) => i), n = idx.length;
  const L = 46, R = 630, top = opts.top || 20, bot = opts.bot || 210, X = j => L + j * (R - L) / (n - 1);
  const mx = Math.ceil(Math.max(...idx.flatMap(i => series.map(s => pw[s[0]][i] || 0))) / 500) * 500, Y = v => bot - v / mx * (bot - top);
  idx.forEach((i, j) => { if (pw.price[i] != null && pw.price[i] < 0) el("rect", {x: X(j) - (R - L) / (n - 1) / 2, y: top, width: (R - L) / (n - 1), height: bot - top, fill: "#fde7dd"}, S); });
  for (let v = 0; v <= mx; v += 500) { el("line", {x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: "#eceae6"}, S); el("text", {x: L - 6, y: Y(v) + 4, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, v.toLocaleString("en-GB")); }
  el("text", {x: 2, y: top + 2, "font-size": 10, fill: "#5b6470"}, S, "MW");
  for (const [k, c, w, dash] of series) el("path", {d: idx.map((i, j) => pw[k][i] == null ? "" : `${j ? "L" : "M"}${X(j)},${Y(pw[k][i])}`).join(""), fill: "none", stroke: c, "stroke-width": w, "stroke-dasharray": dash || ""}, S);
  idx.forEach((i, j) => { const t = pw.time[i]; if (t.endsWith("T00:00") || j == 0) el("text", {x: X(j), y: bot + 16, "font-size": 11, fill: "#5b6470", "text-anchor": j == 0 ? "start" : "middle"}, S,
      new Date(t + ":00Z").toLocaleDateString("en-GB", {weekday: "short", day: "numeric", month: "short"}));
    const r = el("rect", {x: X(j) - 3, y: top, width: 6, height: bot - top, fill: "transparent"}, S);
    r.addEventListener("pointermove", e => tipOn(e, `${f2Hour(t)}<br>` + series.map(([k, , , , nm]) => `${nm}: ${pw[k][i] != null ? pw[k][i].toLocaleString("en-GB") + " MW" : "n/a"}`).join("<br>") + `<br>day-ahead price ${pw.price[i]} EUR/MWh`));
    r.addEventListener("pointerleave", tipOff); });
  return {X, idx};
}
const f2Mae = (k, from, to) => f2Mean(F2.pw.time.map((t, i) => t >= from && t < to && F2.pw[k][i] != null && F2.pw.actual[i] != null ? Math.abs(F2.pw[k][i] - F2.pw.actual[i]) : null));
function s4A() {
  const S = $("#s4Asvg"); if (!S || !F2.pw) return; S.innerHTML = ""; S.setAttribute("viewBox", "0 0 640 262");
  f2PowerChart(S, "2026-04-03", "2026-04-08", [["blend", "#9aa4b1", 2.2, "", "my first model (4-model average)"], ["j4c", "#c2410c", 2.6, "", "J4catDK, with the switch-off stage"], ["actual", "#1a1d21", 2.2, "", "measured"]], {});
  const leg = [["#1a1d21", "measured"], ["#9aa4b1", "my first model"], ["#c2410c", "J4catDK (allows switch-offs)"], ["#fde7dd", "negative day-ahead price"]];
  leg.forEach(([c, t], j) => { el("rect", {x: 46 + j * 148, y: 244, width: 14, height: 10, rx: 2, fill: c}, S); el("text", {x: 64 + j * 148, y: 253, "font-size": 11, fill: "#1a1d21"}, S, t); });
  $("#s4Acap").textContent = `Eastern Denmark (DK2) wind output, 3 to 7 April 2026, hourly. On the shaded hours the price was negative and wind farms were switched off, so the measured output (black) fell while the wind blew. Average miss over these five days: my first model ${Math.round(f2Mae("blend", "2026-04-03", "2026-04-08"))} MW, J4catDK with the switch-off stage ${Math.round(f2Mae("j4c", "2026-04-03", "2026-04-08"))} MW, Energinet ${Math.round(f2Mae("energinet", "2026-04-03", "2026-04-08"))} MW. Hover for the hour's numbers.`;
}
function s4B() {
  const S = $("#s4Bsvg"); if (!S || !F2.pw || !F2.st) return; S.innerHTML = ""; S.setAttribute("viewBox", "0 0 640 478");
  // top: the wind at the stations, which DKcast had right
  const st = F2.st, n = st.time.length, L = 46, R = 630, X = i => L + i * (R - L) / (n - 1);
  const avg = k => st.time.map((_, i) => f2Mean(st.stations.map(s => s[k][i]))), ob = avg("obs"), dk = avg("dk"), mx = Math.ceil(Math.max(...ob, ...dk) / 2) * 2, Y = v => 150 - v / mx * 120, leg = (y, items) => items.forEach(([c, t, dot], j) => { const x0 = L + j * 200; if (dot) el("circle", {cx: x0 + 8, cy: y - 4, r: 3, fill: c}, S); else el("line", {x1: x0, x2: x0 + 18, y1: y - 4, y2: y - 4, stroke: c, "stroke-width": 2.6}, S); el("text", {x: x0 + 24, y, "font-size": 11.5, fill: "#1a1d21"}, S, t); });
  el("text", {x: L, y: 18, "font-size": 13, "font-weight": 600, fill: "#1a1d21"}, S, "The wind: right. Average 10 m wind at the DMI stations");
  st.time.forEach((t, i) => { const pi = F2.pw.time.indexOf(t); if (pi >= 0 && F2.pw.price[pi] < 0) el("rect", {x: X(i) - (R - L) / (n - 1) / 2, y: 26, width: (R - L) / (n - 1), height: 400, fill: "#fde7dd"}, S); });
  for (let v = 0; v <= mx; v += 2) { el("line", {x1: L, x2: R, y1: Y(v), y2: Y(v), stroke: "#eceae6"}, S); el("text", {x: L - 6, y: Y(v) + 4, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, v); }
  el("path", {d: "M" + dk.map((v, i) => `${X(i)},${Y(v)}`).join("L"), fill: "none", stroke: "#c2410c", "stroke-width": 2.6}, S);
  ob.forEach((v, i) => el("circle", {cx: X(i), cy: Y(v), r: 2.4, fill: "#1a1d21"}, S));
  // bottom: the power, which the first model had wrong
  leg(176, [["#1a1d21", "measured at the stations", true], ["#c2410c", "DKcast"]]);
  el("text", {x: L, y: 206, "font-size": 13, "font-weight": 600, fill: "#1a1d21"}, S, "The electricity: wrong. Eastern Denmark wind output, MW");
  const pw = F2.pw, idx = st.time.map(t => pw.time.indexOf(t)), pm = Math.ceil(Math.max(...idx.map(i => Math.max(pw.actual[i] || 0, pw.blend[i] || 0))) / 500) * 500, Yp = v => 410 - v / pm * 190;
  for (let v = 0; v <= pm; v += 500) { el("line", {x1: L, x2: R, y1: Yp(v), y2: Yp(v), stroke: "#eceae6"}, S); el("text", {x: L - 6, y: Yp(v) + 4, "font-size": 11, "text-anchor": "end", fill: "#5b6470"}, S, v.toLocaleString("en-GB")); }
  el("path", {d: "M" + idx.map((i, j) => `${X(j)},${Yp(pw.blend[i])}`).join("L"), fill: "none", stroke: "#9aa4b1", "stroke-width": 2.4}, S);
  el("path", {d: "M" + idx.map((i, j) => `${X(j)},${Yp(pw.j4c[i])}`).join("L"), fill: "none", stroke: "#c2410c", "stroke-width": 2.4}, S);
  el("path", {d: "M" + idx.map((i, j) => `${X(j)},${Yp(pw.actual[i])}`).join("L"), fill: "none", stroke: "#1a1d21", "stroke-width": 2.2}, S);
  leg(470, [["#1a1d21", "measured output"], ["#9aa4b1", "my first model"], ["#c2410c", "J4catDK, allows switch-offs"]]);
  st.time.forEach((t, i) => { if (i % 12 == 0) el("text", {x: X(i), y: 430, "font-size": 11, fill: "#5b6470", "text-anchor": "middle"}, S, f2Hour(t));
    const r = el("rect", {x: X(i) - 4.5, y: 26, width: 9, height: 380, fill: "transparent"}, S); const j = idx[i];
    r.addEventListener("pointermove", e => tipOn(e, `${f2Hour(t)}<br>station wind: measured ${ob[i]?.toFixed(1)} m/s, DKcast ${dk[i]?.toFixed(1)} m/s<br>DK2 power: measured ${pw.actual[j]?.toLocaleString("en-GB")} MW, my first model ${pw.blend[j]?.toLocaleString("en-GB")} MW, J4catDK ${pw.j4c[j]?.toLocaleString("en-GB")} MW<br>price ${pw.price[j]} EUR/MWh`));
    r.addEventListener("pointerleave", tipOff); });
  $("#s4Bcap").innerHTML = `Easter, 4 to 6 April 2026. Top: dots are the measured wind averaged over the stations, the orange line is DKcast. Bottom: black is the measured output in eastern Denmark, grey is my first model's forecast, orange is J4catDK, which allows for wind farms being switched off. <span style="background:#fde7dd;padding:0 4px">Shaded hours</span> had a negative day-ahead price, and the output fell there while the wind kept blowing. Hover for the hour's numbers.`;
}

// ---------- section 5: DKcast preview ----------
const F2CITY = [["06188", "Copenhagen area"], ["06072", "Aarhus area"], ["06126", "Odense area"], ["06031", "Aalborg area"]];
function f2Day(k) { const d = F2.dk, D = d.days[1] || d.days[0], H = D.stations[k].hours;
  return {name: d.meta[k].name, hi: H.reduce((a, h) => h.temp > a.temp ? h : a), lo: Math.min(...H.map(h => h.temp)), sun: H.reduce((a, h) => a + h.sun, 0) / 60, rain: Math.max(...H.map(h => h.rain)), H, day: D.day}; }
const f2DayName = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", {weekday: "long", day: "numeric", month: "short"});
function p5A() {
  const host = $("#p5A"); if (!F2.dk) { host.innerHTML = "<p class='cap'>DKcast data not reachable.</p>"; return; }
  const rows = F2CITY.filter(([k]) => F2.dk.meta[k]).map(([k, c]) => [c, f2Day(k)]);
  host.innerHTML = `<p class="cap" style="margin:0 0 6px">Tomorrow, ${f2DayName(rows[0][1].day)}</p><table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr style="color:var(--soft);text-align:right"><th style="text-align:left;font-weight:500">Near</th><th style="font-weight:500">High</th><th style="font-weight:500">Low</th><th style="font-weight:500">Sun</th><th style="font-weight:500">Rain</th></tr>` +
    rows.map(([c, d]) => `<tr style="border-top:1px solid var(--rule);text-align:right" data-h="${d.name}: high ${d.hi.temp.toFixed(1)} °C, likely ${d.hi.temp_lo.toFixed(0)} to ${d.hi.temp_hi.toFixed(0)}"><td style="text-align:left;padding:5px 0">${c}</td><td><b>${Math.round(d.hi.temp)}°</b></td><td>${Math.round(d.lo)}°</td><td>${d.sun.toFixed(1)} h</td><td>${d.rain}%</td></tr>`).join("") + `</table>`;
}
function p5B() {
  const S = $("#p5B"); S.innerHTML = ""; if (!F2.dk) return; S.setAttribute("viewBox", "0 0 400 330");
  const PX = lon => (lon - 7.9) / 7.4 * 380 + 10, PY = lat => (57.8 - lat) / 3.3 * 300 + 15;
  if (F2.land) F2.land.forEach(r => el("path", {d: "M" + r.map(p => PX(p[0]).toFixed(1) + "," + PY(p[1]).toFixed(1)).join("L") + "Z", fill: "#f3f1ea", stroke: "#cbd5df"}, S));
  const ks = Object.keys(F2.dk.meta), ds = ks.map(k => f2Day(k)), lo = Math.min(...ds.map(d => d.hi.temp)), hi = Math.max(...ds.map(d => d.hi.temp));
  ks.forEach((k, j) => { const m = F2.dk.meta[k], d = ds[j], t = (d.hi.temp - lo) / Math.max(.5, hi - lo);
    const g = el("g", {}, S); el("circle", {cx: PX(m.lon), cy: PY(m.lat), r: 11, fill: `rgb(${Math.round(80 + t * 156)},${Math.round(150 + t * 20)},${Math.round(214 - t * 150)})`, stroke: "#fff", "stroke-width": 1.5}, g);
    el("text", {x: PX(m.lon), y: PY(m.lat) + 4, "font-size": 10, "font-weight": 700, "text-anchor": "middle", fill: "#14202b"}, g, Math.round(d.hi.temp) + "°");
    g.addEventListener("pointermove", e => tipOn(e, `${d.name}, tomorrow<br>high ${d.hi.temp.toFixed(1)} °C (likely ${d.hi.temp_lo.toFixed(0)} to ${d.hi.temp_hi.toFixed(0)})<br>sun ${d.sun.toFixed(1)} h, rain up to ${d.rain}%`)); g.addEventListener("pointerleave", tipOff); });
  el("text", {x: 10, y: 326, "font-size": 11, fill: "#5b6470"}, S, `Tomorrow's high at each station, ${f2DayName(ds[0].day)}`);
}
function p5C() {
  const host = $("#p5C"); if (!F2.dk) return;
  if (!host.dataset.built) { host.dataset.built = 1; host.innerHTML = `<select id="p5Cst" style="font:inherit;font-size:13px;padding:5px 8px;border-radius:8px;border:1px solid var(--rule)">${F2CITY.filter(([k]) => F2.dk.meta[k]).map(([k, c]) => `<option value="${k}">${c} (${F2.dk.meta[k].name})</option>`).join("")}</select><svg id="p5Csvg" style="width:100%"></svg>`;
    $("#p5Cst").onchange = p5C; }
  const d = f2Day($("#p5Cst").value), H = d.H, S = $("#p5Csvg"); S.innerHTML = ""; S.setAttribute("viewBox", "0 0 400 150");
  const lo = Math.floor(Math.min(...H.map(h => h.temp_lo))) - 1, hi = Math.ceil(Math.max(...H.map(h => h.temp_hi))) + 1, n = H.length - 1, X = i => 28 + i * 366 / n, Y = v => 100 - (v - lo) / (hi - lo) * 86;
  H.forEach((h, i) => el("rect", {x: X(i) - 5, y: 140 - h.sun / 60 * 26, width: 10, height: h.sun / 60 * 26, fill: "#f5a524", opacity: .8}, S));
  el("path", {d: "M" + H.map((h, i) => `${X(i)},${Y(h.temp_hi)}`).join("L") + "L" + H.map((h, i) => `${X(n - i)},${Y(H[n - i].temp_lo)}`).join("L") + "Z", fill: "rgba(228,87,46,.15)"}, S);
  el("path", {d: "M" + H.map((h, i) => `${X(i)},${Y(h.temp)}`).join("L"), fill: "none", stroke: "#e4572e", "stroke-width": 2.5}, S);
  for (const v of [lo + 1, hi - 1]) el("text", {x: 2, y: Y(v) + 4, "font-size": 10, fill: "#5b6470"}, S, v + "°");
  H.forEach((h, i) => { if (i % 6 == 0) el("text", {x: X(i), y: 112, "font-size": 10, fill: "#5b6470", "text-anchor": "middle"}, S, new Date(h.t + "Z").toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen"})); });
  el("text", {x: 2, y: 138, "font-size": 10, fill: "#c47f0c"}, S, "sun");
  H.forEach((h, i) => { const r = el("rect", {x: X(i) - 7, y: 0, width: 14, height: 142, fill: "transparent"}, S);
    r.addEventListener("pointermove", e => tipOn(e, `${f2Hour(h.t.slice(0, 13))}<br>${h.temp.toFixed(1)} °C (${h.temp_lo.toFixed(0)} to ${h.temp_hi.toFixed(0)})<br>sun ${h.sun} min, rain ${h.rain}%`)); r.addEventListener("pointerleave", tipOff); });
  el("text", {x: 28, y: 12, "font-size": 11, fill: "#5b6470"}, S, `Tomorrow: temperature with its 8-in-10 range, sun bars below`);
}

function fc2All() { if (!F2.ok) return; fc2Storm(); s3A(); s3B(); s3C(); s4A(); s4B(); p5A(); p5B(); p5C(); p5D(); }

// ---------- section 5, D: a phone weather widget for Aarhus, from the nearest DKcast station ----------
const W5 = {SUN: '<circle cx="24" cy="24" r="9" fill="#ffd25a"/><g stroke="#ffd25a" stroke-width="3" stroke-linecap="round"><path d="M24 5v5M24 38v5M5 24h5M38 24h5M10.6 10.6l3.5 3.5M33.9 33.9l3.5 3.5M10.6 37.4l3.5-3.5M33.9 14.1l3.5-3.5"/></g>',
  CLOUD: (x, c) => `<path transform="translate(${x})" d="M14 38h22a8 8 0 0 0 0-16 11 11 0 0 0-21-2 9 9 0 0 0-1 18z" fill="${c}"/>`,
  DROPS: '<g stroke="#bfe0ff" stroke-width="2.6" stroke-linecap="round"><path d="M17 41l-2 5M25 41l-2 5M33 41l-2 5"/></g>', MOON: '<path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8z" fill="#e8eef7"/>'};
const w5hr = t => +new Date(t + "Z").toLocaleString("en-GB", {hour: "numeric", hourCycle: "h23", timeZone: "Europe/Copenhagen"});
function w5cond(h) { const k = w5hr(h.t), night = k < 7 || k > 17;
  if (h.rain >= 50) return ["Rain", W5.CLOUD(0, "#e9eef4") + W5.DROPS]; if (h.rain >= 25) return ["Showers", W5.CLOUD(0, "#e9eef4") + W5.DROPS];
  if (night) return [h.rain < 15 ? "Night" : "Cloudy night", W5.MOON + (h.rain < 15 ? "" : W5.CLOUD(4, "rgba(233,238,244,.85)"))];
  if (h.sun >= 40) return ["Sunny", W5.SUN]; if (h.sun >= 10) return ["Sunny spells", `<g transform="translate(8,-6) scale(.75)">${W5.SUN}</g>` + W5.CLOUD(-2, "#f2f5f9")]; return ["Cloudy", W5.CLOUD(0, "#f2f5f9")]; }
const w5ic = (h, s) => `<svg viewBox="0 0 48 48" style="width:${s}px;height:${s}px;display:inline-block" aria-hidden="true">${w5cond(h)[1]}</svg>`;
function p5D() {
  const host = $("#p5D"); if (!F2.dk || !F2.dk.meta["06072"]) { host.innerHTML = ""; return; }
  const k = "06072", m = F2.dk.meta[k], H = F2.dk.days.flatMap(d => d.stations[k].hours), nowIso = new Date().toISOString().slice(0, 13);
  let i0 = H.findIndex(h => h.t.slice(0, 13) >= nowIso); if (i0 < 0) i0 = 0;
  const now = H[i0], today = F2.dk.days.find(d => d.stations[k].hours.some(h => h.t.slice(0, 13) == now.t.slice(0, 13))) || F2.dk.days[0], TH = today.stations[k].hours;
  const hi = Math.max(...TH.map(h => h.temp)), lo = Math.min(...TH.map(h => h.temp)), [word] = w5cond(now), kh = w5hr(now.t), night = kh < 7 || kh > 17;
  const bg = night ? "linear-gradient(160deg,#1d2b47,#3a5378)" : now.rain >= 25 ? "linear-gradient(160deg,#4f6680,#8399b0)" : now.sun >= 10 ? "linear-gradient(160deg,#2f86d6,#77b8ee)" : "linear-gradient(160deg,#5b7894,#9cb0c4)";
  const km = Math.round(Math.hypot((m.lon - 10.2108) * Math.cos(56.16 * Math.PI / 180) * 111.3, (m.lat - 56.1567) * 111.3));
  const next = H.slice(i0, i0 + 18).filter((_, j) => j % 3 == 0).slice(0, 6);
  host.innerHTML = `<div style="background:${bg};color:#fff;border-radius:22px;padding:16px 18px 12px;max-width:380px;margin:4px 0 10px;font-family:-apple-system,'SF Pro Text',Inter,system-ui,sans-serif;box-shadow:0 6px 20px rgba(20,32,43,.18)">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><div style="font-size:17px;font-weight:600">Aarhus</div><div style="font-size:44px;font-weight:300;line-height:1.05;margin-top:2px">${Math.round(now.temp)}°</div></div>
      <div style="text-align:right">${w5ic(now, 34)}<div style="font-size:13px;font-weight:600;margin-top:2px">${word}</div><div style="font-size:13px;opacity:.9">H:${Math.round(hi)}° L:${Math.round(lo)}°</div></div></div>
    <div style="display:flex;justify-content:space-between;margin-top:12px;border-top:1px solid rgba(255,255,255,.25);padding-top:8px">` +
    next.map((h, j) => `<div data-h="${new Date(h.t + "Z").toLocaleTimeString("en-GB", {hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen"})}: ${h.temp.toFixed(1)} °C (likely ${h.temp_lo.toFixed(0)} to ${h.temp_hi.toFixed(0)}), sun ${h.sun} min, rain ${h.rain}%" style="text-align:center;font-size:12px">
      <div style="opacity:.9">${j ? new Date(h.t + "Z").toLocaleTimeString("en-GB", {hour: "2-digit", timeZone: "Europe/Copenhagen"}) : "Now"}</div>${w5ic(h, 26)}<div style="font-weight:600;font-size:14px">${Math.round(h.temp)}°</div></div>`).join("") +
    `</div><div style="font-size:10.5px;opacity:.75;margin-top:6px">DKcast, from ${m.name}, the nearest weather station, ${km} km away</div></div>`;
}
