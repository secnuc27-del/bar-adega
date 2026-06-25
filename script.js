// =====================================================
// PROTEÇÃO ANTI-BOT / ANTI-AUTOMAÇÃO (camada client-side)
// =====================================================
// AVISO: Esta camada dificulta automações comuns, mas NÃO é
// segurança real. Um atacante pode contornar qualquer proteção
// de front-end. A segurança real está no servidor, nos headers
// HTTP, no rate limiting e no WAF (Cloudflare em produção).
// =====================================================
;(function _antiBot() {
  'use strict';

  // --- 1. Detectar navegadores headless / automatizados ---
  // Selenium, Puppeteer, Playwright e similares expõem
  // propriedades específicas no objeto navigator / window.
  const headlessSignals = [
    () => navigator.webdriver === true,
    () => !!window._Selenium_IDE_Recorder,
    () => !!window.__selenium_unwrapped,
    () => !!window.__webdriver_evaluate,
    () => !!window.__driver_evaluate,
    () => !!window.__webdriver_script_fn,
    () => typeof window.callPhantom === 'function',
    () => typeof window._phantom !== 'undefined',
    () => !!window.__nightmare,
    () => navigator.languages && navigator.languages.length === 0,
  ];

  const isAutomated = headlessSignals.some(fn => { try { return fn(); } catch { return false; } });

  if (isAutomated) {
    // Não bloquear completamente — apenas registrar e limitar
    // (bloquear abruptamente pode alertar o atacante sobre o que detectamos)
    console.warn('[Security] Ambiente automatizado detectado.');
    // Throttle agressivo para bots: limitar interações
    window._botDetected = true;
  }

  // --- 2. Throttle do link do WhatsApp (anti-bot spam) ---
  // Impede que bots disparem o link do WhatsApp muitas vezes
  let _waLastClick = 0;
  const WA_THROTTLE_MS = 3000; // 3 segundos entre cliques

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href*="wa.me"], a[href*="whatsapp"]');
    if (!link) return;
    const now = Date.now();
    if (window._botDetected || (now - _waLastClick < WA_THROTTLE_MS)) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    _waLastClick = now;
  }, true);

  // --- 3. Honeypot: campo invisível em formulários ---
  // Bots preenchem todos os campos visíveis; humanos não veem este.
  // Usado em conjunto com verificação antes de qualquer envio.
  window._honeypotTriggered = false;
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('form').forEach(function(form) {
      const trap = document.createElement('input');
      trap.type      = 'text';
      trap.name      = 'website'; // nome genérico que bots adoram preencher
      trap.tabIndex  = -1;
      trap.autocomplete = 'off';
      trap.setAttribute('aria-hidden', 'true');
      // Estilo inline para garantir invisibilidade mesmo com CSS bloqueado
      trap.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
      form.appendChild(trap);

      trap.addEventListener('input', function() {
        window._honeypotTriggered = true;
        console.warn('[Security] Honeypot acionado — possível bot.');
      });
    });
  });

})();

// =====================================================
// BLOQUEIO SUAVE DE FERRAMENTAS DE INSPEÇÃO (camada visual)
// =====================================================
// IMPORTANTE: Isto NÃO é segurança real.
// Serve apenas para dificultar usuários comuns curiosos.
// Um atacante ainda pode ver arquivos via interceptação de
// requisições (Burp Suite, Wireshark), usar ferramentas externas
// (curl, wget, Postman) ou modificar dados diretamente.
// A segurança real está no servidor, APIs, autenticação,
// autorização, validação, WAF e logs.
// =====================================================
;(function _devToolsGuard() {
  'use strict';

  // Bloquear teclas de atalho de DevTools
  document.addEventListener('keydown', function(e) {
    const blocked =
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase())) ||
      (e.ctrlKey && e.key.toUpperCase() === 'U') ||
      (e.ctrlKey && e.key.toUpperCase() === 'S');

    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Bloquear menu de contexto (botão direito)
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
  });

  // Desabilitar seleção de texto no body
  // (não afeta inputs/textareas)
  document.addEventListener('selectstart', function(e) {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  });

})();

// Configuração de Contato da Adega (Configurações dinâmicas mescladas do Firebase ou Local)
let dbSettings = null;

// Estado Global da Aplicação (Travado em Português)
const currentLang = "pt";
let activeSection = "home";
let selectedCategory = "todos";

// Dados dinâmicos do Firebase ou LocalStorage (povoado ao iniciar)
let dbCategories = [];
let dbProducts = [];

// Definições de Configurações Padrões do Site
function getDefaultSettings() {
  return {
    whatsapp: "5568999606407",
    instagram: "https://instagram.com/adega_imperialbr",
    facebook: "https://www.facebook.com/share/183EcLi9B7/",
    email: "distribuidoraimperialltda23@gmail.com",
    phone: "+55 (68) 99960-6407",
    address: "R. Manoel Ribeiro, 378, Brasiléia - AC, 69932-000",
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1646.628658339697!2d-68.74381615712065!3d-11.011214863293956!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x917eb73425e0aa55%3A0x74df61a231e107a3!2sR.%20Manoel%20Ribeiro%2C%20378%2C%20Brasil%C3%A9ia%20-%20AC%2C%2069932-000!5e0!3m2!1spt-BR!2sbr!4v1782336464088!5m2!1spt-BR!2sbr",
    hoursVal: "Seg–Dom · 10h às 02h",
    heroTitle: "Bebidas <span class='text-amber-500 font-display'>estupidamente</span> geladas.",
    heroSubtitle: "Confira nossa seleção exclusiva de cervejas e destilados selecionados. Consulte a disponibilidade pelo WhatsApp.",
    ctaTitle: "Pediu, chegou gelado.",
    ctaSubtitle: "Chame no WhatsApp, monte seu pedido e a gente entrega rapidinho com aquela cerveja no ponto certo.",
    aboutText: "A Adega Imperial é a sua vitrine virtual definitiva de bebidas geladas e destilados selecionados na região.\n\nNosso objetivo principal é apresentar um catálogo interativo, organizado e premium, ajudando você a escolher a bebida ideal para qualquer momento.\n\nNão efetuamos transações financeiras ou pagamentos diretamente no site. Toda a consulta de preços, verificação de estoque e finalização de pedidos ocorre de forma rápida e segura no contato humano e direto via WhatsApp.",
    termsText: "1. Caráter Informativo: Este site funciona exclusivamente como um catálogo ou vitrine online de produtos. Nenhuma compra é processada diretamente pelo nosso site.\n\n2. Preços e Estoque: Os preços, disponibilidade e condições das bebidas mostradas estão sujeitos a alterações e devem ser confirmados com o nosso atendimento no WhatsApp.\n\n3. Menores de 18 Anos: A venda e o consumo de bebidas alcoólicas são expressamente proibidos para menores de 18 anos. Ao navegar pela vitrine, você confirma ser maior de idade.",
    privacyText: "Sua privacidade é levada a sério. A nossa vitrine virtual:\n\n• Não coleta dados pessoais: Não solicitamos dados de identificação, localização permanente ou documentos durante a navegação comum.\n\n• Sem transações locais: Não processamos pagamentos em nosso servidor, logo nenhuma informação financeira é armazenada.\n\n• Links Externos: Os contatos ocorrem fora do site (no WhatsApp e Instagram). Recomendamos que verifique as políticas de privacidade destas plataformas de terceiros."
  };
}

// Carregar dicionário do languages.js com injeção de dados dinâmicos
const getT = () => {
  const t = translations[currentLang];
  
  // Sobrescrever com configurações salvas
  const settings = dbSettings || getDefaultSettings();
  t.heroTitle = settings.heroTitle;
  t.heroSubtitle = settings.heroSubtitle;
  t.ctaTitle = settings.ctaTitle;
  t.ctaSubtitle = settings.ctaSubtitle;
  t.infoAddressVal = settings.address;
  t.infoHoursVal = settings.hoursVal;
  
  if (dbCategories && dbCategories.length > 0) {
    t.categoriesData = dbCategories;
  }
  if (dbProducts && dbProducts.length > 0) {
    t.productsData = dbProducts;
  }
  return t;
};


// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  initRouter();
  
  // Inicializar conexão com o banco de dados (Firebase ou Local)
  initClientDatabase();
  
  // Se o hash inicial da URL for um produto (ex: #produto/skol-lata)
  handleInitialProductHash();
});

// ==========================================
// ROTEADOR SPA (Single Page Application)
// ==========================================
function initRouter() {
  const sections = ["home", "catalog", "contact"];
  
  const navigate = (targetId) => {
    // Tratamento de hash especial para produto
    if (targetId.startsWith("produto/")) {
      const prodId = targetId.split("/")[1];
      openProductDetails(prodId);
      window.location.hash = activeSection; // mantém a seção atual sob o modal
      return;
    }
    
    if (!sections.includes(targetId)) {
      targetId = "home";
    }
    
    const isDifferentSection = activeSection !== targetId;
    activeSection = targetId;
    
    // Atualizar links ativos na navegação (Desktop e Mobile)
    document.querySelectorAll(".nav-link").forEach(link => {
      if (link.getAttribute("data-target") === targetId) {
        link.classList.add("nav-active");
        link.classList.remove("text-gray-400");
      } else {
        link.classList.remove("nav-active");
        link.classList.add("text-gray-400");
      }
    });


    // Ocultar todas as seções e exibir a seleta com fade-in
    sections.forEach(sec => {
      const el = document.getElementById(`section-${sec}`);
      if (el) {
        if (sec === targetId) {
          el.classList.remove("hidden");
          el.classList.add("fade-in");
        } else {
          el.classList.add("hidden");
          el.classList.remove("fade-in");
        }
      }
    });
    
    // Scroll para o topo apenas se mudou de seção
    if (isDifferentSection) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    
    // Fechar menu mobile se estiver aberto
    const mobileMenu = document.getElementById("mobile-menu");
    if (mobileMenu) mobileMenu.classList.add("hidden");
    closeCircularMenu();
  };

  // Escutar cliques em elementos de navegação
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-target]");
    if (target) {
      e.preventDefault();
      const targetId = target.getAttribute("data-target");
      if (window.location.hash === `#${targetId}` || (targetId === "home" && !window.location.hash)) {
        // Se já está na mesma seção, apenas rola para o topo
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.location.hash = targetId;
      }
    }
  });

  // Escutar mudança de Hash na URL
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.substring(1) || "home";
    navigate(hash);
  });

  // Navegar para o hash inicial ou "home"
  const initialHash = window.location.hash.substring(1) || "home";
  navigate(initialHash);
}

function handleInitialProductHash() {
  const hash = window.location.hash.substring(1);
  if (hash.startsWith("produto/")) {
    const prodId = hash.split("/")[1];
    openProductDetails(prodId);
  }
}

// ==========================================
// RENDERIZADOR GERAL
// ==========================================
function renderAll() {
  const t = getT();
  
  // Atualizar título do documento
  document.title = t.title;
  
  // 1. Textos Estáticos da Interface
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (t[key]) {
      if (key === "heroTitle") {
        el.innerHTML = t[key];
      } else {
        el.textContent = t[key];
      }
    }
  });

  // 2. Renderizar Highlights (Destaques da distribuidora)
  const highlightsContainer = document.getElementById("highlights-grid");
  if (highlightsContainer) {
    highlightsContainer.innerHTML = t.highlights.map((h, i) => {
      let iconSvg = "";
      if (i === 0) iconSvg = '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707M12 5a7 7 0 100 14 7 7 0 000-14z"/></svg>';
      if (i === 1) iconSvg = '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>';
      if (i === 2) iconSvg = '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>';
      if (i === 3) iconSvg = '<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>';
      
      return `
        <div class="card-tile p-5">
          <div class="grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
            ${iconSvg}
          </div>
          <div class="mt-4 font-display text-xl text-amber-500">${h.title}</div>
          <p class="text-sm text-gray-400 mt-1">${h.desc}</p>
        </div>
      `;
    }).join("");
  }

  // 3. Renderizar Categorias da Home
  const categoriesHomeContainer = document.getElementById("categories-home-grid");
  if (categoriesHomeContainer) {
    categoriesHomeContainer.innerHTML = t.categoriesData.map(c => {
      const mediaHtml = c.image 
        ? `<img src="${c.image}" class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 filter brightness-[0.55] group-hover:brightness-[0.65]" alt="${c.name}">` 
        : `<div class="absolute inset-0 bg-gradient-to-br ${c.accent} opacity-30"></div>`;
      
      return `
        <a href="#catalog" onclick="selectCatalogCategory('${c.slug}')" class="relative group rounded-3xl overflow-hidden border border-neutral-850 shadow-lg h-40 sm:h-48 w-full flex flex-col justify-end p-6 transition-all duration-500 hover:scale-[1.02] hover:border-amber-500/50">
          ${mediaHtml}
          
          <!-- Overlay de gradiente para legibilidade das letras -->
          <div class="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent z-0"></div>
          
          <div class="relative z-10">
            <div class="font-display text-2xl sm:text-3xl text-white font-bold tracking-wide uppercase transition-colors group-hover:text-amber-500">
              ${c.name}
            </div>
            <div class="text-xs sm:text-sm text-gray-300 mt-1 font-medium">
              ${c.tagline}
            </div>
          </div>
        </a>
      `;
    }).join("");
  }

  // 4. Renderizar Mais Pedidos (Home Destaques)
  const featuredContainer = document.getElementById("featured-products-grid");
  if (featuredContainer) {
    // Exibir produtos com fotos reais como destaques
    // Exibir produtos selecionados como destaques (ou os 4 primeiros caso os padrões não existam)
    let featuredList = t.productsData.filter(p => ["heineken", "campari", "amstel", "brahma"].includes(p.id));
    if (featuredList.length === 0 && t.productsData.length > 0) {
      featuredList = t.productsData.slice(0, 4);
    }
    featuredContainer.innerHTML = featuredList.map(p => renderProductCard(p)).join("");
  }

  // 5. Renderizar Filtros de Categoria no Catálogo
  renderCatalogFilters();
  renderCatalogProducts();

  // 6. Renderizar Página de Contato
  renderContactPage();

  // 7. Atualizar Redes Sociais, Mapas e Links de Contato Dinamicamente
  const settings = dbSettings || getDefaultSettings();
  const waNumber = settings.whatsapp;
  const instaUrl = settings.instagram;
  const fbUrl = settings.facebook;
  const emailAddr = settings.email;
  const phoneVal = settings.phone;
  const mapUrl = settings.mapUrl;

  // WhatsApp links
  document.querySelectorAll('a[href*="wa.me"]').forEach(el => {
    let msg = "Olá!";
    try {
      const url = new URL(el.href);
      msg = url.searchParams.get("text") || "Olá!";
    } catch (e) {}
    el.href = `https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`;
  });

  // Instagram links
  document.querySelectorAll('a[href*="instagram.com"]').forEach(el => {
    el.href = instaUrl;
  });

  // Facebook links
  document.querySelectorAll('a[href*="facebook.com"]').forEach(el => {
    el.href = fbUrl;
  });

  // E-mail links
  document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
    el.href = `mailto:${emailAddr}`;
  });

  // Telefone links
  document.querySelectorAll('a[href^="tel:"], .phone-link').forEach(el => {
    el.href = `tel:${phoneVal.replace(/[^0-9+]/g, "")}`;
    el.textContent = phoneVal;
  });

  // Mapa Iframe
  const mapIframe = document.querySelector('iframe[title="Mapa"]');
  if (mapIframe && mapUrl) {
    mapIframe.src = mapUrl;
  }

  if (window.AOS) {
    setTimeout(() => {
      window.AOS.refresh();
    }, 100);
  }
}

// Auxiliar para renderizar Card do Produto
function renderProductCard(p) {
  const t = getT();
  const mediaHtml = p.image
    ? `<img src="${p.image}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" alt="${p.name}">`
    : `<div class="text-7xl transition-transform group-hover:scale-110 drop-shadow-[0_8px_30px_rgba(0,0,0,0.6)]">${p.emoji || '🍺'}</div>`;

  const sizeLabel = p.size || p.volume || "";

  return `
    <div class="card-tile card-tile-hover flex flex-col overflow-hidden group" data-aos="fade-up">
      <div onclick="openProductDetails('${p.id}')" class="cursor-pointer relative aspect-square overflow-hidden bg-neutral-850 flex items-center justify-center">
        ${mediaHtml}
      </div>
      <div class="flex flex-1 flex-col p-4">
        <div onclick="openProductDetails('${p.id}')" class="cursor-pointer font-semibold text-white hover:text-amber-500 transition-colors leading-snug">
          ${p.name}
        </div>
        ${sizeLabel ? `<div class="text-xs text-gray-500 mt-1">${sizeLabel}</div>` : ""}
        <div class="mt-auto pt-3">
          <button onclick="openProductDetails('${p.id}')" class="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/60 hover:bg-amber-500 hover:border-amber-500 hover:text-black px-3 py-1.5 text-xs font-medium text-neutral-300 transition-all duration-200">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            Ver mais
          </button>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
// CATÁLOGO E FILTROS
// ==========================================
function renderCatalogFilters() {
  const t = getT();
  const container = document.getElementById("catalog-filters");
  if (!container) return;

  const activeClass = "bg-amber-500 text-black font-semibold";
  const inactiveClass = "bg-neutral-800 hover:bg-neutral-700 text-gray-300";

  let filtersHtml = `
    <button onclick="filterCatalog('todos')" class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${selectedCategory === "todos" ? activeClass : inactiveClass}">
      <span>✨</span>
      <span>Todos</span>
    </button>
  `;

  filtersHtml += t.categoriesData.map(c => {
    const iconHtml = c.image 
      ? `<img src="${c.image}" class="w-5 h-5 rounded-full object-cover" alt="">`
      : (c.emoji || '🍺');
      
    return `
      <button onclick="filterCatalog('${c.slug}')" class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm transition ${selectedCategory === c.slug ? activeClass : inactiveClass}">
        ${iconHtml}
        <span>${c.name}</span>
      </button>
    `;
  }).join("");

  container.innerHTML = filtersHtml;
}

function filterCatalog(category) {
  selectedCategory = category;
  renderCatalogFilters();
  renderCatalogProducts();
}

function selectCatalogCategory(category) {
  selectedCategory = category;
  renderCatalogFilters();
  renderCatalogProducts();
}

function renderCatalogProducts() {
  const t = getT();
  const container = document.getElementById("catalog-products-grid");
  if (!container) return;

  let filtered = [];
  if (selectedCategory === "todos") {
    filtered = t.productsData;
  } else {
    filtered = t.productsData.filter(p => p.category === selectedCategory);
  }

  container.className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-8";

  if (filtered.length === 0) {
    container.innerHTML = `<div class="col-span-full card-tile p-10 text-center text-gray-400">${t.noProducts}</div>`;
  } else {
    container.innerHTML = filtered.map(p => renderProductCard(p)).join("");
  }

  // Atualiza as animações AOS para os itens carregados dinamicamente
  if (window.AOS) {
    setTimeout(() => {
      window.AOS.refresh();
    }, 50);
  }
}

// ==========================================
// CONTATO
// ==========================================
function renderContactPage() {
  const t = getT();
  const listEl = document.getElementById("contact-payment-methods");
  if (listEl) {
    listEl.innerHTML = t.paymentMethodsList.map(p => `<span class="chip">${p}</span>`).join("");
  }
}

// ==========================================
// DETALHES DO PRODUTO (MODAL)
// ==========================================
function openProductDetails(id) {
  const t = getT();
  
  // Buscar no catálogo de produtos comuns
  let p = t.productsData.find(x => x.id === id);
  if (!p) return;

  // Montar conteúdo do Modal
  const badgeContainer = document.getElementById("modal-product-badge");
  const categoryEl = document.getElementById("modal-product-category");
  const nameEl = document.getElementById("modal-product-name");
  const descEl = document.getElementById("modal-product-desc");
  const actionBtn = document.getElementById("modal-product-action");

  nameEl.textContent = p.name;
  
  const categoryObj = t.categoriesData.find(c => c.slug === p.category);
  if (categoryObj) {
    const iconHtml = categoryObj.image 
      ? `<img src="${categoryObj.image}" class="w-4 h-4 rounded-full object-cover" alt="">`
      : categoryObj.emoji;
    categoryEl.innerHTML = `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-850 border border-neutral-800 text-xs font-semibold text-gray-300">${iconHtml} <span>${categoryObj.name}</span></span>`;
  } else {
    categoryEl.innerHTML = "";
  }
  descEl.textContent = p.description;

  // Renderizar área de mídia (Imagem com Galeria ou Emoji)
  if (p.image) {
    let galleryHtml = "";
    if (p.gallery && p.gallery.length > 1) {
      galleryHtml = `
        <div class="absolute bottom-0 left-0 right-0 flex justify-center gap-2 z-10 px-4 py-3 bg-gradient-to-t from-black/70 to-transparent">
          ${p.gallery.map((img, idx) => `
            <img src="${img}" onclick="event.stopPropagation(); changeModalActiveImage('${img}', this)" class="w-14 h-14 rounded-lg border-2 bg-neutral-900/80 cursor-pointer object-cover transition-all hover:border-amber-500 ${idx === 0 ? 'border-amber-500 ring-2 ring-amber-500/30 scale-105' : 'border-neutral-700 opacity-70 hover:opacity-100'}" alt="miniatura ${idx + 1}">
          `).join("")}
        </div>
      `;
    }
    
    badgeContainer.innerHTML = `
      <img id="modal-product-main-img" src="${p.image}" class="absolute inset-0 w-full h-full object-cover transition-all duration-300 hover:scale-[1.03]" alt="${p.name}">
      ${galleryHtml}
    `;
  } else {
    badgeContainer.innerHTML = `
      <div id="modal-product-media-container" class="w-full h-full flex items-center justify-center">
        <div id="modal-product-emoji" class="text-[7rem] sm:text-[8rem] select-none drop-shadow-[0_15px_30px_rgba(0,0,0,0.7)]">${p.emoji || '🍺'}</div>
      </div>
    `;
  }
  
  // Atualizar botão de ação do modal → agora é Fale Conosco (abre drawer)
  actionBtn.innerHTML = `
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
    Fale Conosco
  `;

  actionBtn.onclick = () => {
    closeProductDetails();
    openContactModal();
  };

  // Exibir Modal
  document.getElementById("detail-modal").classList.add("open");
  
  // Atualizar hash URL
  window.location.hash = `produto/${id}`;
}

function closeProductDetails() {
  document.getElementById("detail-modal").classList.remove("open");
  window.location.hash = activeSection;
}

// Alternar imagem ativa no modal com efeito fade suave
function changeModalActiveImage(imgSrc, thumbEl) {
  const mainImg = document.getElementById("modal-product-main-img");
  if (mainImg) {
    mainImg.style.opacity = 0;
    setTimeout(() => {
      mainImg.src = imgSrc;
      mainImg.style.opacity = 1;
    }, 150);
  }
  
  if (thumbEl && thumbEl.parentNode) {
    thumbEl.parentNode.querySelectorAll("img").forEach(el => {
      el.classList.remove("border-amber-500", "ring-2", "ring-amber-500/30", "scale-105");
      el.classList.add("border-neutral-700", "opacity-70");
    });
    thumbEl.classList.remove("border-neutral-700", "opacity-70");
    thumbEl.classList.add("border-amber-500", "ring-2", "ring-amber-500/30", "scale-105");
  }
}

// ==========================================
// JORNADA DE CONTATO DIRETO
// ==========================================
function openContactModal() {
  document.getElementById("contact-overlay").classList.add("open");
  document.getElementById("contact-drawer").classList.add("open");
}

// Fechar modal de contato
function closeContactModal() {
  document.getElementById("contact-overlay").classList.remove("open");
  document.getElementById("contact-drawer").classList.remove("open");
}

function consultProduct(id) {
  const t = getT();
  const p = t.productsData.find(x => x.id === id);
  if (!p) return;
  const message = `Olá, gostaria de consultar o preço da bebida: *${p.name}* (${p.size})!`;
  const settings = dbSettings || getDefaultSettings();
  const waNumber = settings.whatsapp;
  const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

// ==========================================
// TOASTS
// ==========================================
function showToast(message, isError = false) {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed bottom-5 left-5 z-50 flex flex-col gap-2 max-w-sm pointer-events-none";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `p-4 rounded-xl shadow-lg text-sm text-white font-medium flex items-center gap-2 transform translate-y-10 opacity-0 transition duration-300 pointer-events-auto ${isError ? 'bg-red-600' : 'bg-neutral-900 border border-neutral-700'}`;
  
  const icon = isError 
    ? `<svg class="h-5 w-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`
    : `<svg class="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  
  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("translate-y-10", "opacity-0");
  }, 10);

  setTimeout(() => {
    toast.classList.add("translate-y-10", "opacity-0");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}

// Menu Mobile Toggle Helpers
function toggleCircularMenu() {
  const menu = document.getElementById("mobile-circular-menu");
  if (!menu) return;
  const isExpanded = menu.getAttribute("data-expanded") === "true";
  menu.setAttribute("data-expanded", !isExpanded);
  
  const icon = document.getElementById("circular-menu-icon");
  if (icon) {
    if (!isExpanded) {
      // Mudar ícone para X
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>`;
    } else {
      // Mudar ícone para hambúrguer clássico
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>`;
    }
  }
}

function closeCircularMenu() {
  const menu = document.getElementById("mobile-circular-menu");
  if (menu) {
    menu.setAttribute("data-expanded", "false");
    const icon = document.getElementById("circular-menu-icon");
    if (icon) {
      icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>`;
    }
  }
}

// Abrir modal de informações (Sobre, Termos, Privacidade)
function openInfoModal(type) {
  const modal = document.getElementById("info-modal");
  const titleEl = document.getElementById("info-modal-title");
  const bodyEl = document.getElementById("info-modal-body");
  const settings = dbSettings || getDefaultSettings();
  
  if (type === "sobre") {
    titleEl.textContent = "Sobre Nós";
    bodyEl.innerHTML = settings.aboutText.split("\n\n").map(p => `<p class="mb-4">${p.replace(/\n/g, "<br>")}</p>`).join("") + 
      `<p class="pt-2 border-t border-neutral-800 text-xs text-gray-500">Desenvolvido por <strong>Kaelvora Studios</strong>. Qualquer dúvida sobre a plataforma, entre em contato com a empresa responsável pelo e-mail: <a href="mailto:kaelvorastudios2026@gmail.com" class="text-amber-500 hover:underline">kaelvorastudios2026@gmail.com</a>.</p>`;
  } else if (type === "termos") {
    titleEl.textContent = "Termos de Uso";
    bodyEl.innerHTML = settings.termsText.split("\n\n").map(p => `<p class="mb-4">${p.replace(/\n/g, "<br>")}</p>`).join("") +
      `<p class="pt-2 border-t border-neutral-800 text-xs text-gray-500">Plataforma desenvolvida por <strong>Kaelvora Studios</strong>. Qualquer dúvida sobre os termos ou funcionamento do site, entre em contato com a empresa responsável pelo e-mail: <a href="mailto:kaelvorastudios2026@gmail.com" class="text-amber-500 hover:underline">kaelvorastudios2026@gmail.com</a>.</p>`;
  } else if (type === "privacidade") {
    titleEl.textContent = "Política de Privacidade";
    bodyEl.innerHTML = settings.privacyText.split("\n\n").map(p => `<p class="mb-4">${p.replace(/\n/g, "<br>")}</p>`).join("") +
      `<p class="pt-2 border-t border-neutral-800 text-xs text-gray-500">Desenvolvido por <strong>Kaelvora Studios</strong>. Qualquer dúvida sobre privacidade ou tratamento de informações, entre em contato com a empresa responsável pelo e-mail: <a href="mailto:kaelvorastudios2026@gmail.com" class="text-amber-500 hover:underline">kaelvorastudios2026@gmail.com</a>.</p>`;
  }
  
  modal.classList.add("open");
}

// Fechar modal de informações
function closeInfoModal() {
  document.getElementById("info-modal").classList.remove("open");
}

// Inicialização do Banco de Dados no Cliente (Firebase ou LocalStorage)
function initClientDatabase() {
  const config = window.firebaseConfig;
  const DEFAULT_KEYS = ["SUA_API_KEY", "SEU_PROJECT_ID"];
  const hasFirebaseKeys = config && 
    config.apiKey && 
    !DEFAULT_KEYS.includes(config.apiKey) && 
    config.projectId && 
    !DEFAULT_KEYS.includes(config.projectId);

  if (hasFirebaseKeys) {
    try {
      // Inicializar Firebase
      firebase.initializeApp(config);
      const db = firebase.firestore();

      // Listener de Configurações
      db.collection("settings").doc("general").onSnapshot((doc) => {
        if (doc.exists) {
          dbSettings = doc.data();
        } else {
          dbSettings = getDefaultSettings();
        }
        renderAll();
      });

      // Listener de Categorias
      db.collection("categories").onSnapshot((snapshot) => {
        dbCategories = [];
        snapshot.forEach((doc) => {
          dbCategories.push({ slug: doc.id, ...doc.data() });
        });
        
        if (dbCategories.length === 0) {
          dbCategories = [...translations[currentLang].categoriesData];
        }
        renderAll();
      });

      // Listener de Produtos
      db.collection("products").onSnapshot((snapshot) => {
        dbProducts = [];
        snapshot.forEach((doc) => {
          dbProducts.push({ id: doc.id, ...doc.data() });
        });
        
        if (dbProducts.length === 0) {
          dbProducts = [...translations[currentLang].productsData];
        }
        renderAll();
      });
    } catch (err) {
      console.error("Erro ao inicializar Firebase no cliente:", err);
      loadLocalStorageClient();
    }
  } else {
    loadLocalStorageClient();
  }
}

function loadLocalStorageClient() {
  const localCats = localStorage.getItem("_local_categories");
  const localProds = localStorage.getItem("_local_products");
  const localSettings = localStorage.getItem("_local_settings");

  // Garantir carregamento ou inicialização com padrões
  if (localCats) {
    dbCategories = JSON.parse(localCats);
  } else {
    dbCategories = [...translations[currentLang].categoriesData];
    localStorage.setItem("_local_categories", JSON.stringify(dbCategories));
  }

  if (localProds) {
    dbProducts = JSON.parse(localProds);
  } else {
    dbProducts = [...translations[currentLang].productsData];
    localStorage.setItem("_local_products", JSON.stringify(dbProducts));
  }

  if (localSettings) {
    dbSettings = JSON.parse(localSettings);
  } else {
    dbSettings = getDefaultSettings();
    localStorage.setItem("_local_settings", JSON.stringify(dbSettings));
  }
  
  renderAll();
}
