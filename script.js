/* ==============================
   SMART INVENTORY SYSTEM SCRIPT
   ============================== */

const scriptURL = "https://script.google.com/macros/s/AKfycbwc1XMpu7W5qeyfDzr0dS-JIEUi8i7Ph2SL3z7Q9cJSTwuZJb5wiwMalGFsvzgkZow/exec";

const nameInput        = document.getElementById("productName");
const quantityInput    = document.getElementById("quantity");
const buyingPriceInput = document.getElementById("buyingPrice");
const sellingPriceInput= document.getElementById("sellingPrice");
const uploadInput      = document.getElementById("uploadImage");
const uploadBtn        = document.getElementById("uploadBtn");
const previewBox       = document.getElementById("previewImage");
const productsArea     = document.getElementById("productsArea");

let uploadedImageBase64 = "";

/* -------------------------------
   IMAGE UPLOAD & PREVIEW
--------------------------------*/
uploadBtn.addEventListener("click", () => uploadInput.click());

uploadInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    uploadedImageBase64 = ev.target.result;
    previewBox.textContent = "";
    previewBox.style.backgroundImage = `url(${uploadedImageBase64})`;
    previewBox.style.backgroundSize = "cover";
    previewBox.style.backgroundPosition = "center";
  };
  reader.readAsDataURL(file);
});

/* -------------------------------
   CREATE PRODUCT CARD
--------------------------------*/
function createProductCard(p) {
  const div = document.createElement("div");
  div.className = "product-card";

  div.innerHTML = `
    <div class="product-image" style="background-image:url('${p.image}');background-size:cover;background-position:center;"></div>
    <div class="product-name">${p.name}</div>

    <div class="info-row"><label>SELLING PRICE</label><input type="text" value="${p.selling}" readonly></div>
    <div class="info-row"><label>Quantity remaining</label><input type="text" value="${p.quantity}" readonly></div>
    <div class="info-row"><label>Profit made</label><input type="text" value="${p.profit}" readonly></div>

    <button class="sell-btn">sell</button>
  `;

  div.querySelector(".sell-btn").addEventListener("click", () => handleSell(p));
  return div;
}

/* -------------------------------
   HANDLE SELL
--------------------------------*/
function handleSell(p) {
  if (p.quantity <= 0) { alert("Out of stock!"); return; }

  p.quantity--;
  const profit = ((p.selling - p.buying) / p.buying) * 100;
  p.profit = profit.toFixed(1) + "%";

  saveProductToSheet(p, "update");
  renderProducts();               // update UI instantly
}

/* -------------------------------
   SAVE TO SHEET
--------------------------------*/
async function saveProductToSheet(product, mode = "add") {
  try {
    const resp = await fetch(scriptURL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, data: product })
    });
    const json = await resp.json();
    if (json.status !== "success") throw new Error(json.message || "unknown");
    console.log("Sheet:", json);
  } catch (err) {
    console.error("saveProductToSheet error:", err);
    alert("Failed to save – check console");
  }
}

/* -------------------------------
   VALIDATE & ADD PRODUCT
--------------------------------*/
function validateInputs() {
  return nameInput.value.trim() &&
         quantityInput.value && !isNaN(quantityInput.value) &&
         buyingPriceInput.value && !isNaN(buyingPriceInput.value) &&
         sellingPriceInput.value && !isNaN(sellingPriceInput.value);
}

async function addProduct() {
  if (!validateInputs()) { alert("Please fill all fields correctly!"); return; }

  const product = {
    name: nameInput.value.trim(),
    quantity: parseInt(quantityInput.value, 10),
    buying: parseFloat(buyingPriceInput.value),
    selling: parseFloat(sellingPriceInput.value),
    image: uploadedImageBase64 || "",
    profit: "0%"
  };

  await saveProductToSheet(product, "add");
  await loadProducts();          // refresh list from sheet
  clearForm();
}

/* -------------------------------
   CLEAR FORM
--------------------------------*/
function clearForm() {
  nameInput.value = quantityInput.value = buyingPriceInput.value = sellingPriceInput.value = "";
  previewBox.style.backgroundImage = "";
  previewBox.textContent = "Product image appears here";
  uploadedImageBase64 = "";
}

/* -------------------------------
   LOAD PRODUCTS FROM SHEET
--------------------------------*/
async function loadProducts() {
  try {
    const resp = await fetch(`${scriptURL}?mode=get`);
    const data = await resp.json();
    localStorage.setItem("products", JSON.stringify(data));
    renderProducts();
  } catch (err) {
    console.error("loadProducts error:", err);
    // fallback to cached data
    const cached = localStorage.getItem("products");
    if (cached) renderProducts();
  }
}

/* -------------------------------
   RENDER PRODUCTS
--------------------------------*/
function renderProducts() {
  productsArea.innerHTML = "";
  const list = JSON.parse(localStorage.getItem("products") || "[]");

  if (!list.length) {
    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.textContent = "No products added yet.";
    productsArea.appendChild(ph);
    return;
  }

  list.forEach(p => productsArea.appendChild(createProductCard(p)));
}

/* -------------------------------
   INITIALIZATION
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  // ---- Add “Add Product” button (if it isn’t already in HTML) ----
  const container = document.querySelector(".form-left");
  if (!container.querySelector(".add-product-btn")) {
    const btn = document.createElement("button");
    btn.textContent = "Add Product";
    btn.className = "upload-btn add-product-btn";
    btn.style.marginTop = "10px";
    btn.addEventListener("click", addProduct);
    container.appendChild(btn);
  }

  loadProducts();          // first load
  setInterval(loadProducts, 30000); // optional auto-refresh every 30s
});