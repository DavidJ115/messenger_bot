document.addEventListener("DOMContentLoaded", () => {
  window.pagina = 1;
  const limiteSelect = document.getElementById("limiteContactos");
  const tbody = document.querySelector("#tablaContactos tbody");
  const pagDiv = document.getElementById("paginacion");

  const popDept = document.getElementById("popover-dept");
  const popFecha = document.getElementById("popover-fecha");
  const triggerDept = document.querySelector('[data-target="dept"]');
  const triggerFecha = document.querySelector('[data-target="fecha"]');

  const inputDept = document.getElementById("inputDept");
  const applyDept = document.getElementById("applyDept");
  const closeDept = document.getElementById("closeDept");
  const clearDept = document.getElementById("clearDept");

  const inputFechaDesde = document.getElementById("inputFechaDesde");
  const inputFechaHasta = document.getElementById("inputFechaHasta");
  const applyFecha = document.getElementById("applyFecha");
  const closeFecha = document.getElementById("closeFecha");
  const clearFecha = document.getElementById("clearFecha");

  let filtroDept = "";
  let filtroFechaDesde = "";
  let filtroFechaHasta = "";

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatearFecha(fechaISO) {
    if (!fechaISO) return "";
    const fecha = new Date(fechaISO);
    return fecha.toLocaleString("es-HN", { dateStyle: "short" });
  }

  async function cargarContactos() {
    try {
      let limit = limiteSelect.value;
      const params = new URLSearchParams({ page: window.pagina });

      if (limit === "all") {
        limit = 100000;
        window.pagina = 1;
      }

      params.set("limit", limit);
      if (filtroDept) params.set("departamento", filtroDept);
      if (filtroFechaDesde) params.set("fecha_inicio", filtroFechaDesde);
      if (filtroFechaHasta) params.set("fecha_fin", filtroFechaHasta);

      const res = await fetch(`/api/contactos?${params.toString()}`);
      if (!res.ok) return console.error("Respuesta no OK", res.status, await res.text());

      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];

      tbody.innerHTML = data.map(c => `
        <tr data-fecha="${c.fecha || ""}">
          <td>${c.id}</td>
          <td>${escapeHtml(c.nombre)}</td>
          <td>${escapeHtml(c.departamento)}</td>
          <td>${escapeHtml(c.telefono)}</td>
          <td>${formatearFecha(c.fecha)}</td>
        </tr>
      `).join("");

      actualizarPaginacion(json.page || 1, json.totalPages || 1);
    } catch (err) {
      console.error("Error al cargar contactos:", err);
    }
  }

  function actualizarPaginacion(actual, total) {
    pagDiv.innerHTML = `
      <button ${actual <= 1 ? "disabled" : ""} onclick="window.pagina--; cargarContactos()">⬅ Anterior</button>
      &nbsp; Página ${actual} de ${total} &nbsp;
      <button ${actual >= total ? "disabled" : ""} onclick="window.pagina++; cargarContactos()">Siguiente ➡</button>
    `;
  }

  window.cargarContactos = cargarContactos;

  limiteSelect.addEventListener("change", () => {
    window.pagina = 1;
    cargarContactos();
  });

  // Popovers
  function openPopoverFor(triggerEl, popEl) {
    popDept.classList.remove("active");
    popFecha.classList.remove("active");
    popEl.classList.add("active");
    popEl.setAttribute("aria-hidden", "false");

    const iconRect = triggerEl.getBoundingClientRect();
    const popRect = popEl.getBoundingClientRect();
    const left = Math.max(8, iconRect.left + (iconRect.width / 2) - (popRect.width / 2));
    const top = iconRect.bottom + window.scrollY + 8;
    popEl.style.left = left + "px";
    popEl.style.top = top + "px";
  }

  function closePopovers() {
    popDept.classList.remove("active");
    popFecha.classList.remove("active");
    popDept.setAttribute("aria-hidden", "true");
    popFecha.setAttribute("aria-hidden", "true");
  }

  triggerDept.addEventListener("click", e => {
    e.stopPropagation();
    openPopoverFor(triggerDept, popDept);
    inputDept.focus();
    inputDept.value = filtroDept;
  });

  triggerFecha.addEventListener("click", e => {
    e.stopPropagation();
    openPopoverFor(triggerFecha, popFecha);
    inputFechaDesde.focus();
    inputFechaDesde.value = filtroFechaDesde;
    inputFechaHasta.value = filtroFechaHasta;
  });

  applyDept.addEventListener("click", () => {
    filtroDept = inputDept.value.trim();
    window.pagina = 1;
    closePopovers();
    cargarContactos();
  });
  clearDept.addEventListener("click", () => {
    filtroDept = "";
    inputDept.value = "";
    window.pagina = 1;
    closePopovers();
    cargarContactos();
  });
  closeDept.addEventListener("click", closePopovers);

  applyFecha.addEventListener("click", () => {
    filtroFechaDesde = inputFechaDesde.value || "";
    filtroFechaHasta = inputFechaHasta.value || "";
    window.pagina = 1;
    closePopovers();
    cargarContactos();
  });
  clearFecha.addEventListener("click", () => {
    filtroFechaDesde = "";
    filtroFechaHasta = "";
    inputFechaDesde.value = "";
    inputFechaHasta.value = "";
    window.pagina = 1;
    closePopovers();
    cargarContactos();
  });
  closeFecha.addEventListener("click", closePopovers);

  document.addEventListener("click", e => {
    if (!popDept.contains(e.target) && e.target !== triggerDept) popDept.classList.remove("active");
    if (!popFecha.contains(e.target) && e.target !== triggerFecha) popFecha.classList.remove("active");
  });

  document.addEventListener("keydown", e => { if (e.key === "Escape") closePopovers(); });

  // Exportar Excel
  const btnExportar = document.getElementById("btnExportar");
  btnExportar.addEventListener("click", async () => {
    try {
      const params = new URLSearchParams({ limit: 100000 });
      if (filtroDept) params.set("departamento", filtroDept);
      if (filtroFechaDesde) params.set("fecha_inicio", filtroFechaDesde);
      if (filtroFechaHasta) params.set("fecha_fin", filtroFechaHasta);

      const res = await fetch(`/api/contactos?${params.toString()}`);
      if (!res.ok) return console.error("Error exportando contactos", res.status);

      const json = await res.json();
      const data = Array.isArray(json.data) ? json.data : [];
      if (!data.length) return alert("No hay contactos para exportar.");

      const html = `
        <html><head><meta charset="UTF-8"></head>
        <body>
          <table>
            <thead>
              <tr><th>ID</th><th>Nombre</th><th>Departamento</th><th>Teléfono</th><th>Fecha</th></tr>
            </thead>
            <tbody>
              ${data.map(c => `
                <tr>
                  <td>${c.id}</td>
                  <td>${escapeHtml(c.nombre)}</td>
                  <td>${escapeHtml(c.departamento)}</td>
                  <td>${escapeHtml(c.telefono)}</td>
                  <td>${formatearFecha(c.fecha)}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </body></html>
      `;

      const blob = new Blob([html], { type: "application/vnd.ms-excel" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "contactos.xls";
      a.click();
      URL.revokeObjectURL(url);
      showToast("✅ Contactos exportados exitosamente", "success");
    } catch (err) {
      console.error("Error exportando contactos:", err);
      showToast("❌ No se pudieron exportar los contactos", "error");
    }
  });

  // Modal de vista previa
  const btnEnviar = document.getElementById("btnEnviar");
  const modal = document.getElementById("modalPreview");
  const tablaPreview = document.querySelector("#tablaPreview tbody");
  const btnCancelar = document.getElementById("btnCancelar");
  const btnConfirmar = document.getElementById("btnConfirmar");
  const loader = document.getElementById("loaderEnvio");
  let dataParaEnviar = [];

  btnEnviar.addEventListener("click", () => {
    const filas = document.querySelectorAll("#tablaContactos tbody tr");
    dataParaEnviar = [];
    tablaPreview.innerHTML = "";

    filas.forEach(tr => {
      const nombre = tr.children[1]?.textContent.trim() || "";
      const departamento = tr.children[2]?.textContent.trim() || "";
      const telefono = tr.children[3]?.textContent.trim() || "";
      const fecha = tr.children[4]?.textContent.trim() || "";

      if (nombre && telefono) dataParaEnviar.push({ nombre, departamento, telefono, fecha });
    });

    if (!dataParaEnviar.length) {
      alert("No hay contactos válidos para enviar.");
      return;
    }

    // Renderizar tabla en modal
    tablaPreview.innerHTML = dataParaEnviar.map(c => `
      <tr>
        <td>${c.nombre}</td>
        <td>${c.departamento}</td>
        <td>${c.telefono}</td>
        <td>${c.fecha}</td>
      </tr>
    `).join("");

    modal.style.display = "flex";
  });

  btnCancelar.addEventListener("click", () => { modal.style.display = "none"; });

  btnConfirmar.addEventListener("click", async () => {
    btnConfirmar.disabled = true;
    loader.style.display = "flex";

    try {
      // Enviar al backend los datos tal como están en la tabla
      const payload = dataParaEnviar.map(c => ({
        nombre: c.nombre || "Sin Nombre",
        departamento: c.departamento || "",
        telefono: (c.telefono || "").replace(/[\s-]/g, ""),
        fecha: c.fecha || null // enviar null si no hay fecha
      }));

      const res = await fetch("/api/enviar-crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: payload }),
      });

      const result = await res.json();
      if (result.success) showToast("✅ Envío exitoso al CRM.", "success");
      else showToast("⚠️ Error al enviar:", "error", (result.error || "Desconocido"));

    } catch (err) {
      console.error(err);
      showToast("❌ No se pudo conectar con el CRM.", "error");
    } finally {
      loader.style.display = "none";
      btnConfirmar.disabled = false;
      modal.style.display = "none";
    }
  });


  // Carga inicial
  cargarContactos();
});
