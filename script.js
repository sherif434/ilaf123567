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

// ==========================================
// نظام الملاك والصلاحيات
// ==========================================
const PERMISSIONS = [
    { key: 'manage_products',     label: 'إضافة وتعديل المنتجات', desc: 'إنشاء منتجات جديدة ورفع صورها' },
    { key: 'delete_products',     label: 'حذف المنتجات',          desc: 'إزالة أي منتج من المتجر' },
    { key: 'view_orders',         label: 'عرض الطلبات',           desc: 'الاطلاع على جدول الطلبات والعملاء' },
    { key: 'update_order_status', label: 'تغيير حالة الطلب',      desc: 'تحديث حالة الطلب (تجهيز، شحن، مكتمل)' },
    { key: 'chat_customers',      label: 'مراسلة العملاء',        desc: 'فتح المحادثات والرد على العملاء' },
    { key: 'manage_owners',       label: 'إدارة الملاك',          desc: 'إضافة ملاك جدد وتعديل صلاحياتهم' }
];

const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

const ROLE_PRESETS = {
    'مالك رئيسي':    ALL_PERMISSION_KEYS,
    'مدير':          ['manage_products', 'delete_products', 'view_orders', 'update_order_status', 'chat_customers'],
    'مسؤول منتجات':  ['manage_products', 'delete_products'],
    'موظف مبيعات':   ['view_orders', 'update_order_status', 'chat_customers'],
    'خدمة عملاء':    ['view_orders', 'chat_customers'],
    'مخصص':          []
};

const ORDER_STATUSES = ['قيد الانتظار', 'قيد التجهيز', 'تم الشحن', 'مكتمل', 'ملغي'];

const DEFAULT_OWNERS = [{
    id: 'own-1',
    name: 'المالك الرئيسي',
    email: 'owner@ilaf.com',
    password: '123456',
    role: 'مالك رئيسي',
    permissions: [...ALL_PERMISSION_KEYS],
    active: true,
    isSuper: true
}];

let owners = loadOwners();
let currentOwnerId = localStorage.getItem('ilaf_current_owner') || owners[0].id;
let editingOwnerId = null;

function loadOwners() {
    try {
        const saved = JSON.parse(localStorage.getItem('ilaf_owners'));
        if (Array.isArray(saved) && saved.length) return saved;
    } catch (e) { /* تجاهل البيانات التالفة */ }
    return JSON.parse(JSON.stringify(DEFAULT_OWNERS));
}

function saveOwners() {
    localStorage.setItem('ilaf_owners', JSON.stringify(owners));
    localStorage.setItem('ilaf_current_owner', currentOwnerId);
}

function getCurrentOwner() {
    return owners.find(o => o.id === currentOwnerId) || owners[0];
}

// التحقق من الصلاحية
function hasPermission(key) {
    const me = getCurrentOwner();
    if (!me || !me.active) return false;
    if (me.isSuper) return true;
    return (me.permissions || []).includes(key);
}

function requirePermission(key, message) {
    if (hasPermission(key)) return true;
    alert(message || '🔒 لا تملك صلاحية تنفيذ هذا الإجراء.');
    return false;
}

// تشغيل النظام فور جاهزية الصفحة
window.addEventListener('DOMContentLoaded', () => {
    renderProducts();
    setupImageUpload();
    renderOwnerSwitcher();
    renderOwnersTable();
    renderOwnerProductsTable();
    renderOrdersTable();
    applyPermissions();
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
    if (!requirePermission('manage_products', '🔒 لا تملك صلاحية إضافة المنتجات.')) return;
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
    renderOwnerProductsTable();

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
    const tabPerms = { products: 'manage_products', orders: 'view_orders', owners: 'manage_owners' };
    if (!hasPermission(tabPerms[tab])) {
        alert('🔒 لا تملك صلاحية الدخول إلى هذا القسم.');
        return;
    }

    document.getElementById('ownerProductsTab').classList.toggle('hidden', tab !== 'products');
    document.getElementById('ownerOrdersTab').classList.toggle('hidden', tab !== 'orders');
    document.getElementById('ownerOwnersTab').classList.toggle('hidden', tab !== 'owners');

    document.getElementById('tabBtnProducts').classList.toggle('active', tab === 'products');
    document.getElementById('tabBtnOrders').classList.toggle('active', tab === 'orders');
    document.getElementById('tabBtnOwners').classList.toggle('active', tab === 'owners');
}

function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;

    if (!orders.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-row">لا توجد طلبات بعد.</td></tr>`;
        return;
    }

    const canChat = hasPermission('chat_customers');
    const canUpdate = hasPermission('update_order_status');

    tbody.innerHTML = orders.map(o => `
        <tr>
            <td>#${o.id}</td>
            <td>${o.customerName}</td>
            <td>${o.total} ر.س</td>
            <td>
                ${canUpdate
                    ? `<select class="status-select" onchange="updateOrderStatus('${o.id}', this.value)">
                          ${ORDER_STATUSES.map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}
                       </select>`
                    : `<span class="perm-chip on">${o.status}</span>`}
            </td>
            <td>
                ${canChat
                    ? `<button class="btn-chat-owner" onclick="openOwnerChat('${o.id}', '${o.customerName}')">💬 مراسلة العميل</button>`
                    : `<span class="perm-chip">🔒 لا تملك صلاحية المراسلة</span>`}
            </td>
        </tr>
    `).join('');
}

function updateOrderStatus(orderId, status) {
    if (!requirePermission('update_order_status')) return renderOrdersTable();
    const order = orders.find(o => o.id === orderId);
    if (order) order.status = status;
}

// جدول المنتجات في لوحة التحكم
function renderOwnerProductsTable() {
    const tbody = document.getElementById('ownerProductsTableBody');
    if (!tbody) return;

    if (!products.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="empty-row">لا توجد منتجات بعد.</td></tr>`;
        return;
    }

    const canDelete = hasPermission('delete_products');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td><img class="table-thumb" src="${p.images[0]}" alt="${p.title}"></td>
            <td>${p.title}</td>
            <td>${p.price} ر.س</td>
            <td>
                ${canDelete
                    ? `<button class="mini-btn danger" onclick="deleteProduct(${p.id})">🗑️ حذف</button>`
                    : `<span class="perm-chip">🔒 لا تملك صلاحية الحذف</span>`}
            </td>
        </tr>
    `).join('');
}

function deleteProduct(id) {
    if (!requirePermission('delete_products', '🔒 لا تملك صلاحية حذف المنتجات.')) return;
    if (!confirm('هل تريد حذف هذا المنتج نهائيًا؟')) return;
    products = products.filter(p => p.id !== id);
    renderProducts();
    renderOwnerProductsTable();
}

// المراسلة والشات
function openOwnerChat(orderId, customerName) {
    if (!requirePermission('chat_customers', '🔒 لا تملك صلاحية مراسلة العملاء.')) return;
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
// ==========================================
// واجهة إدارة الملاك والصلاحيات
// ==========================================

// تطبيق الصلاحيات على واجهة لوحة التحكم
function applyPermissions() {
    const me = getCurrentOwner();
    if (!me) return;

    // شريط الحساب الحالي
    document.getElementById('currentOwnerAvatar').textContent = me.name.trim().charAt(0);
    document.getElementById('currentOwnerName').textContent = me.name;
    document.getElementById('currentOwnerPerms').innerHTML =
        `<span class="role-badge ${me.isSuper ? 'super' : ''}">${me.role}</span>` +
        (me.active ? '' : ' <span class="status-pill inactive">موقوف</span>') +
        PERMISSIONS.filter(p => hasPermission(p.key)).map(p => `<span class="perm-chip on">${p.label}</span>`).join('');

    // إظهار/إخفاء التبويبات حسب الصلاحية
    const tabMap = {
        tabBtnProducts: 'manage_products',
        tabBtnOrders: 'view_orders',
        tabBtnOwners: 'manage_owners'
    };
    let firstAllowed = null;
    Object.keys(tabMap).forEach(btnId => {
        const allowed = hasPermission(tabMap[btnId]);
        document.getElementById(btnId).classList.toggle('hidden', !allowed);
        if (allowed && !firstAllowed) firstAllowed = btnId;
    });

    // إخفاء نموذج إضافة منتج لمن لا يملك الصلاحية
    const addForm = document.getElementById('addProductForm');
    if (addForm) addForm.closest('.auth-modal-card').classList.toggle('hidden', !hasPermission('manage_products'));

    // فتح أول تبويب مسموح به
    document.getElementById('ownerProductsTab').classList.add('hidden');
    document.getElementById('ownerOrdersTab').classList.add('hidden');
    document.getElementById('ownerOwnersTab').classList.add('hidden');

    const noAccess = document.getElementById('noAccessBox');
    if (!firstAllowed) {
        noAccess.classList.remove('hidden');
    } else {
        noAccess.classList.add('hidden');
        const tabName = { tabBtnProducts: 'products', tabBtnOrders: 'orders', tabBtnOwners: 'owners' }[firstAllowed];
        switchOwnerTab(tabName);
    }

    renderOwnerProductsTable();
    renderOrdersTable();
}

// قائمة تبديل الحساب (لتجربة الصلاحيات)
function renderOwnerSwitcher() {
    const select = document.getElementById('ownerSwitcher');
    if (!select) return;
    select.innerHTML = owners.map(o =>
        `<option value="${o.id}" ${o.id === currentOwnerId ? 'selected' : ''}>${o.name} — ${o.role}${o.active ? '' : ' (موقوف)'}</option>`
    ).join('');
}

function switchCurrentOwner(id) {
    currentOwnerId = id;
    saveOwners();
    applyPermissions();
    renderOwnersTable();
}

// جدول الملاك
function renderOwnersTable() {
    const tbody = document.getElementById('ownersTableBody');
    if (!tbody) return;

    tbody.innerHTML = owners.map(o => {
        const perms = o.isSuper ? ALL_PERMISSION_KEYS : (o.permissions || []);
        const chips = perms.length
            ? PERMISSIONS.filter(p => perms.includes(p.key)).map(p => `<span class="perm-chip on">${p.label}</span>`).join('')
            : '<span class="perm-chip">بدون صلاحيات</span>';

        return `
        <tr>
            <td>
                <div class="owner-cell">
                    <span class="cu-avatar">${o.name.trim().charAt(0)}</span>
                    <div>
                        <strong>${o.name}</strong>
                        ${o.id === currentOwnerId ? '<div class="muted-text">(الحساب الحالي)</div>' : ''}
                    </div>
                </div>
            </td>
            <td>${o.email}</td>
            <td><span class="role-badge ${o.isSuper ? 'super' : ''}">${o.role}</span></td>
            <td style="max-width:280px;">${chips}</td>
            <td><span class="status-pill ${o.active ? 'active' : 'inactive'}">${o.active ? 'مفعّل' : 'موقوف'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="mini-btn" onclick="openOwnerModal('${o.id}')">✏️ الصلاحيات</button>
                    ${o.isSuper ? '' : `
                        <button class="mini-btn warn" onclick="toggleOwnerActive('${o.id}')">${o.active ? '⏸️ إيقاف' : '▶️ تفعيل'}</button>
                        <button class="mini-btn danger" onclick="deleteOwner('${o.id}')">🗑️ حذف</button>
                    `}
                </div>
            </td>
        </tr>`;
    }).join('');
}

// نافذة إضافة / تعديل مالك
function openOwnerModal(id = null) {
    if (!requirePermission('manage_owners', '🔒 لا تملك صلاحية إدارة الملاك.')) return;

    editingOwnerId = id;
    const owner = id ? owners.find(o => o.id === id) : null;

    document.getElementById('ownerModalTitle').textContent = owner ? `تعديل صلاحيات: ${owner.name}` : 'إضافة مالك جديد';
    document.getElementById('ownerName').value = owner ? owner.name : '';
    document.getElementById('ownerEmail').value = owner ? owner.email : '';
    document.getElementById('ownerPassword').value = '';
    document.getElementById('ownerPassword').placeholder = owner ? 'اتركها فارغة لعدم التغيير' : 'كلمة مرور الدخول';
    document.getElementById('ownerActive').checked = owner ? owner.active : true;

    // قائمة الأدوار
    const roleSelect = document.getElementById('ownerRole');
    roleSelect.innerHTML = Object.keys(ROLE_PRESETS).map(r =>
        `<option value="${r}" ${owner && owner.role === r ? 'selected' : ''}>${r}</option>`
    ).join('');
    if (!owner) roleSelect.value = 'موظف مبيعات';

    renderPermissionCheckboxes(owner ? (owner.permissions || []) : ROLE_PRESETS[roleSelect.value]);
    document.getElementById('ownerFormModal').classList.remove('hidden');
}

function closeOwnerModal() {
    document.getElementById('ownerFormModal').classList.add('hidden');
    editingOwnerId = null;
}

function renderPermissionCheckboxes(selected = []) {
    document.getElementById('permissionsGrid').innerHTML = PERMISSIONS.map(p => `
        <label class="perm-item">
            <input type="checkbox" class="perm-check" value="${p.key}" ${selected.includes(p.key) ? 'checked' : ''} onchange="markCustomRole()">
            <span>
                <span class="perm-title">${p.label}</span>
                <span class="perm-desc">${p.desc}</span>
            </span>
        </label>
    `).join('');
}

function applyRolePreset(role) {
    if (role === 'مخصص') return;
    renderPermissionCheckboxes(ROLE_PRESETS[role] || []);
}

function markCustomRole() {
    const selected = getSelectedPermissions().sort().join(',');
    const roleSelect = document.getElementById('ownerRole');
    const match = Object.keys(ROLE_PRESETS).find(r => [...ROLE_PRESETS[r]].sort().join(',') === selected);
    roleSelect.value = match || 'مخصص';
}

function toggleAllPermissions(state) {
    document.querySelectorAll('.perm-check').forEach(cb => cb.checked = state);
    markCustomRole();
}

function getSelectedPermissions() {
    return Array.from(document.querySelectorAll('.perm-check:checked')).map(cb => cb.value);
}

// حفظ المالك (إضافة أو تعديل)
function handleSaveOwner(e) {
    e.preventDefault();
    if (!requirePermission('manage_owners')) return;

    const name = document.getElementById('ownerName').value.trim();
    const email = document.getElementById('ownerEmail').value.trim().toLowerCase();
    const password = document.getElementById('ownerPassword').value;
    const role = document.getElementById('ownerRole').value;
    const active = document.getElementById('ownerActive').checked;
    const permissions = getSelectedPermissions();

    // منع تكرار البريد الإلكتروني
    if (owners.some(o => o.email.toLowerCase() === email && o.id !== editingOwnerId)) {
        alert('⚠️ هذا البريد الإلكتروني مستخدم بالفعل لمالك آخر.');
        return;
    }

    if (editingOwnerId) {
        const owner = owners.find(o => o.id === editingOwnerId);
        if (owner.isSuper && (!active || permissions.length < ALL_PERMISSION_KEYS.length)) {
            alert('⚠️ لا يمكن إنقاص صلاحيات المالك الرئيسي أو إيقاف حسابه.');
            return;
        }
        Object.assign(owner, { name, email, role, active, permissions });
        if (password) owner.password = password;
        alert('✅ تم تحديث بيانات وصلاحيات المالك.');
    } else {
        if (!password) {
            alert('⚠️ من فضلك أدخل كلمة مرور للمالك الجديد.');
            return;
        }
        owners.push({
            id: 'own-' + Date.now(),
            name, email, password, role, active, permissions,
            isSuper: false
        });
        alert(`✅ تمت إضافة المالك "${name}" بنجاح بصلاحيات ${permissions.length} عنصر.`);
    }

    saveOwners();
    closeOwnerModal();
    renderOwnersTable();
    renderOwnerSwitcher();
    applyPermissions();
}

function toggleOwnerActive(id) {
    if (!requirePermission('manage_owners')) return;
    const owner = owners.find(o => o.id === id);
    if (!owner || owner.isSuper) return;
    owner.active = !owner.active;
    saveOwners();
    renderOwnersTable();
    renderOwnerSwitcher();
    if (id === currentOwnerId) applyPermissions();
}

function deleteOwner(id) {
    if (!requirePermission('manage_owners')) return;
    const owner = owners.find(o => o.id === id);
    if (!owner || owner.isSuper) return alert('⚠️ لا يمكن حذف المالك الرئيسي.');
    if (id === currentOwnerId) return alert('⚠️ لا يمكنك حذف الحساب الذي تستخدمه حاليًا.');
    if (!confirm(`هل تريد حذف المالك "${owner.name}" نهائيًا؟`)) return;

    owners = owners.filter(o => o.id !== id);
    saveOwners();
    renderOwnersTable();
    renderOwnerSwitcher();
}
