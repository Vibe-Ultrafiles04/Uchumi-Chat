// ====== CONFIG: set this to your deployed Apps Script web app URL ======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyjnSw84YcMVSVUIb4sYfxp7KaViMrxwTtpcOkg4w-iNieKiky3fDYmZFQa3soryQel1Q/exec"; // <- REPLACE THIS

/// New Gallery DOM refs
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

// ----------------------------------------------------------------------
// ** NEW DOM REFERENCES FOR UPDATE DIALOG **
const updateDialog = document.getElementById("updateDialog"); // Assumes this modal element exists
const closeUpdateDialogBtn = document.getElementById("closeUpdateDialogBtn"); // Assumes a close button exists
const updateProductName = document.getElementById("updateProductName");
const sellQuantityInput = document.getElementById("sellQuantity");
const restockQuantityInput = document.getElementById("restockQuantity");
const executeUpdateButton = document.getElementById("executeUpdateButton");

let currentProductData = {}; // Stores data of the product currently being updated
// ----------------------------------------------------------------------

// *** NEW FUNCTION: Unique ID Generator ***
function generateUniqueId() {
    // Generates a simple, client-side unique ID using timestamp and a random component
    return 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// Load links from local storage
function loadSavedLinks() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
}

// Save links to local storage
function saveLinks(links) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// helper: check if a link is a direct image url
function isDirectImageUrl(link) {
    if (!link) return false;
    // Check if the link ends with common image extensions
    return /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(link.toLowerCase());
}

// helper: extracts the appropriate thumbnail URL
function getThumbnailUrl(link, size = 800) {
    if (!link) return null;

    const fileId = extractDriveId(link);

    if (fileId) {
        // 1. Google Drive Link
        return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
    }

    if (isDirectImageUrl(link)) {
        // 2. Direct Image URL (use the link itself)
        return link;
    }

    return null; // Not a recognized link type for thumbnail
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

// Render the gallery in the dialog (MODIFIED)
function renderGallery() {
    galleryContainer.innerHTML = '';
    const links = loadSavedLinks();

    if (links.length === 0) {
        galleryContainer.innerHTML = '<div class="hint">No links saved yet.</div>';
        return;
    }

    links.forEach((linkObj, index) => {
        // Use the new unified helper function
        const thumbUrl = getThumbnailUrl(linkObj.driveLink, 200); 

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

// preview button handler (MODIFIED)
previewBtn.addEventListener("click", () => {
    const link = driveLinkInput.value.trim();
    const thumbUrl = getThumbnailUrl(link, 800); // Use the unified helper

    if (!thumbUrl) {
        newThumb.innerHTML = "Invalid Drive or direct Image link (try a link ending in .jpg, .png, etc.)";
        return;
    }
    
    newThumb.innerHTML = `<img src="${thumbUrl}" alt="thumb" style="max-width:100%;max-height:100%"/>`;
});

// **********************************************
// ** NEW/MODIFIED FUNCTIONS START HERE **
// **********************************************

// Helper function to create a single product card DOM element (MODIFIED)
function createProductCard(r) {
    // Data extraction (copied from fetchAndRenderProducts)
    const name = r.name || "PRODUCT DETAILS";
    // Check if r is an object or an array-like structure. The current structure implies r is the object from App Script.
    const quantity = parseInt(r.quantity ?? r[1] ?? r[2] ?? 0); // Convert to number
    const buy = parseFloat(r.buy ?? r[3] ?? r[3] ?? 0);          // Convert to float
    const sell = parseFloat(r.sell ?? r[4] ?? r[4] ?? 0);        // Convert to float
    
    // Assumes the row index or unique ID is available as 'rowId' for updates
    // The App Script should return the actual row number OR the unique ID in 'rowId'
    const rowId = r.rowId; 

    // IMPORTANT: The app script should now return the original link under 'driveLink' 
    // for all product types, or a new 'imageUrl' field. We use 'driveLink' as the main link.
    const productLink = r.driveLink || "";  
    // Use the unified helper to get the image URL for the card
    const thumbUrl = getThumbnailUrl(productLink, 400); 

    // Calculate profit
    const profit = sell - buy;
    const profitClass = profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral';

    // Calculate Percentage Profit (Profit Margin)
    let profitPercent = 0;
    if (sell > 0) {
        // Calculate Profit Margin: ((Sell - Buy) / Sell) * 100
        profitPercent = (profit / sell) * 100;
    } else if (profit > 0 && buy === 0) {
        // Special case: If Cost Price is 0, the margin is 100%
        profitPercent = 100;        
    }
    const profitDisplay = `${profitPercent.toFixed(1)}%`; // Display with one decimal place

    // --- MODERN CARD STRUCTURE ---
    const card = document.createElement("div");
    card.className = "modern-product-card"; // NEW CLASS NAME
    // Add dataset attributes for easy DOM look-up and quantity update
    card.dataset.rowId = rowId;
    card.dataset.quantity = quantity;

    // 1. Thumbnail Area
    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "card-thumb-wrapper";

    // MODIFIED to use the unified thumbUrl
    const thumbContent = thumbUrl
        ? `<img src="${thumbUrl}" alt="Product Image" class="product-image"/>`
        : `<div class="placeholder-image">🖼️ No Image</div>`;
    thumbWrapper.innerHTML = thumbContent;

    // Quantity Badge (Updated element to target for live quantity update)
    const quantityBadge = document.createElement("div");
    const lowStockClass = quantity < 5 ? 'low-stock' : ''; // Example: Low stock warning
    quantityBadge.className = `quantity-badge ${lowStockClass}`;
    quantityBadge.dataset.quantityDisplay = "true"; // Marker for live update
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
            <span class="label">Est. Profit Margin:</span>
            <span class="value">${profitDisplay}</span>
        </div>
    `;

    // 3. Update Button (NEW)
    const updateBtn = document.createElement("button");
    updateBtn.className = "btn-black update-product-btn";
    updateBtn.textContent = "Update Stock";
    
    // Add event listener to open the update dialog
    updateBtn.addEventListener("click", () => {
        openUpdateDialog(r); // Pass the entire product object to the handler
    });

    info.appendChild(updateBtn);
    card.appendChild(info);
    // --- END MODERN CARD STRUCTURE ---
    
    return card;
}

// Handler to open the update dialog (NEW)
function openUpdateDialog(product) {
    // Store the product data globally
    currentProductData = product;
    
    // Populate the dialog fields
    updateProductName.textContent = product.name;
    sellQuantityInput.value = "";
    restockQuantityInput.value = "";
    
    updateDialog.showModal();
}

// Handler to close the update dialog (NEW)
if (closeUpdateDialogBtn) {
    closeUpdateDialogBtn.addEventListener("click", () => {
        updateDialog.close();
    });
}

// Handler to execute the stock update (NEW)
if (executeUpdateButton) {
    executeUpdateButton.addEventListener("click", async () => {
        const sellAmount = parseInt(sellQuantityInput.value || "0", 10);
        const restockAmount = parseInt(restockQuantityInput.value || "0", 10);
        
        if (sellAmount === 0 && restockAmount === 0) {
            alert("Enter a quantity to sell or restock.");
            return;
        }

        const product = currentProductData;
        
        // Use 'id' if available, fallback to 'rowId'
        const productId = product.id || product.rowId; 
        
        if (!productId) {
            alert("Error: Product ID not found for update.");
            return;
        }

        const currentQuantity = parseInt(product.quantity, 10);
        const newQuantity = currentQuantity - sellAmount + restockAmount;
        
        if (newQuantity < 0) {
            alert(`Cannot sell ${sellAmount} units. Current stock is ${currentQuantity}. New quantity would be negative.`);
            return;
        }

        // 1. Prepare Payload for API (POST with specific action)
        const payload = {
            action: "updateQuantity",
            // Send the unique ID for the backend to find the row
            productId: productId, 
            newQuantity: newQuantity
        };

        try {
            // 2. Send Update to Web App
            const res = await fetch(WEB_APP_URL, {
                method: "POST",
                mode: "cors",
                headers: {"Content-Type":"text/plain"}, 
                body: JSON.stringify(payload)
            });
            const json = await res.json();
            
            if (json && json.result === "success") {
                // 3. Update Front-End UI
                // Search by rowId (assuming the backend returns the row number in 'rowId' or the unique ID in a field used for the card's data-row-id)
                const card = productsContainer.querySelector(`[data-row-id="${product.rowId || productId}"]`); 
                if (card) {
                    // Update dataset attribute
                    card.dataset.quantity = newQuantity;
                    
                    // Update the visual badge
                    const badge = card.querySelector('[data-quantity-display="true"]');
                    if (badge) {
                        const lowStockClass = newQuantity < 5 ? 'low-stock' : '';
                        badge.className = `quantity-badge ${lowStockClass}`;
                        badge.innerHTML = `<span class="icon">📦</span> ${newQuantity} in Stock`;
                    }
                }
                
                // 4. Update the currentProductData object for immediate re-updates
                currentProductData.quantity = newQuantity; 
                alert(`Stock for ${product.name} updated successfully to ${newQuantity}.`);
                
                updateDialog.close();
            } else {
                alert("Failed to update product: " + (json && json.message ? json.message : res.status));
            }

        } catch (err) {
            console.error(err);
            alert("Error sending update to server: " + err.message);
        }
    });
}

// add product: collect fields -> POST to Web App (MODIFIED)
addProductBtn.addEventListener("click", async () => {
    // 1. COLLECT ALL DATA FROM INPUTS FIRST
    const name = productNameInput.value.trim(); 
    const quantity = parseInt(productQuantityInput.value || "0", 10);
    const buy = parseFloat(productBuyInput.value || "0");
    const sell = parseFloat(productSellInput.value || "0");
    const link = driveLinkInput.value.trim();
    const fileId = extractDriveId(link);

    if (!name) { alert("Enter product name"); return; }
    
    // Check for a link that can be used for an image (either Drive or a direct URL)
    if (!fileId && !isDirectImageUrl(link) && link.length > 0) {
        alert("Link must be a Google Drive link or a direct image URL (try a link ending in .jpg, .png, etc.)");
        return;
    }

    // *** NEW: Generate Unique Product ID ***
    const uniqueId = generateUniqueId();

    // 2. CREATE THE PAYLOAD OBJECT
    // The 'driveLink' field is repurposed to hold the main link, regardless of type.
    const payload = {
        action: "addProduct", // Optional: Added an action for clarity on the backend
        id: uniqueId, // *** NEW: Unique ID ***
        timestamp: new Date().toISOString(),
        name, quantity, buy, sell,
        driveLink: link, // Holds the Drive link OR the generic URL
        driveFileId: fileId || "" // Only holds an ID if it's a Drive link
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
            
            // Re-fetch products to ensure the new product has a valid rowId for future updates
            fetchAndRenderProducts(); 

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

// ** 1. Global Callback Function (Handles JSONP Response) **
// NOTE: This must be a globally accessible function.
function handleInventoryData(json) {
    // The JSONP response is received here as the 'json' object
    
    // Debugging log
    console.log("APPS SCRIPT JSONP RESPONSE:", json); 
    
    productsContainer.innerHTML = ""; // Clear "Loading..." hint

    if (!Array.isArray(json.rows) || json.rows.length === 0) {
        productsContainer.innerHTML = '<div class="hint">No products returned or invalid response format.</div>';
        return;
    }
    
    // render each row as product card (reverse for newest first)
    const rows = json.rows.slice().reverse();
    rows.forEach((r) => {
        // Ensure each product object 'r' has the necessary fields
        if (!r.rowId && r.row) r.rowId = r.row; 
        
        const card = createProductCard(r); 
        productsContainer.appendChild(card);
    });
}

// ** 2. Modified Fetch Function (Uses JSONP via Script Tag Injection) **
function fetchAndRenderProducts(){
    productsContainer.innerHTML = '<div class="hint">Loading products...</div>';
    
    // The name of the function we defined above
    const callbackName = 'handleInventoryData'; 
    
    // Construct the URL with the action and the mandatory 'callback' parameter
    const url = `${WEB_APP_URL}?action=list&callback=${callbackName}`;

    // Create a script tag to make the JSONP request
    const script = document.createElement('script');
    script.src = url;
    
    // Handle success/failure cleanup
    script.onload = () => {
        // Clean up the temporary script tag after execution
        setTimeout(() => script.remove(), 100); 
    };

    script.onerror = (err) => {
        console.error("JSONP Request Failed:", err);
        productsContainer.innerHTML = '<div class="hint">Error loading products (Failed to connect or script error).</div>';
        script.remove();
    };
    
    // Execute the request by appending the script tag to the head
    document.head.appendChild(script);
}
// small helper to escape HTML when injecting text
function escapeHtml(s){
    return String(s).replace(/[&<>"'`]/g, c=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;', '`':'&#96;'
    })[c]);
}
// Handler to save the current link in the form to the gallery (MODIFIED)
saveLinkBtn.addEventListener("click", () => {
    const link = driveLinkInput.value.trim();
    const name = productNameInput.value.trim() || 'Untitled Link';
    
    // Validate that it's either a Drive link or a direct image URL
    if (!link || (!extractDriveId(link) && !isDirectImageUrl(link))) {
        alert("Please enter a valid Google Drive link or a direct image URL (ends in .jpg, .png, etc.).");
        return;
    }

    const links = loadSavedLinks();
    // Save the original link regardless of type
    links.push({ driveLink: link, name: name }); 
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
