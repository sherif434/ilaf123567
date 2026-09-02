// ==========================================
// إيلاف — script.js
// ==========================================

let products = [
    {
        id: 1,
        title: "زيت الأرجان المغربي الأصلي",
        price: 180,
        description: "زيت أرجان مستخلص معصور على البارد للعناية بالبشرة والشعر.",
        images: ["https://images.unsplash.com/photo-1608248597260-31216c584744?w=500"]
    }
];

let cart = [];
let orders = [
    { id: "1001", customerName: "محمد أحمد", total: 180, status: "مكتمل" }
];

let currentUploadedImages = [];
let activeChatOrderId = null;
let currentDetailProduct = null;

// تشغيل النظام فور جاهزية الصفحة
window.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    setupImageUpload();
    renderOrdersTable();
});

// التنقل بين الأقسام
function showSection(sectionId) {
    document.getElementById('shopSection').classList.add('hidden');
    document.getElementById('productDetailSection').classList.add('hidden');
    document.getElementById('ownerSection').classList.add('hidden');

    if (sectionId === 'shop') document.getElementById('shopSection').classList.remove('hidden');
    if (sectionId === 'owner') document.getElementById('ownerSection').classList.remove('hidden');
}

// عرض المنتجات في المتجر
function renderProducts() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    grid.innerHTML = products.map(p => `
        <div class="product-card" onclick="openProductDetail(${p.id})">
            <img src="${p.images[0]}" alt="${p.title}">
            <h3 class="mt-2">${p.title}</h3>
            <p class="mt-2" style="color: var(--primary-color); font-weight:bold;">${p.price} ر.س</p>
        </div>
    `).join('');
}

// فتح تفاصيل المنتج
function openProductDetail(id) {
    currentDetailProduct = products.find(p => p.id === id);
    if (!currentDetailProduct) return;

    document.getElementById('detailTitle').innerText = currentDetailProduct.title;
    document.getElementById('detailPrice').innerText = `${currentDetailProduct.price} ر.س`;
    document.getElementById('detailDescription').innerText = currentDetailProduct.description;
    
    const mainImg = document.getElementById('detailMainImage');
    mainImg.src = currentDetailProduct.images[0];

    const thumbsContainer = document.getElementById('detailThumbnails');
    thumbsContainer.innerHTML = currentDetailProduct.images.map((img, index) => `
        <img src="${img}" class="thumb-img ${index === 0 ? 'active' : ''}" onclick="changeDetailMainImage('${img}', this)">
    `).join('');

    showSection('detail');
    document.getElementById('productDetailSection').classList.remove('hidden');
}

function changeDetailMainImage(src, element) {
    document.getElementById('detailMainImage').src = src;
    document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
}

// تجهيز رفع الصور
function setupImageUpload() {
    const input = document.getElementById('productImagesInput');
    if (!input) return;
    
    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentUploadedImages.push(event.target.result);
                renderGalleryPreview();
            };
            reader.readAsDataURL(file);
        });
    });
}

function renderGalleryPreview() {
    const preview = document.getElementById('galleryPreview');
    if (!preview) return;
    preview.innerHTML = currentUploadedImages.map((src, index) => `
        <div class="preview-thumb-card">
            <img src="${src}">
            <button type="button" class="remove-img-btn" onclick="removeImage(${index})">&times;</button>
        </div>
    `).join('');
}

function removeImage(index) {
    currentUploadedImages.splice(index, 1);
    renderGalleryPreview();
}

// إضافة منتج جديد
function handleAddProduct(e) {
    e.preventDefault();
    if (currentUploadedImages.length === 0) {
        alert("يرجى رفع صورة واحدة على الأقل للمنتج!");
        return;
    }

    const newProduct = {
        id: Date.now(),
        title: document.getElementById('prodTitle').value,
        price: parseFloat(document.getElementById('prodPrice').value),
        description: document.getElementById('prodDesc').value,
        images: [...currentUploadedImages]
    };

    products.push(newProduct);
    renderProducts();
    
    document.getElementById('addProductForm').reset();
    currentUploadedImages = [];
    renderGalleryPreview();
    alert("تمت إضافة المنتج بنجاح!");
}

// السلة
function toggleCartDrawer() {
    document.getElementById('cartDrawer').classList.toggle('hidden');
}

function addToCartFromDetail() {
    if (currentDetailProduct) {
        cart.push(currentDetailProduct);
        document.getElementById('cartCount').innerText = cart.length;
        renderCart();
        toggleCartDrawer();
    }
}

function renderCart() {
    const container = document.getElementById('cartItemsContainer');
    let total = 0;
    container.innerHTML = cart.map(item => {
        total += item.price;
        return `<div class="mb-3"><strong>${item.title}</strong> — ${item.price} ر.س</div>`;
    }).join('');
    document.getElementById('cartTotal').innerText = `${total} ر.س`;
}

function checkout() {
    if (cart.length === 0) return alert("السلة فارغة!");
    const orderId = Math.floor(1000 + Math.random() * 9000).toString();
    const totalCost = cart.reduce((sum, item) => sum + item.price, 0);
    
    orders.push({ id: orderId, customerName: "عميل جديد", total: totalCost, status: "قيد الانتظار" });
    cart = [];
    document.getElementById('cartCount').innerText = 0;
    renderCart();
    toggleCartDrawer();
    renderOrdersTable();
    alert(`تم إنشاء الطلب بنجاح! رقم الطلب: #${orderId}`);
}

// إدارة لوحة التحكم
function switchOwnerTab(tab) {
    document.getElementById('ownerProductsTab').classList.toggle('hidden', tab !== 'products');
    document.getElementById('ownerOrdersTab').classList.toggle('hidden', tab !== 'orders');
}

function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.customerName}</td>
            <td>${o.total} ر.س</td>
            <td>${o.status}</td>
            <td>
                <button class="btn-chat-owner" onclick="openOwnerChat('${o.id}', '${o.customerName}')">💬 مراسلة العميل</button>
            </td>
        </tr>
    `).join('');
}

// المراسلة والشات
function openOwnerChat(orderId, customerName) {
    activeChatOrderId = orderId;
    document.getElementById('chatCustomerName').innerText = customerName;
    document.getElementById('chatOrderId').innerText = `طلب #${orderId}`;
    document.getElementById('chatModal').classList.remove('hidden');
    loadChatMessages();
}

function closeChatModal() {
    document.getElementById('chatModal').classList.add('hidden');
}

function loadChatMessages() {
    const container = document.getElementById('chatMessagesContainer');
    const messages = JSON.parse(localStorage.getItem(`chat_${activeChatOrderId}`)) || [
        { sender: 'customer', text: 'مرحباً، أريد الاستفسار عن موعد توصيل الطلب.' }
    ];

    container.innerHTML = messages.map(m => `
        <div class="chat-bubble ${m.sender === 'owner' ? 'owner-message' : 'customer-message'}">
            ${m.text}
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

function sendOwnerMessage() {
    const input = document.getElementById('chatInputText');
    const text = input.value.trim();
    if (!text || !activeChatOrderId) return;

    const messages = JSON.parse(localStorage.getItem(`chat_${activeChatOrderId}`)) || [];
    messages.push({ sender: 'owner', text: text });
    localStorage.setItem(`chat_${activeChatOrderId}`, JSON.stringify(messages));

    input.value = '';
    loadChatMessages();
}

function handleChatKeyPress(e) {
    if (e.key === 'Enter') sendOwnerMessage();
}

function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}