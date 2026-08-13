document.addEventListener('DOMContentLoaded', () => {
    /* --- SHARED DATA: PRODUCT DATABASE --- */
    const products = [
        { id: 'legacy', name: 'Velirra Legacy', inspiration: 'Azzaro The Most Wanted', price: 2399, image: 'legacy_new.jpeg', url: 'product-legacy.html', gender: 'Men', notes: 'Cardamom, Ginger, Lemon' },
        { id: 'classic', name: 'Velirra Classic', inspiration: 'Dolce & Gabbana Pour Homme', price: 1699, image: 'classic_new.jpeg', url: 'product-classic.html', gender: 'Men', notes: 'Citrus, Herbs, Tobacco' },
        { id: '7one', name: 'Velirra 7ONE', inspiration: 'Invictus Legend', price: 1699, image: '7one_new.jpeg', url: 'product-7one.html', gender: 'Unisex', notes: 'Sea Salt, Grapefruit, Amber Wood' },
        { id: 'bloom', name: 'Velirra Bloom', inspiration: 'VS Bombshell', price: 1499, image: 'bloom_new.jpeg', url: 'product-bloom.html', gender: 'Women', notes: 'Passionfruit, Peony, Musk' },
        { id: 'legendary', name: 'Velirra Legendary', inspiration: '1 Million Lucky', price: 1999, image: 'legendary_new.jpeg', url: 'product-legendary.html', gender: 'Unisex', notes: 'Plum, Hazelnut, Amber' },
        { id: 'intense', name: 'Velirra Intense', inspiration: 'Tom Ford Tuscan Leather', price: 2099, image: 'intense_new.jpeg', url: 'product-intense.html', gender: 'Unisex', notes: 'Raspberry, Leather, Amber' },
        { id: 'ocean', name: 'Velirra Ocean', inspiration: 'Davidoff Cool Water', price: 1699, image: 'ocean_new.jpeg', url: 'product-ocean.html', gender: 'Women', notes: 'Mint, Sea Water, Lavender' },
        { id: 'prime', name: 'Velirra Prime', inspiration: 'Bleu de Chanel', price: 1899, image: 'prime_new.jpeg', url: 'product-prime.html', gender: 'Men', notes: 'Citrus, Spices, Siky Notes' },
        { id: 'blue', name: 'Velirra Blue', inspiration: 'Light Blue D&G', price: 1899, image: 'Blue.jpeg', url: 'product-blue.html', gender: 'Women', notes: 'Mandarin, Grapefruit, Juniper' },
        { id: 'homme', name: 'Velirra Homme', inspiration: 'Dior Homme Intense', price: 1899, image: 'Homme.jpeg', url: 'product-homme.html', gender: 'Men', notes: 'Lavender, Iris, Cedar' },
        { id: 'auraoud', name: 'Velirra Aura Oud', inspiration: 'Ameer Al Oud', price: 2160, image: 'Aura_OUD.jpeg', url: 'product-auraoud.html', gender: 'Unisex', notes: 'Wood Notes, Agarwood, Vanilla, Sugar, Sandalwood, Herbal Notes' },
        { id: 'sig-noir', name: 'Velirra Signature Noir', inspiration: 'Original Signature', price: 3780, image: 'noir.jpeg', url: 'signature.html', gender: 'Unisex', notes: 'Oud Wood, Incense, Benzoin, Raspberry, Amberwood' }
    ];

    /* --- HERO SLIDER --- */
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
        let currentSlide = 0;
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 1500);
    }

    /* --- SEARCH SYSTEM --- */
    const searchTrigger = document.querySelector('.search-trigger');
    const searchOverlay = document.querySelector('.search-overlay');
    const closeSearch = document.querySelector('.close-search');
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');

    if (searchTrigger) {
        searchTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            searchOverlay.classList.add('active');
            setTimeout(() => searchInput.focus(), 300);
        });
    }

    if (closeSearch) {
        closeSearch.addEventListener('click', () => searchOverlay.classList.remove('active'));
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            if (query.length < 2) {
                searchResults.innerHTML = '';
                return;
            }

            const matches = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.inspiration.toLowerCase().includes(query) ||
                p.notes.toLowerCase().includes(query)
            );

            searchResults.innerHTML = matches.map(p => `
                <a href="${p.url}" class="search-result-item">
                    <img src="${p.image}" alt="${p.name}">
                    <div class="search-result-info">
                        <h4>${p.name}</h4>
                        <p>${p.inspiration}</p>
                    </div>
                </a>
            `).join('');
        });
    }

    /* --- CART SYSTEM --- */
    let cart = JSON.parse(localStorage.getItem('velirra_cart')) || [];
    let isDiscountApplied = localStorage.getItem('velirra_discount') === 'true';

    const cartTrigger = document.querySelector('.cart-trigger');
    const cartDrawer = document.querySelector('.cart-drawer');
    const closeCart = document.querySelector('.close-cart');
    const drawerOverlay = document.querySelector('.drawer-overlay');
    const cartItemsContainer = document.getElementById('cart-items-container');
    const cartSubtotal = document.getElementById('cart-subtotal');
    const cartCountBadge = document.querySelector('.cart-count');

    // Promo Elements
    const promoInput = document.getElementById('promo-input');
    const applyPromoBtn = document.getElementById('apply-promo');
    const discountRow = document.getElementById('discount-row');
    const discountAmountDisplay = document.getElementById('discount-amount');
    const deliveryRow = document.getElementById('delivery-row');

    function updateCartUI() {
        if (!cartItemsContainer) return;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<div class="empty-cart-msg">Your cart is empty</div>';
            cartSubtotal.textContent = '₨ 0';
            cartCountBadge.textContent = '0';
            if (discountRow) discountRow.style.display = 'none';
            if (deliveryRow) deliveryRow.style.display = 'none';
            isDiscountApplied = false;
            localStorage.removeItem('velirra_discount');
        } else {
            let total = 0;
            let count = 0;
            cartItemsContainer.innerHTML = cart.map((item, index) => {
                total += item.price * item.quantity;
                count += item.quantity;
                return `
                    <div class="cart-item">
                        <div class="cart-item-img"><img src="${item.image}" alt="${item.name}"></div>
                        <div class="cart-item-details">
                            <h4>${item.name}</h4>
                            <div class="cart-item-price">₨ ${item.price}</div>
                            <div class="cart-item-qty">
                                <button class="qty-control minus" data-index="${index}">-</button>
                                <span>${item.quantity}</span>
                                <button class="qty-control plus" data-index="${index}">+</button>
                            </div>
                            <button class="remove-item" data-index="${index}">Remove</button>
                        </div>
                    </div>
                `;
            }).join('');

            if (deliveryRow) deliveryRow.style.display = 'flex';

            if (isDiscountApplied) {
                const discount = total * 0.20;
                const grandTotal = total - discount + 200;
                if (discountRow) {
                    discountRow.style.display = 'flex';
                    discountAmountDisplay.textContent = `-₨ ${discount.toLocaleString()}`;
                }
                cartSubtotal.textContent = `₨ ${grandTotal.toLocaleString()}`;
            } else {
                if (discountRow) discountRow.style.display = 'none';
                cartSubtotal.textContent = `₨ ${(total + 200).toLocaleString()}`;
            }

            cartCountBadge.textContent = count;
        }
        localStorage.setItem('velirra_cart', JSON.stringify(cart));
    }

    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', () => {
            const code = promoInput.value.trim().toLowerCase();
            if (code === 'velirra12345') {
                isDiscountApplied = true;
                localStorage.setItem('velirra_discount', 'true');
                alert('Success! 20% Discount Applied.');
                updateCartUI();
            } else {
                alert('Invalid Promo Code');
            }
        });
    }

    if (cartTrigger) {
        cartTrigger.addEventListener('click', (e) => {
            e.preventDefault();
            cartDrawer.classList.add('active');
            drawerOverlay.classList.add('active');
        });
    }

    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartDrawer.classList.remove('active');
            drawerOverlay.classList.remove('active');
        });
    }

    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', () => {
            cartDrawer.classList.remove('active');
            drawerOverlay.classList.remove('active');
        });
    }

    // Add to Cart Logic (on Product Detail Pages)
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', () => {
            const productTitle = document.querySelector('.product-title').textContent.trim();
            const qtyInput = document.querySelector('.qty-input');
            const quantity = qtyInput ? parseInt(qtyInput.value) : 1;

            // Find product by title
            const productObj = products.find(p => productTitle.toLowerCase().includes(p.name.toLowerCase()));

            if (productObj) {
                const existingItem = cart.find(item => item.id === productObj.id);
                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    cart.push({ ...productObj, quantity });
                }
                updateCartUI();
                cartDrawer.classList.add('active');
                drawerOverlay.classList.add('active');
            }
        });
    }

    // Cart Actions (Remove/Qty)
    if (cartItemsContainer) {
        cartItemsContainer.addEventListener('click', (e) => {
            const index = e.target.getAttribute('data-index');
            if (e.target.classList.contains('remove-item')) {
                cart.splice(index, 1);
                updateCartUI();
            } else if (e.target.classList.contains('plus')) {
                cart[index].quantity++;
                updateCartUI();
            } else if (e.target.classList.contains('minus')) {
                if (cart[index].quantity > 1) {
                    cart[index].quantity--;
                    updateCartUI();
                }
            }
        });
    }

    /* --- WHATSAPP CHECKOUT --- */
    const checkoutBtn = document.querySelector('.checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const checkoutForm = document.getElementById('checkout-form');
    const closeModalBtn = document.querySelector('.close-modal');

    if (checkoutBtn && checkoutModal) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length === 0) return alert('Your cart is empty!');

            // Close cart drawer first
            cartDrawer.classList.remove('active');
            // Keep overlay active for modal

            // Open delivery details modal
            checkoutModal.classList.add('active');
        });
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', () => {
            checkoutModal.classList.remove('active');
            drawerOverlay.classList.remove('active');
        });
    }

    if (checkoutForm) {
        // Dynamically inject Full Name input field into checkout form
        if (!document.getElementById('checkout-name')) {
            const nameGroup = document.createElement('div');
            nameGroup.className = 'form-group';
            nameGroup.innerHTML = `
                <label>Full Name *</label>
                <input type="text" id="checkout-name" placeholder="e.g. Ali Khan" required>
            `;
            checkoutForm.insertBefore(nameGroup, checkoutForm.firstChild);
        }

        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const confirmBtn = checkoutForm.querySelector('.confirm-order-btn');
            const originalBtnText = confirmBtn.textContent;
            confirmBtn.disabled = true;
            confirmBtn.textContent = "CONFIRMING ORDER...";

            // Get Delivery Details
            const name = document.getElementById('checkout-name') ? document.getElementById('checkout-name').value.trim() : "";
            const phone = document.getElementById('checkout-phone').value;
            const address = document.getElementById('checkout-address').value;
            const postal = document.getElementById('checkout-postal').value;
            const location = document.getElementById('checkout-location').value;

            // Generate a unique Order ID
            const orderId = "VEL-" + Math.floor(1000 + Math.random() * 9000);

            // Format Items for the Sheet
            const itemsString = cart.map(item => `${item.name} (x${item.quantity})`).join(", ");

            // Calculate Totals
            let total = 0;
            cart.forEach(item => total += item.price * item.quantity);
            let finalPrice = total + 200;
            if (isDiscountApplied) {
                finalPrice = (total * 0.80) + 200;
            }

            // --- SAVE TO GOOGLE SHEETS ---
            const scriptURL = "https://script.google.com/macros/s/AKfycbx6FBP0IFCbq-TzPNUEvhCuROsDtqYokBYYPfJCzWTORYGyx8VAvaFCftsfmF5esiipJw/exec";

            try {
                await fetch(scriptURL, {
                    method: 'POST',
                    mode: 'no-cors',
                    cache: 'no-cache',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: "add",
                        name: name,
                        orderId: orderId,
                        phone: phone,
                        address: address + (postal ? ` (Postal: ${postal})` : ""),
                        items: itemsString,
                        total: finalPrice,
                        location: location
                    })
                });

                // Show Success Message
                showOrderSuccess(orderId);

            } catch (error) {
                console.error("Error saving to sheet:", error);
                alert("Order submitted but there was a sync error. We will process it shortly.");
            } finally {
                // Reset Button
                confirmBtn.disabled = false;
                confirmBtn.textContent = originalBtnText;

                // Close modal and overlay
                checkoutModal.classList.remove('active');

                // Clear cart after order
                cart = [];
                isDiscountApplied = false;
                localStorage.removeItem('velirra_cart');
                localStorage.removeItem('velirra_discount');
                updateCartUI();
            }
        });
    }

    function showOrderSuccess(orderId) {
        // Create success modal dynamically if it doesn't exist
        let successModal = document.getElementById('success-modal');
        if (!successModal) {
            successModal = document.createElement('div');
            successModal.id = 'success-modal';
            successModal.className = 'checkout-modal';
            successModal.innerHTML = `
                <div class="modal-content text-center" style="text-align: center;">
                    <div style="font-size: 4rem; color: #2ecc71; margin-bottom: 20px;">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <h3 style="margin-bottom: 10px; letter-spacing: 2px;">ORDER PLACED!</h3>
                    <p style="color: #666; margin-bottom: 25px;">Your order <b>#${orderId}</b> has been received successfully. We will contact you shortly for confirmation.</p>
                    <button class="confirm-order-btn" onclick="document.getElementById('success-modal').classList.remove('active'); document.querySelector('.drawer-overlay').classList.remove('active');" style="background: #000; max-width: 200px; margin: 0 auto;">CONTINUE SHOPPING</button>
                </div>
            `;
            document.body.appendChild(successModal);
        } else {
            successModal.querySelector('b').textContent = `#${orderId}`;
        }

        // Show it
        successModal.classList.add('active');
        document.querySelector('.drawer-overlay').classList.add('active');
    }

    /* --- QUANTITY SELECTOR (Shared) --- */
    const minusBtn = document.querySelector('.qty-btn.minus');
    const plusBtn = document.querySelector('.qty-btn.plus');
    const qtyInput = document.querySelector('.qty-input');

    if (minusBtn && plusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
            let value = parseInt(qtyInput.value);
            if (value > 1) qtyInput.value = value - 1;
        });
        plusBtn.addEventListener('click', () => {
            let value = parseInt(qtyInput.value);
            qtyInput.value = value + 1;
        });
    }

    /* --- TESTIMONIAL CAROUSEL --- */
    const testimonialTrack = document.querySelector('.testimonial-track');
    const testimonialCards = document.querySelectorAll('.testimonial-card');
    const dots = document.querySelectorAll('.dot');
    const nextBtn = document.querySelector('.next-test');
    const prevBtn = document.querySelector('.prev-test');

    if (testimonialTrack && testimonialCards.length > 0) {
        let currentIdx = 0;
        const totalSlides = testimonialCards.length;

        function getCardsPerView() {
            if (window.innerWidth <= 768) return 1;
            if (window.innerWidth <= 1024) return 2;
            return 3;
        }

        function updateCarousel() {
            const cardsPerView = getCardsPerView();
            const cardWidth = testimonialCards[0].offsetWidth + 30; // Including gap
            testimonialTrack.style.transform = `translateX(-${currentIdx * cardWidth}px)`;

            // Update dots
            dots.forEach((dot, index) => {
                dot.classList.toggle('active', index === currentIdx);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const maxIdx = totalSlides - getCardsPerView();
                currentIdx = (currentIdx + 1) > maxIdx ? 0 : currentIdx + 1;
                updateCarousel();
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const maxIdx = totalSlides - getCardsPerView();
                currentIdx = (currentIdx - 1) < 0 ? maxIdx : currentIdx - 1;
                updateCarousel();
            });
        }

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                currentIdx = index;
                updateCarousel();
            });
        });

        // Handle Resizing
        window.addEventListener('resize', updateCarousel);
    }

    // Initial Load
    updateCartUI();

    // --- PRODUCT GALLERY SLIDER LOGIC ---
    const galleryContainers = document.querySelectorAll('.product-gallery');
    galleryContainers.forEach(gallery => {
        const images = gallery.querySelectorAll('.main-image');
        const dots = gallery.querySelectorAll('.image-dot');
        const prevBtn = gallery.querySelector('.prev');
        const nextBtn = gallery.querySelector('.next');
        let currentIndex = 0;

        if (!images.length || !prevBtn || !nextBtn) return;

        function updateGallery(index) {
            images.forEach(img => img.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));

            if (images[index]) images[index].classList.add('active');
            if (dots[index]) dots[index].classList.add('active');
            currentIndex = index;
        }

        prevBtn.addEventListener('click', (e) => {
            e.preventDefault();
            let index = currentIndex - 1;
            if (index < 0) index = images.length - 1;
            updateGallery(index);
        });

        nextBtn.addEventListener('click', (e) => {
            e.preventDefault();
            let index = currentIndex + 1;
            if (index >= images.length) index = 0;
            updateGallery(index);
        });

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => updateGallery(index));
        });
    });

    /* --- ADD TO CART: Listing Pages (product-card .add-to-cart buttons) --- */
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('.add-to-cart');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();

        // Get id from button data attribute OR from parent product-card data-id
        const card = btn.closest('[data-id]');
        const id = btn.dataset.id || (card && card.dataset.id);
        const productObj = products.find(p => p.id === id);

        if (!productObj) return;

        const existingItem = cart.find(item => item.id === productObj.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ ...productObj, quantity: 1 });
        }
        updateCartUI();

        // Open cart drawer to confirm
        if (cartDrawer) cartDrawer.classList.add('active');
        if (drawerOverlay) drawerOverlay.classList.add('active');

        // Brief button feedback
        const original = btn.textContent;
        btn.textContent = '✓ Added';
        btn.style.background = '#16a34a';
        btn.style.color = '#fff';
        setTimeout(() => {
            btn.textContent = original;
            btn.style.background = '';
            btn.style.color = '';
        }, 1200);
    });

});
