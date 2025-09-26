function showToast(message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // Remover el toast después de 4 segundos
    setTimeout(() => {
        toast.remove();
    }, 4000);
}

// Listener del login
document.getElementById("loginForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const usuario = document.getElementById("usuario").value;
    const contraseña = document.getElementById("contraseña").value;

    try {
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario, contraseña }),
            credentials: "same-origin"
        });

        if (response.ok) {
            showToast("¡Login exitoso! Redirigiendo al dashboard...", "success");
            setTimeout(() => {
                window.location.href = "/dashboard/mensajes";
            }, 1200); // espera un poco para que el toast se vea
        } else {
            const text = await response.text();
            showToast("Error: " + text, "error");
        }
    } catch (error) {
        showToast("Error de conexión al servidor", "error");
        console.error(error);
    }
});



