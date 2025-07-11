// ================ CARRINHO ================
document.addEventListener("DOMContentLoaded", function () {
  const carrinhoBtn = document.getElementById("carrinho");
  const carrinhoContainer = document.getElementById("carrinho-container");
  const carrinhoOverlay = document.getElementById("carrinho-overlay");
  const fecharCarrinho = document.getElementById("fechar-carrinho");
  const continuarComprando = document.getElementById("continuar-comprando");
  const finalizarCompra = document.getElementById("finalizar-compra");
  const carrinhoItens = document.getElementById("carrinho-itens");
  const contadorCarrinho = document.getElementById("contador-carrinho");

  // Variáveis
  let carrinho = JSON.parse(localStorage.getItem("carrinho")) || [];
  let usuarioLogado = localStorage.getItem("usuarioLogado") === "true";

  // Event Listeners
  carrinhoBtn.addEventListener("click", toggleCarrinho);
  fecharCarrinho.addEventListener("click", fecharCarrinhoHandler);
  continuarComprando.addEventListener("click", fecharCarrinhoHandler);
  carrinhoOverlay.addEventListener("click", fecharCarrinhoHandler);
  finalizarCompra.addEventListener("click", finalizarCompraHandler);

  // Inicialização
  atualizarCarrinho();
  atualizarContador();

  // Funções
  function toggleCarrinho() {
    carrinhoContainer.classList.toggle("aberto");
    carrinhoOverlay.classList.toggle("visivel");
    document.body.style.overflow = carrinhoOverlay.classList.contains("visivel")
      ? "hidden"
      : "auto";
  }

  function fecharCarrinhoHandler() {
    carrinhoContainer.classList.remove("aberto");
    carrinhoOverlay.classList.remove("visivel");
    document.body.style.overflow = "auto";
  }

function atualizarCarrinho() {
    // Limpa o carrinho
    carrinhoItens.innerHTML = "";

    if (carrinho.length === 0) {
        carrinhoItens.innerHTML = `
        <div class="carrinho-vazio">
          <i class="fas fa-shopping-bag"></i>
          <p>Seu carrinho está vazio</p>
          <p>Adicione produtos para continuar</p>
        </div>
        `;
        // Atualiza totais para zerar os valores
        atualizarTotais();
        // Fecha o carrinho se estiver vazio
        fecharCarrinhoHandler();
        return;
    }

    // Adiciona cada item
    carrinho.forEach((item, index) => {
      const itemElement = document.createElement("div");
      itemElement.className = "carrinho-item";
      itemElement.innerHTML = `
        <img src="${item.imagem}" alt="${item.nome}" class="carrinho-item-img">
        <div class="carrinho-item-info">
          <div class="carrinho-item-titulo">${item.nome}</div>
          ${item.cor ? `<div class="carrinho-item-variante">Cor: ${item.cor}</div>` : ""}
          ${item.tamanho ? `<div class="carrinho-item-variante">Tamanho: ${item.tamanho}</div>` : ""}
          <div class="carrinho-item-preco">R$ ${item.preco.toFixed(2)}</div>
          <div class="carrinho-item-controle">
            <div class="carrinho-item-quantidade">
              <button onclick="alterarQuantidade(${index}, -1)">-</button>
              <span>${item.quantidade}</span>
              <button onclick="alterarQuantidade(${index}, 1)" ${item.quantidade >= item.estoqueMaximo ? 'disabled' : ''}>+</button>
            </div>
            <button class="carrinho-item-remover" onclick="removerItem(${index})">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      carrinhoItens.appendChild(itemElement);
    });

    // Atualiza totais
    atualizarTotais();
  }

function atualizarTotais() {
    // Se o carrinho estiver vazio, zera todos os totais
    if (carrinho.length === 0) {
        document.getElementById("carrinho-total").textContent = "R$ 0,00";
        return;
    }

    const subtotal = carrinho.reduce(
        (total, item) => total + item.preco * item.quantidade,
        0
    );
    const frete = calcularFrete(subtotal);
    const total = subtotal + frete;

    document.getElementById("carrinho-total").textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
}

  function calcularFrete(subtotal) {
    return subtotal > 200 ? 0 : 15;
  }

  function atualizarContador() {
    const totalItens = carrinho.reduce(
      (total, item) => total + item.quantidade,
      0
    );
    contadorCarrinho.textContent = totalItens;
    contadorCarrinho.style.display = totalItens > 0 ? "flex" : "none";
  }

  function finalizarCompraHandler() {
    if (carrinho.length === 0) {
      showAlert("Seu carrinho está vazio!", "error");
      return;
    }

    if (!usuarioLogado) {
      showAlert("Por favor, faça login para continuar com a compra", "warning");
      toggleCarrinho();
      abrirModalLogin();
      return;
    }

    // Redireciona para checkout
    window.location.href = "/checkout.html";
  }

  // Função para mostrar alerts estilizados
  function showAlert(message, type) {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type}`;
    alertDiv.innerHTML = `
      <div class="alert-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-times-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
      </div>
      <button class="close-alert">&times;</button>
    `;
    
    document.body.appendChild(alertDiv);
    
    // Fecha o alert após 5 segundos
    setTimeout(() => {
      alertDiv.classList.add("fade-out");
      setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
    
    // Fecha ao clicar no botão
    alertDiv.querySelector(".close-alert").addEventListener("click", () => {
      alertDiv.classList.add("fade-out");
      setTimeout(() => alertDiv.remove(), 300);
    });
  }

  // Funções globais
  window.alterarQuantidade = function (index, valor) {
    const novaQuantidade = carrinho[index].quantidade + valor;

    if (novaQuantidade < 1) {
      removerItem(index);
      return;
    }

    // Verifica se não está excedendo o estoque máximo
    if (valor > 0 && novaQuantidade > carrinho[index].estoqueMaximo) {
      showAlert(`Quantidade máxima disponível: ${carrinho[index].estoqueMaximo}`, "warning");
      return;
    }

    carrinho[index].quantidade = novaQuantidade;
    salvarCarrinho();
  };

window.removerItem = function (index) {
    carrinho.splice(index, 1);
    salvarCarrinho();
    showAlert("Produto removido do carrinho", "success");
    
    // Fecha o carrinho se estiver vazio e atualiza totais
    if (carrinho.length === 0) {
        atualizarTotais(); // Garante que os totais sejam zerados
        fecharCarrinhoHandler();
    }
};

  function salvarCarrinho() {
    localStorage.setItem("carrinho", JSON.stringify(carrinho));
    atualizarCarrinho();
    atualizarContador();
  }

  // Função para adicionar itens ao carrinho
  window.adicionarAoCarrinho = function (produto) {
    // Adiciona informação de estoque máximo ao produto
    produto.estoqueMaximo = produto.estoqueMaximo || 10; // Valor padrão caso não seja definido
    
    const itemExistente = carrinho.findIndex(
      (item) =>
        item.id === produto.id &&
        item.cor === produto.cor &&
        item.tamanho === produto.tamanho
    );

    if (itemExistente !== -1) {
      // Verifica se não excede o estoque ao adicionar
      const novaQuantidade = carrinho[itemExistente].quantidade + produto.quantidade;
      if (novaQuantidade > carrinho[itemExistente].estoqueMaximo) {
        showAlert(`Quantidade máxima disponível: ${carrinho[itemExistente].estoqueMaximo}`, "warning");
        return;
      }
      carrinho[itemExistente].quantidade = novaQuantidade;
    } else {
      carrinho.push(produto);
    }

    salvarCarrinho();
    showAlert("Produto adicionado ao carrinho", "success");
    toggleCarrinho();
  };
});