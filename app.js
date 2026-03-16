
const CONFIG = {
  webhookUrl: "https://hook.eu1.make.com/4g2rl5l2j9uogybctr5ypsahp1k4t51s",
  restaurantPhone: "",
  storageKeys: {
    cart: "spaceroll_cart_v1",
    lastOrder: "spaceroll_last_order_v1",
    client: "spaceroll_client_v1"
  }
};

const state = {
  menu: null,
  cart: loadStorage(CONFIG.storageKeys.cart, []),
  currentSearch: "",
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEls();
  initTelegram();
  wireStaticEvents();
  await loadMenu();
  renderCategoryTabs();
  renderMenu();
  updateCartUI();
}

function bindEls() {
  els.menuRoot = document.getElementById("menuRoot");
  els.categoryTabs = document.getElementById("categoryTabs");
  els.searchInput = document.getElementById("searchInput");
  els.repeatOrderBtn = document.getElementById("repeatOrderBtn");
  els.cartDrawer = document.getElementById("cartDrawer");
  els.overlay = document.getElementById("overlay");
  els.cartFab = document.getElementById("cartFab");
  els.infoFab = document.getElementById("infoFab");
  els.floatingCartBtn = document.getElementById("floatingCartBtn");
  els.floatingInfoBtn = document.getElementById("floatingInfoBtn");
  els.floatingCartCount = document.getElementById("floatingCartCount");
  els.cartItems = document.getElementById("cartItems");
  els.cartCount = document.getElementById("cartCount");
  els.summaryQty = document.getElementById("summaryQty");
  els.summaryPrice = document.getElementById("summaryPrice");
  els.checkoutBtn = document.getElementById("checkoutBtn");
  els.clearCartBtn = document.getElementById("clearCartBtn");
  els.closeCartBtn = document.getElementById("closeCartBtn");
  els.checkoutModal = document.getElementById("checkoutModal");
  els.infoModal = document.getElementById("infoModal");
  els.closeCheckoutBtn = document.getElementById("closeCheckoutBtn");
  els.closeInfoBtn = document.getElementById("closeInfoBtn");
  els.checkoutForm = document.getElementById("checkoutForm");
  els.totalItems = document.getElementById("totalItems");
  els.totalCategories = document.getElementById("totalCategories");
  els.template = document.getElementById("itemCardTemplate");
}

function initTelegram() {
  if (!window.Telegram || !Telegram.WebApp) return;
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.MainButton.setParams({
    text: "Відкрити кошик",
    color: "#ee5d2b",
    text_color: "#ffffff",
  });
  Telegram.WebApp.MainButton.onClick(openCart);
}

function wireStaticEvents() {
  els.cartFab.addEventListener("click", openCart);
  els.floatingCartBtn.addEventListener("click", openCart);
  els.infoFab.addEventListener("click", openInfo);
  els.floatingInfoBtn.addEventListener("click", openInfo);
  els.closeCartBtn.addEventListener("click", closeCart);
  els.overlay.addEventListener("click", () => {
    closeCart();
    closeCheckout();
    closeInfo();
  });
  els.checkoutBtn.addEventListener("click", openCheckout);
  els.closeCheckoutBtn.addEventListener("click", closeCheckout);
  els.closeInfoBtn.addEventListener("click", closeInfo);
  els.clearCartBtn.addEventListener("click", clearCart);
  els.repeatOrderBtn.addEventListener("click", repeatLastOrder);
  els.searchInput.addEventListener("input", (e) => {
    state.currentSearch = e.target.value.trim().toLowerCase();
    renderMenu();
  });
  els.checkoutForm.addEventListener("submit", submitOrder);
}

async function loadMenu() {
  const response = await fetch("menu.json");
  state.menu = await response.json();
  const totalItems = state.menu.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  els.totalItems.textContent = totalItems;
  els.totalCategories.textContent = state.menu.categories.length;
}

function renderCategoryTabs() {
  els.categoryTabs.innerHTML = "";
  state.menu.categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.className = "category-tab";
    btn.textContent = `${category.name} · ${category.items.length}`;
    btn.addEventListener("click", () => {
      document.getElementById(`section-${category.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelectorAll(".category-tab").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
    });
    els.categoryTabs.appendChild(btn);
  });
}

function renderMenu() {
  els.menuRoot.innerHTML = "";
  const query = state.currentSearch;
  const categories = state.menu.categories.map((cat) => ({
    ...cat,
    filteredItems: query ? cat.items.filter((item) => stringifyItem(item).includes(query)) : cat.items
  })).filter((cat) => cat.filteredItems.length);

  if (!categories.length) {
    els.menuRoot.innerHTML = `<div class="empty-state">Нічого не знайдено. Спробуй іншу назву або інгредієнт.</div>`;
    return;
  }

  categories.forEach((category) => {
    const section = document.createElement("section");
    section.className = "category-section";
    section.id = `section-${category.id}`;
    const avgPrice = Math.round(category.filteredItems.reduce((sum, item) => sum + item.price, 0) / category.filteredItems.length);
    section.innerHTML = `
      <div class="category-header">
        <div class="category-banner">
          <img src="${category.image}" alt="${category.name}">
          <div class="category-banner-content">
            <h2>${category.name}</h2>
            <p>${category.filteredItems.length} позицій у цій категорії</p>
          </div>
        </div>
        <div class="category-stats">
          <div class="stat"><strong>${category.filteredItems.length}</strong><span>позицій</span></div>
          <div class="stat"><strong>${avgPrice} грн</strong><span>середня ціна</span></div>
        </div>
      </div>
      <div class="items-grid"></div>
    `;
    const grid = section.querySelector(".items-grid");
    category.filteredItems.forEach((item) => grid.appendChild(renderItemCard(item, category)));
    els.menuRoot.appendChild(section);
  });
}

function renderItemCard(item, category) {
  const fragment = els.template.content.cloneNode(true);
  const card = fragment.querySelector(".item-card");
  const img = fragment.querySelector(".item-image");
  const title = fragment.querySelector(".item-title");
  const price = fragment.querySelector(".item-price");
  const meta = fragment.querySelector(".item-meta");
  const desc = fragment.querySelector(".item-desc");
  const cat = fragment.querySelector(".item-category");
  const qtyValue = fragment.querySelector(".qty-value");
  let qty = 1;

  img.src = category.image;
  img.alt = item.name;
  title.textContent = item.name;
  price.textContent = `${item.price} грн`;
  meta.textContent = [item.weight, item.pieces].filter(Boolean).join(" · ");
  desc.textContent = item.desc || "Склад уточнюється";
  cat.textContent = category.name;

  fragment.querySelector(".plus").addEventListener("click", () => {
    qty += 1;
    qtyValue.textContent = qty;
  });
  fragment.querySelector(".minus").addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    qtyValue.textContent = qty;
  });
  fragment.querySelector(".add-btn").addEventListener("click", () => {
    addToCart(item, qty);
  });

  return fragment;
}

function addToCart(item, qty) {
  const existing = state.cart.find((x) => x.id === item.id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({
      id: item.id,
      poster_id: item.poster_id || "",
      name: item.name,
      price: item.price,
      weight: item.weight || "",
      desc: item.desc || "",
      qty,
    });
  }
  saveStorage(CONFIG.storageKeys.cart, state.cart);
  updateCartUI();
  showToast(`Додано: ${item.name}`);
}

function updateCartUI() {
  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  els.cartCount.textContent = totalQty;
  els.floatingCartCount.textContent = totalQty;
  els.summaryQty.textContent = totalQty;
  els.summaryPrice.textContent = `${totalPrice} грн`;
  els.cartItems.innerHTML = "";

  if (!state.cart.length) {
    els.cartItems.innerHTML = `<div class="empty-state">Кошик порожній. Додай роли або сети, щоб оформити замовлення.</div>`;
  } else {
    state.cart.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-row";
      row.innerHTML = `
        <div>
          <h4>${item.name}</h4>
          <p>${item.weight || ""}</p>
          <div class="row-actions">
            <button class="qty-btn" data-act="minus">-</button>
            <strong>${item.qty}</strong>
            <button class="qty-btn" data-act="plus">+</button>
            <button class="remove-btn" data-act="remove">Видалити</button>
          </div>
        </div>
        <strong>${item.qty * item.price} грн</strong>
      `;
      row.querySelector('[data-act="minus"]').addEventListener("click", () => changeQty(item.id, -1));
      row.querySelector('[data-act="plus"]').addEventListener("click", () => changeQty(item.id, 1));
      row.querySelector('[data-act="remove"]').addEventListener("click", () => removeFromCart(item.id));
      els.cartItems.appendChild(row);
    });
  }

  if (window.Telegram?.WebApp?.MainButton) {
    if (totalQty > 0) {
      Telegram.WebApp.MainButton.setText(`Кошик · ${totalPrice} грн`);
      Telegram.WebApp.MainButton.show();
    } else {
      Telegram.WebApp.MainButton.hide();
    }
  }
}

function changeQty(id, delta) {
  const item = state.cart.find((x) => x.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    state.cart = state.cart.filter((x) => x.id !== id);
  }
  saveStorage(CONFIG.storageKeys.cart, state.cart);
  updateCartUI();
}

function removeFromCart(id) {
  state.cart = state.cart.filter((x) => x.id !== id);
  saveStorage(CONFIG.storageKeys.cart, state.cart);
  updateCartUI();
}

function clearCart() {
  state.cart = [];
  saveStorage(CONFIG.storageKeys.cart, state.cart);
  updateCartUI();
}

function openCart() {
  els.cartDrawer.classList.add("open");
  els.overlay.classList.remove("hidden");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  setFloatingVisible(false);
}

function closeCart() {
  els.cartDrawer.classList.remove("open");
  els.cartDrawer.setAttribute("aria-hidden", "true");
  if (!els.checkoutModal.classList.contains("hidden") || !els.infoModal.classList.contains("hidden")) return;
  els.overlay.classList.add("hidden");
  setFloatingVisible(true);
}

function openCheckout() {
  setFloatingVisible(false);
  if (!state.cart.length) {
    showToast("Кошик порожній");
    return;
  }
  const lastClient = loadStorage(CONFIG.storageKeys.client, null);
  if (lastClient) {
    Object.entries(lastClient).forEach(([key, val]) => {
      if (els.checkoutForm.elements[key]) els.checkoutForm.elements[key].value = val;
    });
  }
  els.checkoutModal.classList.remove("hidden");
  els.overlay.classList.remove("hidden");
  els.checkoutModal.setAttribute("aria-hidden", "false");
}

function closeCheckout() {
  els.checkoutModal.classList.add("hidden");
  els.checkoutModal.setAttribute("aria-hidden", "true");
  if (!els.cartDrawer.classList.contains("open") && els.infoModal.classList.contains("hidden")) {
    els.overlay.classList.add("hidden");
    setFloatingVisible(true);
  }
}



function setFloatingVisible(visible) {
  document.body.classList.toggle("hide-floating", !visible);
}

function openInfo() {
  els.infoModal.classList.remove("hidden");
  els.infoModal.setAttribute("aria-hidden", "false");
  els.overlay.classList.remove("hidden");
  setFloatingVisible(false);
}

function closeInfo() {
  els.infoModal.classList.add("hidden");
  els.infoModal.setAttribute("aria-hidden", "true");
  if (!els.cartDrawer.classList.contains("open") && els.checkoutModal.classList.contains("hidden")) {
    els.overlay.classList.add("hidden");
    setFloatingVisible(true);
  }
}

async function submitOrder(event) {
  event.preventDefault();
  if (!state.cart.length) {
    showToast("Кошик порожній");
    return;
  }

  const formData = new FormData(els.checkoutForm);
  const customer = Object.fromEntries(formData.entries());
  customer.cutlery = customer.cutlery ? String(Math.max(0, Number(customer.cutlery) || 0)) : "0";
  saveStorage(CONFIG.storageKeys.client, customer);

  const payload = {
    source: "Telegram Mini App",
    restaurant: state.menu.restaurant,
    currency: state.menu.currency,
    created_at: new Date().toISOString(),
    telegram: window.Telegram?.WebApp?.initDataUnsafe?.user || null,
    customer,
    totals: {
      qty: state.cart.reduce((sum, item) => sum + item.qty, 0),
      price: state.cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    },
    items: state.cart.map((item) => ({
      id: item.id,
      poster_id: item.poster_id,
      name: item.name,
      qty: item.qty,
      price: item.price,
      weight: item.weight,
      sum: item.qty * item.price,
      desc: item.desc,
    })),
  };

  try {
    if (CONFIG.webhookUrl && !CONFIG.webhookUrl.includes("PASTE_")) {
      const response = await fetch(CONFIG.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Webhook status ${response.status}`);
    }

    if (window.Telegram?.WebApp) {
      Telegram.WebApp.sendData(JSON.stringify(payload));
    }

    saveStorage(CONFIG.storageKeys.lastOrder, payload);
    clearCart();
    closeCheckout();
    closeCart();
    setFloatingVisible(true);
    showToast("Замовлення відправлено");
  } catch (error) {
    console.error(error);
    showToast("Помилка відправки. Перевір webhook.");
  }
}

function repeatLastOrder() {
  const lastOrder = loadStorage(CONFIG.storageKeys.lastOrder, null);
  if (!lastOrder?.items?.length) {
    showToast("Ще немає попереднього замовлення");
    return;
  }
  state.cart = structuredClone(lastOrder.items);
  saveStorage(CONFIG.storageKeys.cart, state.cart);
  updateCartUI();
  showToast("Останнє замовлення відновлено");
}

function stringifyItem(item) {
  return [item.name, item.desc, item.weight, item.pieces].filter(Boolean).join(" ").toLowerCase();
}

function loadStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function showToast(text) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}
