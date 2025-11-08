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
const addProductBtn = document.getElementById("addProductBtn");
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
   SAVE TO SHEET – FIXED VERSION
--------------------------------*/
/* -------------------------------
   SAVE TO SHEET – WITH DRIVE IMAGE UPLOAD
--------------------------------*/
const DRIVE_FOLDER_ID = "1V-5KvdzgJxsRkBSyY4Nj6Kew3rmue4WY"; // ← CHANGE THIS

async function saveProductToSheet(product, mode = "add") {
  try {
    let imageUrl = product.image;

    // If image is base64, upload to Drive first
    if (imageUrl && imageUrl.startsWith("data:image")) {
      const blob = dataURLtoBlob(imageUrl);
      const form = new FormData();
      form.append("mode", "uploadImage");
      form.append("folderId", DRIVE_FOLDER_ID);
      form.append("image", blob, "product.jpg");

      const upResp = await fetch(scriptURL, { method: "POST", body: form });
      const upJson = await upResp.json();
      if (upJson.status !== "success") throw new Error("Image upload failed: " + (upJson.message || ""));
      imageUrl = upJson.url;
    }

    const payload = {
      mode: mode,
      data: {
        name:     product.name,
        quantity: product.quantity,
        buying:   product.buying,
        selling:  product.selling,
        profit:   product.profit,
        image:    imageUrl || ""
      }
    };

    const resp = await fetch(scriptURL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await resp.json();
    if (json.status !== "success") throw new Error(json.message || "Save failed");
    return json;

  } catch (err) {
    console.error("save error:", err);
    alert("Save failed: " + err.message);
    throw err;
  }
}

// Helper: base64 → Blob
function dataURLtoBlob(dataURL) {
  const [header, b64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)[1];
  const binary = atob(b64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
/* -------------------------------
   VALIDATE & ADD PRODUCT
--------------------------------*/
function validateInputs() {
  const name = nameInput.value.trim();
  const qty  = parseInt(quantityInput.value, 10);
  const buy  = parseFloat(buyingPriceInput.value);
  const sell = parseFloat(sellingPriceInput.value);

  if (!name) return false;
  if (isNaN(qty) || qty < 0) return false;
  if (isNaN(buy) || buy < 0) return false;
  if (isNaN(sell) || sell < 0) return false;

  return true;
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

    // If server returns empty, clear cache
    if (!data || data.length === 0) {
      localStorage.removeItem("products");
    } else {
      localStorage.setItem("products", JSON.stringify(data));
    }
    renderProducts();
  } catch (err) {
    console.error("loadProducts error:", err);
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
  addProductBtn.addEventListener("click", addProduct); // ← Just attach
  loadProducts();
  setInterval(loadProducts, 30000);
});