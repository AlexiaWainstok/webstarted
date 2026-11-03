(() => {
  const STATIONS = [
    { name: "Postulación", desc: "Creas tu perfil verificado una sola vez: datos básicos, experiencia y un video corto en inglés." },
    { name: "Video en inglés", desc: "Grabas o subes un video de 30 a 60 segundos. Con él pre-verificamos tu nivel de inglés (B2/C1) antes de presentarte a los clientes." },
    { name: "Tech fit interview", desc: "Entrevista técnica con nuestro equipo para confirmar que encajas con la vacante." },
    { name: "Entrevistas con el cliente", desc: "Conversas directamente con el cliente final: la startup de EE. UU. que busca tu perfil." },
    { name: "Oferta en USD", desc: "Rol 100% remoto con pago en dólares." },
  ];

  const route = document.getElementById("route");
  const buttons = [...document.querySelectorAll(".station-btn")];
  const sign = document.getElementById("station-sign");
  const out = (k) => sign.querySelector(`[data-sign="${k}"]`);

  function select(i) {
    buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
    const s = STATIONS[i];
    out("n").textContent = i + 1;
    out("name").textContent = s.name;
    out("desc").textContent = s.desc;
    const next = STATIONS[i + 1];
    out("next").innerHTML = next
      ? `Próxima estación: <strong>${next.name}</strong>`
      : "Fin del recorrido: <strong>tu nuevo rol remoto</strong>";
  }

  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  buttons.forEach((b, i) => {
    b.closest(".station").style.setProperty("--i", i);
    b.addEventListener("click", () => select(i));
    b.addEventListener("focus", () => select(i));
    b.addEventListener("pointerenter", () => { if (finePointer.matches) select(i); });
  });

  // Draw the line once on load; content is visible by default if this never runs.
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inView = route.getBoundingClientRect().top < innerHeight;
  if (!reduce && inView) {
    route.classList.add("intro");
    requestAnimationFrame(() => requestAnimationFrame(() => route.classList.add("go")));
    setTimeout(() => route.classList.remove("intro", "go"), 1800);
  }

  // Boarding form: let the visitor board without picking an area.
  const form = document.querySelector(".boarding");
  form.addEventListener("submit", () => {
    const sel = form.querySelector("select");
    if (!sel.value) sel.disabled = true; // keeps the URL clean: registro.html
  });
  addEventListener("pageshow", () => { form.querySelector("select").disabled = false; });

  // Logo carousel: duplicate the list once so translateX(-50%) loops seamlessly.
  const marquee = document.querySelector("[data-marquee]");
  if (marquee) {
    const inner = marquee.querySelector(".marquee-inner");
    const list = inner.querySelector(".marquee-list");
    const clone = list.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.removeAttribute("aria-label");
    clone.inert = true;
    inner.append(clone);
    const setSpeed = () => inner.style.setProperty("--dur", `${Math.max(20, list.scrollWidth / 45)}s`); // ~45px/s
    setSpeed();
    new ResizeObserver(setSpeed).observe(list);
    const toggle = document.querySelector("[data-marquee-toggle]");
    toggle.addEventListener("click", () => {
      const paused = marquee.classList.toggle("is-paused");
      toggle.setAttribute("aria-pressed", String(paused));
      toggle.querySelector("use").setAttribute("href", paused ? "#i-play" : "#i-pause");
      toggle.querySelector("span").textContent = paused ? "Reanudar carrusel" : "Pausar carrusel";
    });
  }
})();
