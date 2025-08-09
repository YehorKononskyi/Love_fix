
const $ = (s)=> document.querySelector(s);
const wait = (ms)=> new Promise(r=>setTimeout(r, ms));
const D = 440;

function runIntro(){
  const qp = new URL(location.href).searchParams;
  const skip = qp.get("intro")==="0" || qp.get("skipIntro")==="1";
  const intro = $("#intro");
  const s1 = $("#introStep1");
  const s2 = $("#introStep2");
  const s3 = $("#introStep3");
  const rulesList = $("#rulesList");

  if(skip){ intro.classList.add("hidden"); $("#app").removeAttribute("aria-hidden"); document.body.style.setProperty('--bgov-o','0.3'); return; }

  document.body.style.overflow="hidden";
  $("#app").setAttribute("aria-hidden","true");

  let step = 0; let locked = false;
  function show(el){ el.style.display="block"; requestAnimationFrame(()=> el.classList.add("show")); }
  function fadeOut(el, cb){ el.classList.add("hiding"); el.classList.remove("show"); setTimeout(()=>{ el.style.display="none"; el.classList.remove("hiding"); cb&&cb(); }, 420); }

  s1.style.display="none"; s2.style.display="none"; s3.style.display="none";
  setTimeout(()=>{ step=1; show(s1); }, 1000);

  function revealRules(){
    s1.style.display="none"; s2.style.display="none"; show(s3);
    const items = Array.from(rulesList.children);
    items.forEach((li,i)=>{ li.classList.remove("show"); setTimeout(()=> li.classList.add("show"), 140 + i*90); });
  }

  function endIntro(){
    window.__intro_unlock_ts = Date.now() + 600;
    intro.classList.add("fading");
    setTimeout(()=>{
      intro.classList.add("hidden");
      $("#app").removeAttribute("aria-hidden");
      document.body.classList.add("reveal-start");
      requestAnimationFrame(()=>{
        document.body.classList.add("reveal-run");
        document.body.style.setProperty('--bgov-o','0.3');
        setTimeout(()=>{
          document.body.classList.remove("reveal-start");
          document.body.classList.remove("reveal-run");
          document.body.style.overflow="";
        }, 500);
      });
    }, 420);
  }

  intro.addEventListener("pointerup", (e)=>{
    e.preventDefault();
    if(locked) return; locked = true; setTimeout(()=> locked=false, 260);
    if(step===1){ fadeOut(s1, ()=>{ s2.style.display="block"; requestAnimationFrame(()=> s2.classList.add("show")); step=2; }); return; }
    if(step===2){ fadeOut(s2, ()=>{ revealRules(); step=3; }); return; }
    if(step===3){ endIntro(); step=4; return; }
  }, {passive:false});
}

function readCfg(){ return JSON.parse($("#cfg").textContent); }
function byCat(cfg){ const m={}; for(const c of cfg.categories) m[c.id]={...c, cards:[]}; for(const x of cfg.cards){ if(m[x.cat]) m[x.cat].cards.push(x); } return m; }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }

let CFG=null, CATS=null, SELECTED=new Set(), ORDER=[], IDX=-1, HIST=[], ORDER_MODE="shuffle", BUSY=false;
function setAccent(color){ document.body.style.setProperty("--accent", color || "#64b5f6"); }
function applyPalette(cat){
  const el=$("#card");
  if(!cat){
    el.style.setProperty("--fill","#DDF5D6"); el.style.setProperty("--stroke","#3E83A4");
    el.style.setProperty("--text","#39434C"); el.style.setProperty("--strokeW","12px"); setAccent("#64b5f6"); return;
  }
  const c=CATS[cat]; if(!c) return;
  el.style.setProperty("--fill", c.fill || "#fff");
  el.style.setProperty("--stroke", c.stroke || "#000");
  el.style.setProperty("--text", c.text || "#111");
  setAccent(c.stroke || "#64b5f6");
}
function buildOrder(){ const arr = CFG.cards.filter(x=> SELECTED.has(x.cat)); ORDER = (ORDER_MODE==="shuffle") ? shuffle(arr.map(x=>x.id)) : arr.map(x=>x.id); IDX=-1; updateProgress(); }
function cur(){ if(ORDER.length===0) return null; const id=ORDER[IDX]; return CFG.cards.find(c=>c.id===id)||null; }
function updateProgress(){ const total = ORDER.length; const current = (IDX>=0 && IDX<total) ? (IDX+1) : 0; $("#pcap").textContent = `${current} из ${total}`; const pct = total? (current/total*100) : 0; $("#pfill").style.width = pct + "%"; }

async function transitionTo(card, overlapColors=true){
  const inner = document.querySelector(".card-inner"); if(!inner) return;
  BUSY = true; inner.classList.add("fade-out"); if(card && overlapColors) applyPalette(card.cat); await wait(D/2);
  const qn=$("#qnum"), qt=$("#qtext");
  if(!card){ qn.textContent=""; qt.textContent="Выбери категории которые тебя интересуют и тапай чтобы начать :)"; applyPalette(null); }
  else { qn.textContent=`Вопрос ${IDX+1}:`; qt.textContent=card.text; if(!overlapColors) applyPalette(card.cat); }
  inner.style.transform = "translateY(-18px)"; void inner.offsetHeight; inner.classList.remove("fade-out"); await wait(D/2); inner.style.transform = "";
  $("#prevBtn").disabled = HIST.length===0; BUSY = false; updateProgress();
}

function setSelected(ids){ SELECTED = new Set(ids); buildOrder(); HIST.length=0; transitionTo(null); }
function setOrderMode(mode){ ORDER_MODE = (mode==="sequential") ? "sequential" : "shuffle"; buildOrder(); HIST.length=0; transitionTo(null); }
async function next(){ if(BUSY||ORDER.length===0) return; if(IDX>=0){ const last=cur(); if(last) HIST.push(last.id); } IDX++; if(IDX>=ORDER.length){ buildOrder(); IDX=0; } await transitionTo(cur()); }
async function prev(){ if(BUSY||HIST.length===0) return; const prevId=HIST.pop(); const pos=ORDER.indexOf(prevId); if(pos>=0){ IDX=pos; await transitionTo(cur()); } }

function openDeckDialog(){
  const list=$("#deckList"); list.innerHTML="";
  const allIds = Object.keys(CATS);
  const allChecked = allIds.every(id=> SELECTED.has(id));
  const mkAll = `<label class="deck-item"><input type="checkbox" id="deck_all" ${allChecked?"checked":""}>
    <span class="swatch" style="color:#93c5fd; background:#101114"></span>
    <span class="deck-name">Все категории</span></label>`;
  list.insertAdjacentHTML("beforeend", mkAll);
  for(const cat of Object.values(CATS)){
    const chk = SELECTED.has(cat.id) ? "checked" : "";
    list.insertAdjacentHTML("beforeend",
      `<label class="deck-item"><input type="checkbox" class="deckChk" value="${cat.id}" ${chk}>
      <span class="swatch" style="color:${cat.stroke||'#93c5fd'}; background:${cat.fill||'#101114'}"></span>
      <span class="deck-name">${cat.name}</span></label>`
    );
  }
  list.addEventListener("change", (e)=>{
    if(e.target.id==="deck_all"){
      const on = e.target.checked; list.querySelectorAll(".deckChk").forEach(c=> c.checked = on);
    } else if(e.target.classList.contains("deckChk")){
      const allOn = Array.from(list.querySelectorAll(".deckChk")).every(c=> c.checked);
      $("#deck_all").checked = allOn;
    }
  }, {once:false});
  document.querySelectorAll('input[name="orderMode"]').forEach(r=> r.checked = (r.value===ORDER_MODE));
  $("#deckDialog").showModal();
}
function applyDeck(){
  const modeVal = document.querySelector('input[name="orderMode"]:checked')?.value || ORDER_MODE;
  const ids = Array.from(document.querySelectorAll('.deckChk')).filter(c=> c.checked).map(c=> c.value);
  if(ids.length===0){ alert("Выбери хотя бы одну категорию"); return; }
  setOrderMode(modeVal); setSelected(ids); $("#deckDialog").close();
}

function bind(){
  const goNext = (e)=>{ e.preventDefault(); if(window.__intro_unlock_ts && Date.now() < window.__intro_unlock_ts) return; next(); };
  $("#card").addEventListener("click", goNext);
  $("#stage").addEventListener("pointerup", goNext);
  $("#nextBtn").addEventListener("click", goNext);
  $("#prevBtn").addEventListener("click", (e)=>{ e.preventDefault(); prev(); });
  $("#deckBtn").addEventListener("click", (e)=>{ e.preventDefault(); openDeckDialog(); });
  $("#applyDeckBtn").addEventListener("click", (e)=>{ e.preventDefault(); applyDeck(); });

  let sx=null;
  $("#stage").addEventListener("touchstart", e=>{ sx=e.changedTouches[0].clientX; }, {passive:true});
  $("#stage").addEventListener("touchend", e=>{ if(sx===null) return; const dx=e.changedTouches[0].clientX-sx; if(Math.abs(dx)>40){ if(dx<0) next(); else prev(); } sx=null; }, {passive:true});

  window.addEventListener("keydown", e=>{ if(e.key==="ArrowRight"||e.key===" ") next(); if(e.key==="ArrowLeft") prev(); });
}

(function init(){
  runIntro();
  const CFG0 = readCfg(); CATS = byCat(CFG0); CFG = CFG0;
  setSelected(Object.keys(CATS)); setOrderMode(CFG.defaultOrder === "sequential" ? "sequential" : "shuffle");
  transitionTo(null, false); bind(); updateProgress();
})();
