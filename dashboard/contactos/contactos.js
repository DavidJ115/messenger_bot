// contactos.js
document.addEventListener("DOMContentLoaded", () => {
  let pagina = 1;
  const limiteSelect = document.getElementById("limiteContactos");
  const tbody = document.querySelector("#tablaContactos tbody");
  const pagDiv = document.getElementById("paginacion");

  // filtros globales que se envían al backend
  let filtroDept = "";
  let filtroFechaDesde = "";
  let filtroFechaHasta = "";

  // popovers
  const popDept = document.getElementById("popover-dept");
  const popFecha = document.getElementById("popover-fecha");

  const triggerDept = document.querySelector('[data-target="dept"]');
  const triggerFecha = document.querySelector('[data-target="fecha"]');

  // inputs y botones dentro de popovers
  const inputDept = document.getElementById("inputDept");
  const applyDept = document.getElementById("applyDept");
  const closeDept = document.getElementById("closeDept");
  const clearDept = document.getElementById("clearDept");

  const inputFechaDesde = document.getElementById("inputFechaDesde");
  const inputFechaHasta = document.getElementById("inputFechaHasta");
  const applyFecha = document.getElementById("applyFecha");
  const closeFecha = document.getElementById("closeFecha");
  const clearFecha = document.getElementById("clearFecha");

  // ajustar límite
  limiteSelect.addEventListener("change", () => {
    pagina = 1;
    cargarContactos();
  });

  // abrir/posicionar popover
  function openPopoverFor(triggerEl, popEl) {
    // cerrar otros
    popDept.classList.remove("active");
    popFecha.classList.remove("active");

    // colocar activo
    popEl.classList.add("active");
    popEl.setAttribute("aria-hidden", "false");

    // posicionamos centrado respecto al trigger
    const iconRect = triggerEl.getBoundingClientRect();
    const popRect = popEl.getBoundingClientRect();
    // calcular left para centrar bajo el icono (ajustar si sale de pantalla)
    const left = Math.max(8, iconRect.left + (iconRect.width / 2) - (popRect.width / 2));
    const top = iconRect.bottom + window.scrollY + 8; // un poco debajo
    popEl.style.left = left + "px";
    popEl.style.top = top + "px";
  }

  // cerrar popovers
  function closePopovers() {
    popDept.classList.remove("active");
    popFecha.classList.remove("active");
    popDept.setAttribute("aria-hidden", "true");
    popFecha.setAttribute("aria-hidden", "true");
  }

  // eventos triggers
  triggerDept.addEventListener("click", (e) => {
    e.stopPropagation();
    openPopoverFor(triggerDept, popDept);
    inputDept.focus();
    // prefill input con filtro actual
    inputDept.value = filtroDept;
  });

  triggerFecha.addEventListener("click", (e) => {
    e.stopPropagation();
    openPopoverFor(triggerFecha, popFecha);
    inputFechaDesde.focus();
    // prefill
    inputFechaDesde.value = filtroFechaDesde;
    inputFechaHasta.value = filtroFechaHasta;
  });

  // click fuera: cerrar
  document.addEventListener("click", (e) => {
    if (!popDept.contains(e.target) && e.target !== triggerDept) popDept.classList.remove("active");
    if (!popFecha.contains(e.target) && e.target !== triggerFecha) popFecha.classList.remove("active");
  });

  // ESC para cerrar
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePopovers();
  });

  // aplicar / limpiar filtros (dept)
  applyDept.addEventListener("click", () => {
    filtroDept = inputDept.value.trim();
    pagina = 1;
    closePopovers();
    cargarContactos();
  });
  clearDept.addEventListener("click", () => {
    filtroDept = "";
    inputDept.value = "";
    pagina = 1;
    closePopovers();
    cargarContactos();
  });
  closeDept.addEventListener("click", () => {
    closePopovers();
  });

  // aplicar / limpiar filtros (fecha rango)
  applyFecha.addEventListener("click", () => {
    filtroFechaDesde = inputFechaDesde.value || "";
    filtroFechaHasta = inputFechaHasta.value || "";
    pagina = 1;
    closePopovers();
    cargarContactos();
  });
  clearFecha.addEventListener("click", () => {
    filtroFechaDesde = "";
    filtroFechaHasta = "";
    inputFechaDesde.value = "";
    inputFechaHasta.value = "";
    pagina = 1;
    closePopovers();
    cargarContactos();
  });
  closeFecha.addEventListener("click", () => {
    closePopovers();
  });

  // función para cargar datos desde backend con filtros globales
  async function cargarContactos() {
    try {
      const limit = parseInt(limiteSelect.value, 10) || 25;
      const params = new URLSearchParams({
        page: pagina,
        limit,
      });
      if (filtroDept) params.set("departamento", filtroDept);
      if (filtroFechaDesde) params.set("fecha_inicio", filtroFechaDesde);
      if (filtroFechaHasta) params.set("fecha_fin", filtroFechaHasta);

      const res = await fetch(`/api/contactos?${params.toString()}`);
      if (!res.ok) {
        console.error("Respuesta no OK", res.status, await res.text());
        return;
      }
      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];

      // render filas
      tbody.innerHTML = data.map(c => `
        <tr>
          <td>${c.id}</td>
          <td>${escapeHtml(c.nombre)}</td>
          <td>${escapeHtml(c.departamento)}</td>
          <td>${escapeHtml(c.telefono)}</td>
          <td>${c.fecha ? c.fecha : ''}</td>
        </tr>
      `).join("");

      actualizarPaginacion(json.page || 1, json.totalPages || 1);
    } catch (err) {
      console.error("Error al cargar contactos:", err);
    }
  }

  // helper para escapar texto (evita romper HTML si hay comillas)
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // paginación
  function actualizarPaginacion(actual, total) {
    pagDiv.innerHTML = `
      <button ${actual <= 1 ? "disabled" : ""} onclick="pagina--; cargarContactos()">⬅ Anterior</button>
      &nbsp; Página ${actual} de ${total} &nbsp;
      <button ${actual >= total ? "disabled" : ""} onclick="pagina++; cargarContactos()">Siguiente ➡</button>
    `;
  }

  // Exponer funciones al scope global solo para los botones de paginación del template
  window.cargarContactos = cargarContactos;
  window.pagina = pagina;

  // llamada inicial
  cargarContactos();

  
});

// Exportar tabla con estilos a Excel (HTML embebido)
document.getElementById("btnExportar").addEventListener("click", () => {
  const tabla = document.getElementById("tablaContactos");
  if (!tabla) return;

  // Obtenemos estilos de global.css y contactos.css
  Promise.all([
    fetch("/global.css").then(r => r.text()).catch(() => ""),
    fetch("./contactos.css").then(r => r.text()).catch(() => "")
  ]).then(([globalCss, contactosCss]) => {
    const estilos = `<style>${globalCss}\n${contactosCss}</style>`;

    const html = `
      <html>
      <head>
        <meta charset="UTF-8">
        ${estilos}
      </head>
      <body>
        ${tabla.outerHTML}
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "contactos.xls"; // Excel abre .xls aunque sea HTML
    a.click();

    URL.revokeObjectURL(url);
  });
});
