/* Novaé — 3D local sky (WebGL/Three.js): horizon-aligned, real Milky Way photo, stars,
   constellations + names, planets/Sun/Moon, satellites, gyroscope (AR), capture. */
function SkyMap3D() {
  const { useRef, useEffect, useState } = React;
  const NV = window.NV, AS = window.NVAstro;
  const mountRef = useRef(null);
  const api = useRef(null); // imperative handle to the Three scene
  const [fallback, setFallback] = useState(false);
  const [status, setStatus] = useState("Chargement de la 3D…");
  const [show, setShow] = useState({ lines: true, mw: true, planets: true, sats: true, labels: true });
  const [gyro, setGyro] = useState(false);

  useEffect(() => {
    if (!window.THREE) { setFallback(true); return; }
    const THREE = window.THREE, el = mountRef.current; if (!el) return;
    const DEG = Math.PI / 180;
    let mounted = true, renderer, raf, cleanup = () => {};

    const eqVec = (raDeg, decDeg, r) => { const ra = raDeg * DEG, dec = decDeg * DEG; return new THREE.Vector3(r * Math.cos(dec) * Math.cos(ra), r * Math.sin(dec), r * Math.cos(dec) * Math.sin(ra)); };
    const horVec = (az, alt, r) => { const a = az * DEG, e = alt * DEG; return new THREE.Vector3(r * Math.cos(e) * Math.sin(a), r * Math.sin(e), -r * Math.cos(e) * Math.cos(a)); };
    const parseRGB = (s) => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(s || ""); return m ? [+m[1] / 255, +m[2] / 255, +m[3] / 255] : [1, 1, 1]; };
    const labelSprite = (text, color, scale) => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 64; const g = c.getContext("2d");
      g.fillStyle = color || "rgba(150,190,255,0.9)"; g.font = "italic 30px Georgia, serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText(text, 128, 32);
      const t = new THREE.CanvasTexture(c); const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false }));
      sp.scale.set(scale || 60, (scale || 60) / 4, 1); return sp;
    };

    const obs = { lat: 48.8566, lon: 2.3522 };
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => { obs.lat = p.coords.latitude; obs.lon = p.coords.longitude; }, () => {}, { timeout: 8000 });

    const build = () => {
      if (!mounted) return;
      try {
        const W = el.clientWidth || innerWidth, H = el.clientHeight || innerHeight;
        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(W, H);
        el.appendChild(renderer.domElement);
        const scene = new THREE.Scene(); scene.background = new THREE.Color(0x03040a);
        const camera = new THREE.PerspectiveCamera(62, W / H, 0.1, 5000);

        const loader = new THREE.TextureLoader(); loader.crossOrigin = "anonymous";
        // everything equatorial goes under equGroup; equGroup is rotated to the local horizon each tick
        const equ = new THREE.Group(); scene.add(equ);

        // Milky Way photo sphere (galactic frame -> equatorial)
        const mw = new THREE.Mesh(new THREE.SphereGeometry(2000, 64, 48),
          new THREE.MeshBasicMaterial({ map: loader.load("https://cdn.jsdelivr.net/gh/Stellarium/stellarium@master/textures/milkyway.png"), side: THREE.BackSide, color: new THREE.Color(0x6c7cab), depthWrite: false }));
        mw.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), eqVec(192.8595, 27.1283, 1).normalize());
        equ.add(mw);

        // star sprite
        const sc = document.createElement("canvas"); sc.width = sc.height = 64; const sx = sc.getContext("2d");
        const grd = sx.createRadialGradient(32, 32, 0, 32, 32, 32); grd.addColorStop(0, "#fff"); grd.addColorStop(0.35, "rgba(255,255,255,0.85)"); grd.addColorStop(1, "rgba(255,255,255,0)");
        sx.fillStyle = grd; sx.fillRect(0, 0, 64, 64); const starTex = new THREE.CanvasTexture(sc);

        const src = NV.cat || NV.fallback;
        const pos = [], col = [];
        src.stars.forEach((s) => { if (s.mag > 6.5) return; const v = eqVec(s.ra, s.dec, 1400); pos.push(v.x, v.y, v.z); const c = parseRGB(s.color); col.push(c[0], c[1], c[2]); });
        const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
        equ.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 7, map: starTex, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: false, blending: THREE.AdditiveBlending })));

        // constellation lines + names
        const lp = []; (src.lines || []).forEach((seg) => { for (let i = 0; i < seg.length - 1; i++) { const a = eqVec(seg[i][0], seg[i][1], 1380), b = eqVec(seg[i + 1][0], seg[i + 1][1], 1380); lp.push(a.x, a.y, a.z, b.x, b.y, b.z); } });
        const lg = new THREE.BufferGeometry(); lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
        const linesObj = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x4a78d0, transparent: true, opacity: 0.4 })); equ.add(linesObj);
        const namesGroup = new THREE.Group(); equ.add(namesGroup);
        (src.consts || []).forEach((c) => { if (c.rank > 2) return; const sp = labelSprite((c.name || "").toUpperCase(), "rgba(150,185,255,0.85)", 90); sp.position.copy(eqVec(c.ra, c.dec, 1360)); namesGroup.add(sp); });

        // planets / Sun / Moon
        const FR2EN = { Mercure: "Mercury", Vénus: "Venus", Mars: "Mars", Jupiter: "Jupiter", Saturne: "Saturn", Uranus: "Uranus", Neptune: "Neptune", Pluton: "Pluto" };
        const texURL = (k) => "https://cdn.jsdelivr.net/gh/jeromeetienne/threex.planets@master/images/" + ({ mercury: "mercurymap.jpg", venus: "venusmap.jpg", earth: "earthmap1k.jpg", mars: "marsmap1k.jpg", jupiter: "jupitermap.jpg", saturn: "saturnmap.jpg", uranus: "uranusmap.jpg", neptune: "neptunemap.jpg", pluto: "plutomap1k.jpg", moon: "moonmap1k.jpg" }[k]);
        const planetsGroup = new THREE.Group(); equ.add(planetsGroup);
        const bodies = [];
        const addBody = (name, render, size, labelTxt) => { const m = new THREE.Mesh(new THREE.SphereGeometry(size, 24, 18), new THREE.MeshBasicMaterial({ map: loader.load(texURL(render)) })); planetsGroup.add(m); const lab = labelSprite(labelTxt, "rgba(235,240,255,0.9)", 70); planetsGroup.add(lab); bodies.push({ name, mesh: m, lab, r: render }); return m; };
        const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xfff0c0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); sun.scale.set(110, 110, 1); planetsGroup.add(sun);
        const sunLab = labelSprite("Soleil", "rgba(255,230,160,0.9)", 70); planetsGroup.add(sunLab);
        addBody("Lune", "moon", 18, "Lune");
        NV.planets.forEach((pl) => { if (!FR2EN[pl.name]) return; addBody(pl.name, pl.render, Math.max(9, Math.pow(pl.diam, 0.27) / 1.1), pl.name); });

        // satellites (horizontal frame, in the scene directly)
        const satsGroup = new THREE.Group(); scene.add(satsGroup);
        const satObjs = (NV._sats3d || []);
        // load TLE once (shared)
        const satRecs = [];
        if (window.satellite) {
          [[25544, "ISS"], [20580, "Hubble"], [48274, "Tiangong"]].forEach(([id, nm]) => {
            fetch("https://tle.ivanstanojevic.me/api/tle/" + id).then((r) => r.json()).then((j) => {
              const rec = window.satellite.twoline2satrec(j.line1, j.line2);
              const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: 0xffe07a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); dot.scale.set(30, 30, 1);
              const lab = labelSprite("🛰 " + nm, "rgba(255,236,160,0.95)", 60);
              satsGroup.add(dot); satsGroup.add(lab); satRecs.push({ rec, dot, lab });
            }).catch(() => {});
          });
        }

        // horizon ring + cardinals (horizontal frame)
        const hp = []; for (let a = 0; a <= 360; a += 2) { const v = horVec(a, 0, 1390); hp.push(v.x, v.y, v.z); }
        const hg = new THREE.BufferGeometry(); hg.setAttribute("position", new THREE.Float32BufferAttribute(hp, 3));
        scene.add(new THREE.Line(hg, new THREE.LineBasicMaterial({ color: 0x96785a, transparent: true, opacity: 0.6 })));
        [["N", 0], ["E", 90], ["S", 180], ["O", 270]].forEach(([t, a]) => { const sp = labelSprite(t, "rgba(255,225,170,0.95)", 80); sp.position.copy(horVec(a, 2, 1380)); scene.add(sp); });

        // eq -> horizontal orientation of equGroup (function of time + latitude)
        const updateHorizon = (date) => {
          const lst = AS.lstHours(date, obs.lon), lat = obs.lat;
          const u1 = eqVec(lst * 15, lat, 1).normalize();
          const ncpEq = new THREE.Vector3(0, 1, 0);
          const u2 = ncpEq.clone().sub(u1.clone().multiplyScalar(ncpEq.dot(u1))).normalize();
          const u3 = new THREE.Vector3().crossVectors(u1, u2);
          const w1 = new THREE.Vector3(0, 1, 0);
          const ncpH = new THREE.Vector3(0, Math.sin(lat * DEG), -Math.cos(lat * DEG));
          const w2 = ncpH.clone().sub(w1.clone().multiplyScalar(ncpH.dot(w1))).normalize();
          const w3 = new THREE.Vector3().crossVectors(w1, w2);
          const U = new THREE.Matrix4().makeBasis(u1, u2, u3);
          const Wm = new THREE.Matrix4().makeBasis(w1, w2, w3);
          equ.quaternion.setFromRotationMatrix(Wm.multiply(U.transpose()));
        };
        const updateBodies = (date) => {
          try {
            const o = AS.observer(obs.lat, obs.lon, 30);
            const se = AS.bodyEqu("Sun", date, o); sun.position.copy(eqVec(se.ra, se.dec, 1300)); sunLab.position.copy(eqVec(se.ra, se.dec, 1300)).multiplyScalar(0.98);
            bodies.forEach((b) => { const en = b.name === "Lune" ? "Moon" : FR2EN[b.name]; if (!en) return; const eq = AS.bodyEqu(en, date, o); const r = b.name === "Lune" ? 1200 : 1250; b.mesh.position.copy(eqVec(eq.ra, eq.dec, r)); b.lab.position.copy(eqVec(eq.ra, eq.dec, r)).multiplyScalar(0.97); });
          } catch (e) {}
        };
        const updateSats = (date) => {
          if (!window.satellite || !satRecs.length) return;
          const gmst = window.satellite.gstime(date), gd = { longitude: obs.lon * DEG, latitude: obs.lat * DEG, height: 0.03 };
          satRecs.forEach((s) => { try { const pv = window.satellite.propagate(s.rec, date); if (!pv.position) { s.dot.visible = false; s.lab.visible = false; return; } const ecf = window.satellite.eciToEcf(pv.position, gmst); const la = window.satellite.ecfToLookAngles(gd, ecf); const up = la.elevation / DEG > 0; s.dot.visible = up && show.sats; s.lab.visible = up && show.sats; if (up) { const v = horVec(la.azimuth / DEG, la.elevation / DEG, 300); s.dot.position.copy(v); s.lab.position.copy(v).multiplyScalar(0.95); } } catch (e) {} });
        };

        // camera control
        let camAz = 180, camAlt = 25;
        const setCam = (az, alt, roll) => { camera.up.set(0, 1, 0); camera.lookAt(horVec(az, alt, 10)); if (roll) camera.rotateZ(roll * DEG); };
        setCam(camAz, camAlt, 0);
        const dom = renderer.domElement; let drag = false, px = 0, py = 0;
        const down = (e) => { if (api.current && api.current.gyroOn) return; drag = true; px = e.clientX; py = e.clientY; try { dom.setPointerCapture(e.pointerId); } catch (x) {} };
        const move = (e) => { if (!drag) return; const f = camera.fov / 60; camAz -= (e.clientX - px) * 0.12 * f; camAlt = Math.max(-20, Math.min(89, camAlt + (e.clientY - py) * 0.12 * f)); px = e.clientX; py = e.clientY; setCam(camAz, camAlt, 0); };
        const up = () => { drag = false; };
        const wheel = (e) => { e.preventDefault(); camera.fov = Math.max(20, Math.min(85, camera.fov + (e.deltaY > 0 ? 3 : -3))); camera.updateProjectionMatrix(); };
        dom.addEventListener("pointerdown", down); dom.addEventListener("pointermove", move); dom.addEventListener("pointerup", up); dom.addEventListener("pointercancel", up); dom.addEventListener("wheel", wheel, { passive: false });

        const onResize = () => { const w = el.clientWidth, h = el.clientHeight; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); };
        addEventListener("resize", onResize);

        // gyro
        const gyroState = { az: null, alt: 0, roll: 0 };
        const onOrient = (ev) => { if (ev.alpha == null || ev.beta == null || ev.gamma == null) return; const a = ev.alpha * DEG, b = ev.beta * DEG, g = ev.gamma * DEG; const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b), cg = Math.cos(g), sg = Math.sin(g); const lx = -(ca * sg + sa * sb * cg), ly = -(sa * sg - ca * sb * cg), lz = -(cb * cg); let az = Math.atan2(lx, ly) / DEG; az = ((az % 360) + 360) % 360; gyroState.az = az; gyroState.alt = Math.max(-30, Math.min(89, Math.asin(Math.max(-1, Math.min(1, lz))) / DEG)); gyroState.roll = Math.atan2(-cb * sg, sb) / DEG; };

        let last = -1e9, lastSat = -1e9;
        const animate = (t) => {
          if (!mounted) return;
          const date = new Date();
          if (t - last > 1500) { updateHorizon(date); updateBodies(date); last = t; }
          if (t - lastSat > 500) { updateSats(date); lastSat = t; }
          if (api.current && api.current.gyroOn && gyroState.az != null) setCam(gyroState.az, gyroState.alt, gyroState.roll);
          renderer.render(scene, camera); raf = requestAnimationFrame(animate);
        };
        raf = requestAnimationFrame(animate);
        if (mounted) setStatus("");

        api.current = {
          gyroOn: false,
          setLayer: (k, v) => { if (k === "lines") { linesObj.visible = v; namesGroup.visible = v && show.labels; } if (k === "mw") mw.visible = v; if (k === "planets") planetsGroup.visible = v; if (k === "sats") satsGroup.visible = v; if (k === "labels") namesGroup.visible = v && linesObj.visible; },
          startGyro: async () => { const D = window.DeviceOrientationEvent; if (D && typeof D.requestPermission === "function") { try { if (await D.requestPermission() !== "granted") return false; } catch (e) { return false; } } addEventListener("deviceorientationabsolute", onOrient, true); addEventListener("deviceorientation", onOrient, true); api.current.gyroOn = true; return true; },
          stopGyro: () => { removeEventListener("deviceorientationabsolute", onOrient, true); removeEventListener("deviceorientation", onOrient, true); api.current.gyroOn = false; },
          capture: () => { try { window.NVLibrary && window.NVLibrary.capture(renderer.domElement, { date: new Date().toISOString(), place: "Ma position", lat: obs.lat, lon: obs.lon }); } catch (e) {} },
        };

        cleanup = () => { cancelAnimationFrame(raf); removeEventListener("resize", onResize); api.current && api.current.stopGyro(); dom.removeEventListener("pointerdown", down); dom.removeEventListener("pointermove", move); dom.removeEventListener("pointerup", up); dom.removeEventListener("pointercancel", up); dom.removeEventListener("wheel", wheel); try { renderer.dispose(); } catch (x) {} if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement); };
      } catch (err) { if (mounted) { setStatus(""); setFallback(true); } }
    };

    let n = 0; const wait = setInterval(() => { if (window.Astronomy || n++ > 50) { clearInterval(wait); NV.loadCatalog ? NV.loadCatalog().then(build).catch(build) : build(); } }, 100);
    return () => { mounted = false; clearInterval(wait); cleanup(); api.current = null; };
  }, []);

  const toggle = (k) => { const v = !show[k]; setShow(Object.assign({}, show, { [k]: v })); if (api.current) api.current.setLayer(k, v); };
  const toggleGyro = async () => { if (!api.current) return; if (gyro) { api.current.stopGyro(); setGyro(false); } else { const ok = await api.current.startGyro(); setGyro(ok); if (!ok) alert("Gyroscope indisponible (téléphone + HTTPS requis)."); } };
  const chip = (label, on, onClick, cls) => React.createElement("button", { key: label, className: "chip" + (cls || "") + (on ? " on" : ""), onClick }, label);

  if (fallback) return React.createElement(SkyMap);
  return React.createElement("div", { className: "skymap-wrap" },
    React.createElement("div", { ref: mountRef, style: { position: "absolute", inset: 0 } }),
    React.createElement("div", { className: "sky-toolbar" },
      chip("Constellations", show.lines, () => toggle("lines")),
      chip("Noms", show.labels, () => toggle("labels")),
      chip("Voie Lactée", show.mw, () => toggle("mw")),
      chip("Planètes", show.planets, () => toggle("planets")),
      chip("🛰 Satellites", show.sats, () => toggle("sats")),
      chip(gyro ? "📱 Mouvement ✓" : "📱 Suivre l'appareil", gyro, toggleGyro, " chip-ar"),
      React.createElement("button", { className: "chip", onClick: () => api.current && api.current.capture() }, "📸 Capturer")
    ),
    status && React.createElement("div", { className: "sky-loading" }, status),
    React.createElement("div", { className: "sky-jumps" }, React.createElement("span", { className: "jump-label" }, "3D · glissez pour regarder · molette = zoom · horizon réel"))
  );
}
