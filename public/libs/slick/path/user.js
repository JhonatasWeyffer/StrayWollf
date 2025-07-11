// Atualização do botão de login
const loginButton = document.getElementById("login");

loginButton.addEventListener("click", (e) => {
  e.preventDefault();

  // Verifica usuário logado
  if (localStorage.getItem("authToken")) {
    window.location.href = "perfil/";
    return;
  }

  showModal();

  // Garante que o formulário de login está visível
  loginForm.style.display = "flex";
  registerForm.style.display = "none";
  forgotPasswordForm.style.display = "none";
  loginRegisterToggle.style.display = "block";
  modalTitle.textContent = "Login";
  toggleText.textContent = "Não tem uma conta?";
  toggleLink.textContent = "Cadastre-se";
});

// ================ VARIÁVEIS GLOBAIS ================
const modal = document.getElementById("modal");
const overlay = document.getElementById("overlay");
const closeBtn = document.getElementById("close-btn");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotPasswordForm = document.getElementById("forgot-password-form");
const toggleLink = document.getElementById("toggle-link");
const toggleText = document.getElementById("toggle-text");
const loginRegisterToggle = document.getElementById("login-register-toggle");
const modalTitle = document.getElementById("modal-title");
const alertMessage = document.getElementById("alert-message");
const forgotPasswordLink = document.getElementById("forgot-password");
const adminLoginLink = document.getElementById("admin-login");
const backToLoginLink = document.getElementById("back-to-login");

// ================ FUNÇÕES ================
/* Mostra o modal com animação */
function showModal() {
  overlay.style.display = "block";
  modal.style.display = "block";
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);
  document.body.style.overflow = "hidden";
  modal.setAttribute("aria-hidden", "false");
}

function hideModal() {
  modal.classList.remove("active");
  overlay.style.display = "none";
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
  document.body.style.overflow = "auto";
  modal.setAttribute("aria-hidden", "true");
}
/* Mostra mensagem de erro/sucesso/alert */
function showAlert(message, type = "error") {
  alertMessage.textContent = message;
  alertMessage.className = `alert alert-${type}`;
  alertMessage.style.display = "block";

  setTimeout(() => {
    alertMessage.style.opacity = "0";
    setTimeout(() => {
      alertMessage.style.display = "none";
      alertMessage.style.opacity = "1";
    }, 300);
  }, 5000);
}

/* Valida e-mail */
function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/* Mostra o formulário de recuperação de senha */
function showForgotPasswordForm() {
  loginForm.style.display = "none";
  registerForm.style.display = "none";
  forgotPasswordForm.style.display = "flex";
  loginRegisterToggle.style.display = "none";
  modalTitle.textContent = "Recuperar Senha";
}

/* Volta para o login */
function backToLogin() {
  forgotPasswordForm.style.display = "none";
  loginForm.style.display = "flex";
  loginRegisterToggle.style.display = "block";
  modalTitle.textContent = "Login";
}

/* Troca entre Login e Cadastro */
function toggleForms() {
  const isLogin = loginForm.style.display !== "none";

  if (isLogin) {
    loginForm.style.display = "none";
    registerForm.style.display = "flex";
    modalTitle.textContent = "Cadastre-se";
    toggleText.textContent = "Já tem uma conta? ";
    toggleLink.textContent = "Login";
  } else {
    loginForm.style.display = "flex";
    registerForm.style.display = "none";
    modalTitle.textContent = "Login";
    toggleText.textContent = "Não tem uma conta? ";
    toggleLink.textContent = "Cadastre-se";
  }
}

// =================== MODIFICAR PARA A IMPLEMENTAÇÃO REAL =====================
const API_URL = 'http://localhost:3000';

                        /*=====  LOGIN  =====*/
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      // Armazena o token e redireciona
      localStorage.setItem("authToken", data.token);
      showAlert("Login realizado com sucesso!", "success");
      localStorage.setItem("loggedIn", "true");
      setTimeout(() => {
        hideModal();
        window.location.href = "perfil/";
      }, 1500);
    } else {
      showAlert(data.error || "Erro no login!", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showAlert("Erro ao conectar com o servidor!", "error");
  }
});

// ================ CADASTRO ================
let isSubmitting = false;
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (isSubmitting) return;
  isSubmitting = true;

  const submitButton = e.target.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = "Cadastrando...";
  submitButton.disabled = true;

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm-password").value;

  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        confirmPassword,
      }),
    });

    const data = await response.json();

    if (response.ok) {
      showAlert(data.message, "success");
      registerForm.reset();

      setTimeout(() => {
        loginForm.style.display = "flex";
        registerForm.style.display = "none";
        modalTitle.textContent = "Login";
        toggleText.textContent = "Não tem uma conta? ";
        toggleLink.textContent = "Cadastre-se";
      }, 2000);
    } else {
      showAlert(data.error || "Erro no registro!", "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showAlert("Erro ao conectar com o servidor!", "error");
  } finally {
    isSubmitting = false;
    submitButton.textContent = originalText;
    submitButton.disabled = false;
  }
});

// ================ RECUPERAÇÃO DE SENHA ================
document
  .getElementById("forgot-password-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    if (isSubmitting) return;
    isSubmitting = true;

    const submitButton = e.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    submitButton.textContent = "Enviando...";
    submitButton.disabled = true;

    const email = document.getElementById("recovery-email").value;
    if (!email) {
      showAlert("Por favor, insira um e-mail.", "alert");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showAlert(data.message, "success");
        setTimeout(backToLogin, 2000);
      } else {
        showAlert(data.error || "Erro ao solicitar redefinição!", "error");
      }
    } catch (error) {
      showAlert("Erro ao conectar com o servidor!", "error");
      console.error("Erro:", error);
    } finally {
      isSubmitting = false;
      submitButton.textContent = originalText;
      submitButton.disabled = false;
    }
  });

//Lista de Eventos
// Mostra o modal quando a página carrega
window.addEventListener("load", () => {
  if (!localStorage.getItem("loggedIn")) {
    setTimeout(showModal, 1000);
  }
});

// Fecha o modal
closeBtn.addEventListener("click", hideModal);
overlay.addEventListener("click", hideModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") hideModal();
});

// Impede que o modal feche ao clicar dentro
modal.addEventListener("click", (e) => {
  e.stopPropagation();
});

// Navegação entre formulários
toggleLink.addEventListener("click", toggleForms);
forgotPasswordLink.addEventListener("click", (e) => {
  e.preventDefault();
  showForgotPasswordForm();
});
backToLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  backToLogin();
});

// Submit dos formulários
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  handleLogin(email, password);
});

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const confirmPassword = document.getElementById(
    "register-confirm-password"
  ).value;F
  handleRegister(email, password, confirmPassword);
});

forgotPasswordForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("recovery-email").value;
  handlePasswordRecovery(email);
});

// Login ADM (redireciona)
adminLoginLink.addEventListener("click", (e) => {
  e.preventDefault();
  window.location.href = "";
});
