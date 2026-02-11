// app.js
(function(){
  const el = (id)=>document.getElementById(id);
  const clamp = (v,a,b)=>Math.max(a, Math.min(b, v));
  const pct = (x, d=1)=> (100*x).toFixed(d) + "%";
  const num = (x, d=3)=> Number(x).toFixed(d);

  const state = {
    p: 0.17,
    nMax: 30,
    mode: "prd",
    chartType: "chance"
  };

  let mainChart, pgChart;

  function cssVar(name){
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function themeInit(){
    const saved = localStorage.getItem("prd_theme");
    const theme = saved || "dire";
    setTheme(theme, false);

    el("themeToggle").addEventListener("click", ()=>{
      const cur = document.documentElement.getAttribute("data-theme") || "dire";
      setTheme(cur === "dire" ? "radiant" : "dire", true);
    });
  }

  function setTheme(theme, persist){
    document.documentElement.setAttribute("data-theme", theme);

    const isRadiant = theme === "radiant";
    el("themeLabel").textContent = isRadiant ? "Radiant" : "Dire";
    el("themeIcon").textContent = isRadiant ? "☀" : "☾";

    if (persist) localStorage.setItem("prd_theme", theme);

    // Rebuild charts so axes/grid/legend colors match theme tokens
    rebuildCharts();
  }

  function activeNav(hash){
    const calc = el("navCalc");
    const learn = el("navLearn");
    calc.classList.toggle("active", hash.startsWith("#calculator") || hash === "" || hash === "#");
    learn.classList.toggle("active", hash.startsWith("#learn"));
  }

  function route(){
    const hash = (location.hash || "#calculator").toLowerCase();
    activeNav(hash);

    const onLearn = hash.startsWith("#learn");
    el("viewCalculator").classList.toggle("d-none", onLearn);
    el("viewLearn").classList.toggle("d-none", !onLearn);

    if (onLearn){
      recomputeLearn();
      recomputePlayground();
    } else {
      recomputeMain();
    }
  }

  function makeChart(ctx, type){
    const text = cssVar("--text");
    const grid = cssVar("--border");

    return new Chart(ctx, {
      type,
      data: { labels: [], datasets: [] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
          legend: { labels: { color: text } },
          tooltip: { mode: "index", intersect: false }
        },
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            ticks: { color: text },
            grid: { color: grid }
          },
          y: {
            beginAtZero: true,
            suggestedMax: 1,
            ticks: {
              color: text,
              callback: (v)=>Math.round(v*100) + "%"
            },
            grid: { color: grid }
          }
        }
      }
    });
  }

  function rebuildCharts(){
    // Chart instances might not exist yet during initial theme set
    if (mainChart) mainChart.destroy();
    if (pgChart) pgChart.destroy();

    const main = el("mainChart");
    const pg = el("pgChart");
    if (!main || !pg) return;

    mainChart = makeChart(main, "bar");
    pgChart = makeChart(pg, "line");

    // Recompute after rebuild
    recomputeMain();
    recomputePlayground();
  }

  function bindCalculator(){
    el("pInput").addEventListener("input", ()=>{
      const v = Number(el("pInput").value);
      if (!isFinite(v)) return;
      state.p = clamp(v, 1, 95) / 100;
      recomputeMain();
    });

    el("nMax").addEventListener("input", ()=>{
      state.nMax = clamp(Number(el("nMax").value), 10, 80);
      el("nMaxLabel").textContent = String(state.nMax);
      recomputeMain();
    });

    el("mode").addEventListener("change", ()=>{
      state.mode = el("mode").value;
      recomputeMain();
    });

    el("chartType").addEventListener("change", ()=>{
      state.chartType = el("chartType").value;
      recomputeMain();
    });
  }

  function renderPresets(){
    const spells = el("spellsGrid");
    const items = el("itemsGrid");

    function card(p){
      return `
      <div class="col-12 col-sm-6 col-lg-3">
        <div class="preset" data-chance="${p.chance}">
          <div class="d-flex justify-content-between gap-2">
            <div class="name">${p.name}</div>
            <div class="chance">${p.chance}%</div>
          </div>
          <div class="meta mt-1">${p.meta || ""}</div>
          <div class="mt-2">
            <div class="progress" style="height: 8px; background: rgba(127,127,127,0.15); border-radius: 999px;">
              <div class="progress-bar" style="width:${Math.min(100, p.chance)}%; background:${cssVar("--accent2")}; border-radius: 999px;"></div>
            </div>
          </div>
        </div>
      </div>`;
    }

    spells.innerHTML = PRD_PRESETS.spells.map(card).join("");
    items.innerHTML = PRD_PRESETS.items.map(card).join("");

    function clickHandler(e){
      const node = e.target.closest(".preset");
      if (!node) return;
      const chance = Number(node.getAttribute("data-chance"));
      el("pInput").value = String(chance);
      state.p = clamp(chance, 1, 95) / 100;
      window.scrollTo({ top: 0, behavior: "smooth" });
      recomputeMain();
    }

    spells.addEventListener("click", clickHandler);
    items.addEventListener("click", clickHandler);
  }

  function recomputeMain(){
    if (!mainChart) return;

    const C = PRD.solveCForNominalP(state.p);
    el("cValue").textContent = (100*C).toFixed(1);

    const nMax = state.nMax;
    const labels = Array.from({length:nMax}, (_,i)=>String(i+1));

    const prdRes = PRD.computeFromChanceFn((n)=>PRD.chanceDota(C,n), nMax);
    const trRes  = PRD.computeTrueRandom(state.p, nMax);

    const series = (res)=>{
      if (state.chartType === "chance") return res.Pn;
      if (state.chartType === "pmf") return res.qn;
      return res.Fn;
    };

    const ds = [];
    const showPRD = (state.mode === "prd" || state.mode === "both");
    const showTR  = (state.mode === "tr"  || state.mode === "both");

    if (showPRD){
      ds.push({
        label: "PRD",
        data: series(prdRes),
        backgroundColor: cssVar("--accent"),
        borderColor: cssVar("--accent2"),
        borderWidth: 1
      });
    }
    if (showTR){
      ds.push({
        label: "True RNG",
        data: series(trRes),
        backgroundColor: "rgba(120,140,200,0.35)",
        borderColor: "rgba(120,140,200,0.65)",
        borderWidth: 1
      });
    }

    mainChart.data.labels = labels;
    mainChart.data.datasets = ds;
    mainChart.update();

    const s = (state.mode === "tr") ? trRes.stats : prdRes.stats;
    el("statMean").textContent = num(s.mean, 3);
    el("statMedian").textContent = String(s.median);
    el("statP5").textContent = pct(s.p5, 1);
    el("statP10").textContent = pct(s.p10, 1);
  }

  function bindLearn(){
    el("learnP").addEventListener("input", recomputeLearn);

    el("pgModel").addEventListener("change", recomputePlayground);
    el("pgP").addEventListener("input", recomputePlayground);
    el("pgC0").addEventListener("input", recomputePlayground);
    el("pgInc").addEventListener("input", recomputePlayground);
    el("pgK").addEventListener("input", recomputePlayground);
  }

  function recomputeLearn(){
    const p = clamp(Number(el("learnP").value || 25), 1, 95) / 100;
    const C = PRD.solveCForNominalP(p);
    el("learnC").textContent = (100*C).toFixed(1);

    const res = PRD.computeFromChanceFn((n)=>PRD.chanceDota(C,n), 12);

    const rows = [];
    for (let n=1; n<=12; n++){
      rows.push(`
        <tr>
          <td class="mono">${n}</td>
          <td>${pct(res.Pn[n-1], 1)}</td>
          <td>${pct(res.qn[n-1], 1)}</td>
          <td>${pct(res.Fn[n-1], 1)}</td>
        </tr>
      `);
    }
    el("learnTable").innerHTML = rows.join("");
  }

  function recomputePlayground(){
    if (!pgChart) return;

    const model = el("pgModel").value;
    const p = clamp(Number(el("pgP").value || 25), 1, 95) / 100;

    el("pgLinearBox").classList.toggle("d-none", model !== "linear");
    el("pgExpBox").classList.toggle("d-none", model !== "exp");

    const c0 = Number(el("pgC0").value)/100;
    const inc = Number(el("pgInc").value)/100;
    const k = Number(el("pgK").value);

    el("pgC0Label").textContent = el("pgC0").value;
    el("pgIncLabel").textContent = el("pgInc").value;
    el("pgKLabel").textContent = el("pgK").value;

    let fn, label, paramOut;

    if (model === "dota"){
      const C = PRD.solveCForNominalP(p);
      fn = (n)=>PRD.chanceDota(C,n);
      label = "Dota-style linear";
      paramOut = `C = ${(100*C).toFixed(3)}% (solved)`;
    } else if (model === "linear"){
      fn = (n)=>PRD.chanceLinear(c0, inc, n);
      label = "Linear ramp";
      paramOut = `c0=${(100*c0).toFixed(2)}%, inc=${(100*inc).toFixed(2)}%`;
    } else {
      fn = (n)=>PRD.chanceExp(k, n);
      label = "Exponential approach";
      paramOut = `k=${k.toFixed(3)} (P=1-exp(-kN))`;
    }

    el("pgParamOut").textContent = paramOut;

    const nMax = 30;
    const labels = Array.from({length:nMax}, (_,i)=>String(i+1));
    const res = PRD.computeFromChanceFn(fn, nMax);

    pgChart.data.labels = labels;
    pgChart.data.datasets = [{
      label,
      data: res.Pn,
      borderColor: cssVar("--accent2"),
      backgroundColor: cssVar("--accent"),
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.25
    }];
    pgChart.update();
  }

  function main(){
    themeInit();

    // Initialize charts once DOM is ready
    mainChart = makeChart(el("mainChart"), "bar");
    pgChart = makeChart(el("pgChart"), "line");

    // initial labels/state
    el("nMaxLabel").textContent = el("nMax").value;
    state.nMax = Number(el("nMax").value);
    state.p = clamp(Number(el("pInput").value), 1, 95) / 100;

    bindCalculator();
    bindLearn();
    renderPresets();

    window.addEventListener("hashchange", route);
    route();
    recomputeMain();
  }

  document.addEventListener("DOMContentLoaded", main);
})();
