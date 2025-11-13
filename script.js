/* inventory.js */
// ====== CONFIG: set this to your deployed Apps Script web app URL ======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwRbwFafaxrBqfIl1DB2f7-XvukSeXezcWHvAYbyxndz-xdHehPlWG9geyk9qUoY4NV4w/exec"; // <- REPLACE THIS

// DOM refs
// New Gallery DOM refs
const CURRENCY_SYMBOL = "KES";
const linkGalleryDialog = document.getElementById("linkGalleryDialog");
const openGalleryBtn = document.getElementById("openGalleryBtn");
const closeGalleryBtn = document.getElementById("closeGalleryBtn");
const galleryContainer = document.getElementById("galleryContainer");
const saveLinkBtn = document.getElementById("saveLinkBtn");
const driveLinkInput = document.getElementById("driveLink");
const previewBtn = document.getElementById("previewBtn");
const newThumb = document.getElementById("newThumb");
const addProductBtn = document.getElementById("addProductBtn");
const productsContainer = document.getElementById("productsContainer");

const productNameInput = document.getElementById("productName");
const productQuantityInput = document.getElementById("productQuantity");
const productBuyInput = document.getElementById("productBuy");
const productSellInput = document.getElementById("productSell");



const STORAGE_KEY = 'savedProductLinks';

// Load links from local storage
function loadSavedLinks() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
}

// Save links to local storage
function saveLinks(links) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// Render the gallery in the dialog
function renderGallery() {
    galleryContainer.innerHTML = '';
    const links = loadSavedLinks();

    if (links.length === 0) {
        galleryContainer.innerHTML = '<div class="hint">No links saved yet.</div>';
        return;
    }

    links.forEach((linkObj, index) => {
        const fileId = extractDriveId(linkObj.driveLink);
        const thumbUrl = fileId ? driveThumbnailUrl(fileId, 200) : null;

        const card = document.createElement("div");
        card.className = "gallery-card";
        card.dataset.index = index; // Store the index for selection

        const thumb = document.createElement("div");
        thumb.className = "p-thumb";
        thumb.innerHTML = thumbUrl
            ? `<img src="${thumbUrl}" alt="preview" style="width:100%;height:100%;object-fit:cover"/>`
            : `<span style="font-size:12px;color:#888">No Image</span>`;

        const nameDisplay = document.createElement("p");
        nameDisplay.textContent = linkObj.name || "Unnamed Link";
        nameDisplay.style.fontWeight = 'bold';

        // Add a 'Use' button to populate the main form
        const useBtn = document.createElement("button");
        useBtn.className = "btn-black small";
        useBtn.textContent = "Use";
        useBtn.style.marginRight = '5px';
        useBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click
            useLinkFromGallery(index);
        });

        // Add a 'Remove' button
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-black small";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent card click
            removeLinkFromGallery(index);
        });

        card.appendChild(thumb);
        card.appendChild(nameDisplay);
        card.appendChild(useBtn);
        card.appendChild(removeBtn);
        galleryContainer.appendChild(card);
    });
}

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

// **********************************************
// ** NEW/MODIFIED FUNCTIONS START HERE **
// **********************************************

// Helper function to create a single product card DOM element
function createProductCard(r) {
    // Data extraction (copied from fetchAndRenderProducts)
    const name = r.name || r[0] || "PRODUCT DETAILS";
    const quantity = parseInt(r.quantity ?? r[1] ?? r[2] ?? 0); // Convert to number
    const buy = parseFloat(r.buy ?? r[3] ?? r[3] ?? 0);        // Convert to float
    const sell = parseFloat(r.sell ?? r[4] ?? r[4] ?? 0);        // Convert to float
    const fileId = r.driveFileId || r.driveLinkFileId || (r.driveLink ? extractDriveId(r.driveLink) : null) || "";
    const driveLink = r.driveLink || "";
    const thumbUrl = fileId ? driveThumbnailUrl(fileId, 400) : (driveLink || "");

    // Calculate profit
    const profit = sell - buy;
    const profitClass = profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral';

    // --- MODERN CARD STRUCTURE ---
    const card = document.createElement("div");
    card.className = "modern-product-card"; // NEW CLASS NAME

    // 1. Thumbnail Area
    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "card-thumb-wrapper";

    const thumbContent = fileId
        ? `<img src="${thumbUrl}" alt="Product Image" class="product-image"/>`
        : `<div class="placeholder-image">🖼️ No Image</div>`;
    thumbWrapper.innerHTML = thumbContent;

    // Quantity Badge
    const quantityBadge = document.createElement("div");
    const lowStockClass = quantity < 5 ? 'low-stock' : ''; // Example: Low stock warning
    quantityBadge.className = `quantity-badge ${lowStockClass}`;
    quantityBadge.innerHTML = `<span class="icon">📦</span> ${quantity} in Stock`;

    thumbWrapper.appendChild(quantityBadge);
    card.appendChild(thumbWrapper);

    // 2. Info Area
    const info = document.createElement("div");
    info.className = "card-info";

    // Name
    info.innerHTML += `<h4 class="product-name">${escapeHtml(name)}</h4>`;

    // Prices Grid
   info.innerHTML += `
        <div class="price-grid">
            <div class="price-item">
                <span class="label">Cost Price:</span>
                <span class="value buy-price">${CURRENCY_SYMBOL}${buy.toFixed(2)}</span>
            </div>
            <div class="price-item">
                <span class="label">Sell Price:</span>
                <span class="value sell-price">${CURRENCY_SYMBOL}${sell.toFixed(2)}</span>
            </div>
        </div>
    `;

    // Profit Margin
   info.innerHTML += `
        <div class="profit-margin ${profitClass}">
            <span class="label">Est. Profit:</span>
            <span class="value">${CURRENCY_SYMBOL}${profit.toFixed(2)}</span>
        </div>
    `;

    card.appendChild(info);
    // --- END MODERN CARD STRUCTURE ---
    
    return card;
}


// add product: collect fields -> POST to Web App
addProductBtn.addEventListener("click", async () => {
    // 1. COLLECT ALL DATA FROM INPUTS FIRST
    const name = productNameInput.value.trim(); 
    const quantity = parseInt(productQuantityInput.value || "0", 10);
    const buy = parseFloat(productBuyInput.value || "0");
    const sell = parseFloat(productSellInput.value || "0");
    const driveLink = driveLinkInput.value.trim();
    const fileId = extractDriveId(driveLink);

    if (!name) { alert("Enter product name"); return; }

    // 2. CREATE THE PAYLOAD OBJECT
    const payload = {
        timestamp: new Date().toISOString(),
        name, quantity, buy, sell,
        driveLink, driveFileId: fileId || ""
    };

    try {
        const res = await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "cors",
           headers: {"Content-Type":"text/plain"}, 
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json && json.result === "success") {

            // 3. CREATE AND PREPEND THE CARD (USES THE CORRECT NAME FROM 'payload')
            const newCard = createProductCard(payload);
            
            if (productsContainer.children.length === 0 || 
                (productsContainer.children.length === 1 && productsContainer.children[0].className === 'hint')) {
                productsContainer.innerHTML = '';
            }

            productsContainer.prepend(newCard); 

            // 4. CLEAR INPUTS LAST
            productNameInput.value = ""; 
            productQuantityInput.value = "";
            productBuyInput.value = "";
            productSellInput.value = "";
            driveLinkInput.value = "";
            newThumb.innerHTML = "Thumbnail appears";

        } else {
            alert("Failed to add product: " + (json && json.message ? json.message : res.status));
        }
    } catch (err) {
        console.error(err);
        alert("Error sending to server: " + err.message);
    }
});
// fetch products (GET) and render cards
// inventory.js - RECONSTRUCTED fetchAndRenderProducts FUNCTION

// fetch products (GET) and render cards
async function fetchAndRenderProducts(){
    productsContainer.innerHTML = '<div class="hint">Loading products...</div>';
    try {
        const res = await fetch(WEB_APP_URL + "?action=list", {method:"GET", mode:"cors"});
        const json = await res.json();
        
        // Debugging logs (kept from original)
        console.log("APPS SCRIPT JSON RESPONSE:", json); 
        console.log("ROWS DATA:", json.rows); 
        
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
            // Use the new helper function to create and append the card
            const card = createProductCard(r); 
            productsContainer.appendChild(card);
        });
    } catch (err) {
        console.error(err);
        productsContainer.innerHTML = '<div class="hint">Error loading products</div>';
    }
}

// small helper to escape HTML when injecting text
function escapeHtml(s){
    return String(s).replace(/[&<>"'`]/g, c=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;', '`':'&#96;'
    })[c]);
}
// Handler to save the current link in the form to the gallery
// ... (rest of the code remains the same)

saveLinkBtn.addEventListener("click", () => {
    const link = driveLinkInput.value.trim();
    const name = productNameInput.value.trim() || 'Untitled Link';
    const id = extractDriveId(link);

    if (!link || !id) {
        alert("Please enter a valid Google Drive link and preview it first.");
        return;
    }

    const links = loadSavedLinks();
    links.push({ driveLink: link, name: name }); // Save the link and the current name
    saveLinks(links);

    alert(`Link for "${name}" saved to gallery!`);
    
    // Clear the link field only, keep the name/price fields
    driveLinkInput.value = ""; 
    newThumb.innerHTML = "Thumbnail appears";
});

// Open Gallery Dialog
openGalleryBtn.addEventListener("click", () => {
    renderGallery();
    linkGalleryDialog.showModal();
});

// Close Gallery Dialog
closeGalleryBtn.addEventListener("click", () => {
    linkGalleryDialog.close();
});

// Function to populate the main form with a link from the gallery
function useLinkFromGallery(index) {
    const links = loadSavedLinks();
    const linkObj = links[index];
    if (linkObj) {
        // Populate the drive link and product name in the main form
        driveLinkInput.value = linkObj.driveLink;
        productNameInput.value = linkObj.name || "";
        
        // Trigger the preview button function to show the thumbnail
        previewBtn.click();

        linkGalleryDialog.close();
        alert(`Link for "${linkObj.name}" loaded into the Add Product form.`);
    }
}

// Function to remove a link from the gallery
function removeLinkFromGallery(index) {
    if (confirm("Are you sure you want to remove this link from the gallery?")) {
        const links = loadSavedLinks();
        links.splice(index, 1); // Remove item at index
        saveLinks(links);
        renderGallery(); // Re-render the gallery
    }
}

// initial load
fetchAndRenderProducts();