const API_CARDS = 'http://localhost:3000';
const CACHE_KEY = 'products_cache_v2';
const CACHE_EXPIRATION = 30 * 60 * 1000; // 30 minutos

// Estratégia de carregamento: Cache First, then Network
document.addEventListener("DOMContentLoaded", () => {
  // Carrega imediatamente do cache se disponível
  const cachedProducts = getCachedProducts();
  if (cachedProducts) {
    renderProducts(cachedProducts);
  }
  
  // Busca dados atualizados em segundo plano
  loadProducts();
});

async function loadProducts() {
  try {
    const products = await fetchWithCache();
    renderProducts(products);
  } catch (error) {
    console.error("Erro ao carregar produtos:", error);
    if (!getCachedProducts()) {
      showError();
    }
  }
}

async function fetchWithCache() {
  // Tenta buscar da API
  const response = await fetch(`${API_CARDS}/api/products`);
  if (!response.ok) throw new Error("Erro ao carregar produtos");
  
  const products = await response.json();
  cacheProducts(products);
  return products;
}

function cacheProducts(products) {
  const cacheData = {
    data: products,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (e) {
    console.warn("Falha ao salvar no cache:", e);
    // Limpa cache se estiver cheio
    localStorage.removeItem(CACHE_KEY);
  }
}

function getCachedProducts() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRATION) return null;
    
    return data;
  } catch (e) {
    return null;
  }
}

// Renderização otimizada
function renderProducts(products) {
  if (!products || !products.length) return;
  
  // Pré-carrega imagens dos primeiros produtos
  preloadImportantImages(products);
  
  // Renderiza seções prioritárias primeiro
  renderSectionProducts(products);
  renderCarouselProducts(products);
}

function preloadImportantImages(products) {
  // Pré-carrega imagens dos primeiros produtos de cada seção
  const importantProducts = [
    ...products.filter(p => p.category === "Moletons").slice(0, 2),
    ...products.filter(p => p.category === "Camisas").slice(0, 2),
    ...products.filter(p => p.category === "Bermudas").slice(0, 1),
    ...products.filter(p => p.category === "Calçados").slice(0, 1)
  ];
  
  importantProducts.forEach(product => {
    const imgUrl = getImageUrl(product);
    preloadImage(imgUrl);
  });
}

function renderSectionProducts(products) {
  const sections = [
    {
      title: "Moletons & Camisas",
      containerClass: "moletons-camisas",
      categories: ["Moletons", "Camisas"],
      limits: { "Moletons": 2, "Camisas": 2 }
    },
    {
      title: "Bermudas & Calças",
      containerClass: "bermudas-calcas",
      categories: ["Bermudas", "Calças"],
      limits: { "Bermudas": 2, "Calças": 2 }
    },
    {
      title: "Tênis & Calçados",
      containerClass: "tenis-calcados",
      categories: ["Calçados"],
      limits: { "Calçados": 4 }
    },
    {
      title: "Acessórios",
      containerClass: "acessorios",
      categories: ["Acessórios"],
      limits: { "Acessórios": 4 }
    }
  ];

  sections.forEach(section => {
    const container = document.querySelector(`.${section.containerClass} .produtos-grid`);
    if (!container) return;

    // Usa DocumentFragment para renderização eficiente
    const fragment = document.createDocumentFragment();
    
    section.categories.forEach(category => {
      products
        .filter(p => p.category === category)
        .slice(0, section.limits[category])
        .forEach(product => {
          fragment.appendChild(createProductElement(product));
        });
    });

    container.innerHTML = "";
    container.appendChild(fragment);
  });
}

function renderCarouselProducts(products) {
  const carousel = document.querySelector(".carousel");
  if (!carousel) return;

  // Seleciona produtos para o carrossel (otimizado)
  const carouselProducts = selectCarouselProducts(products);
  
  // Renderização eficiente
  const fragment = document.createDocumentFragment();
  carouselProducts.forEach(product => {
    fragment.appendChild(createProductElement(product));
  });

  carousel.innerHTML = "";
  carousel.appendChild(fragment);

  // Reinicializa o carrossel se necessário
  if (window.$?.fn?.slick) {
    $(".carousel").slick("refresh");
  }
}

function selectCarouselProducts(products) {
  const categories = ["Moletons", "Camisas", "Bermudas", "Calças", "Calçados", "Acessórios"];
  const usedIds = new Set();
  const selected = [];

  // Primeiro seleciona 1 de cada categoria
  categories.forEach(category => {
    const prod = products.find(p => p.category === category && !usedIds.has(p.id));
    if (prod) {
      selected.push(prod);
      usedIds.add(prod.id);
    }
  });

  // Completa com produtos mais populares/novos (exemplo)
  if (selected.length < 10) {
    products
      .filter(p => !usedIds.has(p.id))
      .sort((a, b) => (b.views || 0) - (a.views || 0)) // Ordena por popularidade
      .slice(0, 10 - selected.length)
      .forEach(p => {
        selected.push(p);
        usedIds.add(p.id);
      });
  }

  return selected.slice(0, 10);
}

function createProductElement(product) {
  const productElement = document.createElement("div");
  productElement.className = "product";

  const imageUrl = getImageUrl(product);
  const price = formatPrice(product.price);

  // Otimização de imagens
  const loadingAttr = product.index > 4 ? "lazy" : "eager";
  const fetchPriority = product.index <= 2 ? "high" : "auto";

  productElement.innerHTML = `
    <a style="text-decoration: none;" href="produto/?id=${product.id}">
        <img src="${imageUrl}" alt="${product.name}" 
             loading="${loadingAttr}"
             fetchpriority="${fetchPriority}">
        <div>
            <div class="name">${product.name}</div>
            <div class="price">${price}</div>
        </div>
    </a>
  `;

  return productElement;
}

// Funções utilitárias
function getImageUrl(product) {
  return product.images?.length > 0 ? 
    `${API_CARDS}/uploads/${product.images[0].split('/').pop()}` : 
    "img/IMG.gif";
}

function formatPrice(price) {
  return parseFloat(price).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function preloadImage(url) {
  const img = new Image();
  img.src = url;
}

function showError() {
  const containers = document.querySelectorAll('.produtos-grid, .carousel');
  containers.forEach(container => {
    if (container && container.children.length === 0) {
      container.innerHTML = '<div class="error-message">Erro ao carregar produtos. Recarregue a página.</div>';
    }
  });
}