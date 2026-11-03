(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const form = $("#reg");
  const branch = $(".branch");
  const sections = Object.fromEntries($$(".step", form).map((s) => [s.dataset.step, s]));
  const KEY = "ws-tn-draft";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  let current = "1";
  let submitted = false;
  const video = { ok: false, label: "" };
  const touched = new Set();

  /* ---------------- validation ---------------- */
  const AREAS = $$("#area option").map((o) => o.value).filter(Boolean);
  const rules = {
    nombre: (v) => (v.trim().split(/\s+/).length >= 2 && v.trim().length >= 4 ? "" : v.trim() ? "Escribe nombre y apellido, como figuran en tu CV." : "Escribe tu nombre completo, como figura en tu CV."),
    email: (v) => (!v.trim() ? "Necesitamos tu email para avisarte en qué estación está tu perfil." : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? "" : "Revisa el email: falta la @ o el dominio (ej.: nombre@email.com)."),
    pais: (v) => (v ? "" : "Elige tu país de residencia."),
    area: (v) => (v ? "" : "Elige el área en la que quieres trabajar."),
    seniority: () => (form.elements.seniority.value ? "" : "Elige tu seniority."),
    anios: (v) => (v === "" ? "Indica tus años de experiencia (0 si recién empiezas)." : Number.isInteger(+v) && +v >= 0 && +v <= 40 ? "" : "Usa un número entero entre 0 y 40."),
    stack: (v) => (v.trim().length >= 2 ? "" : "Cuéntanos tu stack principal, por ejemplo: React, TypeScript."),
    github: (v) => (!v.trim() || /^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(v.trim()) ? "" : "Revisa el enlace: debe empezar con https:// (ej.: https://github.com/tu-usuario)."),
    cv: () => {
      const f = $("#cv").files[0];
      if (!f) return "";
      if (!/\.(pdf|docx?)$/i.test(f.name)) return "Sube tu CV en PDF o Word (.pdf, .doc o .docx).";
      if (f.size > 5 * 1024 * 1024) return `Tu CV pesa ${(f.size / 1048576).toFixed(1)} MB. El máximo es 5 MB.`;
      return "";
    },
  };
  const STEP_FIELDS = { 1: ["nombre", "email", "pais", "area"], 2: ["seniority", "anios", "stack", "github", "cv"] };

  function fieldEl(name) {
    return name === "seniority" ? $(".seg[role=radiogroup]") : form.elements[name];
  }
  function check(name, show = true) {
    const el = form.elements[name];
    const msg = rules[name](el && el.value !== undefined ? el.value : "");
    if (show) {
      const target = fieldEl(name);
      const err = $(`#${name}-err`);
      target.setAttribute("aria-invalid", msg ? "true" : "false");
      if (name !== "seniority" && name !== "cv") target.setAttribute("aria-describedby", `${name}-err`);
      err.textContent = msg;
    }
    return !msg;
  }
  function validateStep(n, show = true) {
    if (n === "3") return video.ok;
    let firstBad = null;
    for (const name of STEP_FIELDS[n] || []) {
      if (!check(name, show) && !firstBad) firstBad = name;
    }
    if (firstBad && show) {
      const el = firstBad === "seniority" ? $("input[name=seniority]") : form.elements[firstBad];
      el.focus({ preventScroll: false });
    }
    return !firstBad;
  }

  for (const name of ["nombre", "email", "pais", "area", "anios", "stack", "github"]) {
    const el = form.elements[name];
    el.addEventListener("blur", () => { if (el.value || touched.has(name)) { touched.add(name); check(name); } });
    el.addEventListener("input", () => { if (touched.has(name) || el.getAttribute("aria-invalid") === "true") check(name); });
    el.addEventListener("change", () => { if (el.tagName === "SELECT") { touched.add(name); check(name); } });
  }
  $$("input[name=seniority]").forEach((r) => r.addEventListener("change", () => check("seniority")));

  /* ---------------- files: CV + drag & drop ---------------- */
  function bindDrop(input, onFile) {
    const zone = input.closest(".drop");
    ["dragenter", "dragover"].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add("is-over"); }));
    ["dragleave", "drop"].forEach((t) => zone.addEventListener(t, () => zone.classList.remove("is-over")));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; input.dispatchEvent(new Event("change")); }
    });
    input.addEventListener("change", () => onFile(input.files[0], zone));
  }
  function showFile(zone, file, ok, detail) {
    const text = $(".drop-text", zone);
    text.dataset.orig ??= text.innerHTML;
    zone.classList.toggle("has-file", !!file && ok);
    if (file && ok) {
      text.innerHTML = "";
      const strong = document.createElement("strong");
      strong.textContent = file.name;
      const small = document.createElement("small");
      small.textContent = `${detail} · Toca para cambiar el archivo`;
      text.append(strong, small);
    } else text.innerHTML = text.dataset.orig;
  }
  bindDrop($("#cv"), (file, zone) => {
    const ok = check("cv");
    showFile(zone, file, ok, file ? `${(file.size / 1048576).toFixed(1)} MB` : "");
    save();
  });

  const counter = $('[data-count="motivacion"]');
  form.elements.motivacion.addEventListener("input", (e) => { counter.textContent = e.target.value.length; });

  /* ---------------- video: record ---------------- */
  const stage = $(".stage");
  const vid = $(".stage-video");
  const btn = (k) => $(`[data-rec="${k}"]`);
  const videoErr = $("#video-err");
  const videoOk = $("#video-ok");
  let stream = null, recorder = null, chunks = [], t0 = 0, raf = 0, recordedUrl = null, lastTick = -1;

  function setVideo(ok, okText = "", errText = "") {
    video.ok = ok;
    videoErr.textContent = errText;
    videoOk.hidden = !ok;
    $("span", videoOk).textContent = okText;
    updateBranch();
    save();
  }
  function showRec(...keys) { ["enable", "start", "stop", "redo"].forEach((k) => (btn(k).hidden = !keys.includes(k))); }
  function stopStream() { stream?.getTracks().forEach((t) => t.stop()); stream = null; }

  async function enableCamera() {
    setVideo(false);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      videoErr.textContent = "Este navegador no puede grabar video. Sube un video que ya tengas desde la pestaña «Subir un video».";
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }, audio: true });
    } catch (e) {
      videoErr.textContent = e.name === "NotAllowedError"
        ? "No pudimos acceder a tu cámara: el permiso está bloqueado. Actívalo desde la barra de direcciones o sube un video que ya tengas."
        : e.name === "NotFoundError"
          ? "No encontramos una cámara ni un micrófono en este dispositivo. Puedes subir un video que ya tengas."
          : "No pudimos iniciar la cámara. Ciérrala en otras apps (Zoom, Meet) y vuelve a intentar, o sube un video.";
      return;
    }
    if (recordedUrl) { URL.revokeObjectURL(recordedUrl); recordedUrl = null; }
    vid.removeAttribute("src"); vid.controls = false; vid.muted = true;
    vid.srcObject = stream; vid.play().catch(() => {});
    stage.dataset.state = "live";
    showRec("start");
    btn("start").focus();
  }

  function startRec() {
    const type = ["video/webm;codecs=vp9,opus", "video/webm", "video/mp4"].find((t) => MediaRecorder.isTypeSupported?.(t));
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    chunks = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = finishRec;
    recorder.start(250);
    t0 = performance.now(); lastTick = -1;
    stage.dataset.state = "recording";
    showRec("stop");
    btn("stop").focus();
    const fill = $(".rec-fill"), time = $("[data-time]");
    const loop = () => {
      const s = (performance.now() - t0) / 1000;
      fill.style.transform = `scaleX(${Math.min(s / 60, 1)})`;
      if (Math.floor(s) !== lastTick) { lastTick = Math.floor(s); time.textContent = fmt(s); }
      if (s >= 60) return stopRec();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }
  function stopRec() { cancelAnimationFrame(raf); if (recorder?.state === "recording") recorder.stop(); }
  function finishRec() {
    const secs = Math.min((performance.now() - t0) / 1000, 60);
    stopStream();
    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    recordedUrl = URL.createObjectURL(blob);
    vid.srcObject = null; vid.src = recordedUrl; vid.muted = false; vid.controls = true;
    stage.dataset.state = "recorded";
    showRec("redo");
    if (secs < 30) setVideo(false, "", `Tu video dura ${fmt(secs)}. Necesitamos al menos 30 segundos: vuelve a grabar.`);
    else setVideo(true, `Video listo: ${fmt(secs)}. Puedes revisarlo antes de enviar.`);
    video.label = "grabado";
  }
  btn("enable").addEventListener("click", enableCamera);
  btn("start").addEventListener("click", startRec);
  btn("stop").addEventListener("click", stopRec);
  btn("redo").addEventListener("click", enableCamera);

  /* ---------------- video: upload ---------------- */
  bindDrop($("#videofile"), (file, zone) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) { showFile(zone, file, false); return setVideo(false, "", "Ese archivo no es un video. Sube un MP4, MOV o WebM."); }
    if (file.size > 200 * 1048576) { showFile(zone, file, false); return setVideo(false, "", `Tu video pesa ${Math.round(file.size / 1048576)} MB. El máximo es 200 MB.`); }
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const url = URL.createObjectURL(file);
    const done = (secs) => {
      URL.revokeObjectURL(url);
      if (!Number.isFinite(secs)) { showFile(zone, file, true, "Duración no detectada"); return setVideo(true, `${file.name} listo para enviar. Verificaremos la duración al revisarlo.`); }
      if (secs < 30) { showFile(zone, file, false); return setVideo(false, "", `Tu video dura ${fmt(secs)}. Necesitamos entre 30 y 60 segundos.`); }
      if (secs > 65) { showFile(zone, file, false); return setVideo(false, "", `Tu video dura ${fmt(secs)}. El máximo es 1 minuto: recórtalo o grábalo aquí con tu cámara.`); }
      showFile(zone, file, true, fmt(secs));
      setVideo(true, `${file.name} · ${fmt(secs)} · listo para enviar`);
      video.label = "subido";
    };
    probe.onloadedmetadata = () => done(probe.duration);
    probe.onerror = () => done(NaN);
    probe.src = url;
  });

  /* ---------------- tabs ---------------- */
  const tabs = $$('[role="tab"]');
  function selectTab(tab) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", on); t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (tab.id === "tab-up" && stream) { stopRec(); stopStream(); vid.srcObject = null; stage.dataset.state = "idle"; showRec("enable"); }
    setVideo(false); videoErr.textContent = "";
    $$(".drop--tall").forEach((z) => { z.classList.remove("has-file"); const t = $(".drop-text", z); if (t.dataset.orig) t.innerHTML = t.dataset.orig; });
    $("#videofile").value = "";
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => selectTab(t));
    t.addEventListener("keydown", (e) => {
      if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
      const n = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      n.focus(); selectTab(n);
    });
  });

  /* ---------------- branch line ---------------- */
  const stations = $$(".b-st", branch);
  const track = $(".b-track"), fill = $(".b-fill"), train = $(".b-train");

  function centerOf(st) {
    const r = $(".b-roundel", st).getBoundingClientRect(), b = branch.getBoundingClientRect();
    return { x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 };
  }
  function layoutTrack() {
    const a = centerOf(stations[0]), z = centerOf(stations[stations.length - 1]);
    const horizontal = Math.abs(z.x - a.x) > Math.abs(z.y - a.y);
    const lw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--line-w")) || 10;
    Object.assign(track.style, horizontal
      ? { left: `${a.x}px`, top: `${a.y - lw / 2}px`, width: `${z.x - a.x}px`, height: `${lw}px` }
      : { left: `${a.x - lw / 2}px`, top: "0px", width: `${lw}px`, height: `${z.y}px` });
    track.dataset.dir = horizontal ? "x" : "y";
    track.dataset.start = horizontal ? a.x : 0;
  }
  function moveTrain() {
    const idx = current === "4" ? (submitted ? 3 : 2) : current === "login" ? -1 : +current - 1;
    train.hidden = idx < 0;
    if (idx < 0) return;
    const c = centerOf(stations[idx]);
    train.style.transform = `translate(${c.x}px, ${c.y}px)`;
    const a = centerOf(stations[0]), z = centerOf(stations[stations.length - 1]);
    const p = track.dataset.dir === "x" ? (c.x - a.x) / (z.x - a.x) : c.y / z.y;
    fill.style.transform = track.dataset.dir === "x" ? `scaleX(${p})` : `scaleY(${p})`;
  }
  function updateBranch() {
    stations.forEach((st) => {
      const n = st.dataset.step;
      const done = current === "4" ? (n === "1" || n === "2" || submitted) : n !== "4" && +n < +current && validateStep(n, false);
      const here = current === "4" ? (submitted ? "4" : "3") : current;
      st.classList.toggle("is-done", !!done);
      if (n === here) st.setAttribute("aria-current", "step"); else st.removeAttribute("aria-current");
    });
  }
  function relayout() { branch.classList.remove("ready"); layoutTrack(); moveTrain(); requestAnimationFrame(() => branch.classList.add("ready")); }
  new ResizeObserver(relayout).observe(branch);

  /* ---------------- navigation ---------------- */
  const foot = $("[data-foot]"), back = $("[data-back]"), later = $("[data-later]"), nextLabel = $("[data-next-label]");

  function show(step, { focus = true } = {}) {
    if (current === "3" && step !== "3" && stream) { stopRec(); stopStream(); vid.srcObject = null; stage.dataset.state = "idle"; showRec("enable"); }
    current = String(step);
    Object.entries(sections).forEach(([k, s]) => (s.hidden = k !== current));
    const sec = sections[current];
    sec.classList.remove("entering"); void sec.offsetWidth; sec.classList.add("entering");
    foot.hidden = current === "4" || current === "login";
    back.hidden = current === "1";
    later.hidden = current !== "3";
    nextLabel.textContent = current === "3" ? "Enviar perfil" : "Continuar";
    updateBranch(); moveTrain(); save();
    if (focus) $("h2", sec).focus({ preventScroll: true });
    if (focus) {
      const top = form.getBoundingClientRect().top + scrollY - 90;
      if (scrollY > top) scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    }
  }
  function goForward(target) {
    for (let n = +current; n < target; n++) {
      if (!validateStep(String(n))) { if (String(n) !== current) show(String(n), { focus: false }); validateStep(String(n)); return false; }
    }
    show(String(target));
    return true;
  }
  function missingList() {
    const m = [];
    if (!video.ok) m.push("Video corto en inglés");
    if (!$("#cv").files[0]) m.push("CV en inglés");
    if (!form.elements.github.value.trim()) m.push("GitHub o portfolio");
    return m;
  }
  function finish(withVideo) {
    for (const n of ["1", "2"]) if (!validateStep(n, false)) { show(n, { focus: false }); validateStep(n); return; }
    if (withVideo && !video.ok) { videoErr.textContent ||= "Graba o sube tu video de 30 a 60 segundos para enviar tu perfil."; videoErr.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" }); return; }
    submitted = withVideo;
    const sec = sections["4"];
    const missing = missingList();
    $("h2", sec).textContent = withVideo ? "Perfil enviado" : "Progreso guardado";
    $("[data-done-lede]", sec).innerHTML = withVideo
      ? "Tu perfil quedó en revisión. Próxima estación: <strong>Tech fit interview</strong>. Te escribimos a tu email con cada avance."
      : "Tu perfil queda guardado. Cuando subas el video en inglés, pasa a revisión y sigue hacia la <strong>Tech fit interview</strong>.";
    const box = $("[data-missing]", sec);
    box.hidden = !missing.length;
    $("ul", box).replaceChildren(...missing.map((t) => Object.assign(document.createElement("li"), { textContent: t })));
    show("4");
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (current === "1" || current === "2") { if (validateStep(current)) show(String(+current + 1)); }
    else if (current === "3") finish(true);
  });
  back.addEventListener("click", () => show(String(Math.max(1, +current - 1))));
  later.addEventListener("click", () => finish(false));
  $$(".b-btn[data-go]").forEach((b) => b.addEventListener("click", () => {
    const t = +b.dataset.go;
    if (current === "login" || current === "4" || t <= +current) show(String(t)); else goForward(t);
  }));
  $$('.site-header [data-go]').forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    if (a.dataset.go === "login") { history.replaceState(null, "", "#login"); show("login"); }
    else { history.replaceState(null, "", location.pathname); show("1"); }
  }));
  $('.login-actions [data-go]').addEventListener("click", (e) => { e.preventDefault(); history.replaceState(null, "", location.pathname); show("1"); });

  // login (prototype): magic link confirmation
  $("[data-login]").addEventListener("click", () => {
    const el = $("#login-email"), err = $("#login-email-err"), ok = $("#login-ok");
    const msg = rules.email(el.value);
    el.setAttribute("aria-invalid", msg ? "true" : "false");
    el.setAttribute("aria-describedby", "login-email-err");
    err.textContent = msg; ok.hidden = !!msg;
    if (msg) return el.focus();
    $("span", ok).textContent = `Listo. Te enviamos un enlace a ${el.value.trim()}. Vence en 15 minutos.`;
  });

  /* ---------------- draft persistence ---------------- */
  const savedEl = $("[data-saved] span");
  const KEYS = ["nombre", "email", "pais", "area", "anios", "stack", "github", "motivacion"];
  function save() {
    const data = Object.fromEntries(KEYS.map((k) => [k, form.elements[k].value]));
    data.seniority = form.elements.seniority.value;
    data.step = ["1", "2", "3"].includes(current) ? current : data.step;
    try {
      const prev = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (!data.step) data.step = prev.step;
      localStorage.setItem(KEY, JSON.stringify(data));
      if (KEYS.some((k) => data[k]) || data.seniority) {
        savedEl.textContent = `Progreso guardado · ${new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}`;
      }
    } catch { savedEl.textContent = "Este navegador no permite guardar tu progreso: termina el registro en esta visita."; }
  }
  let saveT;
  form.addEventListener("input", (e) => { if (e.target.type !== "file") { clearTimeout(saveT); saveT = setTimeout(save, 400); } });
  form.addEventListener("change", (e) => { if (e.target.type !== "file") save(); });

  function restore() {
    let d = {};
    try { d = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
    KEYS.forEach((k) => { if (d[k]) form.elements[k].value = d[k]; });
    if (d.seniority) { const r = $(`input[name=seniority][value="${d.seniority}"]`); if (r) r.checked = true; }
    counter.textContent = form.elements.motivacion.value.length;
    return d;
  }

  /* ---------------- boot ---------------- */
  const draft = restore();
  const params = new URLSearchParams(location.search);
  const area = params.get("area");
  if (area && AREAS.includes(area)) form.elements.area.value = area;
  let start = "1";
  const paso = params.get("paso");
  if (["2", "3"].includes(paso)) start = paso;
  else if (["2", "3"].includes(draft.step) && validateStep("1", false)) start = draft.step;
  if (location.hash === "#login") start = "login";
  show(start, { focus: false });
  if (Object.keys(draft).length) save();
  relayout();
  addEventListener("pagehide", () => stopStream());
})();
