
//================= RECUPERAÇÃO DE SENHA =================
// Pega o token da URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get("token");
document.getElementById("token").value = token;

// =================== MODIFICAR PARA A IMPLEMENTAÇÃO REAL =====================
const API_URL = 'http://localhost:3000';

// Formulário de redefinição
document.getElementById("reset-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const messageEl = document.getElementById("message");
  messageEl.textContent = "";
  messageEl.className = "message";

  const newPassword = document.getElementById("new-password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  // Validação básica no frontend
  if (newPassword.length < 6) {
    messageEl.textContent = "A senha deve ter no mínimo 6 caracteres";
    messageEl.className = "message error";
    return;
  }

  if (newPassword !== confirmPassword) {
    messageEl.textContent = "As senhas não coincidem";
    messageEl.className = "message error";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token,
        newPassword,
        confirmPassword,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      messageEl.textContent = data.message;
      messageEl.className = "message success";

      // Redireciona após 2 segundos
      setTimeout(() => {     //===== MODIFICAR PARA O LINK REAL =======
        window.location.href = `../../index.html`;
      }, 2000);
    } else {
      messageEl.textContent = data.error || "Erro ao redefinir senha";
      messageEl.className = "message error";
    }
  } catch (error) {
    messageEl.textContent = "Erro ao conectar com o servidor";
    messageEl.className = "message error";
    console.error("Erro:", error);
  }
});