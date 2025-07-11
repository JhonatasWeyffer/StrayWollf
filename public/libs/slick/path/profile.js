// Verifica se o usuário está logado
const authToken = localStorage.getItem('authToken');

// Verifica se o token existe e não está malformado
if (!authToken || authToken.split('.').length !== 3) {
  window.location.href = 'javascript:history.back()';
}

// =================== MODIFICAR PARA A IMPLEMENTAÇÃO REAL =====================
const API_URL = 'http://localhost:3000';

// Configura a data máxima para o campo de nascimento 
document.getElementById('birth-date').max = new Date().toISOString().split('T')[0];

// Função para mostrar alertas personalizados
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert alert-${type}`;
    alertDiv.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        ${message}
    `;
            
document.body.appendChild(alertDiv);
            
    // Remove o alerta após 5 segundos
    setTimeout(() => {
        alertDiv.style.animation = 'fadeOut 0.5s ease-out';
        setTimeout(() => {
            alertDiv.remove();
        }, 500);
    }, 5000);
}

// Máscaras para os campos
function applyMasks() {
    // Máscara para Celular (00) 00000-0000
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 2) {
            value = `(${value.substring(0, 2)}) ${value.substring(2)}`;
        }
        if (value.length > 10) {
            value = `${value.substring(0, 10)}-${value.substring(10, 15)}`;
        }
        e.target.value = value.substring(0, 15);
    });

// Máscara para CPF 000.000.000-00
const cpfInput = document.getElementById('cpf');
cpfInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) {
        value = `${value.substring(0, 3)}.${value.substring(3)}`;
    }
    if (value.length > 7) {
        value = `${value.substring(0, 7)}.${value.substring(7)}`;
    }
    if (value.length > 11) {
        value = `${value.substring(0, 11)}-${value.substring(11)}`;
    }
    e.target.value = value.substring(0, 14);
});

    // Máscara para CEP 00000-000
    const cepInput = document.getElementById('cep');
    cepInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 5) {
            value = `${value.substring(0, 5)}-${value.substring(5)}`;
        }
        e.target.value = value.substring(0, 9);
    });
}

// Validações
function validateForm() {
    let isValid = true;

// Validação do Nome Completo
const fullName = document.getElementById('full-name').value.trim();
if (fullName.length < 5 || fullName.split(' ').length < 2) {
    showError('full-name', 'Digite seu nome completo');
    isValid = false;
} else {
    hideError('full-name');
}

// Validação do Celular (11 dígitos + DDD)
const phone = document.getElementById('phone').value.replace(/\D/g, '');
if (phone.length !== 11) {
    showError('phone', 'Celular inválido. Formato: (00) 00000-0000');
    isValid = false;
} else {
    hideError('phone');
}

// Validação do CPF (11 dígitos e válido)
const cpf = document.getElementById('cpf').value.replace(/\D/g, '');
if (cpf.length !== 11 || !validateCPF(cpf)) {
    showError('cpf', 'CPF inválido. Deve conter 11 dígitos');
    isValid = false;
} else {
    hideError('cpf');
}

// Validação da Data de Nascimento
const birthDate = document.getElementById('birth-date').value;
if (!birthDate) {
    showError('birth-date', 'Data de nascimento obrigatória');
    isValid = false;
} else {
    const birthDateObj = new Date(birthDate);
    const today = new Date();
    const minAgeDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
    const maxAgeDate = new Date(today.getFullYear() - 12, today.getMonth(), today.getDate());
    
    if (birthDateObj < minAgeDate || birthDateObj > maxAgeDate) {
        showError('birth-date', 'Data de nascimento inválida');
        isValid = false;
    } else {
        hideError('birth-date');
    }
}

// Validação do CEP (8 dígitos)
const cep = document.getElementById('cep').value.replace(/\D/g, '');
if (cep.length !== 8) {
    showError('cep', 'CEP inválido. Deve conter 8 dígitos');
    isValid = false;
} else {
    hideError('cep');
}

// Validação dos campos obrigatórios de endereço
const requiredAddressFields = ['address-street', 'address-number', 'address-neighborhood', 'address-city', 'address-state'];
requiredAddressFields.forEach(fieldId => {
    const value = document.getElementById(fieldId).value.trim();
    if (!value) {
        showError(fieldId, 'Campo obrigatório');
        isValid = false;
    } else {
        hideError(fieldId);
    }
});

return isValid;
}

// Função para validar CPF
function validateCPF(cpf) {
    cpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos e não é uma sequência repetida
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }
            
        // Validação dos dígitos verificadores
        let sum = 0;
        let remainder;
            
    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cpf.substring(i-1, i)) * (11 - i);
    }
            
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cpf.substring(i-1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) return false;
    
    return true;
}

// Funções auxiliares para mostrar/ocultar erros
function showError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    field.classList.add('input-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
}

 function hideError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}-error`);
    
    field.classList.remove('input-error');
    errorElement.style.display = 'none';
}

// Função para censurar dados sensíveis
function censorData(data, type) {
    if (!data) return '';
    
    switch(type) {
        case 'cpf':
            return '***.***.***-**';
        case 'birthdate':
            return '**/**/****';
        case 'phone':
            const phone = data.replace(/\D/g, '');
            if (phone.length === 11) {
                return `(${phone.substring(0, 2)}) *****-${phone.substring(7)}`;
            }
            return data;
        default:
            return data;
    }
}

// Função para extrair primeiro e segundo nome
function getShortName(fullName) {
    if (!fullName) return '';
    const names = fullName.split(' ');
    if (names.length === 1) return names[0];
    return `${names[0]} ${names[1]}`;
}

// Função para formatar a data no formato yyyy-MM-dd
function formatDateForInput(dateString) {
    if (!dateString) return '';
    
    // Se já estiver no formato correto, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
    }
            
    // Tenta converter de outros formatos
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '';
    }
            
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Carrega os dados do perfil
async function loadProfile() {
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    // Se token expirou
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('authToken');
      window.location.href = 'javascript:history.back()';
      return;
    }
                
    const data = await response.json();
                
    if (response.ok) {
        // Atualiza a UI com os dados do perfil
        document.getElementById('email').value = data.email;
        document.getElementById('full-name').value = data.full_name || '';
        document.getElementById('phone').value = formatPhone(data.phone) || '';
        document.getElementById('cpf').value = censorData(data.cpf, 'cpf');
        document.getElementById('birth-date').value = '';
        document.getElementById('birth-date').placeholder = censorData(data.birth_date, 'birthdate');
        document.getElementById('cep').value = formatCEP(data.cep) || '';
        document.getElementById('address-street').value = data.address_street || '';
        document.getElementById('address-number').value = data.address_number || '';
        document.getElementById('address-complement').value = data.address_complement || '';
        document.getElementById('address-neighborhood').value = data.address_neighborhood || '';
        document.getElementById('address-city').value = data.address_city || '';
        document.getElementById('address-state').value = data.address_state || '';
        
        // Atualiza o nome exibido
        document.getElementById('profile-display-name').textContent = getShortName(data.full_name) || '';
        
        // Atualiza a foto de perfil de forma segura
        const profilePictureContainer = document.getElementById('profile-picture-container');
        const placeholder = document.getElementById('profile-picture-placeholder');
        
       if (data.profile_picture) {
  const imgPath = data.profile_picture.startsWith('http') ? 
    data.profile_picture : 
    `${API_URL}${data.profile_picture}`;
  
  profilePictureContainer.innerHTML = `<img src="${imgPath}" alt="Foto de perfil">`;
  if (placeholder) {
    placeholder.style.display = 'none';
  }

        } else {
            profilePictureContainer.innerHTML = `
                <div class="profile-picture-placeholder" id="profile-picture-placeholder">
                    <i class="fas fa-user"></i>
                </div>
            `;
        }
        
        // Atualiza o botão para "Editar Perfil" se já tiver dados
        if (data.full_name && data.phone && data.cpf && data.birth_date) {
            document.getElementById('save-button').textContent = 'Editar Perfil';
        } else {
            document.getElementById('save-button').textContent = 'Salvar Alterações';
        }
        
    } else {
        showAlert('Erro ao carregar perfil: ' + (data.error || ''), 'error');
    }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao conectar com o servidor', 'error');
    }
}

// Funções para formatar dados
function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    return match ? `(${match[1]}) ${match[2]}-${match[3]}` : phone;
}

 function formatCPF(cpf) {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    return match ? `${match[1]}.${match[2]}.${match[3]}-${match[4]}` : cpf;
}

function formatCEP(cep) {
    if (!cep) return '';
    const cleaned = cep.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{5})(\d{3})$/);
    return match ? `${match[1]}-${match[2]}` : cep;
}

// Alterna entre modo de edição e visualização
function toggleEditMode() {
    const saveButton = document.getElementById('save-button');
    const isEditing = saveButton.textContent === 'Salvar Alterações';
    
    if (isEditing) {
        // Está no modo de edição, salva as alterações
        saveProfile();
    } else {
        // Está no modo de visualização, entra no modo de edição
        enterEditMode();
    }
}

// Entra no modo de edição
function enterEditMode() {
    // Carrega os dados reais (não censurados)
    loadRealData();
    
    // Atualiza o botão
    document.getElementById('save-button').textContent = 'Salvar Alterações';
}

// Carrega os dados reais para edição
async function loadRealData() {
    try {
        const response = await fetch(`${API_URL}/auth/profile/real`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
                
    const data = await response.json();
        
        if (response.ok) {
            // Preenche os campos com os dados reais
            document.getElementById('cpf').value = formatCPF(data.cpf) || '';
            document.getElementById('birth-date').value = formatDateForInput(data.birth_date) || '';
            document.getElementById('phone').value = formatPhone(data.phone) || '';
        } else {
            showAlert('Erro ao carregar dados para edição: ' + (data.error || ''), 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao conectar com o servidor', 'error');
    }
}

// Envia o formulário de atualização
async function saveProfile() {
    if (!validateForm()) {
        return;
    }
    
    const formData = {
        full_name: document.getElementById('full-name').value.trim(),
        phone: document.getElementById('phone').value.replace(/\D/g, ''),
        cpf: document.getElementById('cpf').value.replace(/\D/g, ''),
        birth_date: document.getElementById('birth-date').value,
        cep: document.getElementById('cep').value.replace(/\D/g, ''),
        address_street: document.getElementById('address-street').value.trim(),
        address_number: document.getElementById('address-number').value.trim(),
        address_complement: document.getElementById('address-complement').value.trim(),
        address_neighborhood: document.getElementById('address-neighborhood').value.trim(),
        address_city: document.getElementById('address-city').value.trim(),
        address_state: document.getElementById('address-state').value
    };
    
    try {
        const response = await fetch(`${API_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Perfil salvo com sucesso!', 'success');
            loadProfile(); // Recarrega os dados para mostrar os campos censurados
        } else {
            showAlert('Erro ao atualizar perfil: ' + (data.error || ''), 'error');
        }
    } catch (error) {
        console.error('Erro:', error);
        showAlert('Erro ao conectar com o servidor', 'error');
    }
}

// Upload da foto de perfil
// Modifique o listener de upload para lidar melhor com erros
document.getElementById('profile-picture-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Validação do tamanho do arquivo
    if (file.size > 5 * 1024 * 1024) {
        showAlert('A imagem deve ter no máximo 5MB', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('profile_picture', file);
    
    try {
        showAlert('Enviando imagem...', 'success');
        
        const response = await fetch(`${API_URL}/auth/profile/picture`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        // Verifique primeiro se houve erro
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha no upload');
        }
        
        const data = await response.json();
        showAlert('Foto de perfil atualizada com sucesso!', 'success');
        
        // Atualize a foto
        const profilePictureContainer = document.getElementById('profile-picture-container');
        const imgPath = data.profile_picture.startsWith('http') ? 
  data.profile_picture : 
  `${API_URL}${data.profile_picture}`;
        
        profilePictureContainer.innerHTML = `<img src="${imgPath}" alt="Foto de perfil">`;
    } catch (error) {
        console.error('Erro no upload:', error);
        showAlert(error.message || 'Erro ao atualizar foto de perfil', 'error');
    } finally {
        e.target.value = '';
    }
});

// Botão Cancelar
document.getElementById('cancel-btn').addEventListener('click', () => {
    loadProfile(); // Recarrega os dados originais
});

// Botão Salvar/Editar
document.getElementById('save-button').addEventListener('click', (e) => {
    e.preventDefault();
    toggleEditMode();
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('loggedIn');
    window.location.href = 'javascript:history.back()';
});

// Remove a barra final da URL se existir
if (window.location.pathname.endsWith('/')) {
  const newUrl = window.location.pathname.replace(/\/+$/, '') + window.location.search + window.location.hash;
  window.history.replaceState(null, null, newUrl);
}

    // Inicialização
    applyMasks();
    loadProfile();