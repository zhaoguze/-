/* =========================================================
   西北非遗 · 内嵌地图
   ---------------------------------------------------------
   技术栈来源：ORBIT 地图技术栈（core/TripMapGl.vue）
   渲染引擎：MapLibre GL JS 4.7.1（已本地化到 assets/vendor/maplibre）
   底图瓦片：高德栅格瓦片（国内实测唯一可达；OSM/CARTO/Wikimedia 均不可达）
             https://webrd0{1..4}.is.autonavi.com/appmaptile?...&style=8
   优点：免 Key，不需要用户申请任何账号，也没有 Key 泄露风险。
   ---------------------------------------------------------
   坐标系：高德底图为 GCJ-02。本站 GEO 点位本来就是 GCJ-02，
           **直接上图，切勿再做 WGS84→GCJ-02 转换**（转两次会偏 300~500 米）。
   暗色：高德只有亮色瓦片，暗色靠 CSS invert 滤镜实现（与 ORBIT 同方案）。
        DOM 标记不经过 canvas 滤镜，所以标记要用亮色。
   ========================================================= */
(function () {
  const TILE_HOSTS = [1, 2, 3, 4];
  const tileUrl = i =>
    `https://webrd0${i}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}`;

  function buildStyle() {
    return {
      version: 8,
      sources: {
        basemap: {
          type: "raster",
          tiles: TILE_HOSTS.map(tileUrl),
          tileSize: 256,
          maxzoom: 18,
          attribution: "© 高德地图"
        }
      },
      layers: [{ id: "basemap", type: "raster", source: "basemap" }]
    };
  }

  const esc = s =>
    String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /**
   * 初始化内嵌地图
   * @param {HTMLElement} box   容器（必须有固定高度）
   * @param {Object} opts  { center:[lng,lat], zoom, dark, points:[{id,name,lat,lng,color}],
   *                         labels:[{text,lat,lng}], onPoint(id) }
   * @param {Function} done (errMessage|null, api) —— 成功或失败都会回调一次（不卡界面）
   */
  function init(box, opts, done) {
    opts = opts || {};
    const ml = window.maplibregl;
    if (!ml) { done && done("MapLibre 未加载"); return null; }
    if (!box) { done && done("地图容器不存在"); return null; }

    let map = null, styleReady = false, markers = [], ro = null, bail = null, fitRaf = 0;
    let userMoved = false, lastW = 0;

    box.classList.add("orbit-map");
    if (opts.dark !== false) box.classList.add("map-dark");

    const clearMarkers = () => {
      markers.forEach(m => { try { m.remove(); } catch (e) {} });
      markers = [];
    };

    function drawMarkers() {
      if (!map) return;
      clearMarkers();
      (opts.points || []).forEach(p => {
        if (p.lat == null || p.lng == null) return;
        const node = document.createElement("div");
        node.className = "orb-dot";
        node.innerHTML =
          `<span class="od-in" style="--pc:${p.color || "#d24b3a"}">` +
          `<span class="od-glow"></span><span class="od-core"></span></span>` +
          `<span class="od-tip">${esc(p.name)}</span>`;
        node.title = p.name || "";
        node.addEventListener("click", () => { if (opts.onPoint) opts.onPoint(p.id); });
        try {
          markers.push(new ml.Marker({ element: node, anchor: "center" }).setLngLat([p.lng, p.lat]).addTo(map));
        } catch (e) {}
      });
      (opts.labels || []).forEach(l => {
        if (l.lat == null || l.lng == null) return;
        const node = document.createElement("div");
        node.className = "orb-label";
        node.textContent = l.text;
        try {
          markers.push(new ml.Marker({ element: node, anchor: "center" }).setLngLat([l.lng, l.lat]).addTo(map));
        } catch (e) {}
      });
    }

    /* 容器在布局切换前可能是 0×0，此时 fitBounds 会被静默忽略 —— 等有尺寸再取景 */
    function fit(retry) {
      if (!map) return;
      const pts = (opts.points || []).filter(p => p.lat != null && p.lng != null);
      if (!pts.length) return;
      if (!box.clientWidth || !box.clientHeight) {
        if ((retry || 0) < 10) { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(() => fit((retry || 0) + 1)); }
        return;
      }
      const lngs = pts.map(p => p.lng), lats = pts.map(p => p.lat);
      try {
        map.resize();
        map.fitBounds(
          [[Math.min.apply(null, lngs), Math.min.apply(null, lats)],
           [Math.max.apply(null, lngs), Math.max.apply(null, lats)]],
          { padding: 54, duration: 0, maxZoom: 7 }
        );
      } catch (e) {}
    }

    /* 兜底：无论成功失败都要回调一次，否则界面会永久卡住 */
    bail = setTimeout(() => {
      if (!styleReady) { box.classList.add("is-failed"); done && done("地图加载超时（WebGL 不可用或瓦片不可达）"); }
    }, 15000);

    try {
      map = new ml.Map({
        container: box,
        style: buildStyle(),
        center: opts.center || [103.6, 35.4],
        zoom: opts.zoom == null ? 4 : opts.zoom,
        attributionControl: false
      });
    } catch (e) {
      clearTimeout(bail);
      box.classList.add("is-failed");
      done && done("地图初始化失败：" + (e && e.message));
      return null;
    }

    try {
      map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new ml.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-right");
      map.addControl(new ml.AttributionControl({ compact: true }), "bottom-right");
    } catch (e) {}

    map.on("load", () => {
      styleReady = true;
      clearTimeout(bail);
      box.classList.remove("is-failed");
      box.classList.add("is-ready");
      drawMarkers();
      try { map.resize(); } catch (e) {}
      fit(0);
      /* 布局稳定后补校一次：首帧容器可能还没拿到最终宽度，会让取景偏窄 */
      setTimeout(() => { if (map && !userMoved) fit(0); }, 450);
      done && done(null, api);
    });

    /* 用户手动拖动/缩放后不再自动重设视野 */
    const canvasEl = map.getCanvas();
    const markMoved = () => { userMoved = true; };
    canvasEl.addEventListener("pointerdown", markMoved);
    canvasEl.addEventListener("wheel", markMoved, { passive: true });

    /* 已加载后的单张瓦片报错不应遮挡地图；初始化阶段交给 8s 兜底 */
    map.on("error", e => {
      if (styleReady) { console.warn("[map] tile error", e && e.error && e.error.message); return; }
    });

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        if (!map) return;
        const w = box.clientWidth;
        if (!w) return;
        try { map.resize(); } catch (e) {}
        /* 容器宽度明显变化（如首帧布局、窗口缩放）时重新取景，用户手动操作后不再干预 */
        if (!userMoved && Math.abs(w - lastW) > 40) { lastW = w; fit(0); }
        else if (!lastW) lastW = w;
      });
      ro.observe(box);
    }

    const api = {
      destroy() {
        clearTimeout(bail);
        cancelAnimationFrame(fitRaf);
        if (ro) { try { ro.disconnect(); } catch (e) {} }
        clearMarkers();
        try { if (map) map.remove(); } catch (e) {}
        map = null; styleReady = false;
      },
      resize() { try { if (map) map.resize(); } catch (e) {} },
      fit: () => fit(0),
      getMap: () => map
    };
    return api;
  }

  window.OrbitMap = { init: init, buildStyle: buildStyle };
})();
