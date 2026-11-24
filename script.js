// CafeteriaEase: front-end ordering system prototype.
// Data is stored in this browser only using localStorage.

const PRODUCTS = [
  { id: 1, name: "Chicken Sandwich", category: "Meals", price: 45, icon: "🥪", description: "Grilled chicken in soft bread." },
  { id: 2, name: "Classic Burger", category: "Meals", price: 50, icon: "🍔", description: "Beef patty with fresh toppings." },
  { id: 3, name: "Rice Meal", category: "Meals", price: 65, icon: "🍛", description: "A filling student-friendly meal." },
  { id: 4, name: "French Fries", category: "Snacks", price: 30, icon: "🍟", description: "Crispy golden potato fries." },
  { id: 5, name: "Cheese Donut", category: "Snacks", price: 25, icon: "🍩", description: "A soft sweet snack." },
  { id: 6, name: "Pizza Slice", category: "Snacks", price: 40, icon: "🍕", description: "A slice topped with cheese." },
  { id: 7, name: "Iced Tea", category: "Drinks", price: 20, icon: "🥤", description: "Chilled refreshing iced tea." },
  { id: 8, name: "Bottled Water", category: "Drinks", price: 15, icon: "💧", description: "Drinking water, 500 ml." },
  { id: 9, name: "Chocolate Milk", category: "Drinks", price: 30, icon: "🥛", description: "Cold chocolate-flavored milk." }
];

const STORAGE_KEYS = {
  cart: "cafeteriaEaseCart_v1",
  orders: "cafeteriaEaseOrders_v1",
  user: "cafeteriaEaseUser_v1"
};

let cart = readStorage(STORAGE_KEYS.cart, []);
let orders = readStorage(STORAGE_KEYS.orders, []);
let currentUser = readStorage(STORAGE_KEYS.user, null);
let activeCategory = "All";
let toastTimer;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn("Could not read saved data:", error);
    return fallback;
  }
}

function saveStorage() {
  localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(currentUser));
}

function money(amount) {
  return "₱" + Number(amount).toFixed(2);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function showScreen(name) {
  const screenIds = ["login", "menu", "cart", "confirmation", "tracking", "admin"];
  if (!screenIds.includes(name)) return;

  if (!currentUser && name !== "login") {
    showScreen("login");
    return;
  }

  if (currentUser?.role !== "admin" && name === "admin") {
    showToast("Admin view is only available in the admin demo account.");
    return;
  }

  document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
  document.getElementById(name + "Screen").classList.add("active");

  document.querySelectorAll(".nav-link[data-screen]").forEach(button => {
    button.classList.toggle("active", button.dataset.screen === name);
  });

  if (name === "cart") renderCart();
  if (name === "confirmation") renderReview();
  if (name === "tracking") renderCustomerOrders();
  if (name === "admin") renderAdmin();
}

function updateNavigation() {
  const loggedIn = Boolean(currentUser);
  document.getElementById("mainNav").classList.toggle("hidden", !loggedIn);
  document.querySelector(".admin-nav").classList.toggle("hidden", currentUser?.role !== "admin");
  updateCartCount();
}

document.getElementById("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = document.getElementById("userName").value.trim();
  const role = document.getElementById("userRole").value;

  if (!name) {
    showToast("Please enter your name.");
    return;
  }

  currentUser = { name, role };
  saveStorage();
  updateNavigation();

  if (role === "admin") {
    showScreen("admin");
    showToast("Welcome, administrator " + name + ".");
  } else {
    showScreen("menu");
    showToast("Welcome, " + name + "!");
  }
});

function signOut() {
  currentUser = null;
  saveStorage();
  updateNavigation();
  showScreen("login");
  showToast("You have signed out.");
}

function renderProducts() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const visibleProducts = PRODUCTS.filter(product => {
    const matchesCategory = activeCategory === "All" || product.category === activeCategory;
    const matchesSearch = product.name.toLowerCase().includes(search) ||
      product.description.toLowerCase().includes(search);
    return matchesCategory && matchesSearch;
  });

  const grid = document.getElementById("productGrid");
  if (visibleProducts.length === 0) {
    grid.innerHTML = `<div class="panel empty-state"><div class="empty-icon">🔎</div><strong>No matching products</strong><p>Try another search or category.</p></div>`;
    return;
  }

  grid.innerHTML = visibleProducts.map(product => `
    <article class="product-card">
      <div class="product-art" aria-hidden="true">${product.icon}</div>
      <div class="product-info">
        <span class="category-label">${product.category}</span>
        <h3>${escapeHTML(product.name)}</h3>
        <p class="muted small">${escapeHTML(product.description)}</p>
        <div class="product-meta"><span class="price">${money(product.price)}</span></div>
        <button class="button button-primary" onclick="addToCart(${product.id})">＋ Add to cart</button>
      </div>
    </article>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

document.getElementById("searchInput").addEventListener("input", renderProducts);
document.getElementById("categoryFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.classList.toggle("selected", chip === button);
  });
  renderProducts();
});

function addToCart(productId) {
  const product = PRODUCTS.find(item => item.id === productId);
  if (!product) return;

  const existing = cart.find(item => item.id === productId);
  if (existing) existing.quantity += 1;
  else cart.push({ ...product, quantity: 1 });

  saveStorage();
  updateCartCount();
  showToast(product.name + " added to your cart.");
}

function updateCartCount() {
  const count = cart.reduce((total, item) => total + item.quantity, 0);
  document.getElementById("navCartCount").textContent = count;
}

function cartTotal() {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

function changeQuantity(productId, change) {
  const item = cart.find(product => product.id === productId);
  if (!item) return;

  item.quantity += change;
  if (item.quantity <= 0) cart = cart.filter(product => product.id !== productId);

  saveStorage();
  renderCart();
  updateCartCount();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveStorage();
  renderCart();
  updateCartCount();
  showToast("Item removed from cart.");
}

function renderCart() {
  const container = document.getElementById("cartLines");
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cartItemLabel").textContent = itemCount + (itemCount === 1 ? " item" : " items");
  document.getElementById("cartSubtotal").textContent = money(cartTotal());
  document.getElementById("cartGrandTotal").textContent = money(cartTotal());
  document.getElementById("checkoutButton").disabled = cart.length === 0;

  if (cart.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🛒</div><strong>Your cart is empty</strong><p>Choose something tasty from the menu.</p><button class="button button-primary" onclick="showScreen('menu')">Browse menu</button></div>`;
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-line">
      <div class="mini-art">${item.icon}</div>
      <div><strong>${escapeHTML(item.name)}</strong><p>${money(item.price)} each</p></div>
      <div class="quantity-control">
        <button aria-label="Decrease ${escapeHTML(item.name)} quantity" onclick="changeQuantity(${item.id}, -1)">−</button>
        <strong>${item.quantity}</strong>
        <button aria-label="Increase ${escapeHTML(item.name)} quantity" onclick="changeQuantity(${item.id}, 1)">+</button>
      </div>
      <button class="remove-button" onclick="removeFromCart(${item.id})">Remove</button>
    </div>
  `).join("");
}

function goToConfirmation() {
  if (cart.length === 0) {
    showToast("Add at least one item before checkout.");
    return;
  }
  document.getElementById("pickupName").value = currentUser?.name || "";
  renderReview();
  showScreen("confirmation");
}

function renderReview() {
  const review = document.getElementById("reviewItems");
  if (cart.length === 0) {
    review.innerHTML = `<p class="muted">Your cart is empty. Return to the menu to add products.</p>`;
    document.getElementById("reviewTotal").textContent = money(0);
    return;
  }

  review.innerHTML = cart.map(item => `
    <div class="review-row">
      <span>${item.icon} ${escapeHTML(item.name)} × ${item.quantity}</span>
      <strong>${money(item.price * item.quantity)}</strong>
    </div>
  `).join("");
  document.getElementById("reviewTotal").textContent = money(cartTotal());
}

function placeOrder() {
  if (cart.length === 0) {
    showToast("Your cart is empty.");
    showScreen("menu");
    return;
  }

  const pickupName = document.getElementById("pickupName").value.trim();
  const note = document.getElementById("pickupNote").value.trim();
  if (!pickupName) {
    showToast("Please enter the name for pickup.");
    document.getElementById("pickupName").focus();
    return;
  }

  const order = {
    id: "CE-" + Date.now().toString().slice(-7),
    customer: pickupName,
    customerRole: currentUser.role,
    items: cart.map(item => ({ ...item })),
    total: cartTotal(),
    note,
    status: "Pending",
    createdAt: new Date().toLocaleString()
  };

  orders.push(order);
  cart = [];
  saveStorage();
  updateCartCount();
  renderCustomerOrders();
  showScreen("tracking");
  showToast("Order placed successfully! Order " + order.id);
}

function statusClass(status) {
  return "status-" + status.toLowerCase().replaceAll(" ", "-");
}

function statusProgress(status) {
  const stages = ["Pending", "Processing", "Ready for Pickup", "Completed"];
  if (status === "Cancelled") return 0;
  return stages.indexOf(status) + 1;
}

function progressHTML(status) {
  const progress = statusProgress(status);
  if (status === "Cancelled") return `<p class="muted small">This order was cancelled.</p>`;
  return `<div class="progress-track">${[1, 2, 3, 4].map(step =>
    `<span class="${step <= progress ? "done" : ""}"></span>`
  ).join("")}</div>`;
}

function renderCustomerOrders() {
  const container = document.getElementById("customerOrderList");
  const customerOrders = orders.filter(order =>
    order.customer.toLowerCase() === (currentUser?.name || "").toLowerCase()
  ).slice().reverse();

  if (customerOrders.length === 0) {
    container.innerHTML = `<div class="panel empty-state"><div class="empty-icon">🧾</div><strong>No orders yet</strong><p>Your submitted orders will appear here.</p><button class="button button-primary" onclick="showScreen('menu')">Start an order</button></div>`;
    return;
  }

  container.innerHTML = customerOrders.map(order => `
    <article class="order-card">
      <div class="order-card-top">
        <div><div class="order-id">${escapeHTML(order.id)}</div><p>${escapeHTML(order.createdAt)}</p></div>
        <span class="status-badge ${statusClass(order.status)}">${escapeHTML(order.status)}</span>
      </div>
      ${progressHTML(order.status)}
      <div class="order-items-text">${order.items.map(item => `${escapeHTML(item.name)} × ${item.quantity}`).join(" · ")}</div>
      ${order.note ? `<p class="order-items-text">Note: ${escapeHTML(order.note)}</p>` : ""}
      <div class="summary-line"><span>Order total</span><strong>${money(order.total)}</strong></div>
    </article>
  `).join("");
}

function renderAdmin() {
  const completed = orders.filter(order => order.status === "Completed");
  const pending = orders.filter(order => order.status === "Pending").length;
  const sales = completed.reduce((sum, order) => sum + order.total, 0);

  document.getElementById("adminStats").innerHTML = `
    <div class="stat-card"><span>Total orders</span><strong>${orders.length}</strong></div>
    <div class="stat-card"><span>Pending orders</span><strong>${pending}</strong></div>
    <div class="stat-card"><span>Completed sales</span><strong>${money(sales)}</strong></div>
  `;

  const container = document.getElementById("adminOrderList");
  if (orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><strong>No incoming orders</strong><p>New customer orders will appear here.</p></div>`;
    return;
  }

  container.innerHTML = orders.slice().reverse().map(order => `
    <article class="admin-order">
      <div class="admin-order-head">
        <div><strong>${escapeHTML(order.id)}</strong><p class="muted small">${escapeHTML(order.customer)} · ${escapeHTML(order.createdAt)}</p></div>
        <strong>${money(order.total)}</strong>
      </div>
      <p class="muted small">${order.items.map(item => `${escapeHTML(item.name)} × ${item.quantity}`).join(" · ")}</p>
      ${order.note ? `<p class="muted small">Customer note: ${escapeHTML(order.note)}</p>` : ""}
      <label for="status-${escapeHTML(order.id)}">Update order status</label>
      <select id="status-${escapeHTML(order.id)}" onchange="updateOrderStatus('${escapeHTML(order.id)}', this.value)">
        ${["Pending", "Processing", "Ready for Pickup", "Completed", "Cancelled"].map(status =>
          `<option value="${status}" ${order.status === status ? "selected" : ""}>${status}</option>`
        ).join("")}
      </select>
      <span class="status-badge ${statusClass(order.status)}">${escapeHTML(order.status)}</span>
    </article>
  `).join("");
}

function updateOrderStatus(orderId, newStatus) {
  const order = orders.find(item => item.id === orderId);
  if (!order) return;

  order.status = newStatus;
  saveStorage();
  renderAdmin();
  showToast(orderId + " updated to " + newStatus + ".");
}

// Initial setup
renderProducts();
updateNavigation();
if (currentUser) {
  showScreen(currentUser.role === "admin" ? "admin" : "menu");
} else {
  showScreen("login");
}
