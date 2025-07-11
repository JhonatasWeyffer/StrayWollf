function abrirModalLogin() {
  const modal = document.getElementById("modal");
  const overlay = document.getElementById("overlay");
  
  if (modal && overlay) {
    modal.classList.add("active");
    overlay.style.display = "block";
    document.getElementById("login-form").style.display = "flex";
    document.getElementById("register-form").style.display = "none";
    document.getElementById("forgot-password-form").style.display = "none";
    document.getElementById("modal-title").textContent = "Login";
    document.getElementById("toggle-text").textContent = "Não tem uma conta? ";
    document.getElementById("toggle-link").textContent = "Cadastre-se";
  }
}

// Variáveis globais
let productData = null;
let selectedColor = null;
let selectedSize = null;
let currentImageIndex = 0;
let relatedProducts = [];

// Elementos DOM
const elements = {
  productTitle: document.getElementById("product-title"),
  productCategory: document.getElementById("product-category"),
  mainImage: document.getElementById("main-image"),
  thumbnailContainer: document.getElementById("thumbnail-container"),
  currentPrice: document.getElementById("current-price"),
  originalPrice: document.getElementById("original-price"),
  discountBadge: document.getElementById("discount-badge"),
  productDescription: document.getElementById("product-description"),
  colorOptions: document.getElementById("color-options"),
  sizeOptions: document.getElementById("size-options"),
  quantityInput: document.getElementById("quantity-input"),
  stockInfo: document.getElementById("stock-info"),
  addToCartBtn: document.getElementById("add-to-cart-btn"),
  alertMessage: document.getElementById("alert-message"),
  fullDescription: document.getElementById("full-description"),
  specsTableBody: document.getElementById("specs-table-body"),
  imageModal: document.getElementById("image-modal"),
  modalImage: document.getElementById("modal-image"),
  closeModal: document.querySelector(".close-modal"),
  decreaseQty: document.getElementById("decrease-qty"),
  increaseQty: document.getElementById("increase-qty"),
  tabBtns: document.querySelectorAll(".tab-btn"),
  tabContents: document.querySelectorAll(".tab-content"),
};

async function fetchProductData(productId) {
  try {
    const response = await fetch(
      `http://localhost:3000/api/products/${productId}`
    );

    if (!response.ok) {
      throw new Error("Produto não encontrado");
    }

    const apiData = await response.json();

    // Transformar os dados da API para o formato esperado pelo frontend
    productData = {
      id: apiData.id,
      name: apiData.name,
      category: apiData.category,
      description: apiData.description,
      fullDescription: apiData.full_description,
      price: parseFloat(apiData.price),
      originalPrice: apiData.original_price
        ? parseFloat(apiData.original_price)
        : null,
      discount: apiData.original_price
        ? Math.round((1 - apiData.price / apiData.original_price) * 100)
        : 0,
      specs: apiData.specs,
      variants: apiData.variants,
      colors: apiData.variants.map((variant) => ({
        id: variant.id,
        name: variant.color.name,
        code: variant.color.code,
        images: variant.images,
      })),
      sizes: [], // Não usamos mais isso diretamente - os tamanhos são por variante
    };

    // Carrega os dados do produto
    loadProductData();
    // Processar variantes para cores e tamanhos
    const colorMap = new Map();
    const sizeSet = new Set();

    apiData.variants.forEach((variant) => {
      // Adicionar cor se não existir
      if (!colorMap.has(variant.color.name)) {
        colorMap.set(variant.color.name, {
          id: variant.id,
          name: variant.color.name,
          code: variant.color.code,
          images: variant.images,
        });
      }

      // Adicionar tamanhos
      variant.sizes.forEach((size) => {
        sizeSet.add(
          JSON.stringify({
            id: size.name,
            name: size.name,
            stock: size.stock,
          })
        );
      });
    });

    // Converter mapas para arrays
    productData.colors = Array.from(colorMap.values());
    productData.sizes = Array.from(sizeSet).map((str) => JSON.parse(str));

    // Ordenar tamanhos se necessário
    productData.sizes.sort((a, b) => {
      const sizeOrder = ["PP", "P", "M", "G", "GG", "XG", "XXG"];
      return sizeOrder.indexOf(a.name) - sizeOrder.indexOf(b.name);
    });

    loadRelatedProducts();
  } catch (error) {
    console.error("Erro ao carregar dados do produto:", error);
  }
}

// Carrega os dados do produto na página
function loadProductData() {
  if (!productData) return;

const categoryLink = document.getElementById("category-link");
categoryLink.textContent = productData.category;
categoryLink.href = `../categoria/${productData.category.toLowerCase()}/`;

  // Atualiza o breadcrumb com o nome do produto
  document.getElementById("product-name-breadcrumb").textContent =
    productData.name;
  document.getElementById("product-title-breadcrumb").textContent =
    productData.name;

  // Informações básicas
  elements.productTitle.textContent = productData.name;
  elements.productDescription.textContent = productData.description;
  elements.fullDescription.innerHTML = productData.fullDescription;

  // Preço
  elements.currentPrice.textContent = `R$ ${productData.price
    .toFixed(2)
    .replace(".", ",")}`;

  if (
    productData.originalPrice &&
    productData.originalPrice > productData.price
  ) {
    elements.originalPrice.textContent = `R$ ${productData.originalPrice
      .toFixed(2)
      .replace(".", ",")}`;
    elements.discountBadge.textContent = `${productData.discount}% OFF`;
    elements.discountBadge.style.backgroundColor = "#ff5252";
  } else {
    elements.originalPrice.textContent = "";
    elements.discountBadge.textContent = "";
    elements.discountBadge.style.backgroundColor = "transparent";
  }

  // Cores
  elements.colorOptions.innerHTML = "";
  productData.colors.forEach((color, index) => {
    const colorElement = document.createElement("div");
    colorElement.className = "color-option";
    colorElement.style.backgroundColor = color.code;
    colorElement.title = color.name;
    colorElement.dataset.colorId = color.id;

    // Seleciona a primeira cor por padrão
    if (index === 0) {
      colorElement.classList.add("selected");
      selectedColor = color;
      loadProductImages(color.images);
      // Atualiza os tamanhos para a primeira cor
      updateSizeOptionsForColor(color);
    }

    colorElement.addEventListener("click", () =>
      selectColor(color, colorElement)
    );
    elements.colorOptions.appendChild(colorElement);
  });

  // Tamanhos
  productData.sizes.forEach((size, index) => {
    const sizeElement = document.createElement("div");
    sizeElement.className = "size-option";
    sizeElement.textContent = size.name;
    sizeElement.dataset.sizeId = size.id;

    if (size.stock <= 0) {
      sizeElement.classList.add("unavailable");
      sizeElement.title = "Esgotado";
    } else {
      sizeElement.title = `${size.stock} disponíveis`;

      // Seleciona o primeiro tamanho disponível por padrão
      if (index === 0 || (selectedSize === null && size.stock > 0)) {
        sizeElement.classList.add("selected");
        selectedSize = size;
        updateStockInfo(size.stock);
      }
    }

    sizeElement.addEventListener("click", () => selectSize(size, sizeElement));
    elements.sizeOptions.appendChild(sizeElement);
  });

  // Especificações
  elements.specsTableBody.innerHTML = "";
  productData.specs.forEach((spec) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <th>${spec.name}</th>
            <td>${spec.value}</td>
        `;
    elements.specsTableBody.appendChild(row);
  });

  // Adiciona o produto no formato desejado
  const produtoContainer = document.createElement("div");
  produtoContainer.className = "produto";

  // Usa a primeira imagem disponível ou uma padrão
  const primeiraImagem =
    productData.images.length > 0
      ? productData.images[0]
      : "../../img/IMG.jpeg";

  produtoContainer.innerHTML = `
        <img src="${primeiraImagem}" alt="${productData.name}">
        <h4>${productData.name}</h4>
        <p>R$ ${productData.price.toFixed(2).replace(".", ",")}</p>
    `;

  // Adiciona ao DOM onde você quiser que apareça
  document.querySelector(".product-layout").appendChild(produtoContainer);
}

// Carrega as imagens do produto
function loadProductImages(images) {
  if (!images || images.length === 0) return;

  // Define a imagem principal
  elements.mainImage.src = images[0];
  elements.mainImage.alt = productData.name;

  // Limpa as miniaturas existentes
  elements.thumbnailContainer.innerHTML = "";

  // Adiciona as miniaturas
  images.forEach((image, index) => {
    const thumbnail = document.createElement("img");
    thumbnail.src = image;
    thumbnail.alt = `${productData.name} - ${index + 1}`;
    thumbnail.className = "thumbnail";

    // Primeira miniatura ativa por padrão
    if (index === 0) {
      thumbnail.classList.add("active");
      currentImageIndex = 0;
    }

    thumbnail.addEventListener("click", () => {
      // Remove a classe 'active' de todas as miniaturas
      document
        .querySelectorAll(".thumbnail")
        .forEach((t) => t.classList.remove("active"));

      // Adiciona a classe 'active' para a miniatura clicada
      thumbnail.classList.add("active");

      // Atualiza a imagem principal
      elements.mainImage.src = image;
      currentImageIndex = index;
    });

    elements.thumbnailContainer.appendChild(thumbnail);
  });
}

// Seleciona uma cor e atualiza os tamanhos disponíveis
function selectColor(color, element) {
  // Remove a seleção de todas as cores
  document
    .querySelectorAll(".color-option")
    .forEach((c) => c.classList.remove("selected"));

  // Adiciona a seleção para a cor clicada
  element.classList.add("selected");
  selectedColor = color;

  // Carrega as imagens para a cor selecionada
  loadProductImages(color.images);

  // Atualiza os tamanhos disponíveis para esta cor específica
  updateSizeOptionsForColor(color);
}

// Atualizar os tamanhos com base na cor selecionada
function updateSizeOptionsForColor(color) {
  // Encontra a variante correspondente à cor selecionada
  const variant = productData.variants.find(
    (v) => v.color.name === color.name && v.color.code === color.code
  );

  if (!variant) {
    console.error("Variante não encontrada para a cor selecionada");
    return;
  }

  // Limpa as opções de tamanho atuais
  elements.sizeOptions.innerHTML = "";

  // Adiciona os tamanhos disponíveis para esta variante
  variant.sizes.forEach((size, index) => {
    const sizeElement = document.createElement("div");
    sizeElement.className = "size-option";
    sizeElement.textContent = size.name;
    sizeElement.dataset.sizeId = size.id;

    if (size.stock <= 0) {
      sizeElement.classList.add("unavailable");
      sizeElement.title = "Esgotado";
    } else {
      sizeElement.title = `${size.stock} disponíveis`;

      // Seleciona o primeiro tamanho disponível por padrão
      if (index === 0 || (selectedSize === null && size.stock > 0)) {
        sizeElement.classList.add("selected");
        selectedSize = size;
        updateStockInfo(size.stock);
      }
    }

    sizeElement.addEventListener("click", () => selectSize(size, sizeElement));
    elements.sizeOptions.appendChild(sizeElement);
  });

  // Se nenhum tamanho estiver selecionado (todos esgotados), limpa a seleção
  if (!document.querySelector(".size-option.selected")) {
    selectedSize = null;
    updateStockInfo(0);
  }
}

// Seleciona um tamanho
function selectSize(size, element) {
  if (size.stock <= 0) return;

  // Remove a seleção de todos os tamanhos
  document
    .querySelectorAll(".size-option")
    .forEach((s) => s.classList.remove("selected"));

  // Adiciona a seleção para o tamanho clicado
  element.classList.add("selected");
  selectedSize = size;

  // Atualiza as informações de estoque
  updateStockInfo(size.stock);
}

// Verifica a disponibilidade do tamanho selecionado para a cor atual
function checkSizeAvailability() {
  if (!selectedSize) return;

  // Encontra o elemento do tamanho selecionado
  const sizeElement = document.querySelector(
    `.size-option[data-size-id="${selectedSize.id}"]`
  );

  if (sizeElement) {
    // Se o tamanho estiver esgotado, deseleciona
    if (selectedSize.stock <= 0) {
      sizeElement.classList.remove("selected");
      selectedSize = null;

      // Tenta selecionar o primeiro tamanho disponível
      const firstAvailable = document.querySelector(
        ".size-option:not(.unavailable)"
      );
      if (firstAvailable) {
        firstAvailable.click();
      } else {
        updateStockInfo(0);
      }
    }
  }
}

// Atualiza as informações de estoque
function updateStockInfo(stock) {
  if (stock > 10) {
    elements.stockInfo.textContent = "Em estoque";
    elements.stockInfo.className = "stock-info";
  } else if (stock > 0) {
    elements.stockInfo.textContent = `Últimas ${stock} unidades!`;
    elements.stockInfo.className = "stock-info low-stock";
  } else {
    elements.stockInfo.textContent = "Esgotado";
    elements.stockInfo.className = "stock-info";
  }

  // Atualiza a quantidade máxima permitida
  elements.quantityInput.max = stock > 10 ? 10 : stock;

  // Ajusta a quantidade se for maior que o estoque
  if (parseInt(elements.quantityInput.value) > stock) {
    elements.quantityInput.value = stock > 0 ? 1 : 0;
  }

  // Desabilita os botões se o produto estiver esgotado
  elements.addToCartBtn.disabled = stock <= 0;
}

// Mostra mensagem de feedback
function showAlert(message, type) {
  elements.alertMessage.textContent = message;
  elements.alertMessage.className = `alert alert-${type}`;
  elements.alertMessage.style.display = "block";

  // Esconde a mensagem após 5 segundos
  setTimeout(() => {
    elements.alertMessage.style.display = "none";
  }, 5000);
}

// Adiciona ao carrinho
function addToCart() {
  if (!selectedColor || !selectedSize) {
    showAlert(
      "Por favor, selecione a cor e o tamanho antes de adicionar ao carrinho.",
      "error"
    );
    return;
  }

  const quantity = parseInt(elements.quantityInput.value);

  if (quantity <= 0) {
    showAlert("Por favor, selecione uma quantidade válida.", "error");
    return;
  }

  const cartItem = {
    id: productData.id,
    nome: productData.name,
    cor: selectedColor.name,
    tamanho: selectedSize.name,
    preco: productData.price,
    quantidade: quantity,
    imagem: selectedColor.images[0],
  };

  // Chama a função global para adicionar ao carrinho
  if (typeof adicionarAoCarrinho === 'function') {
    adicionarAoCarrinho(cartItem);
  } else {
    console.error("Função adicionarAoCarrinho não encontrada");
  }
}

// Atualiza o contador do carrinho (simulação)
function updateCartCounter() {
  // Na implementação real, você buscaria o total de itens do carrinho da API
  const cartCounter = document.getElementById("contador-carrinho");
  if (cartCounter) {
    const currentCount = parseInt(cartCounter.textContent) || 0;
    cartCounter.textContent =
      currentCount + parseInt(elements.quantityInput.value);
  }
}

// Compra agora (redireciona para o checkout)
function buyNow() {
  if (!selectedColor || !selectedSize) {
    showAlert(
      "Por favor, selecione a cor e o tamanho antes de comprar.",
      "error"
    );
    return;
  }

  const quantity = parseInt(elements.quantityInput.value);

  if (quantity <= 0) {
    showAlert("Por favor, selecione uma quantidade válida.", "error");
    return;
  }

  // Primeiro adiciona ao carrinho
  addToCart();

  // Depois redireciona para o checkout (simulação)
  setTimeout(() => {
    window.location.href = "checkout.html";
  }, 1000);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  // Agora os botões vão existir quando este código executar
  document.querySelector(".prev-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    changeImage("prev");
  });

  document.querySelector(".next-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    changeImage("next");
  });

  // Obtém o ID do produto da URL (simulação)
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id") || 1;

  // Carrega os dados do produto
  fetchProductData(productId);

  // Imagem principal - clique para ampliar
  elements.mainImage.addEventListener("click", () => {
    elements.modalImage.src = selectedColor.images[currentImageIndex];
    elements.imageModal.style.display = "flex";
    document.body.style.overflow = "hidden";
  });

  // Fechar modal
  elements.closeModal.addEventListener("click", () => {
    elements.imageModal.style.display = "none";
    document.body.style.overflow = "auto";
  });

  // Fechar modal ao clicar fora da imagem
  elements.imageModal.addEventListener("click", (e) => {
    if (e.target === elements.imageModal) {
      elements.imageModal.style.display = "none";
      document.body.style.overflow = "auto";
    }
  });

  // Controle de quantidade
  elements.decreaseQty.addEventListener("click", () => {
    const currentValue = parseInt(elements.quantityInput.value);
    if (currentValue > 1) {
      elements.quantityInput.value = currentValue - 1;
    }
  });

  elements.increaseQty.addEventListener("click", () => {
    const currentValue = parseInt(elements.quantityInput.value);
    const maxValue = parseInt(elements.quantityInput.max);
    if (currentValue < maxValue) {
      elements.quantityInput.value = currentValue + 1;
    }
  });

  // Validar entrada de quantidade
  elements.quantityInput.addEventListener("change", () => {
    const value = parseInt(elements.quantityInput.value);
    const max = parseInt(elements.quantityInput.max);

    if (isNaN(value) || value < 1) {
      elements.quantityInput.value = 1;
    } else if (value > max) {
      elements.quantityInput.value = max;
    }
  });

  // Botões de ação
  elements.addToCartBtn.addEventListener("click", addToCart);

  // Tabs
  elements.tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      // Remove a classe 'active' de todos os botões e conteúdos
      elements.tabBtns.forEach((b) => b.classList.remove("active"));
      elements.tabContents.forEach((c) => c.classList.remove("active"));

      // Adiciona a classe 'active' para o botão e conteúdo clicado
      btn.classList.add("active");
      const tabId = btn.getAttribute("data-tab");
      document.getElementById(`${tabId}-tab`).classList.add("active");
    });
  });
});