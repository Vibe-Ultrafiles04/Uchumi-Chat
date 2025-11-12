/* inventory.js */
// ====== CONFIG: set this to your deployed Apps Script web app URL ======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxSZwAX4UaXdrhZAT1nx1YoS1Pv1pgTRYRxl01egj2rPFqXR5nsOu1j-izPCICLU7wwmg/exec"; // <- REPLACE THIS

// DOM refs
const driveLinkInput = document.getElementById("driveLink");
const previewBtn = document.getElementById("previewBtn");
const newThumb = document.getElementById("newThumb");
const addProductBtn = document.getElementById("addProductBtn");
const productsContainer = document.getElementById("productsContainer");

const productNameInput = document.getElementById("productName");
const productQuantityInput = document.getElementById("productQuantity");
const productBuyInput = document.getElementById("productBuy");
const productSellInput = document.getElementById("productSell");

// selected product UI (for demo)
const selectedThumb = document.getElementById("selectedThumb");
const selectedName = document.getElementById("selectedName");
const selectedSell = document.getElementById("selectedSell");
const selectedQty = document.getElementById("selectedQty");
const selectedProfit = document.getElementById("selectedProfit");
const sellBtn = document.getElementById("sellBtn");
const sellQty = document.getElementById("sellQty");

// helper: extract drive id from multiple link formats
function extractDriveId(link) {
  if (!link) return null;
  // patterns:
  // https://drive.google.com/file/d/FILEID/view?usp=sharing
  // https://drive.google.com/open?id=FILEID
  // https://drive.google.com/thumbnail?id=FILEID&sz=w1000
  let m = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
  if (m && m[1]) return m[1];
  m = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
  if (m && m[1]) return m[1];
  // fallback: maybe the whole thing is an id
  if (/^[a-zA-Z0-9_-]{10,}$/.test(link)) return link;
  return null;
}

// return a Drive thumbnail url (public files must be shareable)
function driveThumbnailUrl(fileId, size=800){
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

// preview button handler
previewBtn.addEventListener("click", () => {
  const link = driveLinkInput.value.trim();
  const id = extractDriveId(link);
  if (!id) {
    newThumb.innerHTML = "Invalid Drive link";
    return;
  }
  const url = driveThumbnailUrl(id, 800);
  newThumb.innerHTML = `<img src="${url}" alt="thumb" style="max-width:100%;max-height:100%"/>`;
});

// add product: collect fields -> POST to Web App
addProductBtn.addEventListener("click", async () => {
  const name = productNameInput.value.trim();
  const quantity = parseInt(productQuantityInput.value || "0", 10);
  const buy = parseFloat(productBuyInput.value || "0");
  const sell = parseFloat(productSellInput.value || "0");
  const driveLink = driveLinkInput.value.trim();
  const fileId = extractDriveId(driveLink);

  if (!name) { alert("Enter product name"); return; }

  const payload = {
    timestamp: new Date().toISOString(),
    name, quantity, buy, sell,
    driveLink, driveFileId: fileId || ""
  };

  try {
    const res = await fetch(WEB_APP_URL, {
      method: "POST",
      mode: "cors",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (json && json.result === "success") {
      // clear inputs
      productNameInput.value = "";
      productQuantityInput.value = "";
      productBuyInput.value = "";
      productSellInput.value = "";
      driveLinkInput.value = "";
      newThumb.innerHTML = "Thumbnail appears";
      // reload list
      await fetchAndRenderProducts();
    } else {
      alert("Failed to add product: " + (json && json.message ? json.message : res.status));
    }
  } catch (err) {
    console.error(err);
    alert("Error sending to server: " + err.message);
  }
});

// fetch products (GET) and render cards
async function fetchAndRenderProducts(){
  productsContainer.innerHTML = '<div class="hint">Loading products...</div>';
  try {
    const res = await fetch(WEB_APP_URL + "?action=list", {method:"GET", mode:"cors"});
    const json = await res.json();
    if (!Array.isArray(json.rows)) {
      productsContainer.innerHTML = '<div class="hint">No products returned.</div>';
      return;
    }
    // render each row as product card (reverse for newest first)
    const rows = json.rows.slice().reverse();
    if (rows.length === 0){
      productsContainer.innerHTML = '<div class="hint">No products yet.</div>';
      return;
    }
    productsContainer.innerHTML = "";
    rows.forEach((r, idx) => {
      // expected server format: object with at least name, quantity, buy, sell, driveFileId or driveLink
      const name = r.name || r[0] || "Unnamed";
      const quantity = r.quantity ?? r[1] ?? r[2] ?? 0;
      const buy = r.buy ?? r[3] ?? r[3] ?? "";
      const sell = r.sell ?? r[4] ?? r[4] ?? "";
      const fileId = r.driveFileId || r.driveLinkFileId || (r.driveLink ? extractDriveId(r.driveLink) : null) || "";
      const driveLink = r.driveLink || "";
      const thumbUrl = fileId ? driveThumbnailUrl(fileId, 400) : (driveLink || "");

      const card = document.createElement("div");
      card.className = "product-card";

      const thumb = document.createElement("div");
      thumb.className = "p-thumb";
      thumb.innerHTML = fileId ? `<img src="${thumbUrl}" alt="thumb" style="width:100%;height:100%;object-fit:cover"/>`
                             : `<span style="font-size:12px;color:#888">No image</span>`;

      const info = document.createElement("div");
      info.className = "p-info";
      info.innerHTML = `<h4>${escapeHtml(name)}</h4>
                        <p>Quantity: ${escapeHtml(String(quantity))}</p>
                        <p>Buying price: ${escapeHtml(String(buy))}</p>
                        <p>Selling price: ${escapeHtml(String(sell))}</p>`;

      card.appendChild(thumb);
      card.appendChild(info);

      // click handler to populate selected panel
      card.addEventListener("click", () => {
        selectedThumb.innerHTML = fileId ? `<img src="${thumbUrl}" alt="sel" style="max-width:100%;max-height:100%"/>` : "No image";
        selectedName.value = name;
        selectedSell.value = sell;
        selectedQty.value = quantity;
        // profit calculation (simple)
        const profit = (sell && buy) ? (((sell - buy) / buy) * 100).toFixed(1) + "%" : "0%";
        selectedProfit.value = profit;
      });

      productsContainer.appendChild(card);
    });
  } catch (err) {
    console.error(err);
    productsContainer.innerHTML = '<div class="hint">Error loading products</div>';
  }
}

// simple sell action: only updates front-end (demo). To actually update sheet, you would POST an update action.
sellBtn.addEventListener("click", () => {
  const name = selectedName.value;
  const qtyToSell = parseInt(sellQty.value || "0", 10);
  if (!name) { alert("Select a product first"); return; }
  if (!qtyToSell || qtyToSell <= 0) { alert("Enter quantity to sell"); return; }

  // naive UI update: reduce quantity field value. For production, post an update to server to adjust inventory.
  const newQty = Math.max(0, parseInt(selectedQty.value || "0", 10) - qtyToSell);
  selectedQty.value = newQty;
  alert(`Sold ${qtyToSell} of ${name}. (Demo only — not persisted unless you implement server update)`);
});

// small helper to escape HTML when injecting text
function escapeHtml(s){
  return String(s).replace(/[&<>"'`]/g, c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;', '`':'&#96;'
  })[c]);
}

// initial load
fetchAndRenderProducts();
