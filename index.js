// ====== CONFIG: set this to your deployed Apps Script web app URL ======
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyzR8pXx1W3Ia4eGHNr9fu1EVsNC_ALbUXu5_CU39hHJpGs_4P1XoPc-b6KnbRUi-pk/exec"; // <- REPLACE THIS

// ** GLOBAL FLAG: Read the flag set in the HTML files **
const IS_ADMIN_VIEW = window.IS_ADMIN_VIEW === true;

/// New Gallery DOM refs
const CURRENCY_SYMBOL = "KES";
const productsContainer = document.getElementById("productsContainer");
const STORAGE_KEY = 'savedProductLinks';

// 🆕 NEW: Store all fetched products globally for filtering
let allProducts = []; 
const businessFilterInput = document.getElementById("businessFilterInput"); // NEW DOM REF
// ----------------------------------------------------------------------
// ** ADMIN-ONLY DOM REFERENCES & INPUTS (Wrapped in check for safety) **

let linkGalleryDialog, openGalleryBtn, closeGalleryBtn, galleryContainer, saveLinkBtn, driveLinkInput, previewBtn, newThumb, addProductBtn;
let productNameInput, productQuantityInput, productBuyInput, productSellInput;
// NEW ADMIN INPUTS:
let productBusinessNameInput, productCategoryInput;
let updateDialog, closeUpdateDialogBtn, updateProductName, sellQuantityInput, restockQuantityInput, executeUpdateButton;

if (IS_ADMIN_VIEW) {
    linkGalleryDialog = document.getElementById("linkGalleryDialog");
    openGalleryBtn = document.getElementById("openGalleryBtn");
    closeGalleryBtn = document.getElementById("closeGalleryBtn");
    galleryContainer = document.getElementById("galleryContainer");
    saveLinkBtn = document.getElementById("saveLinkBtn");
    driveLinkInput = document.getElementById("driveLink");
    previewBtn = document.getElementById("previewBtn");
    newThumb = document.getElementById("newThumb");
    addProductBtn = document.getElementById("addProductBtn");
    
    productNameInput = document.getElementById("productName");
    productQuantityInput = document.getElementById("productQuantity");
    productBuyInput = document.getElementById("productBuy");
    productSellInput = document.getElementById("productSell");
    // Get new admin input refs
    productBusinessNameInput = document.getElementById("productBusinessName");
    productCategoryInput = document.getElementById("productCategory");

    // Update Dialog Refs
    updateDialog = document.getElementById("updateDialog");
    closeUpdateDialogBtn = document.getElementById("closeUpdateDialogBtn");
    updateProductName = document.getElementById("updateProductName");
    sellQuantityInput = document.getElementById("sellQuantity");
    restockQuantityInput = document.getElementById("restockQuantity");
    executeUpdateButton = document.getElementById("executeUpdateButton");
}
// ----------------------------------------------------------------------

let currentProductData = {}; // Stores data of the product currently being updated

// *** HELPER FUNCTIONS ***

// Helper: Formats a number with commas and two decimal places (Required by createProductCard)
function formatNumberWithCommas(number) {
    const num = parseFloat(number);
    if (isNaN(num)) return '0.00';
    
    const fixedNum = num.toFixed(2);
    const parts = fixedNum.split('.');
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    
    return formattedInteger + decimalPart;
}

// Helper: Unique ID Generator
function generateUniqueId() {
    return 'prod-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
}

// Helper: strips commas from a formatted number string
function unformatNumber(value) {
    if (typeof value !== 'string') return value;
    return value.replace(/,/g, ''); 
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
        // 2. Direct Image URL
        return link;
    }

    return null;
}

// helper: extract drive id from multiple link formats
function extractDriveId(link) {
    if (!link) return null;
    let m = link.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (m && m[1]) return m[1];
    m = link.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (m && m[1]) return m[1];
    if (/^[a-zA-Z0-9_-]{10,}$/.test(link)) return link;
    return null;
}

// small helper to escape HTML when injecting text
function escapeHtml(s){
    return String(s).replace(/[&<>"'`]/g, c=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;', '`':'&#96;'
    })[c]);
}

// ----------------------------------------------------------------------
// *** CORE RENDERING LOGIC ***
// ----------------------------------------------------------------------
// NEW: Function to create the business header card element
function createBusinessCardHeader(businessName, categoryNames, latestProduct) {
    const businessCard = document.createElement("div");
    businessCard.className = "business-card-header"; // Apply main styling for the enclosure
    
    // Use the latest product's image for the main display
    const latestProductLink = latestProduct.driveLink || "";
    const latestThumbUrl = getThumbnailUrl(latestProductLink, 800); 

    // Join category names for display
    const categoriesText = categoryNames.join(' | ');

    businessCard.innerHTML = `
        <div class="latest-product-image-container">
            ${latestThumbUrl 
                ? `<img src="${latestThumbUrl}" alt="Latest Product Image" class="latest-product-image"/>`
                : `<div class="placeholder-image-large">🖼️ Latest Product Image</div>`
            }
        </div>
        <div class="business-info">
            <h2 class="business-name">${escapeHtml(businessName)}</h2>
            <div class="product-categories">${escapeHtml(categoriesText)}</div>
        </div>
        <button class="btn-black open-business-card-btn">Click card to open</button>
    `;
    
   
  // SMOOTH NAVIGATION TO business.html (feels like sliding!)
businessCard.querySelector(".open-business-card-btn").addEventListener('click', (e) => {
    e.preventDefault();
    
    // Trigger smooth exit animation
    document.body.style.animation = 'slideOutToLeft 0.5s cubic-bezier(0.32, 0.72, 0, 1) forwards';
    
    const encodedName = encodeURIComponent(businessName.trim());
    
    setTimeout(() => {
        window.location.href = `business.html?name=${encodedName}`;
    }, 100); // Reduced delay — animation continues during navigation
});
    
    return businessCard;
}
// Helper function to create a single product card DOM element (CONDITIONAL)
function createProductCard(r) {
    // Data extraction
    const name = r.name || "PRODUCT DETAILS";
    const quantity = parseInt(r.quantity ?? r[1] ?? r[2] ?? 0);
    const buy = parseFloat(r.buy ?? r[3] ?? r[3] ?? 0);
    const sell = parseFloat(r.sell ?? r[4] ?? r[4] ?? 0);
    const rowId = r.rowId; 
    const businessName = r.businessName || "Unassigned Business"; 
    const category = r.category || "Unassigned Category";
    
    // NEW: Description and Details from the data object
    const description = r.description || '';
    const details = r.details || '';

    const productLink = r.driveLink || "";  
    const thumbUrl = getThumbnailUrl(productLink, 400); 

    // Calculate profit (Admin View Only)
    let profitClass = '';
    let profitDisplay = '';
    if (IS_ADMIN_VIEW) {
        const profit = sell - buy;
        profitClass = profit > 0 ? 'profit-positive' : profit < 0 ? 'profit-negative' : 'profit-neutral';
        let profitPercent = 0;
        if (sell > 0) {
            profitPercent = ((sell - buy) / sell) * 100;
        } else if (profit > 0 && buy === 0) {
            profitPercent = 100;        
        }
        profitDisplay = `${profitPercent.toFixed(1)}%`;
    }


    // --- MODERN CARD STRUCTURE ---
    const card = document.createElement("div");
    card.className = "modern-product-card";
    
    // 🆕 NEW: Add dataset for filtering. 
    // We add the business name in lowercase for easy filtering later.
    card.dataset.businessName = businessName.toLowerCase(); 
    
    // Add dataset attributes ONLY if in Admin View (required for live updates)
    if (IS_ADMIN_VIEW) {
        card.dataset.rowId = rowId;
        card.dataset.quantity = quantity;
    }

    // 1. Thumbnail Area
    const thumbWrapper = document.createElement("div");
    thumbWrapper.className = "card-thumb-wrapper";

    const thumbContent = thumbUrl
        ? `<img src="${thumbUrl}" alt="Product Image" class="product-image"/>`
        : `<div class="placeholder-image">🖼️ No Image</div>`;
    thumbWrapper.innerHTML = thumbContent;

    // Quantity Badge 
    const quantityBadge = document.createElement("div");
    const lowStockClass = quantity < 5 ? 'low-stock' : '';
    quantityBadge.className = `quantity-badge ${lowStockClass}`;
    
    if (IS_ADMIN_VIEW) {
        quantityBadge.dataset.quantityDisplay = "true";
    }

    quantityBadge.innerHTML = `<span class="icon">📦</span> ${quantity} in Stock`;

    thumbWrapper.appendChild(quantityBadge);
    card.appendChild(thumbWrapper);

    // 2. Info Area
    const info = document.createElement("div");
    info.className = "card-info";

    // Business & Category display (Customer View) or just Name (Admin View)
    if (!IS_ADMIN_VIEW) {
        info.innerHTML += `<div class="product-business">${escapeHtml(businessName)}</div>`;
        info.innerHTML += `<div class="product-category">${escapeHtml(category)}</div>`;
    }

    // Name
    info.innerHTML += `<h4 class="product-name">${escapeHtml(name)}</h4>`;
    
    // --- NEW: DESCRIPTION AND DETAILS (Customer View Only) ---
    if (!IS_ADMIN_VIEW) {
        if (description) {
            info.innerHTML += `<p class="product-description">${escapeHtml(description)}</p>`;
        }
        if (details) {
            info.innerHTML += `<p class="product-details"><strong>Details:</strong> ${escapeHtml(details)}</p>`;
        }
    }
    // ---------------------------------------------------------

    // Prices Grid - Render SELL PRICE in both, but only BUY PRICE in Admin
    info.innerHTML += `
        <div class="price-grid">
            ${IS_ADMIN_VIEW ? 
                `<div class="price-item">
                    <span class="label">Cost Price:</span>
                    <span class="value buy-price">${CURRENCY_SYMBOL}${formatNumberWithCommas(buy)}</span>
                </div>` : ''
            }
            <div class="price-item">
                <span class="label">Sell Price:</span>
                <span class="value sell-price">${CURRENCY_SYMBOL}${formatNumberWithCommas(sell)}</span>
            </div>
        </div>
    `;
    
    // Profit Margin - ONLY in Admin View
    if (IS_ADMIN_VIEW) {
        info.innerHTML += `
            <div class="profit-margin ${profitClass}">
                <span class="label">Est. Profit Margin:</span>
                <span class="value">${profitDisplay}</span>
            </div>
        `;

        // 3. Update Button - ONLY in Admin View
        const updateBtn = document.createElement("button");
        updateBtn.className = "btn-black update-product-btn";
        updateBtn.textContent = "Update Stock";
        
        // Add event listener to open the update dialog
        updateBtn.addEventListener("click", () => {
            openUpdateDialog(r);
        });

        info.appendChild(updateBtn);
    }
    
    card.appendChild(info);
    
    return card;
}

// 🆕 NEW: Function to render the products to the DOM, accepting a filtered list
function renderProductsToDOM(productsToRender) {
    productsContainer.innerHTML = "";

    if (!Array.isArray(productsToRender) || productsToRender.length === 0) {
        productsContainer.innerHTML = '<div class="hint">No products found matching the filter criteria.</div>';
        return;
    }

    // --- Grouping Logic Implementation ---
    // Group by Business Name
    const groupedByBusiness = productsToRender.reduce((acc, product) => {
        const business = product.businessName || "Unassigned Business";
        const category = product.category || "Unassigned Category";

        if (!acc[business]) {
            acc[business] = {
                latestProduct: product, // Assuming the first product encountered is the 'latest'
                categories: new Set(),
                productsByCategory: {}
            };
        }

        acc[business].categories.add(category);

        if (!acc[business].productsByCategory[category]) {
            acc[business].productsByCategory[category] = [];
        }

        acc[business].productsByCategory[category].push(product);
        return acc;
    }, {});

    // Render the grouped products
    for (const businessName in groupedByBusiness) {
        const groupData = groupedByBusiness[businessName];
        const allCategoryNames = Array.from(groupData.categories);

        // ** 1. Create the main wrapper for the business group (This will be the collapsible container) **
        const businessGroupContainer = document.createElement('div');
        businessGroupContainer.className = 'business-group-container';

        // ** 2. Create the business card header (Image, Name, Categories, Button) **
        const businessHeaderCard = createBusinessCardHeader(businessName, allCategoryNames, groupData.latestProduct);
        businessGroupContainer.appendChild(businessHeaderCard);

        // ** 3. Create the container for the individual product cards **
        const productCardDisplayArea = document.createElement('div');
        productCardDisplayArea.className = 'product-card-display-area'; // Container to be shown/hidden

        for (const categoryName in groupData.productsByCategory) {
            const products = groupData.productsByCategory[categoryName];

            // Category Header (Inside the collapsible area)
            const categoryHeader = document.createElement('h4');
            categoryHeader.className = 'category-group-header-small';
            categoryHeader.textContent = escapeHtml(categoryName);
            productCardDisplayArea.appendChild(categoryHeader);

            let productGroupWrapper = document.createElement('div');
            productGroupWrapper.className = 'product-group-wrapper';

            products.forEach((r) => {
                if (!r.rowId && r.row) r.rowId = r.row;

                // NOTE: The individual product cards now only display product-specific details, 
                // as Business Name and Categories are in the main header.
                const card = createProductCard(r);
                productGroupWrapper.appendChild(card);
            });

            productCardDisplayArea.appendChild(productGroupWrapper);
        }

        businessGroupContainer.appendChild(productCardDisplayArea);
        productsContainer.appendChild(businessGroupContainer);
    }
}
// ** 1. Global Callback Function (Handles JSONP Response) **
function handleInventoryData(json) {
    productsContainer.innerHTML = "";

    if (!Array.isArray(json.rows) || json.rows.length === 0) {
        productsContainer.innerHTML = '<div class="hint">No products returned or invalid response format.</div>';
        return;
    }
    
    // 🆕 NEW: Store the full, reversed list of products globally
    allProducts = json.rows.slice().reverse(); 
    
    // Initial render uses all products
    renderProductsToDOM(allProducts);
}

// 🆕 NEW: Filtering Logic
function filterProducts() {
    if (!businessFilterInput) return; // Exit if the filter input element doesn't exist
    
    const filterText = businessFilterInput.value.toLowerCase().trim();
    
    // If no filter text, render all products
    if (filterText === "") {
        renderProductsToDOM(allProducts);
        return;
    }
    
    // Filter the global product list by Business Name
    const filtered = allProducts.filter(product => {
        const businessName = (product.businessName || "").toLowerCase();
        // Check if the business name contains the filter text
        return businessName.includes(filterText);
    });
    
    renderProductsToDOM(filtered);
}


// ** 2. Fetch Function (Uses JSONP via Script Tag Injection) **
function fetchAndRenderProducts(){
    productsContainer.innerHTML = '<div class="hint">Loading products...</div>';
    
    const callbackName = 'handleInventoryData'; 
    const url = `${WEB_APP_URL}?action=list&callback=${callbackName}`;

    const script = document.createElement('script');
    script.src = url;
    
    script.onload = () => {
        setTimeout(() => script.remove(), 100); 
    };

    script.onerror = (err) => {
        console.error("JSONP Request Failed:", err);
        productsContainer.innerHTML = '<div class="hint">Error loading products (Failed to connect or script error). Check console.</div>';
        script.remove();
    };
    
    document.head.appendChild(script);
}

// ----------------------------------------------------------------------
// *** ADMIN VIEW (STUDIO.HTML) EVENT HANDLERS ***
// ----------------------------------------------------------------------

if (IS_ADMIN_VIEW) {
    // --- GALLERY HANDLERS ---
    
    // Render the gallery in the dialog
    function renderGallery() {
        galleryContainer.innerHTML = '';
        const links = loadSavedLinks();

        if (links.length === 0) {
            galleryContainer.innerHTML = '<div class="hint">No links saved yet.</div>';
            return;
        }

        links.forEach((linkObj, index) => {
            const thumbUrl = getThumbnailUrl(linkObj.driveLink, 200); 

            const card = document.createElement("div");
            card.className = "gallery-card";
            card.dataset.index = index;

            const thumb = document.createElement("div");
            thumb.className = "p-thumb";
            thumb.innerHTML = thumbUrl
                ? `<img src="${thumbUrl}" alt="preview" style="width:100%;height:100%;object-fit:cover"/>`
                : `<span style="font-size:12px;color:#888">No Image</span>`;

            const nameDisplay = document.createElement("p");
            nameDisplay.textContent = linkObj.name || "Unnamed Link";
            nameDisplay.style.fontWeight = 'bold';

            const useBtn = document.createElement("button");
            useBtn.className = "btn-black small";
            useBtn.textContent = "Use";
            useBtn.style.marginRight = '5px';
            useBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                useLinkFromGallery(index);
            });

            const removeBtn = document.createElement("button");
            removeBtn.className = "btn-black small";
            removeBtn.textContent = "Remove";
            removeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                removeLinkFromGallery(index);
            });

            card.appendChild(thumb);
            card.appendChild(nameDisplay);
            card.appendChild(useBtn);
            card.appendChild(removeBtn);
            galleryContainer.appendChild(card);
        });
    }
    
    // Function to populate the main form with a link from the gallery
    function useLinkFromGallery(index) {
        const links = loadSavedLinks();
        const linkObj = links[index];
        if (linkObj) {
            driveLinkInput.value = linkObj.driveLink;
            productNameInput.value = linkObj.name || "";
            
            previewBtn.click();

            linkGalleryDialog.close();
            alert(`Link for "${linkObj.name}" loaded into the Add Product form.`);
        }
    }

    // Function to remove a link from the gallery
    function removeLinkFromGallery(index) {
        if (confirm("Are you sure you want to remove this link from the gallery?")) {
            const links = loadSavedLinks();
            links.splice(index, 1);
            saveLinks(links);
            renderGallery();
        }
    }
    
    // Event Listeners for Gallery and Add Form
    previewBtn.addEventListener("click", () => {
        const link = driveLinkInput.value.trim();
        const thumbUrl = getThumbnailUrl(link, 800);

        if (!thumbUrl) {
            newThumb.innerHTML = "Invalid Drive or direct Image link (try a link ending in .jpg, .png, etc.)";
            return;
        }
        
        newThumb.innerHTML = `<img src="${thumbUrl}" alt="thumb" style="max-width:100%;max-height:100%"/>`;
    });

    saveLinkBtn.addEventListener("click", () => {
        const link = driveLinkInput.value.trim();
        const name = productNameInput.value.trim() || 'Untitled Link';
        
        if (!link || (!extractDriveId(link) && !isDirectImageUrl(link))) {
            alert("Please enter a valid Google Drive link or a direct image URL (ends in .jpg, .png, etc.).");
            return;
        }

        const links = loadSavedLinks();
        links.push({ driveLink: link, name: name });
        saveLinks(links);

        alert(`Link for "${name}" saved to gallery!`);
        
        driveLinkInput.value = "";
        newThumb.innerHTML = "Thumbnail appears";
    });

    openGalleryBtn.addEventListener("click", () => {
        renderGallery();
        linkGalleryDialog.showModal();
    });

    closeGalleryBtn.addEventListener("click", () => {
        linkGalleryDialog.close();
    });

    // --- ADD PRODUCT HANDLER ---
    addProductBtn.addEventListener("click", async () => {
        // 1. COLLECT ALL DATA FROM INPUTS FIRST
        const name = productNameInput.value.trim(); 
        const businessName = productBusinessNameInput.value.trim(); 
        const category = productCategoryInput.value.trim(); 
        // NOTE: ADD INPUTS FOR description and details to studio.html if you want to input them.
        
        const quantity = parseInt(unformatNumber(productQuantityInput.value) || "0", 10);
        const buy = parseFloat(unformatNumber(productBuyInput.value) || "0");
        const sell = parseFloat(unformatNumber(productSellInput.value) || "0");
        const link = driveLinkInput.value.trim();
        const fileId = extractDriveId(link);

        if (!name) { alert("Enter product name"); return; }
        if (!businessName) { alert("Enter business name"); return; } 
        if (!category) { alert("Enter product category"); return; } 

        
        if (!fileId && !isDirectImageUrl(link) && link.length > 0) {
            alert("Link must be a Google Drive link or a direct image URL (try a link ending in .jpg, .png, etc.)");
            return;
        }

        const uniqueId = generateUniqueId();

        // 2. CREATE THE PAYLOAD OBJECT
        const payload = {
            action: "addProduct",
            id: uniqueId,
            timestamp: new Date().toISOString(),
            name, quantity, buy, sell,
            businessName, 
            category, 
            driveLink: link,
            driveFileId: fileId || ""
            // NOTE: Add description and details fields to this payload if you add inputs in studio.html
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
                productBusinessNameInput.value = ""; 
                productCategoryInput.value = ""; 

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

    // --- UPDATE STOCK HANDLERS ---
    
    // Handler to open the update dialog
    function openUpdateDialog(product) {
        currentProductData = product;
        updateProductName.textContent = product.name;
        sellQuantityInput.value = "";
        restockQuantityInput.value = "";
        
        updateDialog.showModal();
    }

    // Handler to close the update dialog
    if (closeUpdateDialogBtn) {
        closeUpdateDialogBtn.addEventListener("click", () => {
            updateDialog.close();
        });
    }

    // Handler to execute the stock update
    if (executeUpdateButton) {
        executeUpdateButton.addEventListener("click", async () => {
            const sellAmount = parseInt(unformatNumber(sellQuantityInput.value) || "0", 10);
            const restockAmount = parseInt(unformatNumber(restockQuantityInput.value) || "0", 10);
            
            if (sellAmount === 0 && restockAmount === 0) {
                alert("Enter a quantity to sell or restock.");
                return;
            }

            const product = currentProductData;
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
                    // Use a query selector that handles either data-row-id or data-id, depending on how data is returned
                    const card = productsContainer.querySelector(`[data-row-id="${product.rowId || productId}"]`); 
                    if (card) {
                        card.dataset.quantity = newQuantity;
                        
                        const badge = card.querySelector('[data-quantity-display="true"]');
                        if (badge) {
                            const lowStockClass = newQuantity < 5 ? 'low-stock' : '';
                            badge.className = `quantity-badge ${lowStockClass}`;
                            badge.innerHTML = `<span class="icon">📦</span> ${newQuantity} in Stock`;
                        }
                    }
                    
                    // 4. Update the currentProductData object for immediate re-updates
                    currentProductData.quantity = newQuantity; 
                    
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

    // --- TOUCH HANDLER FOR MOBILE SCROLL (Kept as provided) ---
    document.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(".product-group-wrapper").forEach(row => {
            row.addEventListener("touchstart", () => {
                row.style.scrollBehavior = "auto";
            });
            row.addEventListener("touchend", () => {
                row.style.scrollBehavior = "smooth";
            });
        });
    });
}
// ----------------------------------------------------------------------

// initial load
fetchAndRenderProducts();

// 🆕 NEW: Add event listener for the filter input to enable filtering
if(businessFilterInput) {
    businessFilterInput.addEventListener('input', filterProducts);
}