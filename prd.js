// prd.js
(function(){
  const EPS = 1e-12;
  const clamp01 = (x)=>Math.max(0, Math.min(1, x));

  function computeFromChanceFn(chanceFn, nMax){
    const Pn = new Array(nMax);
    const qn = new Array(nMax);
    const Fn = new Array(nMax);

    let surv = 1;

    for (let n=1; n<=nMax; n++){
      const p = clamp01(chanceFn(n));
      Pn[n-1] = p;

      const q = surv * p;
      qn[n-1] = q;

      surv *= (1 - p);
      Fn[n-1] = 1 - surv;

      if (p >= 1 - 1e-12){
        for (let k=n+1; k<=nMax; k++){
          Pn[k-1] = 1;
          qn[k-1] = 0;
          Fn[k-1] = 1;
        }
        break;
      }
    }

    return { Pn, qn, Fn, stats: statsFromPMF(qn) };
  }

  function computeTrueRandom(p, nMax){
    return computeFromChanceFn(()=>p, nMax);
  }

  function chanceDota(C, n){
    return clamp01(C * n);
  }

  function chanceLinear(c0, inc, n){
    return clamp01(c0 + inc*(n-1));
  }

  function chanceExp(k, n){
    return clamp01(1 - Math.exp(-k*n));
  }

  function statsFromPMF(qn){
    const nMax = qn.length;
    const mass = qn.reduce((a,b)=>a+b,0);
    const m = Math.max(mass, EPS);

    let mean = 0;
    for (let n=1; n<=nMax; n++) mean += n * (qn[n-1]/m);

    let variance = 0;
    for (let n=1; n<=nMax; n++){
      const d = n - mean;
      variance += d*d * (qn[n-1]/m);
    }

    let cdf = 0;
    let median = nMax;
    for (let n=1; n<=nMax; n++){
      cdf += qn[n-1]/m;
      if (cdf >= 0.5){ median = n; break; }
    }

    const p5  = qn.slice(0,5).reduce((a,b)=>a+b,0)/m;
    const p10 = qn.slice(0,10).reduce((a,b)=>a+b,0)/m;

    return { mass, mean, variance, sd: Math.sqrt(variance), median, p5, p10 };
  }

  // Solve C so that (approx) proc-rate = p  =>  1/E[attempts] ~= p
  function solveCForNominalP(p){
    p = clamp01(p);
    if (p <= 0) return 0;
    if (p >= 1) return 1;

    function rateForC(C){
      const nCap = Math.min(5000, Math.ceil(1 / Math.max(C, 1e-9)) + 60);
      const r = computeFromChanceFn((n)=>chanceDota(C,n), nCap);
      return 1 / r.stats.mean;
    }

    let lo = 0;
    let hi = 1;

    const rHi = rateForC(hi);
    if (rHi < p) return hi;

    for (let i=0; i<70; i++){
      const mid = (lo + hi) / 2;
      const r = rateForC(mid);
      if (r > p) hi = mid;
      else lo = mid;
    }
    return (lo + hi) / 2;
  }

  window.PRD = {
    computeFromChanceFn,
    computeTrueRandom,
    chanceDota,
    chanceLinear,
    chanceExp,
    solveCForNominalP
  };
})();
