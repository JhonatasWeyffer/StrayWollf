// Configurações
const API_CARDS = 'http://localhost:3000';
const CACHE_KEY = 'products_cache';
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutos

// Remove a barra final da URL se existir
document.addEventListener("DOMContentLoaded", () => {
  // Carrega produtos imediatamente do cache se disponível
  const cachedProducts = getCachedProducts();
  if (cachedProducts) {
    renderBermudas(cachedProducts);
  }
  
  // Busca produtos atualizados
  loadProducts();
  
  // Verifica URL
  if (window.location.pathname.endsWith('/')) {
    const newUrl = window.location.pathname.replace(/\/+$/, '') + window.location.search + window.location.hash;
    window.history.replaceState(null, null, newUrl);
  }
});

async function loadProducts() {
  try {
    await fetchAndCacheProducts();
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    // Se falhar e não tiver cache, mostrar mensagem de erro
    if (!getCachedProducts()) {
      showError();
    }
  }
}

async function fetchAndCacheProducts() {
  const response = await fetch(`${API_CARDS}/api/products`);
  if (!response.ok) throw new Error("Erro ao carregar produtos");
  
  const products = await response.json();
  cacheProducts(products);
  renderBermudas(products);
}

function cacheProducts(products) {
  const cacheData = {
    data: products,
    timestamp: Date.now()
  };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

function getCachedProducts() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (!cached) return null;
  
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp > CACHE_EXPIRATION) return null;
  
  return data;
}

function renderBermudas(products) {
  const container = document.querySelector('.bermudas .produtos-grid');
  if (!container) return;

  const fragment = document.createDocumentFragment();
  const bermudas = products.filter(p => p.category === "Bermudas");
  
  container.innerHTML = "";
  
  // Pré-carrega as primeiras imagens para prioridade
  bermudas.slice(0, 4).forEach(p => {
    const imgUrl = getImageUrl(p);
    preloadImage(imgUrl);
  });

  bermudas.forEach(product => {
    fragment.appendChild(createProductElement(product));
  });

  container.appendChild(fragment);
  adjustLayout(container, bermudas.length);
}

function getImageUrl(product) {
  return product.images?.length > 0 ? 
    `${API_CARDS}/uploads/${product.images[0].split('/').pop()}` : 
    "../img/IMG.gif";
}

function preloadImage(url) {
  const img = new Image();
  img.src = url;
}

function createProductElement(product) {
  const productElement = document.createElement("div");
  productElement.className = "produto";

  const imageUrl = getImageUrl(product);
  const price = formatPrice(product.price);

  productElement.innerHTML = `
    <a style="text-decoration: none;" href="../produto/?id=${product.id}">
        <img src="${imageUrl}" alt="${product.name}" 
             ${window.innerWidth > 768 ? 'fetchpriority="high"' : ''}
             loading="${product.index > 3 ? 'lazy' : 'eager'}">
        <div>
            <div class="name">${product.name}</div>
            <div class="price">${price}</div>
        </div>
    </a>
  `;

  return productElement;
}

function formatPrice(price) {
  return parseFloat(price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function adjustLayout(container, productCount) {
  if (productCount % 4 !== 0) {
    const remaining = 4 - (productCount % 4);
    for (let i = 0; i < remaining; i++) {
      const placeholder = document.createElement('div');
      placeholder.className = 'produto placeholder';
      placeholder.style.visibility = 'hidden';
      container.appendChild(placeholder);
    }
    
    if (productCount < 4) {
      container.style.justifyContent = 'center';
    }
  } else {
    container.style.justifyContent = '';
  }
}

function showError() {
  const container = document.querySelector('.bermudas .produtos-grid');
  if (container) {
    container.innerHTML = '<div style="text-align: center; margin-top: 4%;" class="error-message">Erro na busca do produtos. <br> Não foi possível carregar os produtos. Tente recarregar a página ou contatar o administrador!.</div>';
  }
}