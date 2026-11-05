/* =========================================================
   西北非遗 · 五省手艺影像志 —— 路由 / 渲染 / 轮播 / 影像
   ========================================================= */

const app = document.getElementById("app");
const topbar = document.getElementById("topbar");
const navSearch = document.getElementById("navSearch");
const searchLayer = document.getElementById("searchLayer");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const vmodal = document.getElementById("vmodal");
const vmodalFrame = document.getElementById("vmodalFrame");
const vmodalLink = document.getElementById("vmodalLink");
const vmodalX = document.getElementById("vmodalX");

/* ---------- 数据与图片 ---------- */
const IMG = window.IMG_MAP || {};
const VIDEOS = window.VIDEO_LIST || [];
const CHAT_ENDPOINT = (window.APP_CONFIG && window.APP_CONFIG.CHAT_ENDPOINT) || "http://127.0.0.1:4190/api/chat";
const PROV_BY_ID = Object.fromEntries(PROVINCES.map(p => [p.id, p]));
const CITY_BY_ID = Object.fromEntries(CITIES.map(c => [c.id, c]));

const itemById = id => ITEMS.find(i => i.id === id);
const itemsByProvince = pid => ITEMS.filter(i => i.provinceId === pid);
const itemsByCity = cid => ITEMS.filter(i => i.cityId === cid);
const countByCity = cid => itemsByCity(cid).length;
const countByProvince = pid => itemsByProvince(pid).length;
const countByCat = cat => ITEMS.filter(i => i.category === cat).length;
/* 只保留真正收录了项目的城市：地图打点、城市索引都以此为准 */
const CITIES_WITH_ITEMS = CITIES.filter(c => ITEMS.some(i => i.cityId === c.id));
const hasItems = cid => ITEMS.some(i => i.cityId === cid);
const LEVEL_RANK = lv => LEVELS.indexOf(lv);

const firstImg = () => Object.values(IMG).find(Boolean) || "";
const imgProv = id => IMG["scene_" + id] || IMG["scene_shaanxi"] || firstImg();
/* 个别项目网上没有可靠图，借用同类正确题材的图，避免书籍/展位等错图 */
const IMG_ALIAS = { puhua: "suona", yulinxiaoqv: "shuoshu", liangzhouxianxiao: "heixibaojuan", yangshinisu: "qingyangxiangbao" };
const imgItem = it => IMG[it.id] || (IMG_ALIAS[it.id] && IMG[IMG_ALIAS[it.id]]) || imgProv(it.provinceId);

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const xmlEsc = (s = "") =>
  String(s).replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]));

/* ---------- 兜底封面（无照片时） ---------- */
const PALETTE = [["#2a2520", "#15120f"], ["#2b2119", "#141110"], ["#241f1a", "#121010"]];
function makeCover(item, seed = 0) {
  const [c1, c2] = PALETTE[seed % PALETTE.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs>
  <rect width="800" height="600" fill="url(#g)"/>
  <circle cx="620" cy="150" r="120" fill="none" stroke="#d24b3a" stroke-opacity=".5" stroke-width="2"/>
  <text x="60" y="470" font-size="54" fill="#f3efe7" font-family="Songti SC,STSong,SimSun,serif">${xmlEsc(item.summary.slice(0, 9))}</text>
  <text x="60" y="516" font-size="22" fill="#8a8177" letter-spacing="3" font-family="PingFang SC,Microsoft YaHei,sans-serif">${xmlEsc(item.city + " · " + item.category)}</text>
</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* ---------- 顶栏 / 搜索 ---------- */
function onScroll() {
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  topbar.classList.toggle("scrolled", y > 40);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
  const fill = document.getElementById("scrollFill");
  if (fill) fill.style.transform = "scaleX(" + p + ")";
}
window.addEventListener("scroll", onScroll, { passive: true });

function openSearch() {
  searchLayer.classList.add("on");
  searchLayer.setAttribute("aria-hidden", "false");
  setTimeout(() => searchInput.focus(), 60);
}
function closeSearch() {
  searchLayer.classList.remove("on");
  searchLayer.setAttribute("aria-hidden", "true");
}
navSearch.addEventListener("click", openSearch);
searchLayer.addEventListener("click", e => { if (e.target === searchLayer) closeSearch(); });
searchForm.addEventListener("submit", e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  closeSearch();
  location.hash = "#/discover" + (q ? "?kw=" + encodeURIComponent(q) : "");
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeSearch(); });

function setNav(name) {
  document.querySelectorAll(".nav a").forEach(a => a.classList.toggle("active", a.dataset.nav === name));
}

/* ---------- 路由 ---------- */
function parseHash() {
  let h = location.hash.replace(/^#\/?/, "");
  const [path, qs] = h.split("?");
  const params = new URLSearchParams(qs || "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "home", params };
  if (parts[0] === "discover") return { name: "discover", params };
  if (parts[0] === "map") return { name: "map", params };
  if (parts[0] === "ask") return { name: "ask", params };
  if (parts[0] === "about") return { name: "about", params };
  if (parts[0] === "item") return { name: "item", id: parts[1], params };
  return { name: "home", params };
}

let heroCleanup = null;
function render() {
  const r = parseHash();
  document.body.classList.toggle("is-home", r.name === "home");
  if (heroCleanup) { heroCleanup(); heroCleanup = null; }
  destroyChinaMap();
  window.scrollTo(0, 0);
  if (r.name === "home") renderHome();
  else if (r.name === "discover") renderDiscover(r.params);
  else if (r.name === "map") renderMap();
  else if (r.name === "ask") renderAsk(r.params);
  else if (r.name === "about") renderAbout();
  else if (r.name === "item") renderItem(r.id);
  else renderHome();
  observeReveals();
  onScroll();
}

/* ---------- 组件 ---------- */
function cardHTML(it, seed = 0) {
  const src = imgItem(it) || makeCover(it, seed);
  return `<a class="card reveal" href="#/item/${it.id}">
    <div class="card-img"><img src="${src}" alt="${esc(it.name)}" loading="lazy" decoding="async">
      <span class="card-level${it.level === "世界级" ? " is-world" : ""}">${esc(it.level)}</span>
      <span class="card-arrow">↗</span></div>
    <div class="card-info">
      <h3 class="card-name">${esc(it.name)}</h3>
      <p class="card-meta"><i>${esc(it.city)}</i> · ${esc(it.category)}</p>
      <p class="card-sum">${esc(it.summary)}</p>
    </div>
  </a>`;
}

const VIDKEY = { "安塞腰鼓": "yaogu", "华县皮影戏": "pixi", "秦腔": "qinqiang", "陕北民歌": "shanbeiminge", "临夏花儿": "linxiahuaer", "热贡唐卡": "regongyishu", "维吾尔木卡姆艺术": "muqam", "维吾尔族达瓦孜": "dawaazi", "艾德莱斯绸织染技艺": "aidelaisi", "维吾尔族麦西热甫": "meshrep" };
function videoHTML(v) {
  const poster = IMG[VIDKEY[v.topic]] || imgProv("shaanxi");
  return `<div class="vid reveal" data-bvid="${esc(v.bvid)}">
    <img src="${poster}" alt="${esc(v.topic)}" loading="lazy" decoding="async">
    <div class="vid-grad"></div>
    <span class="vid-play" aria-hidden="true"></span>
    <div class="vid-info"><h4>${esc(v.title || v.topic)}</h4><p>${esc(v.up || "哔哩哔哩")} · ${esc(v.topic)}</p></div>
  </div>`;
}
function biliIframe(bvid) {
  return `<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=1" allow="autoplay; fullscreen" allowfullscreen scrolling="no"></iframe>`;
}
function openVideo(bvid) {
  if (!vmodal) return;
  const v = VIDEOS.find(x => x.bvid === bvid) || {};
  const local = v.file;
  if (local) {
    /* 优先播放本地下载的视频；若本地文件缺失/损坏，自动回退到 B 站 iframe */
    const vposter = IMG[VIDKEY[v.topic]] || "";
    vmodalFrame.innerHTML = `<video src="${esc(local)}"${vposter ? ` poster="${esc(vposter)}"` : ""} controls autoplay playsinline preload="metadata"></video>`;
    const vid = vmodalFrame.querySelector("video");
    if (vid) vid.addEventListener("error", () => { vmodalFrame.innerHTML = biliIframe(bvid); }, { once: true });
  } else {
    vmodalFrame.innerHTML = biliIframe(bvid);
  }
  vmodalLink.href = "https://www.bilibili.com/video/" + bvid;
  vmodal.classList.add("on");
  vmodal.setAttribute("aria-hidden", "false");
}
function closeVideo() {
  if (!vmodal) return;
  vmodal.classList.remove("on");
  vmodal.setAttribute("aria-hidden", "true");
  vmodalFrame.innerHTML = "";
}
if (vmodalX) vmodalX.addEventListener("click", closeVideo);
if (vmodal) vmodal.addEventListener("click", e => { if (e.target === vmodal) closeVideo(); });
document.addEventListener("keydown", e => { if (e.key === "Escape") closeVideo(); });

function bindVideos() {
  const box = document.querySelector(".videos");
  if (!box) return;
  box.addEventListener("click", e => {
    const el = e.target.closest(".vid");
    if (!el) return;
    openVideo(el.dataset.bvid);
  });
}

/* =========================================================
   首页
   ========================================================= */
const HERO_TITLES = { shaanxi: "八百里秦川", gansu: "河西走廊", ningxia: "塞上江南", qinghai: "青海长云", xinjiang: "天山南北" };
const ASK_PRESETS = [
  "秦腔和京剧有什么区别？",
  "安塞腰鼓为什么在陕北？",
  "推荐三项适合孩子了解的非遗",
  "去西安看非遗，两天怎么安排？"
];

function renderHome() {
  setNav("home");
  const slides = PROVINCES.map(p => ({
    id: p.id, name: p.name, short: p.short,
    title: HERO_TITLES[p.id] || p.name,
    desc: p.desc, note: p.note,
    count: countByProvince(p.id), cities: p.cities.length,
    img: imgProv(p.id)
  }));
  const featured = PROVINCES.flatMap(p => itemsByProvince(p.id).slice(0, 2));

  app.innerHTML = `
  <section class="hero" id="hero">
    <div class="hero-bg">
      ${slides.map((s, i) => `<div class="hero-slide ${i === 0 ? "on" : ""}" style="background-image:url('${s.img}')"></div>`).join("")}
    </div>
    <div class="hero-scrim"></div>
    <div class="hero-body">
      <div class="hero-copy">
        <p class="hero-kicker">西北非物质文化遗产<span class="ken"> · SHAANXI / GANSU / NINGXIA / QINGHAI / XINJIANG</span></p>
        <h1 class="hero-title" id="heroTitle">${esc(slides[0].title)}</h1>
        <p class="hero-text" id="heroText">${esc(slides[0].desc)}</p>
        <div class="hero-meta" id="heroMeta"></div>
        <div class="hero-actions">
          <button class="btn btn-light" id="toProv">走进五省 <span class="ar">→</span></button>
          <button class="btn btn-ghost" id="heroRand">随机一项</button>
        </div>
      </div>
      <div class="hero-side">
        <div class="hero-thumbs" id="heroThumbs">
          ${slides.map((s, i) => `<button class="thumb ${i === 0 ? "on" : ""}" data-i="${i}"><img src="${s.img}" alt="${esc(s.name)}" loading="lazy" decoding="async"><span>${esc(s.name)}</span></button>`).join("")}
        </div>
        <div class="hero-counter"><span class="auto-pill"><i></i>AUTO</span><span id="heroCounter">01 / ${String(slides.length).padStart(2, "0")}</span></div>
      </div>
    </div>
    <div class="hero-progress"><i id="heroProg"></i></div>
  </section>

  <section class="sec" id="provinces">
    <div class="sec-head reveal"><p class="kicker">五 省</p><h2 class="sec-title">山河各有脾气</h2><div class="sec-rule"></div>
      <p class="sec-sub">从黄土高原到河西走廊，从贺兰山到青海湖，再到天山南北——同一种守艺的心，长出五种面貌。</p></div>
    <div class="prov-cards">
      ${PROVINCES.map(p => `<a class="prov-card reveal" href="#/discover?province=${p.id}">
        <img src="${imgProv(p.id)}" alt="${esc(p.name)}" loading="lazy" decoding="async">
        <div class="prov-grad"></div>
        <span class="prov-big">${esc(p.short)}</span>
        <div class="prov-info"><h3>${esc(p.name)}</h3><p>${esc(p.note)}</p>
          <div class="prov-meta"><b>${countByProvince(p.id)}</b><span>项收录</span></div></div>
      </a>`).join("")}
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="sec-head reveal"><p class="kicker">精 选</p><h2 class="sec-title">先读这几页</h2><div class="sec-rule"></div></div>
    <div class="cards">${featured.map((it, i) => cardHTML(it, i)).join("")}</div>
  </section>

  ${VIDEOS.length ? `<section class="sec" style="padding-top:0">
    <div class="sec-head reveal"><p class="kicker">影 像</p><h2 class="sec-title">真实现场</h2><div class="sec-rule"></div>
      <p class="sec-sub">鼓点、唱腔、光影——点开即播（来自哔哩哔哩的真实记录）。</p></div>
    <div class="videos">${VIDEOS.map(videoHTML).join("")}</div>
  </section>` : ""}

  <section class="sec" style="padding-top:0">
    <div class="sec-head reveal"><p class="kicker">AI 问 答</p><h2 class="sec-title">有问题，随时问</h2><div class="sec-rule"></div>
      <p class="sec-sub">关于五省非遗的历史、技艺、去处，AI 助手随时接话——不确定的它会直说。</p></div>
    <div class="ask-teaser reveal">
      <div class="ask-chips">
        ${ASK_PRESETS.map(q => `<button data-q="${esc(q)}">${esc(q)}</button>`).join("")}
      </div>
      <form class="ask-mini" id="askMini">
        <input id="askMiniInput" placeholder="问点什么…" autocomplete="off">
        <button type="submit">去问 <span class="ar">→</span></button>
      </form>
    </div>
  </section>

  <section class="sec" style="padding-top:0">
    <div class="sec-head reveal"><p class="kicker">门 类</p><h2 class="sec-title">十大类，各有一双手</h2><div class="sec-rule"></div></div>
    <div class="cat-row">${CATEGORIES.map(c => `<a class="cat-chip" href="#/discover?category=${encodeURIComponent(c)}">${esc(c)} <b>${countByCat(c)}</b></a>`).join("")}</div>
  </section>`;

  const toProv = document.getElementById("toProv");
  if (toProv) toProv.addEventListener("click", () => {
    const s = document.getElementById("provinces");
    if (s) s.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const hr = document.getElementById("heroRand");
  if (hr) hr.addEventListener("click", goRandom);

  bindVideos();

  const askTeaser = document.querySelector(".ask-teaser");
  if (askTeaser) askTeaser.addEventListener("click", e => {
    const b = e.target.closest("[data-q]");
    if (b) location.hash = "#/ask?q=" + encodeURIComponent(b.dataset.q);
  });
  const askMini = document.getElementById("askMini");
  if (askMini) askMini.addEventListener("submit", e => {
    e.preventDefault();
    const v = document.getElementById("askMiniInput").value.trim();
    location.hash = "#/ask" + (v ? "?q=" + encodeURIComponent(v) : "");
  });

  heroCleanup = initHero(slides);
}

function initHero(slides) {
  const hero = document.getElementById("hero");
  if (!hero) return null;
  const els = [...hero.querySelectorAll(".hero-slide")];
  const thumbs = [...hero.querySelectorAll(".thumb")];
  const title = document.getElementById("heroTitle");
  const text = document.getElementById("heroText");
  const meta = document.getElementById("heroMeta");
  const counter = document.getElementById("heroCounter");
  const prog = document.getElementById("heroProg");
  const copy = hero.querySelector(".hero-copy");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let idx = 0, timer = null, paused = false;

  function go(i) {
    idx = (i + slides.length) % slides.length;
    const s = slides[idx];
    els.forEach((el, k) => el.classList.toggle("on", k === idx));
    thumbs.forEach((el, k) => el.classList.toggle("on", k === idx));
    title.textContent = s.title;
    text.textContent = s.desc;
    meta.innerHTML = `<div><b>${s.count}</b><span>项 非 遗</span></div><div><b>${s.cities}</b><span>座 城 市</span></div><div><b>${String(idx + 1).padStart(2, "0")}</b><span>/ ${String(slides.length).padStart(2, "0")} 省 区</span></div>`;
    counter.textContent = String(idx + 1).padStart(2, "0") + " / " + String(slides.length).padStart(2, "0");
    if (prog) {
      prog.style.animation = "none";
      void prog.offsetWidth;
      prog.style.animation = "heroProg 6000ms linear forwards";
      prog.style.animationPlayState = "running";
    }
    if (copy) {
      copy.classList.remove("swap");
      void copy.offsetWidth;
      copy.classList.add("swap");
    }
  }
  function start() {
    if (timer) clearInterval(timer);
    if (!paused && !reduce) timer = setInterval(() => go(idx + 1), 6000);
  }
  thumbs.forEach(el => el.addEventListener("click", () => { go(+el.dataset.i); start(); }));
  hero.addEventListener("mouseenter", () => { paused = true; if (timer) clearInterval(timer); if (prog) prog.style.animationPlayState = "paused"; });
  hero.addEventListener("mouseleave", () => { paused = false; go(idx); start(); });
  go(0); start();
  return () => { if (timer) clearInterval(timer); };
}

function goRandom() {
  const it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  location.hash = "#/item/" + it.id;
}

/* =========================================================
   发现页
   ========================================================= */
const disc = { province: "", city: "", category: "", kw: "", sort: "default" };

function renderDiscover(params = new URLSearchParams()) {
  setNav("discover");
  disc.province = params.get("province") || "";
  disc.city = params.get("city") || "";
  disc.category = params.get("category") || "";
  disc.kw = params.get("kw") || "";
  disc.sort = "default";

  const scope = disc.province && PROV_BY_ID[disc.province] ? PROV_BY_ID[disc.province].name
    : disc.city && CITY_BY_ID[disc.city] ? CITY_BY_ID[disc.city].name : "西北五省";

  app.innerHTML = `
  <header class="page-head">
    <p class="kicker">五 省 非 遗</p>
    <h1 class="page-title">${esc(scope)}的<em>手艺</em></h1>
    <p class="page-lead">按省份、城市、门类与关键词自由组合，挑一门手艺，慢慢读下去。</p>
  </header>
  <div class="filters">
    <div class="filters-in">
      <div id="provChips" style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="chip ${disc.province === "" ? "on" : ""}" data-prov="">全部省份</button>
        ${PROVINCES.map(p => `<button class="chip ${disc.province === p.id ? "on r" : ""}" data-prov="${p.id}">${esc(p.name)}</button>`).join("")}
      </div>
      <div style="flex:1"></div>
      <div class="filter-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5L21 21"/></svg>
        <input type="search" id="discKw" placeholder="搜非遗、城市、门类…" value="${esc(disc.kw)}" autocomplete="off">
      </div>
      <div class="sel"><select id="discSort">
        <option value="default">排序：默认</option><option value="level">按保护级别</option>
        <option value="city">按城市</option><option value="name">按名称</option>
      </select></div>
    </div>
  </div>
  <div class="result-bar" id="discBar"></div>
  <section class="sec" style="padding-top:34px">
    <div id="catChips" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px">
      <button class="chip ${disc.category === "" ? "on" : ""}" data-cat="">全部门类</button>
      ${CATEGORIES.map(c => `<button class="chip ${disc.category === c ? "on r" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}
    </div>
    <div class="cards" id="discResults"></div>
  </section>`;

  const kw = document.getElementById("discKw");
  const sort = document.getElementById("discSort");
  document.getElementById("provChips").addEventListener("click", e => {
    const b = e.target.closest("[data-prov]"); if (!b) return;
    disc.province = b.dataset.prov; disc.city = ""; syncChips(); updateDiscover();
  });
  document.getElementById("catChips").addEventListener("click", e => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    disc.category = b.dataset.cat; syncChips(); updateDiscover();
  });
  kw.addEventListener("input", () => { disc.kw = kw.value; updateDiscover(); });
  sort.addEventListener("change", () => { disc.sort = sort.value; updateDiscover(); });
  updateDiscover();
}

function syncChips() {
  document.querySelectorAll("#provChips .chip").forEach(c => {
    const on = c.dataset.prov === disc.province;
    c.classList.toggle("on", on); c.classList.toggle("r", on && disc.province !== "");
  });
  document.querySelectorAll("#catChips .chip").forEach(c => c.classList.toggle("on", c.dataset.cat === disc.category));
}

function filteredItems() {
  let list = ITEMS.slice();
  if (disc.province) list = list.filter(i => i.provinceId === disc.province);
  if (disc.city) list = list.filter(i => i.cityId === disc.city);
  if (disc.category) list = list.filter(i => i.category === disc.category);
  const k = disc.kw.trim().toLowerCase();
  if (k) list = list.filter(i => (i.name + i.city + i.category + i.summary + i.history + i.feature).toLowerCase().includes(k));
  if (disc.sort === "level") list.sort((a, b) => LEVEL_RANK(a.level) - LEVEL_RANK(b.level));
  else if (disc.sort === "city") list.sort((a, b) => a.city.localeCompare(b.city, "zh"));
  else if (disc.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "zh"));
  return list;
}

function updateDiscover() {
  const list = filteredItems();
  const bar = document.getElementById("discBar");
  const box = document.getElementById("discResults");
  if (bar) bar.innerHTML = `共 <b>${list.length}</b> 项${disc.province && PROV_BY_ID[disc.province] ? " · " + esc(PROV_BY_ID[disc.province].name) : ""}${disc.category ? " · " + esc(disc.category) : ""}${disc.kw ? " · “" + esc(disc.kw) + "”" : ""}${(disc.province || disc.category || disc.kw) ? '<span class="clear" id="clearDisc">清空</span>' : ""}`;
  if (box) box.innerHTML = list.length ? list.map((it, i) => cardHTML(it, i)).join("")
    : `<div class="empty">没有匹配的项目，换个关键词或清空筛选试试。</div>`;
  const cl = document.getElementById("clearDisc");
  if (cl) cl.addEventListener("click", () => { location.hash = "#/discover"; });
  observeReveals();
}

/* =========================================================
   详情页
   ========================================================= */
function renderItem(id) {
  const it = itemById(id);
  if (!it) { renderHome(); return; }
  setNav("discover");
  const p = PROV_BY_ID[it.provinceId];
  const idx = ITEMS.findIndex(i => i.id === id);
  const prev = ITEMS[(idx - 1 + ITEMS.length) % ITEMS.length];
  const next = ITEMS[(idx + 1) % ITEMS.length];
  const related = ITEMS.filter(i => i.id !== id && (i.provinceId === it.provinceId || i.category === it.category)).slice(0, 4);
  const heroImg = imgItem(it) || makeCover(it);
  const gal = [heroImg, imgProv(it.provinceId), (related[0] ? imgItem(related[0]) : imgProv(it.provinceId))];

  app.innerHTML = `
  <article>
    <section class="item-hero">
      <div class="bg" style="background-image:url('${heroImg}')"></div>
      <div class="scrim"></div>
      <div class="item-in">
        <a class="back" href="#/discover${p ? "?province=" + p.id : ""}">← 回到${esc(p ? p.name : "五省")}</a>
        <div class="item-tags">
          <span class="tag red">${esc(it.level)}</span>
          <span class="tag">${esc(it.category)}</span>
          <span class="tag">${esc(p ? p.name : "")}</span>
        </div>
        <h1 class="item-title">${esc(it.name)}</h1>
        <p class="item-city">${esc(it.city)}</p>
        <p class="item-sum">${esc(it.summary)}</p>
      </div>
    </section>

    <div class="item-body">
      <section class="dsection reveal">
        <div class="dhead"><span class="dnum">壹</span><h2 class="dh2">历史由来</h2></div>
        <p class="dp">${esc(it.history)}</p>
      </section>
      <section class="dsection reveal">
        <div class="dhead"><span class="dnum">贰</span><h2 class="dh2">技艺特点</h2></div>
        <p class="dp">${esc(it.feature)}</p>
        <div class="gallery">
          ${gal.map(src => `<img src="${src}" alt="${esc(it.name)}" loading="lazy" decoding="async">`).join("")}
        </div>
      </section>
      <section class="dsection reveal">
        <div class="dhead"><span class="dnum">叁</span><h2 class="dh2">传承现状</h2></div>
        <p class="dp">${esc(it.inheritor)}</p>
      </section>
      <section class="dsection reveal">
        <div class="dhead"><span class="dnum">肆</span><h2 class="dh2">冷知识</h2></div>
        <p class="dfact">${esc(it.fact)}</p>
      </section>

      <div class="item-nav">
        <a class="nav-card prev" href="#/item/${prev.id}" aria-label="上一项：${esc(prev.name)}"><img src="${imgItem(prev) || makeCover(prev)}" alt="${esc(prev.name)}" loading="lazy" decoding="async"><span class="nc-grad"></span><span class="nc-in"><span class="nc-k">← 上一页</span><span class="nc-n">${esc(prev.name)}</span></span></a>
        <a class="nav-card next" href="#/item/${next.id}" aria-label="下一项：${esc(next.name)}"><img src="${imgItem(next) || makeCover(next)}" alt="${esc(next.name)}" loading="lazy" decoding="async"><span class="nc-grad"></span><span class="nc-in"><span class="nc-k">下一页 →</span><span class="nc-n">${esc(next.name)}</span></span></a>
      </div>
    </div>

    ${related.length ? `<section class="sec" style="padding-top:0">
      <div class="sec-head reveal"><p class="kicker">同 乡 · 同 类</p><h2 class="sec-title">接着读这几页</h2><div class="sec-rule"></div></div>
      <div class="cards">${related.map((r, i) => cardHTML(r, i)).join("")}</div>
    </section>` : ""}
  </article>`;
}

/* =========================================================
   地图
   ========================================================= */
/* 城市经纬度（GCJ-02 近似） */
const GEO = {
  xian: [34.3416, 108.9398], baoji: [34.361, 107.237], xianyang: [34.329, 108.709], tongchuan: [34.897, 108.945], weinan: [34.499, 109.510],
  yanan: [36.585, 109.490], yulin: [38.285, 109.734], hanzhong: [33.067, 107.023], ankang: [32.684, 109.029], shangluo: [33.868, 109.940],
  lanzhou: [36.061, 103.834], jiuquan: [40.142, 94.662], zhangye: [38.925, 100.449], wuwei: [37.928, 102.638], tianshui: [34.581, 105.725], qingyang: [35.709, 107.638], linxia: [35.601, 103.212],
  yinchuan: [38.487, 106.231], wuzhong: [37.997, 106.199], guyuan: [36.004, 106.279], zhongwei: [37.515, 105.189],
  xining: [36.617, 101.778], haidong: [36.502, 102.104], huangnan: [35.520, 102.015], yushu: [33.004, 97.008],
  urumqi: [43.8256, 87.6168], kashgar: [39.4704, 75.9898], turpan: [42.9476, 89.1841], yining: [43.9074, 81.2778],  aksu: [41.1688, 80.2606], hotan: [37.1143, 79.9225], korla: [41.7259, 86.1746], hami: [42.8332, 93.5153],
  altay: [47.8449, 88.1396], changji: [44.0113, 87.3082], atushi: [39.7161, 76.1683],
  gannan: [35.0000, 102.9100]
};
const PROV_LABEL = {
  shaanxi: ["陕西", 34.34, 108.94], gansu: ["甘肃", 38.4, 100.4], ningxia: ["宁夏", 37.7, 106.1],
  qinghai: ["青海", 35.8, 98.6], xinjiang: ["新疆", 41.6, 85.2]
};

let tmap = null;       // 官方 SDK 实例（AMap / TMap）
let orbitMap = null;   // 瓦片地图句柄（MapLibre + 高德瓦片）
function destroyChinaMap() {
  if (orbitMap) { try { orbitMap.destroy(); } catch (e) {} orbitMap = null; }
  if (tmap) { try { tmap.destroy(); } catch (e) {} tmap = null; }
}

function ensureTMap(cb) {
  if (window.TMap) return cb();
  const cfg = window._TMapSecurityConfig || {};
  const proxyReady = cfg.serviceHost && !String(cfg.serviceHost).includes("__WB_");
  const key = (window.APP_CONFIG && window.APP_CONFIG.TENCENT_MAP_KEY) || "";
  if (!proxyReady && !key) return cb(new Error("noauth"));
  let src = "https://map.qq.com/api/gljs?v=1.exp";
  if (!proxyReady) src += "&key=" + encodeURIComponent(key);
  const s = document.createElement("script");
  s.src = src;
  s.onload = () => cb();
  s.onerror = () => cb(new Error("load"));
  document.head.appendChild(s);
}

/* config 里的 Key 是否仍是未替换的占位符 */
function isPlaceholderVal(s) {
  const v = String(s || "").trim();
  return !v || /请到|自行申请|占位|placeholder|YOUR_|__/.test(v);
}

/* ---------- 高德地图（AMap JS API 2.0，官方瓦片底图） ---------- */
/* Key 取值优先级：本机 localStorage（页面内临时填入） > config.js */
function getAMapKey() {
  const cfg = window.APP_CONFIG || {};
  const ls = k => { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } };
  const key = (ls("AMAP_KEY") || cfg.AMAP_KEY || "").trim();
  const sec = (ls("AMAP_SECURITY_CODE") || cfg.AMAP_SECURITY_CODE || "").trim();
  return { key, sec };
}

function ensureAMap(cb) {
  if (window.AMap) return cb();
  const { key, sec } = getAMapKey();
  if (isPlaceholderVal(key)) return cb(new Error("nokey"));
  /* 安全密钥必须在 SDK 加载前注入 */
  if (!isPlaceholderVal(sec)) window._AMapSecurityConfig = { securityJsCode: sec };
  const s = document.createElement("script");
  s.src = "https://webapi.amap.com/maps?v=2.0&key=" + encodeURIComponent(key);
  s.onload = () => cb();
  s.onerror = () => cb(new Error("load"));
  document.head.appendChild(s);
}

function dotIcon(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"><circle cx="9" cy="9" r="7" fill="${color}" fill-opacity="0.94" stroke="#fff" stroke-width="2"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function initAMap(box, onFail) {
  ensureAMap(err => {
    if (err || !window.AMap) { onFail && onFail(err && err.message); return; }
    try {
      /* viewMode 2D = 高德栅格瓦片底图；GCJ-02 坐标 */
      const map = new AMap.Map(box, {
        zoom: 4.3, center: [103.6, 35.4], viewMode: "2D", resizeEnable: true, showIndoorMap: false
      });
      tmap = map;
      PROVINCES.forEach(p => p.cities.forEach(c => {
        const g = GEO[c.id];
        if (!g || !hasItems(c.id)) return;
        const mk = new AMap.Marker({
          position: [g[1], g[0]],                       // [lng, lat]
          icon: new AMap.Icon({ size: new AMap.Size(18, 18), image: dotIcon(p.palette), imageSize: new AMap.Size(18, 18) }),
          offset: new AMap.Pixel(-9, -9), title: c.name
        });
        mk.on("click", () => { location.hash = "#/discover?city=" + c.id; });
        map.add(mk);
      }));
      Object.values(PROV_LABEL).forEach(v => {
        map.add(new AMap.Text({
          text: v[0], position: [v[2], v[1]], anchor: "center", offset: new AMap.Pixel(0, -22),
          style: { "background": "none", "border": "none", "color": "#f3efe7", "font-size": "15px", "font-weight": "600", "text-shadow": "0 1px 6px rgba(0,0,0,.9)" }
        }));
      });
      box.classList.add("ready");
      setTimeout(() => { try { map.resize(); } catch (e) {} }, 400);
    } catch (e) { onFail && onFail("init"); }
  });
}

/* 地图始终内嵌在本页：无 Key 时在页面内给出授权入口，不跳转任何独立页面 */
function showMapFallback(box) {
  box.innerHTML = `<div class="map-fallback"><div class="mf-in">
    <p class="mf-title">中国地图</p>
    <p>地图直接嵌入在本页，但需要地图服务授权才能加载瓦片。填入高德 Key 后即刻在本页渲染，不会打开独立页面。</p>
    <form class="mf-key" id="mfKeyForm" autocomplete="off">
      <input id="mfKey" type="text" placeholder="高德 Key（Web端 JS API）" autocomplete="off">
      <input id="mfSec" type="text" placeholder="安全密钥 securityJsCode（选填但推荐）" autocomplete="off">
      <button class="btn btn-light" type="submit">在本页显示地图</button>
    </form>
    <p class="mf-hint">申请入口：<a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener">console.amap.com</a>
      → 应用管理 → 添加 Key → 服务平台选「Web端(JS API)」。<br>
      Key 仅保存在本机浏览器 localStorage，仅用于本地调试；正式部署请写入 <code>config.js</code> 并配置 Referer 域名白名单。</p>
  </div></div>`;

  const form = document.getElementById("mfKeyForm");
  if (form) form.addEventListener("submit", e => {
    e.preventDefault();
    const k = (document.getElementById("mfKey").value || "").trim();
    const s = (document.getElementById("mfSec").value || "").trim();
    if (!k) return;
    try {
      localStorage.setItem("AMAP_KEY", k);
      if (s) localStorage.setItem("AMAP_SECURITY_CODE", s);
    } catch (err) {}
    /* SDK 若已用旧 Key 加载过，需刷新才能以新 Key 重新加载 */
    if (window.AMap) { location.reload(); return; }
    box.innerHTML = "";
    initChinaMap();
  });
}

/* ---------- 腾讯地图（回退：预览环境代理零 Key） ---------- */
function initTencentMap(box, onFail) {
  ensureTMap(err => {
    if (err || !window.TMap) { showMapFallback(box); onFail && onFail(err && err.message); return; }
    try {
      const map = new TMap.Map(box, {
        center: new TMap.LatLng(39.2, 93.2), zoom: 3.9, viewMode: "2D", pitch: 0, rotation: 0, showControl: true
      });
      tmap = map;
      const styles = {};
      PROVINCES.forEach(p => {
        styles[p.id] = new TMap.MarkerStyle({ width: 18, height: 18, src: dotIcon(p.palette) });
      });
      const geoms = [];
      PROVINCES.forEach(p => p.cities.forEach(c => {
        const g = GEO[c.id];
        if (g && hasItems(c.id)) geoms.push({ id: c.id, styleId: p.id, position: new TMap.LatLng(g[0], g[1]) });
      }));
      const markers = new TMap.MultiMarker({ map, styles, geometries: geoms });
      markers.on("click", evt => {
        const id = evt.geometry && evt.geometry.id;
        if (id) location.hash = "#/discover?city=" + id;
      });
      const labs = [];
      Object.values(PROV_LABEL).forEach((v, i) =>
        labs.push({ id: "p" + i, styleId: "lab", position: new TMap.LatLng(v[1], v[2]), content: v[0] }));
      const labStyle = new TMap.LabelStyle({ color: "#f3efe7", size: 15, offset: { x: 0, y: -22 }, alignment: "center" });
      new TMap.MultiLabel({ map, styles: { lab: labStyle }, geometries: labs });
      box.classList.add("ready");
      setTimeout(() => { try { map.resize(); } catch (e) {} }, 400);
    } catch (e) { showMapFallback(box); onFail && onFail("init"); }
  });
}

/* ---------- 入口：按 MAP_PROVIDER 分派 ---------- */
function initChinaMap() {
  const box = document.getElementById("chinaMap");
  if (!box) return;
  const note = document.getElementById("mapNote");
  const setNote = t => { if (note) { note.textContent = t || ""; note.style.display = t ? "block" : "none"; } };
  const provider = (window.APP_CONFIG && window.APP_CONFIG.MAP_PROVIDER) || "amap-tiles";

  /* 点位：GEO 已是 GCJ-02，与高德瓦片同坐标系，直接上图（切勿二次转换）
     只给真正收录了项目的城市打点，避免点进去是空列表 */
  const points = [];
  PROVINCES.forEach(p => p.cities.forEach(c => {
    const g = GEO[c.id];
    if (g && hasItems(c.id)) points.push({ id: c.id, name: c.name, lat: g[0], lng: g[1], color: p.palette });
  }));
  const labels = Object.values(PROV_LABEL).map(v => ({ text: v[0], lat: v[1], lng: v[2] }));

  /* 默认：高德栅格瓦片 + MapLibre（免 Key） */
  if (provider === "amap-tiles") {
    if (!window.OrbitMap) { setNote("地图模块未加载：请确认 assets/map-tiles.js 与 MapLibre 已引入。"); return; }
    orbitMap = window.OrbitMap.init(box, {
      center: [95.0, 39.0], zoom: 3.6, dark: true, points, labels,
      onPoint: id => { location.hash = "#/discover?city=" + id; }
    }, err => {
      if (!err) { setNote(""); return; }
      /* 瓦片底图失败 → 释放 MapLibre，再退到官方 SDK */
      if (orbitMap) { try { orbitMap.destroy(); } catch (e) {} orbitMap = null; }
      setNote("高德瓦片底图加载失败（" + err + "），正在尝试官方地图…");
      initAMap(box, reason => {
        if (reason === "nokey") setNote("当前未配置高德 Key，已回退腾讯地图。在 config.js 填入 AMAP_KEY 与 AMAP_SECURITY_CODE 后可用高德官方底图。");
        else if (reason) setNote("高德官方地图加载失败（" + reason + "），已回退腾讯地图。");
        initTencentMap(box, r => { if (r) setNote(""); });
      });
    });
    return;
  }

  if (provider === "amap") {
    /* 优先高德瓦片；若未配置 Key 或加载失败，自动回退腾讯，保证地图始终可见 */
    initAMap(box, reason => {
      if (reason === "nokey") {
        setNote("当前未配置高德 Key，已自动回退显示腾讯地图。在 config.js 填入 AMAP_KEY 与 AMAP_SECURITY_CODE 后即切换为高德瓦片底图。");
      } else if (reason) {
        setNote("高德地图加载失败（" + reason + "），已回退腾讯地图。请检查 Key 是否为「Web端(JS API)」类型、安全密钥是否正确。");
      }
      /* 腾讯也不可用时，说明由页面内的授权卡片承担，清空顶部提示条避免重复 */
      initTencentMap(box, r => { if (r) setNote(""); });
    });
  } else {
    initTencentMap(box, r => { if (r) setNote("腾讯地图不可用（" + r + "），可在 config.js 配置 TENCENT_MAP_KEY。"); });
  }
}

function renderMap() {
  setNav("map");
  app.innerHTML = `
  <header class="page-head">
    <p class="kicker">分 布 地 图</p>
    <h1 class="page-title">中国版图上的<em>西北非遗</em></h1>
    <p class="page-lead">五省（区）共 ${CITIES_WITH_ITEMS.length} 座城市收录了 ${ITEMS.length} 项非遗。点地图上的亮点即可翻阅；右侧也可按省份浏览。</p>
  </header>
  <section class="sec" style="padding-top:20px">
    <div class="map-wrap">
      <div>
        <div class="china-map" id="chinaMap"></div>
        <p class="map-note" id="mapNote" style="display:none"></p>
        <div class="legend">${PROVINCES.map(p => `<span><i style="background:${p.palette}"></i>${esc(p.name)} · ${countByProvince(p.id)} 项</span>`).join("")}</div>
      </div>
      <div class="map-index reveal">
        ${PROVINCES.map(p => `<h4><i style="background:${p.palette}"></i>${esc(p.name)} · ${countByProvince(p.id)} 项</h4>
          <ul>${p.cities.filter(c => hasItems(c.id)).map(c => `<li><a href="#/discover?city=${c.id}">${esc(c.name)} <span style="color:var(--faint)">${countByCity(c.id)}</span></a></li>`).join("")}</ul>`).join("")}
      </div>
    </div>
  </section>`;
  initChinaMap();
}

/* =========================================================
   关于
   ========================================================= */
function renderAbout() {
  setNav("about");
  app.innerHTML = `
  <section class="about-hero">
    <div class="bg" style="background-image:url('${imgProv("gansu")}')"></div>
    <div class="scrim"></div>
    <div class="about-in"><h1>非遗，是<em>活着的手艺</em>——在人的手上、嘴里、日子里传。</h1></div>
  </section>
  <section class="sec">
    <div class="about-cols">
      <div class="about-col reveal"><h4><span class="n">01</span>什么是非遗</h4>
        <p>联合国名录里的“人类非物质文化遗产”，指被各群体视作其文化遗产的实践、表演、知识技能，以及相关工具与场所。它强调“活态传承”——人不在，艺就断了。</p></div>
      <div class="about-col reveal"><h4><span class="n">02</span>十大门类</h4>
        <p>我国将非遗分为民间文学、传统音乐、舞蹈、戏剧、曲艺、体育游艺杂技、美术、技艺、医药、民俗十类。本站收录的 ${ITEMS.length} 项，散布在全部十类之中。</p></div>
      <div class="about-col reveal"><h4><span class="n">03</span>为什么是西北</h4>
        <p>周秦汉唐在陕西层层叠压，丝路从甘肃穿过，黄河在宁夏拐弯，唐蕃古道通青海，天山南北则把草原、绿洲与戈壁连成一线。五省（区）地貌迥异，却都把“守一门手艺”活成了日常。</p></div>
    </div>
    <div class="scope reveal">
      <p class="scope-title">关于收录范围</p>
      <p class="scope-lead">西北五省（区）现有国家级非遗代表性项目<b>逾 300 项</b>（其中陕西 91 项、甘肃 83 项、宁夏 28 项），省级项目逾 3000 项。本站不做全量名录，而是按「兼顾省份、城市与十大门类」的原则精选 <b>${ITEMS.length} 项</b>，逐项撰写历史由来、技艺特点、传承现状与冷知识四节正文，并配真实照片与现场影像。</p>
      <table class="scope-table">
        <thead><tr><th>省（区）</th><th>本站收录</th><th>收录城市</th><th>覆盖门类</th></tr></thead>
        <tbody>
          ${PROVINCES.map(p => {
            const list = ITEMS.filter(i => i.provinceId === p.id);
            const cities = new Set(list.map(i => i.cityId)).size;
            const cats = new Set(list.map(i => i.category)).size;
            return `<tr><td><i style="background:${p.palette}"></i>${esc(p.name)}</td><td>${list.length} 项</td><td>${cities} 座</td><td>${cats} 类</td></tr>`;
          }).join("")}
          <tr class="sum"><td>合计</td><td>${ITEMS.length} 项</td><td>${CITIES_WITH_ITEMS.length} 座</td><td>${new Set(ITEMS.map(i => i.category)).size} 类</td></tr>
        </tbody>
      </table>
      <p class="scope-note">官方数字据各省（区）文旅部门 2025 年公开口径；完整名录请以中国非物质文化遗产网公布为准。本站文字为编辑整理，非官方发布。</p>
    </div>
    <div style="margin-top:36px;display:flex;gap:12px;flex-wrap:wrap">
      <a class="btn btn-light" href="#/discover">开始翻阅 <span class="ar">→</span></a>
      <a class="btn btn-ghost" href="#/map">看分布地图</a>
    </div>
  </section>`;
}

/* =========================================================
   AI 问答
   ========================================================= */
let chatThread = [];
let chatBusy = false;

function chatSystem() {
  const ctx = ITEMS.map(i => `${i.name}（${i.city}·${i.category}）：${i.summary}`).join("；");
  return "你是「西北非遗」网站的讲解助手，服务于陕西、甘肃、宁夏、青海、新疆五省（区）非物质文化遗产的科普。只回答与非遗、历史文化、旅行相关的问题；用简体中文，简洁分点，控制在 220 字以内；不确定的信息要说明“资料不足”；不要编造传承人姓名。本站收录项目：" + ctx;
}

function addMsg(log, role, text) {
  const el = document.createElement("div");
  el.className = "msg " + role;
  el.innerHTML = `<span class="who">${role === "user" ? "你" : "助手"}</span><div class="bubble"></div>`;
  el.querySelector(".bubble").textContent = text;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

/* ---------- 离线速答：后端不可用时，用站内数据兜底，保证问答永不报错 ---------- */
function localAnswer(q) {
  const t = String(q || "").trim();
  if (!t) return null;

  /* 1) 直接问到某一项非遗 */
  const hit = ITEMS.filter(i => t.includes(i.name));
  if (hit.length) {
    return hit.slice(0, 3).map(i =>
      `【${i.name}】${i.city} · ${i.level} · ${i.category}\n${i.summary}\n历史：${i.history}\n特点：${i.feature}`
    ).join("\n\n");
  }

  /* 2) 问到某座城市 */
  const city = CITIES.find(c => t.includes(c.name));
  if (city) {
    const list = ITEMS.filter(i => i.cityId === city.id);
    if (list.length) {
      return `${city.name}（${city.note}）共收录 ${list.length} 项非遗：\n` +
        list.map(i => `· ${i.name}（${i.category} · ${i.level}）`).join("\n");
    }
  }

  /* 3) 问到某个省区 */
  const prov = PROVINCES.find(p => t.includes(p.name));
  if (prov) {
    const list = ITEMS.filter(i => i.provinceId === prov.id);
    return `${prov.full}共收录 ${list.length} 项非遗。${prov.desc}\n\n代表项目：\n` +
      list.slice(0, 8).map(i => `· ${i.name}（${i.city} · ${i.category}）`).join("\n");
  }

  /* 4) 问到某个门类 */
  const cat = CATEGORIES.find(c => t.includes(c));
  if (cat) {
    const list = ITEMS.filter(i => i.category === cat);
    if (list.length) {
      return `「${cat}」共收录 ${list.length} 项：\n` +
        list.map(i => `· ${i.name}（${i.city} · ${i.level}）`).join("\n");
    }
  }

  /* 5) 推荐类提问 */
  if (/推荐|适合|哪些|有什么|介绍|了解|看看/.test(t)) {
    const picks = ["安塞腰鼓", "华县皮影戏", "凤翔木版年画"].map(n => ITEMS.find(i => i.name === n)).filter(Boolean);
    if (picks.length) {
      return "挑三项直观、容易上手、也适合带孩子一起了解的：\n\n" +
        picks.map((i, n) =>
          `${n + 1}. 【${i.name}】${i.city} · ${i.category}\n   ${i.summary}。${i.feature.slice(0, 60)}……`
        ).join("\n\n");
    }
  }

  return null;
}

function offlineCardHTML(q) {
  return `<div class="offline-tip">
    <p class="ot-title">暂时没连上 AI 后端</p>
    <p class="ot-body">站内 43 项非遗资料仍可离线检索。若想获得完整对话，请启动后端后再问一次：</p>
    <code class="ot-code">node server.js</code>
    <p class="ot-hint">也可直接运行项目根目录的 <b>启动.cmd</b>，它会同时开好服务和页面。</p>
    <button class="btn btn-light ot-retry" type="button">重试这一次提问</button>
  </div>`;
}

/* ---------- 访客自带 API Key（存 localStorage，只发往本机后端） ---------- */
const LS_KEY = "ich_ds_key", LS_MODEL = "ich_ds_model";
function getUserKey() { try { return localStorage.getItem(LS_KEY) || ""; } catch (e) { return ""; } }
function getUserModel() { try { return localStorage.getItem(LS_MODEL) || ""; } catch (e) { return ""; } }
function setUserKey(k, m) {
  try {
    if (k) localStorage.setItem(LS_KEY, k); else localStorage.removeItem(LS_KEY);
    if (m) localStorage.setItem(LS_MODEL, m); else localStorage.removeItem(LS_MODEL);
  } catch (e) {}
}
function chatHeaders() {
  const h = { "Content-Type": "application/json" };
  const k = getUserKey();
  if (k) { h["X-DeepSeek-Key"] = k; const m = getUserModel(); if (m) h["X-DeepSeek-Model"] = m; }
  return h;
}

async function sendChat(text) {
  text = (text || "").trim();
  if (!text || chatBusy) return;
  const log = document.getElementById("chatLog");
  const input = document.getElementById("chatInput");
  const btn = document.getElementById("chatSend");
  if (!log) return;
  if (input) { input.value = ""; input.style.height = "auto"; }
  addMsg(log, "user", text);
  chatThread.push({ role: "user", content: text });
  const bot = addMsg(log, "bot", "");
  bot.querySelector(".bubble").innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
  chatBusy = true;
  if (btn) btn.disabled = true;
  let acc = "", upstreamErr = "";
  try {
    const res = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: chatHeaders(),
      body: JSON.stringify({ messages: [{ role: "system", content: chatSystem() }, ...chatThread.slice(-10)] })
    });
    if (!res.ok || !res.body) throw new Error("HTTP " + res.status);
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const raw = buf.slice(0, idx); buf = buf.slice(idx + 2);
        const line = raw.split("\n").find(l => l.startsWith("data:"));
        if (!line) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const j = JSON.parse(d);
          if (j.error) { upstreamErr = j.message || j.error; continue; }
          const c = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
          if (c) { acc += c; bot.querySelector(".bubble").textContent = acc; log.scrollTop = log.scrollHeight; }
        } catch (e) {}
      }
    }
    if (upstreamErr && !acc) throw new Error(upstreamErr);
    if (!acc) acc = "（没有收到内容，请稍后再试）";
    bot.querySelector(".bubble").textContent = acc;
    chatThread.push({ role: "assistant", content: acc });
  } catch (e) {
    /* 后端不可用：优先用站内数据离线作答，绝不把原始报错甩给用户 */
    const local = localAnswer(text);
    if (local) {
      acc = local + "\n\n—— 以上由站内离线知识库作答（当前未连接 AI 后端，范围限于本站收录的 43 项资料）。";
      bot.querySelector(".bubble").textContent = acc;
      chatThread.push({ role: "assistant", content: acc });
      log.scrollTop = log.scrollHeight;
    } else {
      const bubble = bot.querySelector(".bubble");
      bubble.innerHTML = offlineCardHTML(text);
      const rb = bubble.querySelector(".ot-retry");
      if (rb) {
        rb.addEventListener("click", () => {
          const logEl = document.getElementById("chatLog");
          bot.remove();
          if (logEl) {
            const us = logEl.querySelectorAll(".msg.user");
            if (us.length) us[us.length - 1].remove();
          }
          if (chatThread.length && chatThread[chatThread.length - 1].role === "user") chatThread.pop();
          sendChat(text);
        });
      }
    }
  } finally {
    chatBusy = false;
    if (btn) btn.disabled = false;
  }
}

function renderAsk(params) {
  setNav("ask");
  const historyHTML = chatThread.map(m =>
    `<div class="msg ${m.role === "user" ? "user" : "bot"}"><span class="who">${m.role === "user" ? "你" : "助手"}</span><div class="bubble">${esc(m.content)}</div></div>`
  ).join("");
  app.innerHTML = `
  <header class="page-head">
    <p class="kicker">AI 问 答</p>
    <h1 class="page-title">问一问<em>非遗</em></h1>
    <p class="page-lead">关于陕西、甘肃、宁夏、青海、新疆的非遗、历史与去处，随时提问。回答由 DeepSeek 生成，也可以在下方绑定你自己的 API Key。</p>
  </header>
  <section class="sec" style="padding-top:10px">
    <div class="chat">
      <div class="chat-log" id="chatLog">
        <div class="msg bot"><span class="who">助手</span><div class="bubble">你好，我是西北非遗助手。可以问我某项手艺的来历、怎么去、和别的剧种有什么区别，或者让我按主题推荐几项。</div></div>
        ${historyHTML}
      </div>
      <div class="chat-sugs" id="chatSugs">${ASK_PRESETS.map(q => `<button data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
      <form class="chat-form" id="chatForm">
        <textarea id="chatInput" rows="1" placeholder="问点什么…（Enter 发送，Shift+Enter 换行）"></textarea>
        <button type="submit" id="chatSend">发送</button>
      </form>
      <p class="chat-note">
        <span class="chat-status" id="chatStatus"><i></i><span>正在检测 AI 后端…</span></span>
        <button class="key-link" id="keyToggle" type="button">绑定我的 API Key</button>
      </p>
      <div class="key-panel" id="keyPanel" hidden>
        <p class="kp-title">使用你自己的 DeepSeek API Key</p>
        <p class="kp-desc">填写后，AI 问答将用你的 Key 调用 DeepSeek，额度从你的账号扣除。Key 只保存在你本机浏览器的 localStorage，仅发往本机后端代转发，不上传任何第三方。</p>
        <div class="kp-row">
          <input id="kpKey" type="password" placeholder="sk-..." autocomplete="off" spellcheck="false">
          <select id="kpModel">
            <option value="deepseek-chat">deepseek-chat（通用）</option>
            <option value="deepseek-reasoner">deepseek-reasoner（推理）</option>
          </select>
        </div>
        <div class="kp-actions">
          <button class="btn btn-light" id="kpSave" type="button">校验并保存</button>
          <button class="btn btn-ghost" id="kpClear" type="button">清除</button>
          <span class="kp-msg" id="kpMsg"></span>
        </div>
        <p class="kp-hint">还没有 Key？到 platform.deepseek.com → API keys → 创建。</p>
      </div>
    </div>
  </section>`;

  /* ---------- 后端状态：连上→AI 在线；未连上→自动走站内离线知识库 ---------- */
  const offlineTxt = "离线知识库模式 · 由站内 " + ITEMS.length + " 项资料作答";
  function refreshStatus() {
    const el = document.getElementById("chatStatus");
    if (!el) return;
    const setSt = (cls, txt) => { el.className = "chat-status " + cls; el.querySelector("span").textContent = txt; };
    const mine = !!getUserKey();
    const base = CHAT_ENDPOINT.replace(/\/api\/chat.*$/, "");
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = setTimeout(() => { if (ctrl) ctrl.abort(); }, 2500);
    fetch(base + "/api/health", ctrl ? { signal: ctrl.signal } : {})
      .then(r => (r.ok ? r.json() : null))
      .then(j => {
        clearTimeout(timer);
        if (!j) return setSt("is-off", offlineTxt);
        if (mine) return setSt("is-on", "AI 已连接 · 你的 Key" + (getUserModel() ? "（" + getUserModel() + "）" : ""));
        if (j.demo) return setSt("is-demo", "AI 后端已启动 · 演示模式（可在下方绑定自己的 Key）");
        setSt("is-on", "AI 已连接 · " + (j.model || "DeepSeek"));
      })
      .catch(() => { clearTimeout(timer); setSt("is-off", offlineTxt); });
  }
  refreshStatus();

  /* ---------- 绑定访客自己的 API Key ---------- */
  const kpToggle = document.getElementById("keyToggle");
  const kpPanel = document.getElementById("keyPanel");
  const kpKey = document.getElementById("kpKey");
  const kpModel = document.getElementById("kpModel");
  const kpMsg = document.getElementById("kpMsg");
  const kpSave = document.getElementById("kpSave");
  const kpClear = document.getElementById("kpClear");
  const setKpMsg = (t, cls) => { if (kpMsg) { kpMsg.textContent = t || ""; kpMsg.className = "kp-msg " + (cls || ""); } };

  if (getUserKey()) {
    if (kpKey) kpKey.value = getUserKey();
    if (kpModel && getUserModel()) kpModel.value = getUserModel();
    if (kpToggle) kpToggle.textContent = "已绑定我的 Key";
  }
  if (kpToggle && kpPanel) {
    kpToggle.addEventListener("click", () => {
      kpPanel.hidden = !kpPanel.hidden;
      if (!kpPanel.hidden) { if (kpKey) kpKey.focus(); setKpMsg("", ""); }
    });
  }
  if (kpSave) kpSave.addEventListener("click", async () => {
    const k = ((kpKey && kpKey.value) || "").trim();
    if (!k) return setKpMsg("请先填写 Key", "is-err");
    setKpMsg("校验中…", "");
    kpSave.disabled = true;
    try {
      const base = CHAT_ENDPOINT.replace(/\/api\/chat.*$/, "");
      const r = await fetch(base + "/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: k })
      });
      const j = await r.json().catch(() => ({}));
      if (j && j.ok) {
        setUserKey(k, (kpModel && kpModel.value) || "");
        setKpMsg("已保存，后续提问将使用你的 Key", "is-ok");
        if (kpToggle) kpToggle.textContent = "已绑定我的 Key";
        refreshStatus();
      } else {
        setKpMsg((j && j.message) || "校验失败", "is-err");
      }
    } catch (e) {
      setKpMsg("无法连接校验接口：" + e.message, "is-err");
    } finally {
      kpSave.disabled = false;
    }
  });
  if (kpClear) kpClear.addEventListener("click", () => {
    setUserKey("", "");
    if (kpKey) kpKey.value = "";
    if (kpToggle) kpToggle.textContent = "绑定我的 API Key";
    setKpMsg("已清除，将使用站点默认配置", "is-ok");
    refreshStatus();
  });

  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const sugs = document.getElementById("chatSugs");
  if (sugs) sugs.addEventListener("click", e => {
    const b = e.target.closest("[data-q]");
    if (b) sendChat(b.dataset.q);
  });
  if (form) form.addEventListener("submit", e => { e.preventDefault(); sendChat(input.value); });
  if (input) {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(input.value); }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 140) + "px";
    });
    try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
  }
  const q = params && params.get("q");
  if (q) { if (input) input.value = q; setTimeout(() => sendChat(q), 300); }
}

/* =========================================================
   进场动效
   ========================================================= */
let revealObserver = null;
function observeReveals() {
  const nodes = app.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) { nodes.forEach(n => n.classList.add("in")); return; }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(es => {
      es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); revealObserver.unobserve(e.target); } });
    }, { threshold: 0.1 });
  }
  nodes.forEach(n => { if (!n.classList.contains("in")) revealObserver.observe(n); });
}

window.addEventListener("hashchange", render);
render();
