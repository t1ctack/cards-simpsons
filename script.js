// URL da API pública dos Simpsons (retorna { docs: [ ...personagens ] })
const API_URL = "https://apisimpsons.fly.dev/api/personajes?limit=1000";

// Quantos cards aparecem por vez
const POR_PAGINA = 24;

// Elementos da página
const grade = document.getElementById("grade");
const info = document.getElementById("info");
const campoBusca = document.getElementById("busca");
const filtroStatus = document.getElementById("filtroStatus");
const btnFavoritos = document.getElementById("btnFavoritos");
const btnMais = document.getElementById("btnMais");

// Estado da aplicação
let todosPersonagens = [];
let listaFiltrada = [];
let quantidadeVisivel = POR_PAGINA;
let soFavoritos = false;
let horaAtualizacao = "";

// Favoritos salvos no navegador (localStorage)
let favoritos = carregarFavoritos();

function carregarFavoritos() {
  try {
    return new Set(JSON.parse(localStorage.getItem("favoritosSimpsons")) || []);
  } catch (erro) {
    return new Set();
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem("favoritosSimpsons", JSON.stringify([...favoritos]));
  } catch (erro) {
    // Se o navegador bloquear o armazenamento, o site continua funcionando.
  }
}

// ---------- Consumo da API com fetch ----------
function buscarPersonagens() {
  info.textContent = "Carregando personagens...";

  fetch(API_URL)
    .then(function (resposta) {
      if (!resposta.ok) {
        throw new Error("Erro HTTP " + resposta.status);
      }
      return resposta.json();
    })
    .then(function (dados) {
      // Mantém apenas personagens com nome e imagem
      todosPersonagens = (dados.docs || []).filter(function (p) {
        return p.Nombre && p.Imagen;
      });

      horaAtualizacao = new Date().toLocaleTimeString("pt-BR");
      montarFiltroStatus();
      aplicarFiltros();
    })
    .catch(function (erro) {
      console.error("Falha ao consumir a API:", erro);
      info.textContent = "Não foi possível carregar os personagens agora. Verifique sua internet e tente novamente.";
    });
}

// ---------- Utilidades ----------
function limparTexto(texto) {
  return (texto || "").replace(/\s+/g, " ").trim();
}

function normalizar(texto) {
  return limparTexto(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function nomeStatus(status) {
  const s = limparTexto(status);
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "Desconhecido";
}

function classeStatus(status) {
  const s = normalizar(status);
  if (s === "vivo") return "status--vivo";
  if (s === "fallecido") return "status--fallecido";
  if (s === "ficticio") return "status--ficticio";
  return "";
}

function resumir(texto, limite) {
  const t = limparTexto(texto);
  return t.length > limite ? t.slice(0, limite).trim() + "..." : t;
}

// ---------- Filtros ----------
function montarFiltroStatus() {
  const lista = [...new Set(todosPersonagens.map(function (p) {
    return nomeStatus(p.Estado);
  }))].sort();

  lista.forEach(function (status) {
    const opcao = document.createElement("option");
    opcao.value = status;
    opcao.textContent = status;
    filtroStatus.appendChild(opcao);
  });
}

function aplicarFiltros() {
  const termo = normalizar(campoBusca.value);
  const status = filtroStatus.value;

  listaFiltrada = todosPersonagens.filter(function (p) {
    const nomeOk = normalizar(p.Nombre).includes(termo);
    const statusOk = status === "todos" || nomeStatus(p.Estado) === status;
    const favoritoOk = !soFavoritos || favoritos.has(p._id);
    return nomeOk && statusOk && favoritoOk;
  });

  quantidadeVisivel = POR_PAGINA;
  renderizar();
}

// ---------- Criação dinâmica dos cards (DOM) ----------
function criarCard(personagem) {
  const card = document.createElement("article");
  card.className = "card";

  const nome = document.createElement("h3");
  nome.className = "card__nome";
  nome.textContent = limparTexto(personagem.Nombre);

  const coracao = document.createElement("button");
  coracao.type = "button";
  coracao.className = "card__coracao";
  coracao.textContent = "♥";
  atualizarCoracao(coracao, personagem);
  coracao.addEventListener("click", function () {
    alternarFavorito(personagem, coracao);
  });

  const imagem = document.createElement("img");
  imagem.className = "card__imagem";
  imagem.src = personagem.Imagen;
  imagem.alt = "Imagem de " + limparTexto(personagem.Nombre);
  imagem.loading = "lazy";
  imagem.addEventListener("error", function () {
    // Imagem de reserva caso o link da API esteja quebrado
    imagem.src = "data:image/svg+xml;utf8," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='150' height='170'><rect width='100%' height='100%' fill='#fff3a0'/><text x='50%' y='52%' font-size='54' text-anchor='middle'>🍩</text></svg>"
    );
  }, { once: true });

  const status = document.createElement("span");
  status.className = "card__status " + classeStatus(personagem.Estado);
  status.textContent = nomeStatus(personagem.Estado);

  const ocupacao = document.createElement("p");
  ocupacao.className = "card__ocupacao";
  ocupacao.textContent = resumir(personagem.Ocupacion, 60) || "Ocupação desconhecida";

  const descricao = document.createElement("p");
  descricao.className = "card__descricao";
  descricao.textContent = resumir(personagem.Historia, 110);

  card.appendChild(coracao);
  card.appendChild(nome);
  card.appendChild(imagem);
  card.appendChild(status);
  card.appendChild(ocupacao);
  card.appendChild(descricao);

  return card;
}

function atualizarCoracao(botao, personagem) {
  const ativo = favoritos.has(personagem._id);
  botao.classList.toggle("ativo", ativo);
  botao.setAttribute("aria-pressed", String(ativo));
  botao.setAttribute(
    "aria-label",
    (ativo ? "Remover dos favoritos: " : "Favoritar: ") + limparTexto(personagem.Nombre)
  );
}

function alternarFavorito(personagem, botao) {
  if (favoritos.has(personagem._id)) {
    favoritos.delete(personagem._id);
  } else {
    favoritos.add(personagem._id);
  }
  salvarFavoritos();
  atualizarCoracao(botao, personagem);

  // Se está vendo só favoritos, atualiza a lista na hora
  if (soFavoritos) {
    aplicarFiltros();
  }
}

function renderizar() {
  grade.replaceChildren();

  const visiveis = listaFiltrada.slice(0, quantidadeVisivel);
  visiveis.forEach(function (personagem) {
    grade.appendChild(criarCard(personagem));
  });

  if (listaFiltrada.length === 0) {
    info.textContent = soFavoritos
      ? "Você ainda não favoritou ninguém. Clique no ♥ de um card!"
      : "Nenhum personagem encontrado com esses filtros.";
  } else {
    info.textContent =
      "Mostrando " + visiveis.length + " de " + listaFiltrada.length +
      " personagens • dados carregados da API às " + horaAtualizacao;
  }

  btnMais.hidden = visiveis.length >= listaFiltrada.length;
}

// ---------- Eventos ----------
campoBusca.addEventListener("input", aplicarFiltros);
filtroStatus.addEventListener("change", aplicarFiltros);

btnFavoritos.addEventListener("click", function () {
  soFavoritos = !soFavoritos;
  btnFavoritos.setAttribute("aria-pressed", String(soFavoritos));
  aplicarFiltros();
});

btnMais.addEventListener("click", function () {
  quantidadeVisivel += POR_PAGINA;
  renderizar();
});

// Inicia a aplicação
buscarPersonagens();
