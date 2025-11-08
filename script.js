/* ==============================
   SMART INVENTORY SYSTEM SCRIPT
   ============================== */

const scriptURL = "https://script.google.com/macros/s/AKfycbwc1XMpu7W5qeyfDzr0dS-JIEUi8i7Ph2SL3z7Q9cJSTwuZJb5wiwMalGFsvzgkZow/exec"; // 🔹 Replace this with your deployed web app URL

const nameInput = document.getElementById("productName");
const quantityInput = document.getElementById("quantity");
const buyingPriceInput = document.getElementById("buyingPrice");
const sellingPriceInput = document.getElementById("sellingPrice");
const uploadInput = document.getElementById("uploadImage");
const uploadBtn = document.getElementById("uploadBtn");
const previewBox = document.getElementById("previewImage");
const productsArea = document.getElementById("productsArea");

let uploadedImageBase64 = "";

/* -------------------------------
   IMAGE UPLOAD & PREVIEW
--------------------------------*/
uploadBtn.addEventListener("click", () => {
  uploadInput.click();
});

uploadInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    uploadedImageBase64 = e.target.result;
    previewBox.textContent = "";
    previewBox.style.backgroundImage = `url(${uploadedImageBase64})`;
    previewBox.style.backgroundSize = "cover";
    previewBox.style.backgroundPosition = "center";
  };
  reader.readAsDataURL(file);
});

/* -------------------------------
   ADD NEW PRODUCT
--------------------------------*/
function createProductCard(product) {
  const div = document.createElement("div");
  div.className = "product-card";

  div.innerHTML = `
    <div class="product-image" style="background-image: url(${product.image}); background-size: cover; background-position: center;"></div>
    <div class="product-name">${product.name}</div>

    <div class="info-row">
      <label>SELLING PRICE</label>
      <input type="text" value="${product.selling}" readonly />
    </div>

    <div class="info-row">
      <label>Quantity remaining</label>
      <input type="text" value="${product.quantity}" readonly />
    </div>

    <div class="info-row">
      <label>Profit made</label>
      <input type="text" value="${product.profit || '0%'}" readonly />
    </div>

    <button class="sell-btn">sell</button>
  `;

  const sellBtn = div.querySelector(".sell-btn");
  sellBtn.addEventListener("click", () => {
    handleSell(product);
  });

  return div;
}

/* -------------------------------
   HANDLE SELL ACTION
--------------------------------*/
function handleSell(product) {
  if (product.quantity <= 0) {
    alert("Out of stock!");
    return;
  }

  product.quantity -= 1;
  const profit =
    ((product.selling - product.buying) / product.buying) * 100;
  product.profit = profit.toFixed(1) + "%";

  saveProductToSheet(product, "update");
  renderProducts();
}

/* -------------------------------
   SAVE PRODUCT TO GOOGLE SHEETS
--------------------------------*/
async function saveProductToSheet(product, mode = "add") {
  try {
    await fetch(scriptURL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        data: product,
      }),
    });
    console.log("Saved to Google Sheets:", product);
  } catch (err) {
    console.error("Error saving product:", err);
  }
}

/* -------------------------------
   SUBMIT NEW PRODUCT
--------------------------------*/
function validateInputs() {
  return (
    nameInput.value &&
    buyingPriceInput.value &&
    sellingPriceInput.value &&
    quantityInput.value
  );
}

async function addProduct() {
  if (!validateInputs()) {
    alert("Please fill all fields!");
    return;
  }

  const product = {
    name: nameInput.value.trim(),
    quantity: parseInt(quantityInput.value),
    buying: parseFloat(buyingPriceInput.value),
    selling: parseFloat(sellingPriceInput.value),
    image: uploadedImageBase64 || "",
    profit: "0%",
  };

  await saveProductToSheet(product, "add");
  renderProducts();
  clearForm();
}

/* -------------------------------
   CLEAR FORM AFTER ADD
--------------------------------*/
function clearForm() {
  nameInput.value = "";
  quantityInput.value = "";
  buyingPriceInput.value = "";
  sellingPriceInput.value = "";
  previewBox.style.backgroundImage = "";
  previewBox.textContent = "Product image appears here";
  uploadedImageBase64 = "";
}

/* -------------------------------
   LOAD PRODUCTS FROM SHEET
--------------------------------*/
async function loadProducts() {
  try {
    const res = await fetch(scriptURL + "?mode=get");
    const data = await res.json();
    localStorage.setItem("products", JSON.stringify(data));
    renderProducts();
  } catch (err) {
    console.error("Error loading products:", err);
    // Offline fallback
    const offlineData = localStorage.getItem("products");
    if (offlineData) renderProducts();
  }
}

/* -------------------------------
   RENDER PRODUCTS
--------------------------------*/
function renderProducts() {
  productsArea.innerHTML = "";
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  if (products.length === 0) {
    const ph = document.createElement("div");
    ph.className = "placeholder";
    ph.textContent = "No products added yet.";
    productsArea.appendChild(ph);
    return;
  }
  products.forEach((p) => productsArea.appendChild(createProductCard(p)));
}

/* -------------------------------
   INITIALIZATION
--------------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  // Add a click event to add product form
  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Product";
  addBtn.className = "upload-btn";
  addBtn.style.marginTop = "10px";
  document.querySelector(".form-left").appendChild(addBtn);

  addBtn.addEventListener("click", addProduct);

  loadProducts();
});
