// ====== CONFIG: set this to your deployed Apps Script web app URL ======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzhuY5yq7ADaD-YmNK7_O0ch1Quedgiau2Ml91HtijvTU68K_VajtopbuSAcSRn0EaF/exec"; // <- REPLACE THIS

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
const productDescriptionInput = document.getElementById("productDescription"); // NEW
const productDetailsInput = document.getElementById("productDetails"); // NEW
// *** NEW DOM REFERENCES for Business and Category ***
const businessNameInput = document.getElementById("businessName");
const businessCategoryInput = document.getElementById("businessCategory");
// ***************************************************

const businessFilterInput = document.getElementById("businessFilterInput");
const productNameInput = document.getElementById("productName");
const productQuantityInput = document.getElementById("productQuantity");
const productBuyInput = document.getElementById("productBuy");
const productSellInput = document.getElementById("productSell");

const DEVICE_ID_KEY = 'uniqueDeviceId';
const OWNER_BUSINESS_KEY = 'ownerBusinessName';
const STORAGE_KEY = 'savedProductLinks';

// ----------------------------------------------------------------------
// ** NEW DOM REFERENCES FOR UPDATE DIALOG **
const updateDialog = document.getElementById("updateDialog"); // Assumes this modal element exists
const closeUpdateDialogBtn = document.getElementById("closeUpdateDialogBtn"); // Assumes a close button exists
const updateProductName = document.getElementById("updateProductName");
const sellQuantityInput = document.getElementById("sellQuantity");
const restockQuantityInput = document.getElementById("restockQuantity");
const executeUpdateButton = document.getElementById("executeUpdateButton");

let DEVICE_ID = getOrCreateDeviceId();
let OWNER_BUSINESS_NAME = localStorage.getItem(OWNER_BUSINESS_KEY);
let currentProductData = {}; // Stores data of the product currently being updated
// ----------------------------------------------------------------------


function getOrCreateDeviceId() {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
        // Generate a new unique ID (similar to your generateUniqueId)
        id = 'dev-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
        localStorage.setItem(DEVICE_ID_KEY, id);
    }
    console.log("Device ID:", id);
    return id;
}

// Function to set the business name (called upon successful creation)
function setOwnerBusinessName(name) {
    OWNER_BUSINESS_NAME = name;
    localStorage.setItem(OWNER_BUSINESS_KEY, name);
    // Also, disable the businessNameInput after creation
    businessNameInput.disabled = true; 
    businessNameInput.title = "A business name is already registered to this device.";
}

// Function to check and disable the input on page load
function initializeBusinessNameInput() {
    if (OWNER_BUSINESS_NAME) {
        businessNameInput.value = OWNER_BUSINESS_NAME;
        businessNameInput.disabled = true;
        businessNameInput.title = "A business name is already registered to this device. Clear storage to register a new one.";
    } else {
        businessNameInput.disabled = false;
        businessNameInput.title = "";
    }
}

// *** NEW FUNCTION: Unique ID Generator (Stays the same) ***
function generateUniqueId() {
    // Generates a simple, client-side unique ID using timestamp and a random component
    return 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// *** MISSING HELPER FUNCTION (REQUIRED FOR NUMBER INPUTS) ***
function unformatNumber(value) {
    if (typeof value !== 'string') return value;
    // Remove all commas from the string
    return value.replace(/,/g, ''); 
}

// NEW FUNCTION: Handles the API call and UI removal for product deletion
async function deleteProduct(productId, productName, cardElement) {
    // 1. Confirmation Dialog
    if (!confirm(`⚠️ WARNING: Are you sure you want to PERMANENTLY delete the product "${productName}" (ID: ${productId})?\n\nThis action cannot be undone and will remove the item from the Google Sheet.`)) {
        return; // Stop if the user cancels
    }

    // 2. Prepare Payload for API
    const payload = {
        action: "deleteProduct",
        productId: productId // Use the unique product ID for the backend to find the row
    };

    try {
        // 3. Send Delete request to Web App
        const res = await fetch(WEB_APP_URL, {
            method: "POST",
            mode: "cors",
            headers: {"Content-Type":"text/plain"}, 
            body: JSON.stringify(payload)
        });
        const json = await res.json();
        
        // 4. Handle Response
        if (json && json.result === "success") {
            // Remove the card from the UI immediately
            cardElement.remove();
            alert(`✅ Product "${productName}" successfully deleted.`);
            
        } else {
            alert("❌ Failed to delete product: " + (json && json.message ? json.message : res.status));
        }

    } catch (err) {
        console.error("Error sending delete request to server:", err);
        alert("An error occurred while trying to delete the product.");
    }
}


// ==========================================================
// *** NEW UI AND BACKEND ACTION HANDLERS ***
// ==========================================================

/**
 * Handler for editing the category name.
 */
async function openEditCategoryDialog(businessName, oldCategoryName, productData) {
    const newCategory = prompt(`Enter the new name for the category "${oldCategoryName}" in business "${businessName}":`);

    if (newCategory && newCategory.trim() !== "" && newCategory.trim() !== oldCategoryName) {
        const trimmedNewCategory = newCategory.trim();

        const payload = {
            action: "editCategoryName",
            businessName: businessName, 
            oldCategoryName: oldCategoryName,
            newCategoryName: trimmedNewCategory
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
                alert(`✅ Category "${oldCategoryName}" successfully renamed to "${trimmedNewCategory}". Refreshing data...`);
                fetchAndRenderProducts(); 
            } else {
                alert("❌ Failed to rename category: " + (json && json.message ? json.message : res.status));
            }
        } catch (err) {
            console.error("Error sending category edit request to server:", err);
            alert("An error occurred while trying to rename the category.");
        }
    } else if (newCategory !== null) {
        alert("Category name unchanged or cancelled.");
    }
}

/**
 * Handler for deleting the entire Business group.
 */
async function deleteBusiness(businessName, categoryName) {
    if (!confirm(`🔥 WARNING: Are you sure you want to PERMANENTLY delete ALL products associated with the business "${businessName}"?\n\nThis action cannot be undone and will remove many items from the Google Sheet.`)) {
        return;
    }

    const payload = {
        action: "deleteBusinessGroup",
        businessName: businessName
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
            fetchAndRenderProducts(); 
            alert(`✅ All products for business "${businessName}" successfully deleted.`);
        } else {
            alert("❌ Failed to delete business group: " + (json && json.message ? json.message : res.status));
        }

    } catch (err) {
        console.error("Error sending delete business request to server:", err);
        alert("An error occurred while trying to delete the business.");
    }
}
// Load links from local storage (Stays the same)
function loadSavedLinks() {
    const json = localStorage.getItem(STORAGE_KEY);
    return json ? JSON.parse(json) : [];
}

// Save links to local storage (Stays the same)
function saveLinks(links) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

// helper: check if a link is a direct image url (Stays the same)
function isDirectImageUrl(link) {
    if (!link) return false;
    // Check if the link ends with common image extensions
    return /\.(jpe?g|png|gif|webp|svg)(\?.*)?$/i.test(link.toLowerCase());
}

// helper: extracts the appropriate thumbnail URL (Stays the same)
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

// helper: extract drive id from multiple link formats (Stays the same)
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

    // --- NEW: Extract Device Ownership ID and Check Authorization ---
    const productOwnerId = r.businessOwnerId || ""; 
    // Check if the current device is the creator (or if the ID is missing for legacy data)
    const canEdit = productOwnerId === DEVICE_ID || !productOwnerId; 
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
        updateBtn.title = "Only the device that created this product can update its stock.";
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