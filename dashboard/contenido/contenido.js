let pagina = 1;              // Página inicial
const limite = 25;           // Máximo por página
let editandoId = null;       // Para edición

//const modalForm = document.getElementById('modalForm');

// Formatea fecha/hora en input datetime-local
function formatDateTime(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Carga contenido paginado
async function cargarContenido() {
  try {
    const res = await fetch(`/api/contenido?page=${pagina}&limit=${limite}`);
    const json = await res.json();

    // Si tu backend devuelve directamente un array
    const data = Array.isArray(json.data) ? json.data : [];
    const page = json.page || 1;
    const totalPages = json.totalPages || 1;

    const tbody = document.querySelector("#tablaContenido tbody");
    tbody.innerHTML = data.map(c => {
      const inicio = formatDateTime(c.fecha_inicio);
      const fin = formatDateTime(c.fecha_fin);

      return `
        <tr>
          <td>${c.id}</td>
          <td>${c.titulo}</td>
          <td>${c.texto}</td>
          <td>${inicio}</td>
          <td>${fin}</td>
          <td>
            <button class="btnEditar" 
              data-id="${c.id}" 
              data-titulo="${c.titulo.replaceAll('"','&quot;')}" 
              data-texto="${c.texto.replaceAll('"','&quot;')}" 
              data-fecha_inicio="${inicio}" 
              data-fecha_fin="${fin}">✏️</button>
            <button onclick="eliminarContenido(${c.id})">❌</button>
          </td>
        </tr>
      `;
    }).join("");

    actualizarPaginacionContenido(page, totalPages);

  } catch (err) {
    console.error("Error al cargar contenido:", err);
  }
}

// Botones de paginación
function actualizarPaginacionContenido(actual, total) {
  const pagDiv = document.getElementById("paginacionContenido");
  pagDiv.innerHTML = `
    <button ${actual <= 1 ? "disabled" : ""} onclick="pagina--; cargarContenido()">⬅ Anterior</button>
    Página ${actual} de ${total}
    <button ${actual >= total ? "disabled" : ""} onclick="pagina++; cargarContenido()">Siguiente ➡</button>
  `;
}

// Editar contenido
function editarContenido(id, titulo, texto, fecha_inicio, fecha_fin) {
  editandoId = id;
  document.getElementById("contenidoId").value = id;
  document.getElementById("titulo").value = titulo;
  document.getElementById("texto").value = texto;
  document.getElementById("fecha_inicio").value = fecha_inicio;
  document.getElementById("fecha_fin").value = fecha_fin;

  // Abrir el modal
  modalForm.style.display = 'flex';
}

// Cancelar edición
function cancelarEdicion() {
  editandoId = null;
  document.getElementById("formContenido").reset();
}

// Guardar contenido (crear o editar)
async function guardarContenido(e) {
  e.preventDefault();
  const id = document.getElementById("contenidoId").value;
  const titulo = document.getElementById("titulo").value;
  const texto = document.getElementById("texto").value;
  const fecha_inicio = document.getElementById("fecha_inicio").value || null;
  const fecha_fin = document.getElementById("fecha_fin").value || null;

  const url = id ? `/api/contenido/${id}` : "/api/contenido";
  const method = id ? "PUT" : "POST";

  await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, texto, fecha_inicio, fecha_fin })
  });

  cancelarEdicion();

  // Cierra modal y resetea formulario
  modalForm.style.display = 'none';

  cargarContenido();
}

// Eliminar contenido
async function eliminarContenido(id) {
  await fetch(`/api/contenido/${id}`, { method: "DELETE" });
  cargarContenido();
}

// Listener para todos los botones de editar
document.querySelector("#tablaContenido").addEventListener("click", (e) => {
  if (e.target.classList.contains("btnEditar")) {
    const btn = e.target;
    editarContenido(
      btn.dataset.id,
      btn.dataset.titulo,
      btn.dataset.texto,
      btn.dataset.fecha_inicio,
      btn.dataset.fecha_fin
    );
  }
});

// Carga inicial
cargarContenido();
