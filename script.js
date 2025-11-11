/* ==============================
   SMART INVENTORY SYSTEM SCRIPT
   ============================== */

const scriptURL = "https://script.google.com/macros/s/AKfycbxSZwAX4UaXdrhZAT1nx1YoS1Pv1pgTRYRxl01egj2rPFqXR5nsOu1j-izPCICLU7wwmg/exec";
const DRIVE_FOLDER_ID = "1c4aUZRL8nupz264U8k6ODn89nAweKvrQ"; // CHANGE THIS

let nameInput, quantityInput, buyingPriceInput, sellingPriceInput;
let uploadInput, uploadBtn, addProductBtn, previewBox, productsArea;
let uploadedImageBase64 = "";

/* -------------------------------
   DOM READY – ONLY ONE!
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  // GET ELEMENTS
  nameInput         = document.getElementById("productName");
  quantityInput     = document.getElementById("quantity");
  buyingPriceInput  = document.getElementById("buyingPrice");
  sellingPriceInput = document.getElementById("sellingPrice");
  uploadInput       = document.getElementById("uploadImage");
  uploadBtn         = document.getElementById("uploadBtn");
  addProductBtn     = document.getElementById("addProductBtn");
  previewBox        = document.getElementById("previewImage");
  productsArea      = document.getElementById("productsArea");

  // IMAGE UPLOAD
  uploadBtn.addEventListener("click", () => uploadInput.click());
  uploadInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      uploadedImageBase64 = ev.target.result;
      previewBox.textContent = "";
      previewBox.style.backgroundImage = `url(${uploadedImageBase64})`;
      previewBox.style.backgroundSize = "cover";
      previewBox.style.backgroundPosition = "center";
    };
    reader.readAsDataURL(file);
  });

  // ADD PRODUCT
  addProductBtn.addEventListener("click", addProduct);

  // INITIAL LOAD
  loadProducts();
  setInterval(loadProducts, 30000);
});

/* -------------------------------
   CREATE PRODUCT CARD
--------------------------------*/
function createProductCard(p) {
  const div = document.createElement("div");
  div.className = "product-card";

  const imageUrl = p.image && p.image.startsWith("http") ? p.image : "icons/icon-192x192.png";

  div.innerHTML = `
    <div class="product-image" style="background-image:url('${imageUrl}');background-size:cover;background-position:center;"></div>
    <div class="product-name">${p.name}</div>

    <div class="info-row"><label>SELLING PRICE</label><input type="text" value="${p.selling}" readonly></div>
    <div class="info-row"><label>Quantity remaining</label><input type="text" value="${p.quantity}" readonly></div>
    <div class="info-row"><label>Profit made</label><input type="text" value="${p.profit || '0%'}" readonly></div>

    <button class="sell-btn">sell</button>
  `;

  div.querySelector(".sell-btn").addEventListener("click", () => handleSell(p));
  return div;
}

/* -------------------------------
   HANDLE SELL
--------------------------------*/
function handleSell(p) {
  if (p.quantity <= 0) {
    alert("Out of stock!");
    return;
  }
  p.quantity--;
  const profit = p.buying > 0 ? ((p.selling - p.buying) / p.buying) * 100 : 0;
  p.profit = profit.toFixed(1) + "%";

  saveProductToSheet(p, "update").then(() => renderProducts());
}

/* -------------------------------
   SAVE TO SHEET – WITH IMAGE UPLOAD
--------------------------------*/
async function saveProductToSheet(product, mode = "add") {
  const form = new FormData();
  form.append("mode", mode);
  form.append("name", product.name);
  form.append("quantity", product.quantity);
  form.append("buying", product.buying);
  form.append("selling", product.selling);
  form.append("profit", product.profit || "0%");

   if (uploadInput.files && uploadInput.files[0]) {
    form.append("image", uploadInput.files[0]);
    form.append("folderId", DRIVE_FOLDER_ID);
  }

  const resp = await fetch(scriptURL, { method: "POST", body: form });
  const json = await resp.json();

  if (json.status !== "success") throw new Error(json.message || "Save failed");

  // RETURN THE NEW PRODUCT WITH IMAGE URL
  return {
    ...product,
    image: json.imageUrl || product.image || ""
  };
}

/* -------------------------------
   ADD PRODUCT
--------------------------------*/
async function addProduct() {
  if (!validateInputs()) {
    alert("Please fill all fields correctly!");
    return;
  }

  const product = {
    name: nameInput.value.trim(),
    quantity: parseInt(quantityInput.value, 10),
    buying: parseFloat(buyingPriceInput.value),
    selling: parseFloat(sellingPriceInput.value),
    profit: "0%"
  };

  try {
    const savedProduct = await saveProductToSheet(product, "add");
    await loadProducts(); // REFRESH FROM SHEET
    clearForm();
  } catch (err) {
    alert("Failed to add product: " + err.message);
  }
}

/* -------------------------------
   VALIDATE INPUTS
--------------------------------*/
function validateInputs() {
  const name = nameInput.value.trim();
  const qty = parseInt(quantityInput.value, 10);
  const buy = parseFloat(buyingPriceInput.value);
  const sell = parseFloat(sellingPriceInput.value);

  return name && !isNaN(qty) && qty >= 0 && !isNaN(buy) && buy >= 0 && !isNaN(sell) && sell >= 0;
}

/* -------------------------------
   CLEAR FORM
--------------------------------*/
function clearForm() {
  nameInput.value = quantityInput.value = buyingPriceInput.value = sellingPriceInput.value = "";
  previewBox.style.backgroundImage = "";
  previewBox.textContent = "Product image appears here";
  uploadedImageBase64 = "";
  uploadInput.value = "";
}

/* -------------------------------
   LOAD FROM SHEET
--------------------------------*/
async function loadProducts() {
  try {
    const resp = await fetch(`${scriptURL}?mode=get`);
    const data = await resp.json();

    if (data && data.length > 0) {
      localStorage.setItem("products", JSON.stringify(data));
    } else {
      localStorage.removeItem("products");
    }
  } catch (err) {
    console.error("Load failed:", err);
  } finally {
    renderProducts();
  }
}

/* -------------------------------
   RENDER PRODUCTS
--------------------------------*/
function renderProducts() {
  productsArea.innerHTML = "";
  const list = JSON.parse(localStorage.getItem("products") || "[]");

  if (list.length === 0) {
    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.textContent = "No products in inventory.";
    productsArea.appendChild(ph);
    return;
  }

  list.forEach(p => {
    productsArea.appendChild(createProductCard(p));
  });
}