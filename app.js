const CONFIG = {
  webhookUrl: "https://hook.eu1.make.com/4g2rl5l2j9uogybctr5ypsahp1k4t51s",
  storageKeys: {
    cart: "spaceroll_cart_v1",
    lastOrder: "spaceroll_last_order_v1",
    client: "spaceroll_client_v1",
    openCategories: "spaceroll_open_categories_v1"
  }
};

const state = {
  menu: null,
  cart: loadStorage(CONFIG.storageKeys.cart, []),
  currentSearch: "",
  openCategories: new Set(loadStorage(CONFIG.storageKeys.openCategories, [])),
};

const els = {};
document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEls();
  initTelegram();
  wireStaticEvents();
  await loadMenu();
  normalizeOpenCategories();
  renderCategoriesModal();
  renderMenu();
  updateCartUI();
}

function bindEls() {
  Object.assign(els, {
    menuRoot: document.getElementById("menuRoot"),
    searchInput: document.getElementById("searchInput"),
    repeatOrderBtn: document.getElementById("repeatOrderBtn"),
    cartDrawer: document.getElementById("cartDrawer"),
    categoriesModal: document.getElementById("categoriesModal"),
    categoriesList: document.getElementById("categoriesList"),
    overlay: document.getElementById("overlay"),
    floatingCartBtn: document.getElementById("floatingCartBtn"),
    floatingInfoBtn: document.getElementById("floatingInfoBtn"),
    floatingCategoriesBtn: document.getElementById("floatingCategoriesBtn"),
    floatingCartCount: document.getElementById("floatingCartCount"),
    cartItems: document.getElementById("cartItems"),
    summaryQty: document.getElementById("summaryQty"),
    summaryPrice: document.getElementById("summaryPrice"),
    checkoutBtn: document.getElementById("checkoutBtn"),
    clearCartBtn: document.getElementById("clearCartBtn"),
    closeCartBtn: document.getElementById("closeCartBtn"),
    closeCategoriesBtn: document.getElementById("closeCategoriesBtn"),
    checkoutModal: document.getElementById("checkoutModal"),
    infoModal: document.getElementById("infoModal"),
    closeCheckoutBtn: document.getElementById("closeCheckoutBtn"),
    closeInfoBtn: document.getElementById("closeInfoBtn"),
    totalItems: document.getElementById("totalItems"),
    totalCategories: document.getElementById("totalCategories"),
    template: document.getElementById("itemCardTemplate"),
  });
}

function initTelegram() {
  if (!window.Telegram || !Telegram.WebApp) return;
  Telegram.WebApp.ready();
  Telegram.WebApp.expand();
  Telegram.WebApp.MainButton.setParams({
    text: "Відкрити кошик",
    color: "#ee5d2b",
    text_color: "#ffffff"
  });
  Telegram.WebApp.MainButton.onClick(openCart);
}

function wireStaticEvents() {
  if (els.floatingCartBtn) els.floatingCartBtn.addEventListener("click", openCart);
  if (els.floatingInfoBtn) els.floatingInfoBtn.addEventListener("click", openInfo);
  if (els.floatingCategoriesBtn) els.floatingCategoriesBtn.addEventListener("click", openCategories);

  if (els.closeCartBtn) els.closeCartBtn.addEventListener("click", closeCart);
  if (els.closeCategoriesBtn) els.closeCategoriesBtn.addEventListener("click", closeCategories);
  if (els.closeCheckoutBtn) els.closeCheckoutBtn.addEventListener("click", closeCheckout);
  if (els.closeInfoBtn) els.closeInfoBtn.addEventListener("click", closeInfo);

  if (els.clearCartBtn) els.clearCartBtn.addEventListener("click", clearCart);
  if (els.checkoutBtn) els.checkoutBtn.addEventListener("click", openCheckout);
  if (els.repeatOrderBtn) els.repeatOrderBtn.addEventListener("click", repeatLastOrder);
  if (els.overlay) els.overlay.addEventListener("click", closeAllSheets);

  if (els.searchInput) {
    els.searchInput.addEventListener("input", (e) => {
      state.currentSearch = e.target.value.trim().toLowerCase();
      renderMenu();
    });
  }
}

async function loadMenu() {
  const response = await fetch("menu.json");
  state.menu = await response.json();

  if (els.totalItems) {
    els.totalItems.textContent = state.menu.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }
  if (els.totalCategories) {
    els.totalCategories.textContent = state.menu.categories.length;
  }
}

function normalizeOpenCategories() {
  if (!state.menu?.categories?.length) return;

  const ids = new Set(state.menu.categories.map((c) => c.id));
  state.openCategories = new Set([...state.openCategories].filter((id) => ids.has(id)));

  if (!state.openCategories.size && state.menu.categories[0]) {
    state.openCategories.add(state.menu.categories[0].id);
    persistOpenCategories();
  }
}

function renderCategoriesModal() {
  if (!els.categoriesList || !state.menu?.categories) return;

  els.categoriesList.innerHTML = "";

  state.menu.categories.forEach((category) => {
    const btn = document.createElement("button");
    btn.className = "category-jump-btn";
    btn.innerHTML = `<strong>${category.name}</strong><span>${category.items.length} позицій</span>`;

    btn.addEventListener("click", () => {
      state.openCategories.add(category.id);
      persistOpenCategories();
      renderMenu();
      closeCategories();
      document.getElementById(`section-${category.id}`)?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });

    els.categoriesList.appendChild(btn);
  });
}

function renderMenu() {
  if (!els.menuRoot || !state.menu?.categories) return;

  els.menuRoot.innerHTML = "";
  const query = state.currentSearch;

  const categories = state.menu.categories
    .map((cat) => ({
      ...cat,
      filteredItems: query
        ? cat.items.filter((item) => stringifyItem(item).includes(query))
        : cat.items
    }))
    .filter((cat) => cat.filteredItems.length);

  if (query) {
    state.openCategories = new Set(categories.map((cat) => cat.id));
  }

  if (!categories.length) {
    els.menuRoot.innerHTML = `<div class="empty-state">Нічого не знайдено. Спробуй іншу назву або інгредієнт.</div>`;
    return;
  }

  categories.forEach((category) => {
    const section = document.createElement("section");
    const isOpen = state.openCategories.has(category.id);
    section.className = `category-section${isOpen ? " open" : ""}`;
    section.id = `section-${category.id}`;

    const avgPrice = Math.round(
      category.filteredItems.reduce((sum, item) => sum + item.price, 0) / category.filteredItems.length
    );

    section.innerHTML = `
      <button class="accordion-btn" type="button" aria-expanded="${isOpen}">
        <div class="category-header">
          <div class="category-banner">
            <img src="${category.image}" alt="${escapeHtml(category.name)}">
            <div class="category-banner-content">
              <h2>${category.name}</h2>
              <p>${category.filteredItems.length} позицій у цій категорії</p>
            </div>
          </div>
          <div class="category-stats">
            <div class="stat"><strong>${category.filteredItems.length}</strong><span>позицій</span></div>
            <div class="stat"><strong>${avgPrice} грн</strong><span>середня ціна</span></div>
          </div>
          <div class="accordion-icon">⌄</div>
        </div>
      </button>
      <div class="items-grid"></div>
    `;

    section.querySelector(".accordion-btn").addEventListener("click", () => toggleCategory(category.id));

    const grid = section.querySelector(".items-grid");
    category.filteredItems.forEach((item) => grid.appendChild(renderItemCard(item, category)));

    els.menuRoot.appendChild(section);
  });
}

function renderItemCard(item, category) {
  const fragment = els.template.content.cloneNode(true);

  const img = fragment.querySelector(".item-image");
  const title = fragment.querySelector(".item-title");
  const price = fragment.querySelector(".item-price");
  const meta = fragment.querySelector(".item-meta");
  const desc = fragment.querySelector(".item-desc");
  const cat = fragment.querySelector(".item-category");
  const qtyValue = fragment.querySelector(".qty-value");

  let qty = 1;

  if (img) {
    img.src = category.image;
    img.alt = item.name;
  }
  if (title) title.textContent = item.name;
  if (price) price.textContent = `${item.price} грн`;
  if (meta) meta.textContent = [item.weight, item.pieces].filter(Boolean).join(" · ");
  if (desc) desc.textContent = item.desc || "Склад уточнюється";
  if (cat) cat.textContent = category.name;

  fragment.querySelector(".plus")?.addEventListener("click", () => {
    qty += 1;
    if (qtyValue) qtyValue.textContent = qty;
  });

  fragment.querySelector(".minus")?.addEventListener("click", () => {
    qty = Math.max(1, qty - 1);
    if (qtyValue) qtyValue.textContent = qty;
  });

  fragment.querySelector(".add-btn")?.addEventListener("click", () => addToCart(item, qty));

  return fragment;
}

function toggleCategory(id) {
  if (state.openCategories.has(id)) state.openCategories.delete(id);
  else state.openCategories.add(id);

  persistOpenCategories();
  renderMenu();
}

function persistOpenCategories() {
  saveStorage(CONFIG.storageKeys.openCategories, [...state.openCategories]);
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
  if (!els.cartItems) return;

  const totalQty = state.cart.reduce((sum, item) => sum + item.qty, 0);
  const totalPrice = state.cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  if (els.floatingCartCount) els.floatingCartCount.textContent = totalQty;
  if (els.summaryQty) els.summaryQty.textContent = totalQty;
  if (els.summaryPrice) els.summaryPrice.textContent = `${totalPrice} грн`;

  els.cartItems.innerHTML = "";

  if (!state.cart.length) {
    els.cartItems.innerHTML = `<div class="empty-state">Кошик порожній. Додай позиції, щоб оформити замовлення.</div>`;
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
  closeAllSheets();
  els.cartDrawer?.classList.add("open");
  els.overlay?.classList.remove("hidden");
  els.cartDrawer?.setAttribute("aria-hidden", "false");
  setFloatingVisible(false);
}

function closeCart() {
  els.cartDrawer?.classList.remove("open");
  els.cartDrawer?.setAttribute("aria-hidden", "true");
  maybeRestoreFloating();
}

function openCategories() {
  closeAllSheets();
  els.categoriesModal?.classList.remove("hidden");
  requestAnimationFrame(() => els.categoriesModal?.classList.add("open"));
  els.overlay?.classList.remove("hidden");
  els.categoriesModal?.setAttribute("aria-hidden", "false");
  setFloatingVisible(false);
}

function closeCategories() {
  els.categoriesModal?.classList.remove("open");
  setTimeout(() => els.categoriesModal?.classList.add("hidden"), 220);
  els.categoriesModal?.setAttribute("aria-hidden", "true");
  maybeRestoreFloating();
}

function openInfo() {
  closeAllSheets();
  els.infoModal?.classList.remove("hidden");
  els.overlay?.classList.remove("hidden");
  els.infoModal?.setAttribute("aria-hidden", "false");
  setFloatingVisible(false);
}

function closeInfo() {
  els.infoModal?.classList.add("hidden");
  els.infoModal?.setAttribute("aria-hidden", "true");
  maybeRestoreFloating();
}

function openCheckout() {
  if (!state.cart.length) return showToast("Кошик порожній");

  closeCart();
  setFloatingVisible(false);

  const modal = els.checkoutModal;
  if (!modal) return;

  modal.classList.remove("hidden");
  els.overlay?.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  modal.innerHTML = `
    <div class="checkout-sheet-inner">
      <div class="sheet-topline"></div>
      <div class="sheet-header">
        <div>
          <p class="eyebrow">Оформлення</p>
          <h2>Оберіть спосіб отримання</h2>
        </div>
        <button type="button" class="icon-btn" id="closeCheckoutChoiceBtn">×</button>
      </div>

      <div class="checkout-choice-actions">
        <button type="button" class="primary-btn" data-mode="delivery">🚚 Доставка</button>
        <button type="button" class="secondary-btn" data-mode="pickup">🥡 Самовивіз</button>
      </div>
    </div>
  `;

  document.getElementById("closeCheckoutChoiceBtn")?.addEventListener("click", closeCheckout);
  modal.querySelector('[data-mode="delivery"]')?.addEventListener("click", () => renderCheckoutForm("delivery"));
  modal.querySelector('[data-mode="pickup"]')?.addEventListener("click", () => renderCheckoutForm("pickup"));
}

function renderCheckoutForm(mode) {
  const lastClient = loadStorage(CONFIG.storageKeys.client, null) || {};
  const isDelivery = mode === "delivery";

  els.checkoutModal.innerHTML = `
    <div class="checkout-sheet-inner">
      <div class="sheet-topline"></div>
      <div class="sheet-header">
        <div>
          <p class="eyebrow">Оформлення</p>
          <h2>${isDelivery ? "Доставка" : "Самовивіз"}</h2>
        </div>
        <div class="sheet-header-actions">
          <button type="button" class="icon-btn" id="backToChoiceBtn">←</button>
          <button type="button" class="icon-btn" id="closeCheckoutFormBtn">×</button>
        </div>
      </div>

      <form id="dynamicCheckoutForm" class="checkout-form">
        <label class="field">
          <span>Ім'я</span>
          <input name="name" placeholder="Ваше ім'я" value="${escapeHtml(lastClient.name || "")}" required>
        </label>

        <label class="field">
          <span>Телефон</span>
          <input name="phone" placeholder="+380..." value="${escapeHtml(lastClient.phone || "")}" required>
        </label>

        ${isDelivery ? `
          <label class="field">
            <span>Адреса доставки</span>
            <textarea name="address" placeholder="Місто, вулиця, будинок, квартира" required>${escapeHtml(lastClient.address || "")}</textarea>
          </label>
        ` : ""}

        <label class="field">
          <span>Спосіб отримання</span>
          <input value="${isDelivery ? "Доставка" : "Самовивіз"}" disabled>
        </label>

        ${isDelivery ? `
          <label class="field">
            <span>Спосіб оплати</span>
            <select name="payment_method" required>
              <option value="online" ${(lastClient.payment_method || "") === "online" ? "selected" : ""}>Онлайн</option>
              <option value="cash" ${(lastClient.payment_method || "") === "cash" ? "selected" : ""}>Готівка / при отриманні</option>
            </select>
          </label>
        ` : `
          <label class="field">
            <span>Спосіб оплати</span>
            <input value="Оплата при отриманні" disabled>
          </label>
        `}

        <label class="field">
          <span>Кількість приборів</span>
          <input name="cutlery" type="number" min="0" step="1" value="${escapeHtml(lastClient.cutlery || "0")}">
        </label>

        <label class="field">
          <span>Коментар до замовлення</span>
          <textarea name="comment" placeholder="Без васабі, передзвонити, домофон...">${escapeHtml(lastClient.comment || "")}</textarea>
        </label>

        <label class="field">
          <span>На яку годину підготувати</span>
          <input name="delivery_time" type="time" value="${escapeHtml(lastClient.delivery_time || "")}" required>
        </label>

        <div class="checkout-actions">
          <button type="submit" class="checkout-submit">Відправити замовлення</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById("backToChoiceBtn")?.addEventListener("click", openCheckout);
  document.getElementById("closeCheckoutFormBtn")?.addEventListener("click", closeCheckout);

  const dynamicForm = document.getElementById("dynamicCheckoutForm");
  dynamicForm?.addEventListener("submit", (event) => submitOrder(event, mode));
}

function closeCheckout() {
  els.checkoutModal?.classList.add("hidden");
  els.checkoutModal?.setAttribute("aria-hidden", "true");
  maybeRestoreFloating();
}

function closeAllSheets() {
  els.cartDrawer?.classList.remove("open");
  els.cartDrawer?.setAttribute("aria-hidden", "true");

  els.categoriesModal?.classList.remove("open");
  els.categoriesModal?.classList.add("hidden");
  els.categoriesModal?.setAttribute("aria-hidden", "true");

  els.infoModal?.classList.add("hidden");
  els.infoModal?.setAttribute("aria-hidden", "true");

  els.checkoutModal?.classList.add("hidden");
  els.checkoutModal?.setAttribute("aria-hidden", "true");

  els.overlay?.classList.add("hidden");
  setFloatingVisible(true);
}

function maybeRestoreFloating() {
  const anyOpen =
    els.cartDrawer?.classList.contains("open") ||
    !els.infoModal?.classList.contains("hidden") ||
    !els.checkoutModal?.classList.contains("hidden") ||
    els.categoriesModal?.classList.contains("open");

  if (!anyOpen) {
    els.overlay?.classList.add("hidden");
    setFloatingVisible(true);
  }
}

function setFloatingVisible(visible) {
  document.body.classList.toggle("hide-floating", !visible);
}

async function submitOrder(event, mode = "delivery") {
  event.preventDefault();
  if (!state.cart.length) return showToast("Кошик порожній");

  const form = event.target;
  const formData = new FormData(form);
  const customer = Object.fromEntries(formData.entries());

  customer.fulfillment_type = mode === "delivery" ? "delivery" : "pickup";
  customer.cutlery = customer.cutlery ? String(Math.max(0, Number(customer.cutlery) || 0)) : "0";

  if (mode === "pickup") {
    customer.address = "";
    customer.payment_method = "pickup_pay_on_receive";
  }

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
    closeAllSheets();
    showToast("Замовлення відправлено");
  } catch (error) {
    console.error(error);
    showToast("Помилка відправки. Перевір webhook.");
  }
}

function repeatLastOrder() {
  const lastOrder = loadStorage(CONFIG.storageKeys.lastOrder, null);
  if (!lastOrder?.items?.length) return showToast("Ще немає попереднього замовлення");

  state.cart = structuredClone(lastOrder.items);
  saveStorage(CONFIG.storageKeys.cart, state.cart);
  updateCartUI();
  showToast("Останнє замовлення відновлено");
}

function stringifyItem(item) {
  return [item.name, item.desc, item.weight, item.pieces]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
