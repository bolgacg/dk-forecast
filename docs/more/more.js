// "More from this project": cards linking all four sites, shown at the bottom of each one except itself.
// One shared file so every site stays in step. Include with <script src="https://bolgacg.github.io/dk-forecast/more/more.js" defer></script>
(function () {
  const B = "https://bolgacg.github.io/", T = B + "dk-forecast/more/";
  const S = [["dk-forecast/", "thumb-forecast.jpg", "The one-page summary", "Can one person forecast Danish weather better than the big public models? DKcast against ECMWF, DMI and yr.no, and the power forecast against Energinet."],
    ["dkcast/", "thumb-dkcast.jpg", "DKcast weather", "Today and tomorrow, hour by hour, at 21 Danish weather stations, and every morning it checks itself against DMI."],
    ["dk-wind-live/", "thumb-live.jpg", "Live wind power league", "Every morning before the noon market close, my wind power forecast against Energinet's and the public models', ranked once the day is measured."],
    ["dk-wind-blend/", "thumb-study.jpg", "The full study", "Storm anatomy, error maps, blending and the uncertainty check, with a PDF."]];
  const here = location.pathname.split("/").filter(Boolean)[0] + "/";
  const box = document.createElement("section");
  box.setAttribute("aria-label", "More from this project");
  box.style.cssText = "max-width:920px;margin:36px auto 28px;padding:0 16px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#1a1d21";
  box.innerHTML = `<h2 style="font-size:18px;margin:0 0 12px;font-weight:600">More from this project</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">` +
    S.filter(s => s[0] != here).map(([u, img, t, d]) => `<a href="${B + u}" style="display:block;text-decoration:none;color:inherit;background:#fff;border:1px solid #e2e0dc;border-radius:12px;overflow:hidden">
      <img src="${T + img}" alt="" loading="lazy" style="width:100%;display:block;aspect-ratio:560/350;object-fit:cover;object-position:top;border-bottom:1px solid #e2e0dc">
      <div style="padding:10px 12px"><b style="font-size:15px">${t}</b><p style="font-size:13px;line-height:1.45;color:#5b6470;margin:4px 0 0;text-align:left">${d}</p></div></a>`).join("") + `</div>`;
  const f = document.querySelector("footer");
  (f && f.parentNode ? f.parentNode.insertBefore(box, f) : document.body.appendChild(box));
})();
