// v4: order mode toggle (shuffle/sequential) with config default.
const $ = (s)=> document.querySelector(s);

async function fetchConfig(){
  const urlParam = new URL(location.href).searchParams.get("cfg");
  const url = urlParam || "./config.json";
  try{ const r = await fetch(url, {cache:"no-cache"}); if(!r.ok) throw 0; return await r.json(); }
  catch(e){ return DEFAULT_CONFIG; }
}
function byCat(cfg){ const m={}; for(const c of cfg.categories) m[c.id]={...c, cards:[]}; for(const x of cfg.cards){ if(m[x.cat]) m[x.cat].cards.push(x); } return m; }
function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }

let CFG=null, CATS=null, CURRENT="all", ORDER=[], IDX=-1, HIST=[], ORDER_MODE="shuffle";

function buildOrder(){
  const arr = CURRENT==="all" ? CFG.cards : (CATS[CURRENT]?.cards||[]);
  ORDER = (ORDER_MODE === "shuffle") ? shuffle(arr.map(x=>x.id)) : arr.map(x=>x.id);
  IDX=-1;
}
function cur(){ if(ORDER.length===0) return null; const id=ORDER[IDX]; return CFG.cards.find(c=>c.id===id)||null; }

function applyPalette(cat){
  const el = $("#card");
  if(cat==="all" || !CATS[cat]){
    el.style.setProperty("--fill", "#DDF5D6");
    el.style.setProperty("--stroke", "#3E83A4");
    el.style.setProperty("--text", "#39434C");
    el.style.setProperty("--strokeW", "12px");
    return;
  }
  const c = CATS[cat];
  el.style.setProperty("--fill", c.fill || "#fff");
  el.style.setProperty("--stroke", c.stroke || "#000");
  el.style.setProperty("--text", c.text || "#111");
  el.style.setProperty("--strokeW", (c.strokeW ? (c.strokeW|0)+"px" : "12px"));
}

function renderCard(card){
  const qn=$("#qnum"), qt=$("#qtext");
  if(!card){ qn.textContent="Вопрос"; qt.textContent="Тапни, чтобы начать"; applyPalette("all"); $("#prevBtn").disabled = HIST.length===0; return; }
  qn.textContent = `Вопрос ${IDX+1}:`; qt.textContent = card.text; applyPalette(card.cat); $("#prevBtn").disabled = HIST.length===0;
}

function setCat(id){ CURRENT=id; buildOrder(); HIST.length=0; renderCard(null); }
function setOrderMode(mode){ ORDER_MODE = (mode==="sequential") ? "sequential" : "shuffle"; buildOrder(); HIST.length=0; renderCard(null); }

function next(){ if(ORDER.length===0) return; if(IDX>=0){ const last=cur(); if(last) HIST.push(last.id); } IDX++; if(IDX>=ORDER.length){ buildOrder(); IDX=0; } renderCard(cur()); }
function prev(){ if(HIST.length===0) return; const prevId=HIST.pop(); const pos=ORDER.indexOf(prevId); if(pos>=0){ IDX=pos; renderCard(cur()); } }

function openDeckDialog(){
  const list=$("#deckList"); list.innerHTML="";
  const mk=(cat)=>`<label class="deck-item"><input type="radio" name="deck" value="${cat.id}">
    <span class="swatch" style="color:${cat.stroke||'#93c5fd'}; background:${cat.fill||'#101114'}"></span>
    <span class="deck-name">${cat.name}</span></label>`;
  list.insertAdjacentHTML("beforeend", `<label class="deck-item"><input type="radio" name="deck" value="all"><span class="swatch" style="color:#93c5fd; background:#101114"></span><span class="deck-name">Все</span></label>`);
  for(const cat of Object.values(CATS)){ list.insertAdjacentHTML("beforeend", mk(cat)); }
  // set radios
  const radios = list.querySelectorAll('input[type="radio"][name="deck"]');
  radios.forEach(r=>{ if(r.value===CURRENT) r.checked=true; });
  document.querySelectorAll('input[name="orderMode"]').forEach(r=> r.checked = (r.value===ORDER_MODE));
  $("#deckDialog").showModal();
}
function applyDeck(){
  const deckVal = document.querySelector('input[name="deck"]:checked')?.value || "all";
  const modeVal = document.querySelector('input[name="orderMode"]:checked')?.value || ORDER_MODE;
  setCat(deckVal);
  setOrderMode(modeVal);
  $("#deckDialog").close();
}

function bind(){
  const goNext = (e)=>{ e.preventDefault(); next(); };
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

const DEFAULT_CONFIG = {
  version: 4,
  defaultOrder: "shuffle",
  categories: [
    {id:"trust", name:"Доверие", fill:"#DDF5D6", stroke:"#3E83A4", text:"#39434C", strokeW:12},
    {id:"close", name:"Близость и нежность", fill:"#D9EFF6", stroke:"#3E83A4", text:"#3E4A54", strokeW:12},
    {id:"bounds", name:"Границы", fill:"#F3F3C8", stroke:"#9F8F3E", text:"#5A5A44", strokeW:12}
  ],
  cards: [
    {id:"t1", cat:"trust", text:"Когда я молчу/закрываюсь, что чаще всего за этим стоит и как тебе лучше реагировать?"},
    {id:"t2", cat:"trust", text:"В чём мне сложнее всего просить помощи у тебя?"},
    {id:"c1", cat:"close", text:"Что для тебя знак заботы, который я иногда упускаю?"},
    {id:"b1", cat:"bounds", text:"Где тебе нужна моя защита от внешних требований?"}
  ]
};

(async function init(){
  const cfg = await fetchConfig();
  CFG = cfg; CATS = byCat(cfg);
  const def = (cfg.defaultOrder === "sequential") ? "sequential" : "shuffle";
  setOrderMode(def);
  setCat("all");
  renderCard(null);
  bind();
})();
