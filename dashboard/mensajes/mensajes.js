let pagina = 1;
let limite = 25;

const selectLimite = document.getElementById("limiteMensajes");
selectLimite.addEventListener("change", () => {
  limite = parseInt(selectLimite.value);
  pagina = 1; // Reiniciamos a página 1
  cargarMensajes();
});

async function cargarMensajes() {
  try {
    const res = await fetch(`/api/mensajes?page=${pagina}&limit=${limite}`);
    const json = await res.json();
    const data = json.data;

    const tbody = document.querySelector("#tablaMensajes tbody");
    tbody.innerHTML = data.map(m => {
      // Color condicional: azul si viene de bot, blanco si es usuario
      const colorFila = m.from_bot === 1 ? "style='background-color:#cce7ff;'" : "";

      return `
        <tr ${colorFila}>
          <td>${m.id}</td>
          <td>${m.nombre_usuario}</td>
          <td>${m.mensaje}</td>
          <td>${m.fecha ? m.fecha : ''}</td>
        </tr>
      `;
    }).join("");

    actualizarPaginacionMensajes(json.page, json.totalPages);
  } catch (err) {
    console.error("Error al cargar mensajes:", err);
  }
}

// Botones de paginación
function actualizarPaginacionMensajes(actual, total) {
  const pagDiv = document.getElementById("paginacionMensajes");
  pagDiv.innerHTML = `
    <button ${actual <= 1 ? "disabled" : ""} onclick="pagina--; cargarMensajes()">⬅ Anterior</button>
    Página ${actual} de ${total}
    <button ${actual >= total ? "disabled" : ""} onclick="pagina++; cargarMensajes()">Siguiente ➡</button>
  `;
}

// Carga inicial
cargarMensajes();
