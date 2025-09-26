// ====== Función para mostrar toast ======
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container") || (() => {
    const div = document.createElement("div");
    div.id = "toast-container";
    div.style.position = "fixed";
    div.style.top = "20px";
    div.style.right = "20px";
    div.style.zIndex = "9999";
    document.body.appendChild(div);
    return div;
  })();

  const toast = document.createElement("div");
  toast.textContent = message;
  toast.style.marginBottom = "10px";
  toast.style.padding = "12px 20px";
  toast.style.borderRadius = "6px";
  toast.style.color = "#fff";
  toast.style.fontSize = "14px";
  toast.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.5s, transform 0.5s";

  // Colores según tipo
  if (type === "success") toast.style.background = "#2ecc71";
  else if (type === "error") toast.style.background = "#e74c3c";
  else toast.style.background = "#3498db";

  container.appendChild(toast);

  // animación
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 100);

  // eliminar después de 3s
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// ====== Inyecta header ======
fetch("/includes/header.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("header").innerHTML = data;

    // Activar enlace actual
    const links = document.querySelectorAll("nav a");
    links.forEach(link => {
      if (link.href === window.location.href) {
        link.classList.add("active");
      }
    });

    // Botón de logout
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          const response = await fetch("/logout", {
            method: "POST",
            credentials: "same-origin"
          });

          if (response.ok) {
            showToast("Sesión cerrada correctamente", "success");
            setTimeout(() => (window.location.href = "/"), 1500);
          } else {
            showToast("Error cerrando sesión", "error");
          }
        } catch (error) {
          console.error(error);
          showToast("Error de conexión al servidor", "error");
        }
      });
    }
  });

// ====== Inyecta footer ======
fetch("/includes/footer.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("footer").innerHTML = data;
  });
