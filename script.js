// ====== CONFIG: set this to your deployed Apps Script web app URL ======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxuY8aTcLrfjailzE5r2WTbopTxgsef_bYt1Y2Iv25aSXJeFXdGAhb9CUREusOx0ogLJg/exec"; 

/// DOM References
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
const productDescriptionInput = document.getElementById("productDescription");
const productDetailsInput = document.getElementById("productDetails");

const businessNameInput = document.getElementById("businessName");
const businessCategoryInput = document.getElementById("businessCategory");
const productNameInput = document.getElementById("productName");
const productQuantityInput = document.getElementById("productQuantity");
const productBuyInput = document.getElementById("productBuy");
const productSellInput = document.getElementById("productSell");
const imageFileInput = document.getElementById("imageFileInput");

const DEVICE_ID_KEY = 'uniqueDeviceId';
const OWNER_BUSINESS_KEY = 'ownerBusinessName';
const STORAGE_KEY = 'savedProductLinks';

// UPDATE DIALOG DOM
const updateDialog = document.getElementById("updateDialog");
const closeUpdateDialogBtn = document.getElementById("closeUpdateDialogBtn");
const updateProductName = document.getElementById("updateProductName");
const sellQuantityInput = document.getElementById("sellQuantity");
const restockQuantityInput = document.getElementById("restockQuantity");
const updateCategoryInput = document.getElementById("updateCategory"); 
const executeUpdateButton = document.getElementById("executeUpdateButton");
const goToEditPageButton = document.getElementById("goToEditPageButton");

let DEVICE_ID = getOrCreateDeviceId();
let OWNER_BUSINESS_NAME = localStorage.getItem(OWNER_BUSINESS_KEY);
let currentProductData = {}; 
let selectedImageBase64 = null;
let selectedImageMimeType = null;

// --- INITIALIZATION ---
window.onload = () => {
    initializeBusinessNameInput();
    fetchAndRenderProducts();
    renderGallery();
};

function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        id = 'dev-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
}

function initializeBusinessNameInput() {
    const currentName = window.BUSINESS_NAME || OWNER_BUSINESS_NAME;
    if (currentName) {
        businessNameInput.value = currentName;
        businessNameInput.disabled = true;
    }
}

// --- IMAGE SELECTION LOGIC ---
if (imageFileInput) {
    imageFileInput.addEventListener("change", function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                const base64String = event.target.result;
                selectedImageBase64 = base64String.split(',')[1]; 
                selectedImageMimeType = file.type;
                newThumb.innerHTML = `<img src="${base64String}" style="width:100%; height:100%; object-fit:cover; border-radius:8px;" />`;
                if (driveLinkInput) driveLinkInput.value = ""; 
            };
            reader.readAsDataURL(file);
        }
    });
}

if (driveLinkInput) {
    driveLinkInput.addEventListener("input", () => {
        if (driveLinkInput.value.trim() !== "") {
            imageFileInput.value = "";
            selectedImageBase64 = null;
            selectedImageMimeType = null;
        }
    });
}

// --- HELPERS ---
function generateUniqueId() { return 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5); }
function unformatNumber(v) { return typeof v === 'string' ? v.replace(/,/g, '') : v; }

function getThumbnailUrl(link, size = 800) {
    if (!link) return null;
    let driveId = extractDriveId(link);
    if (driveId) return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;
    if (/\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(link.toLowerCase())) return link;
    return null;
}

function extractDriveId(link) {
    if (!link) return null;
    // Handle standard drive links, sharing links, and direct IDs
    let m = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m && m[1]) return m[1];
    m = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m && m[1]) return m[1];
    // If string looks like a standalone ID (no slashes), return it
    if (!link.includes('/') && link.length > 15) return link;
    return null;
}

// --- CORE CRUD ACTIONS ---

/**
 * FETCH AND RENDER
 */
async function fetchAndRenderProducts() {
    if (!productsContainer) return;
    productsContainer.innerHTML = "<div class='loading-state'>Syncing with database...</div>";
    
    try {
        const res = await fetch(`${WEB_APP_URL}?action=getAllProducts`);
        const data = await res.json();
        productsContainer.innerHTML = "";
        
        const myBiz = window.BUSINESS_NAME || OWNER_BUSINESS_NAME;
        const rows = data.rows || [];
        const filtered = rows.filter(r => r.businessName === myBiz).reverse();
        
        if (filtered.length === 0) {
            productsContainer.innerHTML = "<div class='hint'>No products found. Start by adding one above.</div>";
            return;
        }

        filtered.forEach(r => {
            const card = document.createElement("div");
            card.className = "modern-product-card";
            const thumb = getThumbnailUrl(r.driveLink, 400);
            
            card.innerHTML = `
                <div class="card-thumb-wrapper">
                    ${thumb ? `<img src="${thumb}" class="product-image">` : `<div class="placeholder">🖼️</div>`}
                </div>
                <div class="card-info">
                    <h4>${r.name}</h4>
                    <p class="category-text">${r.category || 'Uncategorized'}</p>
                    <p>Stock: <span class="stock-qty">${r.quantity}</span></p>
                    <div class="card-actions">
                        <button class="update-stock-btn btn-black small">Update</button>
                        <button class="delete-prod-btn btn-red small">🗑️</button>
                    </div>
                </div>
            `;
            
           
            
            productsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Fetch error:", err);
        productsContainer.innerHTML = "<div class='error'>Failed to load products. Check connection.</div>";
    }
}

/**
 * ADD PRODUCT
 */
addProductBtn.onclick = async () => {
    const name = productNameInput.value.trim();
    if (!name) return alert("Product Name is required");

    // Fix: If a link is provided, extract the clean ID to prevent duplicate logic issues
    const rawLink = driveLinkInput.value.trim();
    const driveId = extractDriveId(rawLink);
    const finalLink = driveId ? driveId : rawLink;

    const payload = {
        action: "addProduct",
        id: generateUniqueId(),
        businessName: businessNameInput.value.trim(),
        category: businessCategoryInput.value.trim(),
        name: name,
        quantity: parseInt(unformatNumber(productQuantityInput.value)) || 0,
        buy: parseFloat(unformatNumber(productBuyInput.value)) || 0,
        sell: parseFloat(unformatNumber(productSellInput.value)) || 0,
        description: productDescriptionInput.value,
        details: productDetailsInput.value,
        driveLink: finalLink,
        imageData: selectedImageBase64,
        imageMimeType: selectedImageMimeType,
        deviceId: DEVICE_ID
    };

    addProductBtn.disabled = true;
    addProductBtn.textContent = "Uploading...";

    try {
        const res = await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "cors",
            headers: {"Content-Type":"text/plain"},
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json.result === "success") {
            alert("✅ Product Added Successfully!");
            location.reload();
        } else {
            alert("Upload Error: " + json.message);
        }
    } catch (e) {
        alert("Server connection failed. Verify WEB_APP_URL.");
    } finally {
        addProductBtn.disabled = false;
        addProductBtn.textContent = "Add Product";
    }
};

/**
 * DELETE PRODUCT
 */
async function deleteProduct(productId, productName, cardElement) {
    if (!confirm(`⚠️ Permanently delete "${productName}"?\nThis action cannot be undone.`)) return;

    // Visual feedback
    const delBtn = cardElement.querySelector(".delete-prod-btn");
    const originalText = delBtn.textContent;
    delBtn.disabled = true;
    delBtn.textContent = "...";

    try {
        const res = await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "cors",
            headers: {"Content-Type":"text/plain"},
            body: JSON.stringify({ 
                action: "deleteProduct", 
                productId: productId 
            })
        });
        const json = await res.json();
        if (json.result === "success") {
            cardElement.remove();
        } else {
            alert("Could not delete: " + (json.message || "Unknown error"));
            delBtn.disabled = false;
            delBtn.textContent = originalText;
        }
    } catch (e) {
        alert("Network error during deletion.");
        delBtn.disabled = false;
        delBtn.textContent = originalText;
    }
}

/**
 * UPDATE STOCK & CATEGORY
 */
if (executeUpdateButton) {
    executeUpdateButton.onclick = async () => {
        const sold = parseInt(unformatNumber(sellQuantityInput.value)) || 0;
        const add = parseInt(unformatNumber(restockQuantityInput.value)) || 0;
        const newCategory = updateCategoryInput ? updateCategoryInput.value.trim() : currentProductData.category;
        
        // Calculate the net change in quantity
        const change = add - sold;

        executeUpdateButton.disabled = true;
        executeUpdateButton.textContent = "Updating DB...";

        try {
            const res = await fetch(WEB_APP_URL, {
                method: "POST",
                mode: "cors",
                headers: {"Content-Type":"text/plain"},
                body: JSON.stringify({ 
                    action: "updateStock", 
                    productId: currentProductData.id, 
                    quantityChange: change,
                    category: newCategory // This updates the sheet column for Category
                })
            });
            const json = await res.json();
            if (json.result === "success") {
                updateDialog.close();
                fetchAndRenderProducts(); // Refresh UI
                alert("Updated successfully!");
            } else {
                alert("Error: " + json.message);
            }
        } catch (e) {
            alert("Update failed. Check Apps Script permissions.");
        } finally {
            executeUpdateButton.disabled = false;
            executeUpdateButton.textContent = "Execute Update";
        }
    };
}

// --- GALLERY HELPERS ---
function loadSavedLinks() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
}

function saveLinks(links) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function renderGallery() {
    if (!galleryContainer) return;
    const links = loadSavedLinks();
    galleryContainer.innerHTML = "";
    links.forEach((link, idx) => {
        const thumb = getThumbnailUrl(link, 150);
        const div = document.createElement("div");
        div.className = "gallery-item";
        div.style = "border:1px solid #ddd; padding:5px; position:relative; cursor:pointer; background:#fff; border-radius:8px; display:flex; align-items:center; justify-content:center; min-height:80px;";
        div.innerHTML = `
            <div style="height:60px; width:60px; background:#f9f9f9; overflow:hidden; border-radius:4px; display:flex; align-items:center; justify-content:center;">
                ${thumb ? `<img src="${thumb}" style="width:100%;height:100%;object-fit:cover;">` : '🔗'}
            </div>
            <button class="del-link-btn" style="position:absolute;top:-8px;right:-8px;background:#ff4444;color:white;border:none;border-radius:50%;width:22px;height:22px;cursor:pointer;font-size:12px;font-weight:bold;box-shadow:0 2px 4px rgba(0,0,0,0.2);">×</button>
        `;
        div.onclick = (e) => {
            if (e.target.className === "del-link-btn") {
                links.splice(idx, 1);
                saveLinks(links);
                renderGallery();
                return;
            }
            driveLinkInput.value = link;
            if (previewBtn) previewBtn.click();
            linkGalleryDialog.close();
        };
        galleryContainer.appendChild(div);
    });
}

// Event Listeners for UI
if (openGalleryBtn) openGalleryBtn.onclick = () => { renderGallery(); linkGalleryDialog.showModal(); };
if (closeGalleryBtn) closeGalleryBtn.onclick = () => linkGalleryDialog.close();
if (closeUpdateDialogBtn) closeUpdateDialogBtn.onclick = () => updateDialog.close();
if (goToEditPageButton) goToEditPageButton.onclick = () => {
    const biz = window.BUSINESS_NAME || OWNER_BUSINESS_NAME;
    window.location.href = `./edit_products.html?business=${encodeURIComponent(biz)}`;
};
// Render the gallery in the dialog (Stays the same)
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

// preview button handler (Stays the same)
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

// Helper function to create a single product card DOM element (MODIFIED to use 'id' consistently)
// Helper function to create a single product card DOM element (MODIFIED to use 'id' consistently)
// Helper function to create a single product card DOM element (MODIFIED to use 'id' consistently)
// Assume DEVICE_ID is a globally defined variable holding the unique ID of the current device.

function createProductCard(r) {
    // Data extraction (all extraction logic remains the same)
    const name = r.name || "PRODUCT DETAILS";
    const quantity = parseInt(r.quantity ?? 0);
    const buy = parseFloat(r.buy ?? 0);
    const sell = parseFloat(r.sell ?? 0);
    
    // NEW: Extract description and details
    const description = r.description || "";
    const details = r.details || "";
    
    // The unique ID for the product
    const productId = r.id; 
    const rowId = r.rowId; 
    const businessName = r.businessName;
    const categoryName = r.category;    

    // --- NEW: Extract Device Ownership ID and Check Authorization (FIXED FOR RECOVERY) ---
    const productOwnerId = r.businessOwnerId || ""; 
    const productBusinessName = r.businessName || ""; // Get business name from card data

    // CRITICAL FIX: Allow editing if the product's business name matches the locally stored owner business name.
    const isOwnerBusinessMatch = OWNER_BUSINESS_NAME && productBusinessName === OWNER_BUSINESS_NAME;

    // Authorization Check:
    // 1. Does the product's business name match the locally stored owner business name? (This enables access after recovery)
    // 2. OR Is the current device ID the creator? (Original device check)
    // 3. OR Is the product legacy data (no productOwnerId)?
    const canEdit = isOwnerBusinessMatch || productOwnerId === DEVICE_ID || !productOwnerId; 
    // --- END NEW CHECK ---
    
    // IMPORTANT: The app script should now return the original link under 'driveLink' 
    const productLink = r.driveLink || "";  
    // Use the unified helper to get the image URL for the card
    const thumbUrl = getThumbnailUrl(productLink, 400); 

    // Calculate profit (remains the same)
    const profit = sell - buy;
    const profitClass = profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral';

    // Calculate Percentage Profit (remains the same)
    let profitPercent = 0;
    if (sell > 0) {
        profitPercent = (profit / sell) * 100;
    } else if (profit > 0 && buy === 0) {
        profitPercent = 100;        
    }
    const profitDisplay = `${profitPercent.toFixed(1)}%`;

    // --- MODERN CARD STRUCTURE (remains the same) ---
    const card = document.createElement("div");
    card.className = "modern-product-card";
    card.dataset.productId = productId;
    card.dataset.rowId = rowId; 
    card.dataset.quantity = quantity;

    // 1. Thumbnail Area (remains the same)
    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "card-thumb-wrapper";
    const thumbContent = thumbUrl
        ? `<img src="${thumbUrl}" alt="Product Image" class="product-image"/>`
        : `<div class="placeholder-image">🖼️ No Image</div>`;
    thumbWrapper.innerHTML = thumbContent;

    const quantityBadge = document.createElement("div");
    const lowStockClass = quantity < 5 ? 'low-stock' : '';
    quantityBadge.className = `quantity-badge ${lowStockClass}`;
    quantityBadge.dataset.quantityDisplay = "true";
    quantityBadge.innerHTML = `<span class="icon">📦</span> ${quantity} in Stock`;

    thumbWrapper.appendChild(quantityBadge);
    card.appendChild(thumbWrapper);

    // 2. Info Area (remains the same)
    const info = document.createElement("div");
    info.className = "card-info";

    info.innerHTML += `<h4 class="product-name">${escapeHtml(name)}</h4>`;
    
    if (description.length > 0) {
        info.innerHTML += `<p class="product-description">${escapeHtml(description)}</p>`;
    }

    if (details.length > 0) {
        info.innerHTML += `<div class="product-details">
            <span class="details-label">Details:</span> ${escapeHtml(details)}
        </div>`;
    }

    // --- MODIFIED PRICE STRUCTURE START ---
    info.innerHTML += `
        <div class="price-grid">
            <div class="price-item-combined">
                <span class="label">Cost Price:</span>
                <span class="value buy-price">${CURRENCY_SYMBOL}${formatNumberWithCommas(buy)}</span>
            </div>
            <div class="price-item-combined">
                <span class="label">Sell Price:</span>
                <span class="value sell-price">${CURRENCY_SYMBOL}${formatNumberWithCommas(sell)}</span>
            </div>
        </div>
    `;
    // --- MODIFIED PRICE STRUCTURE END ---
    
    info.innerHTML += `
        <div class="profit-margin ${profitClass}">
            <span class="label">Est. Profit Margin:</span>
            <span class="value">${profitDisplay}</span>
        </div>
    `;

    // 3. Action Buttons Container
    const actionButtons = document.createElement("div");
    actionButtons.className = "product-action-buttons";

    // Update Button (Existing)
    const updateBtn = document.createElement("button");
    updateBtn.className = "btn-black update-product-btn";
    updateBtn.textContent = "Update Stock";
    
    // 🔒 Conditional: Disable Update Stock button if not the creator
    if (canEdit) {
        updateBtn.addEventListener("click", () => {
            openUpdateDialog(r);
        });
    } else {
        updateBtn.disabled = true;
        // Updated title to reflect the new, more permissive logic
        updateBtn.title = `Only the device registered to business "${productBusinessName}" can update stock.`;
        updateBtn.style.opacity = '0.5';
    }
    
    // --- MODIFIED DELETE BUTTON INTO ACTION MENU ---
    const actionMenuWrapper = document.createElement("div");
    actionMenuWrapper.className = "action-menu-wrapper"; // For positioning the menu

    const menuBtn = document.createElement("button");
    menuBtn.className = "btn-red action-menu-btn"; 
    
    const menu = document.createElement("div");
    menu.className = "delete-action-menu";
    menu.style.display = 'none'; // Initially hidden
    
    // 🔒 Conditional: Control menu content and button behavior
    if (canEdit) {
        menuBtn.textContent = "Actions ▼";
        menu.innerHTML = `
            <button data-action="delete-product">🗑️ Delete This Product Card</button>
            <button data-action="edit-category">✏️ Edit Category: ${escapeHtml(categoryName)}</button>
            <button data-action="delete-business">🔥 Delete Whole Business: ${escapeHtml(businessName)}</button>
        `;
    } else {
        menuBtn.textContent = "View Info ⓘ";
        menu.innerHTML = `<button data-action="none" disabled>🔒 Not Editable by this device</button>`;
        menuBtn.style.opacity = '0.7'; // Visually indicate it's not the main action button
    }


    // Toggle menu visibility (applies to both editable and non-editable states)
    menuBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // Stop click from propagating to the document
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
    });
    
    // Handle menu item clicks (only necessary if editable)
    if (canEdit) {
        menu.addEventListener('click', (e) => {
            const action = e.target.dataset.action;
            if (action) {
                menu.style.display = 'none'; // Hide menu after selection
                if (action === "delete-product") {
                    deleteProduct(productId, name, card); 
                } else if (action === "edit-category") {
                    openEditCategoryDialog(businessName, categoryName, r);
                } else if (action === "delete-business") {
                    deleteBusiness(businessName, categoryName);
                }
            }
        });
    }

    // Append menu elements
    actionMenuWrapper.appendChild(menuBtn);
    actionMenuWrapper.appendChild(menu);
    // --- END MODIFIED DELETE BUTTON ---

    // Append buttons/menu to the container
    actionButtons.appendChild(updateBtn);
    actionButtons.appendChild(actionMenuWrapper); // Append the menu wrapper here
    
    // Append the container to the info area
    info.appendChild(actionButtons);
    card.appendChild(info);
    
    // Hide the menu when clicking anywhere else on the document
    document.addEventListener('click', (e) => {
        if (menu.style.display === 'block' && !actionMenuWrapper.contains(e.target)) {
            menu.style.display = 'none';
        }
    });

    return card;
}
// NEW HELPER FUNCTION: Formats a number with commas and two decimal places (Stays the same)
function formatNumberWithCommas(number) {
    const num = parseFloat(number);
    if (isNaN(num)) return '0.00';
    
    // Convert to a string with two decimal places
    const fixedNum = num.toFixed(2);
    
    // Separate integer and decimal parts
    const parts = fixedNum.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    // Add commas to the integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return formattedInteger + decimalPart;
}

// Handler to open the update dialog (MODIFIED to use 'id' consistently)
function openUpdateDialog(product) {
    // Store the product data globally
    currentProductData = product;
    
    // Populate the dialog fields
    updateProductName.textContent = product.name;
    sellQuantityInput.value = "";
    restockQuantityInput.value = "";
    
    updateDialog.showModal();
}

// Handler to close the update dialog (Stays the same)
if (closeUpdateDialogBtn) {
    closeUpdateDialogBtn.addEventListener("click", () => {
        updateDialog.close();
    });
}

// Handler to execute the stock update (MODIFIED to use 'id' consistently)
if (executeUpdateButton) {
    executeUpdateButton.addEventListener("click", async () => {
        const sellAmount = parseInt(unformatNumber(sellQuantityInput.value) || "0", 10);
        const restockAmount = parseInt(unformatNumber(restockQuantityInput.value) || "0", 10);
        
        if (sellAmount === 0 && restockAmount === 0) {
            alert("Enter a quantity to sell or restock.");
            return;
        }

        const product = currentProductData;
        
        // Use 'id' (the unique ID) as the primary key
        const productId = product.id; 
        const rowId = product.rowId; // Keep rowId for DOM lookup convenience

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
                // Look up by data-product-id
                const card = productsContainer.querySelector(`[data-product-id="${productId}"]`); 
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
                
                // The success alert is REMOVED here to provide an instant, silent update.
                
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

addProductBtn.addEventListener("click", async () => {
    // 1. COLLECT ALL DATA FROM INPUTS FIRST
    const businessName = businessNameInput.value.trim();
    const category = businessCategoryInput.value.trim();
    const name = productNameInput.value.trim();
    // NEW: Collect Description and Details
    const description = productDescriptionInput.value.trim();
    const details = productDetailsInput.value.trim();
    
    const quantity = parseInt(unformatNumber(productQuantityInput.value) || "0", 10);
    const buy = parseFloat(unformatNumber(productBuyInput.value) || "0");
    const sell = parseFloat(unformatNumber(productSellInput.value) || "0");
    const link = driveLinkInput.value.trim();
    const fileId = extractDriveId(link);

    // --- VALIDATION/ENFORCEMENT START ---

    // ⛔️ ENFORCEMENT CHECK: One business name per phone
    if (OWNER_BUSINESS_NAME && businessName !== OWNER_BUSINESS_NAME) {
        alert(`❌ Error: This device is already registered to the business "${OWNER_BUSINESS_NAME}". You cannot create products for a different business.`);
        return;
    }
    
    if (!businessName) { alert("Enter business name"); return; }
    if (!category) { alert("Enter product category"); return; }
    if (!name) { alert("Enter product name"); return; }
    
    // Check for a link that can be used for an image (either Drive or a direct URL)
    if (!fileId && !isDirectImageUrl(link) && link.length > 0) {
        alert("Link must be a Google Drive link or a direct image URL (try a link ending in .jpg, .png, etc.)");
        return;
    }

    // --- VALIDATION/ENFORCEMENT END ---

    // *** NEW: Generate Unique Product ID ***
    const uniqueId = generateUniqueId();

    // 2. CREATE THE PAYLOAD OBJECT
    const payload = {
        action: "addProduct",
        id: uniqueId, 
        timestamp: new Date().toISOString(),
        businessName: businessName, 
        category: category,        
        description: description,    
        details: details,            
        name, quantity, buy, sell,
        driveLink: link,
        driveFileId: fileId || "",
        // 🔑 CRITICAL NEW FIELD: Include the unique device ID for ownership tracking
        deviceId: DEVICE_ID 
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
            
            // 🔒 CRITICAL STEP: Register the business name to this device upon first successful creation
            if (!OWNER_BUSINESS_NAME) {
                setOwnerBusinessName(businessName); // This updates the global variable and Local Storage
                // 🛑 REMOVED: alert(`✅ Success! Business "${businessName}" is now registered to this device (${DEVICE_ID}).`);
                
            } else {
                // 🛑 REMOVED: alert(`✅ Product "${name}" successfully added to "${businessName}".`);
            }

            // --- ADDED: Save Business and Category to Local Storage (for input persistence) ---
            // This is the logic you requested previously, placed here where the data is confirmed to be used.
            localStorage.setItem('lastBusinessName', businessName);
            localStorage.setItem('lastCategory', category);
            // -----------------------------------------------------------------------------------

            // Re-fetch products to ensure the new product has a valid rowId for future updates
            fetchAndRenderProducts(); 

            // 4. CLEAR INPUTS LAST
            // Do NOT clear businessNameInput/businessCategoryInput if the user is likely to add another item in the same group.
            productNameInput.value = ""; 
            productQuantityInput.value = "";
            productBuyInput.value = "";
            productSellInput.value = "";
            // NEW: Clear Description and Details inputs
            productDescriptionInput.value = "";
            productDetailsInput.value = "";
            
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
// ** 1. Global Callback Function (MODIFIED for Grouping) **
function handleInventoryData(json) {
    productsContainer.innerHTML = ""; // Clear "Loading..." hint

    if (!Array.isArray(json.rows) || json.rows.length === 0) {
        productsContainer.innerHTML = '<div class="hint">No products returned or invalid response format.</div>';
        return;
    }
    
    const rows = json.rows.slice().reverse();

    // 1. Group products by Business Name
    const groupedByBusiness = rows.reduce((acc, product) => {
        const business = product.businessName || 'Uncategorized Business';
        acc[business] = acc[business] || [];
        acc[business].push(product);
        return acc;
    }, {});

    // 2. Iterate through Business Groups
    for (const businessName in groupedByBusiness) {
        const businessProducts = groupedByBusiness[businessName];

        // Business Header
        const businessHeader = document.createElement('h2');
        businessHeader.className = 'business-header';
        businessHeader.textContent = `🏢 ${businessName}`;
        productsContainer.appendChild(businessHeader);

        // 3. Group products within the business by Category
        const groupedByCategory = businessProducts.reduce((acc, product) => {
            const category = product.category || 'Other Category';
            acc[category] = acc[category] || [];
            acc[category].push(product);
            return acc;
        }, {});

        // 4. Iterate through Category Groups
        for (const categoryName in groupedByCategory) {
            const categoryProducts = groupedByCategory[categoryName];

            // Category Header
            const categoryHeader = document.createElement('h3');
            categoryHeader.className = 'category-header';
            categoryHeader.textContent = `🏷️ ${categoryName}`;
            productsContainer.appendChild(categoryHeader);

            // Product Card Wrapper (the scrollable container)
            const categoryGroupWrapper = document.createElement('div');
            categoryGroupWrapper.className = 'product-group-wrapper'; // Use the class for styling/scrolling

            // 5. Append product cards
            categoryProducts.forEach(r => {
                // Ensure each product object 'r' has the necessary fields
                if (!r.rowId && r.row) r.rowId = r.row; 
                const card = createProductCard(r); 
                categoryGroupWrapper.appendChild(card);
            });
            
            productsContainer.appendChild(categoryGroupWrapper);
        }
    }
}

// --- NEW FUNCTION: Direct Navigation to Edit Page ---

/**
 * Creates the URL for the edit page, passing the business name for filtering.
 * Assumes the target page is 'edit.html'.
 */
function navigateToEditPage() {
    // 1. Check for the registered business name
    if (!OWNER_BUSINESS_NAME) {
        alert("🔒 Access Denied: You must register a business name by adding a product first.");
        return;
    }

    // 2. Construct the URL to the edit page with the business name as a query parameter
    // This allows the edit.html page to know which products to load.
    const editUrl = `edit.html?business=${encodeURIComponent(OWNER_BUSINESS_NAME)}`;

    // 3. Navigate to the new page
    window.location.href = editUrl;
}

// 4. Attach the handler to the button
if (goToEditPageButton) {
    goToEditPageButton.addEventListener("click", navigateToEditPage);
}
// *** NEW FUNCTION: Applies the filter to the rendered products ***
function applyBusinessFilter(filterTerm) {
    const term = filterTerm.toLowerCase().trim();
    const productGroups = productsContainer.querySelectorAll('.product-group-wrapper');
    const businessHeaders = productsContainer.querySelectorAll('.business-header');
    
    let anyBusinessVisible = false;

    // 1. Iterate over each Business Header and its corresponding product groups
    businessHeaders.forEach(header => {
        const businessName = header.textContent.replace('🏢 ', '').trim().toLowerCase();
        let groupProductsWrapper = header.nextElementSibling; // Get the next element after the header
        
        // Find the next element that is a product-group-wrapper (skipping category headers in between)
        while (groupProductsWrapper && !groupProductsWrapper.classList.contains('product-group-wrapper')) {
            groupProductsWrapper = groupProductsWrapper.nextElementSibling;
        }

        // Hide the Business Header and its entire group wrapper by default
        header.style.display = 'none';
        if (groupProductsWrapper) {
            groupProductsWrapper.style.display = 'none';
        }
    });

    // 2. Iterate over the raw product list (from the grouped data, if you had it)
    // ---
    // NOTE: Since the current rendering logic groups everything into category wrappers, 
    // the filter must be applied *during* the rendering phase or by searching the DOM
    // for all business-related elements. 
    //
    // A simpler approach is to:
    // a) Re-fetch and re-render the filtered results (more network traffic, simplest code change).
    // b) Hide/Show the rendered DOM elements (less network traffic, more complex DOM traversal).
    //
    // **Let's use the DOM hiding/showing approach (Option b) which is more efficient after initial load.**
    // ---

    // The filter will re-iterate over *all* the product cards and headers and hide/show them.
    let currentBusinessVisible = false;
    
    // Get ALL business headers, category headers, and product wrappers
    const allElements = productsContainer.children;
    
    for (const element of allElements) {
        if (element.classList.contains('business-header')) {
            // Check the current business header
            const businessName = element.textContent.replace('🏢 ', '').trim().toLowerCase();
            
            // Determine if the business should be visible
            currentBusinessVisible = businessName.includes(term) || term === '';
            
            // Set visibility for the business header
            element.style.display = currentBusinessVisible ? 'block' : 'none';
            
            if (currentBusinessVisible) {
                anyBusinessVisible = true;
            }
            
        } else if (element.classList.contains('category-header')) {
            // Category headers are only visible if the parent business is visible
            element.style.display = currentBusinessVisible ? 'block' : 'none';
            
        } else if (element.classList.contains('product-group-wrapper')) {
            // Product wrappers are only visible if the parent business is visible
            element.style.display = currentBusinessVisible ? 'flex' : 'none'; // Assuming 'flex' for the wrapper
        }
    }

    // Display a "No results" message if no business is visible and the search term is not empty
    const noResultsHint = document.getElementById('noFilterResultsHint');
    if (!anyBusinessVisible && term.length > 0) {
        if (!noResultsHint) {
            const hint = document.createElement('div');
            hint.id = 'noFilterResultsHint';
            hint.className = 'hint';
            hint.textContent = `No products found matching business name: "${filterTerm}"`;
            productsContainer.appendChild(hint);
        } else {
            noResultsHint.textContent = `No products found matching business name: "${filterTerm}"`;
            noResultsHint.style.display = 'block';
        }
    } else if (noResultsHint) {
        noResultsHint.style.display = 'none';
    }
}
// FINAL & PERFECT VERSION FOR STUDIO.HTML (script.js)
function fetchAndRenderProducts() {
    // Get business name from sessionStorage (set when entering from index.html)
    // Fallback to localStorage (in case user refreshes studio.html directly)
    let ownerBusiness = sessionStorage.getItem('ownerStudioAccess') || 
                        localStorage.getItem('ownerBusinessName');

    if (!ownerBusiness) {
        productsContainer.innerHTML = `
            <div class="hint" style="color:red">
                Access denied or business name missing.<br>
                Please enter Studio from the main gallery.
            </div>`;
        console.error("No business name found for studio access");
        return;
    }

    productsContainer.innerHTML = '<div class="hint">Loading your products...</div>';

    const callbackName = 'handleInventoryData';
    let url = `${WEB_APP_URL}?action=list&callback=${callbackName}`;

    // Always send the business name in Studio mode — this is safe and required
    url += `&business=${encodeURIComponent(ownerBusiness.trim())}`;

    const script = document.createElement('script');
    script.src = url;

    script.onload = () => setTimeout(() => script.remove(), 100);

    script.onerror = () => {
        productsContainer.innerHTML = `
            <div class="hint" style="color:red">
                Failed to load products.<br>
                Check internet or try again.
            </div>`;
        console.error("JSONP load failed:", url);
        script.remove();
    };

    document.head.appendChild(script);
}
// small helper to escape HTML when injecting text (Stays the same)
function escapeHtml(s){
    return String(s).replace(/[&<>"'`]/g, c=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;', '`':'&#96;'
    })[c]);
}
// Handler to save the current link in the form to the gallery (Stays the same)
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

// Open Gallery Dialog (Stays the same)
openGalleryBtn.addEventListener("click", () => {
    renderGallery();
    linkGalleryDialog.showModal();
});

// Close Gallery Dialog (Stays the same)
closeGalleryBtn.addEventListener("click", () => {
    linkGalleryDialog.close();
});

// Function to populate the main form with a link from the gallery (Stays the same)
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

// Function to remove a link from the gallery (Stays the same)
function removeLinkFromGallery(index) {
    if (confirm("Are you sure you want to remove this link from the gallery?")) {
        const links = loadSavedLinks();
        links.splice(index, 1); // Remove item at index
        saveLinks(links);
        renderGallery(); // Re-render the gallery
    }
}
// =============================================
// MAIN PAGE LOAD — ONE SINGLE PLACE (FIXED)
// =============================================
document.addEventListener("DOMContentLoaded", () => {

    // 1. AUTO-FILL BUSINESS NAME FROM setup.html (THIS IS WHAT YOU WANTED!)
    const savedBusinessName = localStorage.getItem('ownerBusinessName');
    if (savedBusinessName) {
        // Fill the "Add Product" business name field
        if (businessNameInput) {
            businessNameInput.value = savedBusinessName;
            businessNameInput.disabled = true;
            businessNameInput.title = "Business name is permanently linked to this device";
        }

        // Fill and lock the top filter input
        if (businessFilterInput) {
            businessFilterInput.value = savedBusinessName;
            businessFilterInput.placeholder = savedBusinessName;
            businessFilterInput.readOnly = true; // Prevents accidental change
        }

        // Auto-filter so only YOUR business products show up immediately
        applyBusinessFilter(savedBusinessName);
    }

    // 2. Run your existing initialization (keeps the disable logic consistent)
    initializeBusinessNameInput?.();

    // 3. Smooth touch scrolling for product rows
    document.querySelectorAll(".product-group-wrapper").forEach(row => {
        row.addEventListener("touchstart", () => row.style.scrollBehavior = "auto");
        row.addEventListener("touchend", () => row.style.scrollBehavior = "smooth");
    });

    // 4. Live filter as user types (your existing code)
    if (businessFilterInput) {
        businessFilterInput.addEventListener('input', (e) => {
            applyBusinessFilter(e.target.value);
        });
    }

    // 5. Finally load all products
    fetchAndRenderProducts();
});