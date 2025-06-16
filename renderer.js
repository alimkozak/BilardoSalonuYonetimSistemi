// renderer.js - İyileştirilmiş Bilardo Salonu Yönetim Sistemi

const { ipcRenderer } = require('electron');

// DOM elementleri
document.addEventListener('DOMContentLoaded', async () => {
    // Tema ayarlarını başlat
    initializeTheme();
    
    // Sekme navigasyonu
    const navButtons = document.querySelectorAll('nav button');
    const sections = document.querySelectorAll('section.section');

    // Modaller
    const tableModal = document.getElementById('tableModal');
    const productModal = document.getElementById('productModal');
    const billModal = document.getElementById('billModal');
    const editOrderModal = document.getElementById('editOrderModal');
    const editPlayerCountModal = document.getElementById('editPlayerCountModal');
    const customerModal = document.getElementById('customerModal');
    const tableColorModal = document.getElementById('tableColorModal');
    const backupModal = document.getElementById('backupModal');
    const startTimeModal = document.getElementById('startTimeModal');
    const numberSelectorOverlay = document.getElementById('numberSelectorOverlay');
    const reservationModal = document.getElementById('reservationModal');
    const editSaleModal = document.getElementById('editSaleModal');
    
    // Modal kapatma düğmeleri
    const closeButtons = document.querySelectorAll('.close');
    
    // Form referansları
    const modalOrderForm = document.getElementById('modalOrderForm');
    const productForm = document.getElementById('productForm');
    const pricingForm = document.getElementById('pricingForm');
    const reservationForm = document.getElementById('reservationForm');
    const editOrderForm = document.getElementById('editOrderForm');
    const editPlayerCountForm = document.getElementById('editPlayerCountForm');
    const customerForm = document.getElementById('customerForm');
    
    // Masa başlat ve durdur butonları
    const startTableBtn = document.getElementById('startTableBtn');
    const stopTableBtn = document.getElementById('stopTableBtn');
    const refreshTableBtn = document.getElementById('refreshTableBtn');
    const editPlayerCountBtn = document.getElementById('editPlayerCountBtn');
    const editStartTimeBtn = document.getElementById('editStartTimeBtn');
    
    // Oyuncu sayısı seçici
    const playerCountSelector = document.getElementById('playerCountSelector');
    const playerButtons = document.querySelectorAll('.player-btn');
    
    // Rapor tarihi seçimi
    const reportStartDate = document.getElementById('reportStartDate');
    const reportEndDate = document.getElementById('reportEndDate');
    const loadReportBtn = document.getElementById('loadReportBtn');
    
    // Sipariş tarihi seçimi
    const orderDateSelector = document.getElementById('orderDateSelector');
    const loadOrdersBtn = document.getElementById('loadOrdersBtn');
    
    // Rapor tabları
    const reportTabButtons = document.querySelectorAll('.report-tab-btn');
    
    // Müşteri yönetimi butonları
    const addCustomerBtn = document.getElementById('addCustomerBtn');
    
    // Yedekleme modalı butonları
    const showBackupModalBtn = document.getElementById('showBackupModalBtn');
    const createBackupBtn = document.getElementById('createBackupBtn');
    const restoreBackupBtn = document.getElementById('restoreBackupBtn');
    
    // Başlangıç saati düzenleme
    const hourSelect = document.getElementById('hourSelect');
    const minuteSelect = document.getElementById('minuteSelect');
    const selectedTimeDisplay = document.getElementById('selectedTimeDisplay');
    const applyStartTimeBtn = document.getElementById('applyStartTimeBtn');
    const cancelStartTimeBtn = document.getElementById('cancelStartTimeBtn');
    
     // Adet giriş pop-up'ı
     const numberDisplay = document.getElementById('numberDisplay');
     const numberSelectorTitle = document.getElementById('numberSelectorTitle');
     const numberConfirmBtn = document.getElementById('numberConfirmBtn');
     const numberCancelBtn = document.getElementById('numberCancelBtn');
     const numberButtons = document.querySelectorAll('.number-btn');
    
    // Adet giriş butonları
    const modalQuantityBtn = document.getElementById('modalQuantityBtn');
    const productPriceBtn = document.getElementById('productPriceBtn');
    const editOrderQuantityBtn = document.getElementById('editOrderQuantityBtn');
    const editPlayerCountValueBtn = document.getElementById('editPlayerCountValueBtn');
    
    // Güncel saat gösterimi
    const currentTimeDisplay = document.getElementById('currentTime');
    
   // Global değişkenler
   let currentTableId = null;
   let settings = null;
   let tables = [];
   let products = [];
   let reservations = [];
   let customers = [];
   let selectedPlayerCount = 2; // Varsayılan olarak 2 oyuncu
   let currentOrder = null; // Düzenlenmekte olan sipariş
   let autoRefreshIntervalId = null; // Otomatik yenileme için interval ID
   let clockIntervalId = null; // Saat gösterimi için interval ID
   let currentNumberInput = null; // Aktif sayı giriş alanı
   let currentTableStartTime = null; // Masa başlangıç zamanı (düzenleme için)
   let currentCustomerId = null; // Seçilen müşteri ID
   let currentSaleId = null; // Düzenlenmekte olan satış ID
   let isReservationModalInitialized = false; // Rezervasyon modal dropdown kontrolü

    // Tema değiştirme fonksiyonu - Sadece varsayılan ve koyu tema
    function initializeTheme() {
        const themeSelector = document.getElementById('themeSelector');
        
        // Diğer temalar kaldırıldı, sadece varsayılan ve koyu tema kaldı
        if (themeSelector) {
            // Seçenek sayısını azalt
            themeSelector.innerHTML = `
                <option value="default">Varsayılan</option>
                <option value="dark">Koyu</option>
            `;
            
            const savedTheme = localStorage.getItem('selectedTheme') || 'default';
            // Eğer kaydedilmiş tema artık mevcut değilse, varsayılanı kullan
            if (savedTheme !== 'default' && savedTheme !== 'dark') {
                localStorage.setItem('selectedTheme', 'default');
                changeTheme('default');
            } else {
                changeTheme(savedTheme);
                themeSelector.value = savedTheme;
            }
            
            themeSelector.addEventListener('change', (e) => {
                changeTheme(e.target.value);
            });
        }
    }

    // Tema değiştirme fonksiyonu
    function changeTheme(themeName) {
        document.body.className = ''; // Mevcut temaları temizle
        document.body.classList.add(`theme-${themeName}`);
        localStorage.setItem('selectedTheme', themeName);
    }
     // Masa arkaplan renklerini özelleştirme fonksiyonu - Düzeltildi
     function customizeTableStyle(tableEl, table) {
        // Custom renk seçimini localStorage'dan al
        const customColors = JSON.parse(localStorage.getItem('tableCustomColors') || '{}');
        
        if (customColors[table.id]) {
            tableEl.querySelector('.table-header').style.backgroundColor = customColors[table.id];
        } else {
            // Varsayılan renkleri duruma göre ayarla
            if (table.status === 'available') {
                tableEl.querySelector('.table-header').style.backgroundColor = 'var(--available-bg)';
            } else if (table.status === 'active') {
                tableEl.querySelector('.table-header').style.backgroundColor = 'var(--active-bg)';
            } else if (table.status === 'reserved') {
                tableEl.querySelector('.table-header').style.backgroundColor = 'var(--warning-color)';
            }
        }
    }

  // Belirli tarihteki siparişleri yükle - Müşteri entegrasyonu iyileştirildi
  async function loadOrdersByDate(date) {
    const ordersList = document.getElementById('ordersList');
    if (!ordersList) return;

    try {
        // Tüm satışları al
        const sales = await ipcRenderer.invoke('get-sales-by-date', date);
        
        // Tüm siparişleri al
        const orders = await ipcRenderer.invoke('get-orders');
        
        // Tüm müşterileri al
        const allCustomers = await ipcRenderer.invoke('get-customers');
        
        // Seçilen tarihin siparişlerini filtrele
        const dateOrders = orders.filter(order => 
            order.timestamp.startsWith(date)
        );

        if (sales.length === 0 && dateOrders.length === 0) {
            ordersList.innerHTML = `<p>${formatDate(date)} tarihi için sipariş bulunmamaktadır.</p>`;
            return;
        }

        ordersList.innerHTML = '';
        
        // Satış gruplarını göster - Her masa kapanışı ayrı
        sales.forEach(sale => {
            const saleDiv = document.createElement('div');
            saleDiv.className = 'sale-group';
            
            // Müşteri bilgisini al (eğer varsa)
            const customer = allCustomers.find(c => c.id === sale.customerId);
            const customerName = customer ? customer.name : (sale.customerName || 'Müşteri');
            
            // Satış başlığı oluştur
            const hours = Math.floor(sale.duration / 60);
            const minutes = sale.duration % 60;
            
            let headerHTML = `
                <div class="sale-header">
                    <h4>Masa ${sale.tableNumber} - ${customerName}</h4>
                    <p><strong>Zaman:</strong> ${formatTime(sale.timestamp)}</p>
                    <p><strong>Masa Ücreti:</strong> ${sale.billiardFee.toFixed(2)} ₺</p>
                    <p><strong>Süre:</strong> ${hours} saat ${minutes} dakika</p>
            `;
            
            // Satışın toplam tutarları
            headerHTML += `<p><strong>Ürün Toplamı:</strong> ${sale.productTotal.toFixed(2)} ₺</p>`;
            headerHTML += `<p><strong>Genel Toplam:</strong> ${sale.totalAmount.toFixed(2)} ₺</p>`;
            
            // Satış butonları (düzenleme ve silme)
            headerHTML += `
                <div class="sale-actions">
                    <button class="edit-sale-btn btn small" data-id="${sale.id}" data-customer-id="${sale.customerId || ''}"><i class="fas fa-edit"></i> Düzenle</button>
                    <button class="delete-sale-btn btn small danger" data-id="${sale.id}"><i class="fas fa-trash"></i> Sil</button>
                </div>
            `;
            headerHTML += `</div>`;
            
            saleDiv.innerHTML = headerHTML;
            
            // Bu satışa ait siparişleri bul
            const saleOrders = dateOrders.filter(o => o.saleId === sale.id && o.productName !== 'Masa Ücreti');
            
            // Ürün siparişlerini listele
            if (saleOrders.length > 0) {
                const productsDiv = document.createElement('div');
                productsDiv.className = 'product-orders-list';
                
                saleOrders.forEach(order => {
                    const orderItem = document.createElement('div');
                    orderItem.className = 'order-item';
                    const orderTotal = order.price * order.quantity;
                    
                    orderItem.innerHTML = `
                        <div class="order-info">
                            <p><strong>${order.productName}</strong> x ${order.quantity} = ${orderTotal.toFixed(2)} ₺</p>
                        </div>
                    `;
                    
                    productsDiv.appendChild(orderItem);
                });
                
                saleDiv.appendChild(productsDiv);
            }
            
            ordersList.appendChild(saleDiv);
        });
        
        // Event listener'lar ekle
        document.querySelectorAll('.edit-sale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const saleId = Number(btn.dataset.id);
                const customerId = btn.dataset.customerId ? Number(btn.dataset.customerId) : null;
                showEditSaleModal(saleId, date, customerId);
            });
        });
        
        document.querySelectorAll('.delete-sale-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const saleId = Number(btn.dataset.id);
                if (confirm('Bu satışı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
                    deleteSale(saleId, date);
                }
            });
        });
        
        // Geçmiş tarihe ait tüm siparişleri silme butonu ekle
        if (sales.length > 0) {
            const deleteAllBtn = document.createElement('button');
            deleteAllBtn.className = 'btn danger';
            deleteAllBtn.innerHTML = '<i class="fas fa-trash"></i> Tüm Siparişleri Sil';
            deleteAllBtn.style.marginTop = '20px';
            
            deleteAllBtn.addEventListener('click', () => {
                if (confirm(`${formatDate(date)} tarihine ait tüm siparişleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
                    deleteAllOrdersByDate(date);
                }
            });
            
            ordersList.appendChild(deleteAllBtn);
        }
        
    } catch (error) {
        console.error('Siparişler yüklenirken hata oluştu:', error);
        ordersList.innerHTML = '<p>Siparişler yüklenirken bir hata oluştu.</p>';
    }
}

    // Belirli tarihteki tüm siparişleri sil
    async function deleteAllOrdersByDate(date) {
        try {
            // Önce o tarihe ait tüm satışları al
            const sales = await ipcRenderer.invoke('get-sales-by-date', date);
            
            // Her satışı tek tek sil
            for (const sale of sales) {
                await ipcRenderer.invoke('delete-sale', sale.id);
            }
            
            // Siparişleri yeniden yükle
            loadOrdersByDate(date);
            // Müşteri bilgilerini yeniden yükle 
            await loadCustomers();
            
            alert(`${formatDate(date)} tarihine ait tüm siparişler başarıyla silindi!`);
        } catch (error) {
            console.error('Siparişler silinirken hata oluştu:', error);
            alert('Siparişler silinirken bir hata oluştu!');
        }
    }
   
    // Satış düzenleme modalını göster - Müşteri entegrasyonu iyileştirildi
    async function showEditSaleModal(saleId, date, customerId) {
        currentSaleId = saleId;
        
        // Satış verilerini al
        const sales = await ipcRenderer.invoke('get-sales-by-date', date);
        const sale = sales.find(s => s.id === saleId);
        
        if (!sale) {
            alert('Satış bulunamadı!');
            return;
        }
        
        // İlişkili siparişleri al
        const orders = await ipcRenderer.invoke('get-orders');
        const saleOrders = orders.filter(o => o.saleId === saleId && o.productName !== 'Masa Ücreti');
        
        // Düzenleme modalını ayarla
        document.getElementById('editCustomerName').value = sale.customerName || 'Müşteri';
        document.getElementById('editBilliardFee').value = sale.billiardFee.toFixed(2);
        
        // Satış detaylarını göster
        document.getElementById('saleDetails').innerHTML = `
            <div class="sale-info">
                <p><strong>Masa:</strong> ${sale.tableNumber}</p>
                <p><strong>Tarih:</strong> ${formatDate(sale.timestamp)}</p>
                <p><strong>Süre:</strong> ${Math.floor(sale.duration / 60)} saat ${sale.duration % 60} dakika</p>
            </div>
        `;
        
        // Satışa ait ürünleri listele
        const productsList = document.getElementById('editSaleProductsList');
        productsList.innerHTML = '';
        
        if (saleOrders.length > 0) {
            saleOrders.forEach(order => {
                const orderItem = document.createElement('div');
                orderItem.className = 'edit-product-item';
                orderItem.innerHTML = `
                    <div class="product-edit-info">
                        <p>${order.productName} x ${order.quantity} = ${(order.price * order.quantity).toFixed(2)} ₺</p>
                    </div>
                    <div class="product-edit-actions">
                        <button class="edit-product-btn btn small" data-id="${order.id}"><i class="fas fa-edit"></i></button>
                        <button class="delete-product-btn btn small danger" data-id="${order.id}"><i class="fas fa-trash"></i></button>
                    </div>
                `;
                
                productsList.appendChild(orderItem);
            });
            
            // Ürün düzenleme ve silme butonlarını ayarla
            document.querySelectorAll('.edit-product-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const orderId = Number(btn.dataset.id);
                    const order = saleOrders.find(o => o.id === orderId);
                    if (order) {
                        showEditOrderModal(order);
                    }
                });
            });
            
            document.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const orderId = Number(btn.dataset.id);
                    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
                        await ipcRenderer.invoke('delete-order', orderId);
                        showEditSaleModal(saleId, date, customerId);
                    }
                });
            });
        } else {
            productsList.innerHTML = '<p>Bu satışta ürün bulunmamaktadır.</p>';
        }
        
        // Yeni ürün ekle butonunu ayarla
        document.getElementById('addProductToSaleBtn').onclick = () => {
            // Ürün ekleme modalı göster
            showAddProductToSaleModal(saleId, date, customerId);
        };
        
        // Satışı kaydet butonunu ayarla
        document.getElementById('saveSaleBtn').onclick = async () => {
            const customerName = document.getElementById('editCustomerName').value;
            const billiardFee = parseFloat(document.getElementById('editBilliardFee').value);
            
            if (isNaN(billiardFee) || billiardFee < 0) {
                alert('Geçerli bir masa ücreti giriniz!');
                return;
            }
            
            try {
                // Satışı güncelle
                const updatedSale = {
                    id: saleId,
                    customerName,
                    billiardFee,
                    customerId: customerId // customerId'yi de güncelle
                };
                
                await ipcRenderer.invoke('update-sale', updatedSale);
                
                // Masa ücreti siparişini güncelle
                const masaUcretiSiparisi = orders.find(o => o.saleId === saleId && o.productName === 'Masa Ücreti');
                if (masaUcretiSiparisi) {
                    await ipcRenderer.invoke('update-order', {
                        ...masaUcretiSiparisi,
                        price: billiardFee
                    });
                }
                
                // Eğer ilişkili bir müşteri varsa, toplam harcamasını güncelle
                if (customerId) {
                    // Eski verileri al
                    const oldSale = sales.find(s => s.id === saleId);
                    const priceDifference = billiardFee - oldSale.billiardFee;
                    
                    if (priceDifference !== 0) {
                        // Müşteri harcamasını güncelle
                        await ipcRenderer.invoke('update-customer-spending', {
                            customerId: customerId,
                            amount: priceDifference,
                            date: new Date().toISOString(),
                            updateSpendingOnly: true
                        });
                    }
                }
                
                // Modalı kapat ve siparişleri yenile
                document.getElementById('editSaleModal').style.display = 'none';
                loadOrdersByDate(date);
                
                // Müşterileri de yenile
                await loadCustomers();
                
                alert('Satış başarıyla güncellendi!');
            } catch (error) {
                console.error('Satış güncellenirken hata oluştu:', error);
                alert('Satış güncellenirken bir hata oluştu!');
            }
        };
        
        // İptal butonunu ayarla
        document.getElementById('cancelSaleEditBtn').onclick = () => {
            document.getElementById('editSaleModal').style.display = 'none';
        };
        
        // Modalı göster
        document.getElementById('editSaleModal').style.display = 'block';
    }

    // Satışa yeni ürün ekle modalı - Müşteri entegrasyonu iyileştirildi
    function showAddProductToSaleModal(saleId, date, customerId) {
        // Ürünleri al
        if (products.length === 0) {
            alert('Ürünler yüklenemedi. Lütfen sayfayı yenileyin ve tekrar deneyin.');
            return;
        }
        
        // Ürün seçimi form oluştur
        let productOptions = '';
        products.forEach(product => {
            productOptions += `<option value="${product.id}">${product.name} - ${product.price} ₺</option>`;
        });
        
        const productSelectionHTML = `
            <div id="addProductForm" style="margin: 15px 0;">
                <div class="form-group">
                    <label for="saleProductSelect">Ürün Seçin:</label>
                    <select id="saleProductSelect">
                        ${productOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="saleProductQuantity">Miktar:</label>
                    <input type="number" id="saleProductQuantity" min="1" value="1">
                </div>
                <button id="confirmAddProductBtn" class="btn">Ekle</button>
                <button id="cancelAddProductBtn" class="btn secondary">İptal</button>
            </div>
        `;
        
        // Formu ekle
        const productsList = document.getElementById('editSaleProductsList');
        // Form zaten varsa temizle
        const existingForm = document.getElementById('addProductForm');
        if (existingForm) {
            existingForm.remove();
        }
        productsList.insertAdjacentHTML('beforeend', productSelectionHTML);
        
        // Event listener'ları ekle
        document.getElementById('confirmAddProductBtn').addEventListener('click', async () => {
            const productId = Number(document.getElementById('saleProductSelect').value);
            const quantity = Number(document.getElementById('saleProductQuantity').value);
            
            if (quantity < 1) {
                alert('Miktar en az 1 olmalıdır.');
                return;
            }
            
            const product = products.find(p => p.id === productId);
            if (!product) {
                alert('Ürün bulunamadı!');
                return;
            }
            
            try {
                // Satış bilgilerini al
                const sales = await ipcRenderer.invoke('get-sales-by-date', date);
                const sale = sales.find(s => s.id === saleId);
                
                if (!sale) {
                    alert('Satış bulunamadı!');
                    return;
                }
                
                // Yeni sipariş ekle
                await ipcRenderer.invoke('save-order', {
                    tableId: sale.tableId,
                    tableNumber: sale.tableNumber,
                    productId,
                    productName: product.name,
                    quantity,
                    price: product.price,
                    paid: true,
                    saleId: saleId,
                    customerId: customerId // Müşteri ilişkisini koru
                });
                
                // Satışı güncelle - ürün toplamını ve genel toplamı
                const newProductTotal = sale.productTotal + (product.price * quantity);
                const newTotalAmount = sale.billiardFee + newProductTotal;
                
                await ipcRenderer.invoke('update-sale', {
                    id: saleId,
                    productTotal: newProductTotal,
                    totalAmount: newTotalAmount
                });
                
                // Eğer ilişkili bir müşteri varsa, toplam harcamasını güncelle
                if (customerId) {
                    // Müşteri harcamasını güncelle
                    await ipcRenderer.invoke('update-customer-spending', {
                        customerId: customerId,
                        amount: product.price * quantity,
                        date: new Date().toISOString(),
                        updateSpendingOnly: true
                    });
                }
                
                // Formu kaldır
                document.getElementById('addProductForm').remove();
                
                // Modalı yenile
                showEditSaleModal(saleId, date, customerId);
                
                // Müşteri listesini güncelle
                await loadCustomers();
                
            } catch (error) {
                console.error('Ürün eklenirken hata oluştu:', error);
                alert('Ürün eklenirken bir hata oluştu!');
            }
        });
        
        document.getElementById('cancelAddProductBtn').addEventListener('click', () => {
            document.getElementById('addProductForm').remove();
        });
    }

 // Satış silme - Müşteri entegrasyonu iyileştirildi
 async function deleteSale(saleId, date) {
    try {
        // Önce satış bilgilerini al
        const sales = await ipcRenderer.invoke('get-sales-by-date', date);
        const sale = sales.find(s => s.id === saleId);
        
        if (sale && sale.customerId) {
            // Müşteri harcamasını güncelle (silinen satışın tutarını çıkart)
            await ipcRenderer.invoke('update-customer-spending', {
                customerId: sale.customerId,
                amount: -sale.totalAmount, // Negatif değer olarak ekle (çıkartma işlemi)
                date: new Date().toISOString(),
                updateSpendingOnly: true
            });
        }
        
        // Satışı sil
        await ipcRenderer.invoke('delete-sale', saleId);
        
        // Siparişleri yenile
        loadOrdersByDate(date);
        
        // Müşteri listesini güncelle
        await loadCustomers();
        
        alert('Satış başarıyla silindi!');
    } catch (error) {
        console.error('Satış silinirken hata oluştu:', error);
        alert('Satış silinirken bir hata oluştu!');
    }
}

 // Sipariş tarihi seçimi butonu
 if (loadOrdersBtn) {
    loadOrdersBtn.addEventListener('click', () => {
        const selectedDate = orderDateSelector.value;
        if (selectedDate) {
            loadOrdersByDate(selectedDate);
        } else {
            alert('Lütfen bir tarih seçin.');
        }
    });
}

    // Masa renk seçimini ayarla
    function setTableColor(tableId, color) {
        const customColors = JSON.parse(localStorage.getItem('tableCustomColors') || '{}');
        customColors[tableId] = color;
        localStorage.setItem('tableCustomColors', JSON.stringify(customColors));
        
        // Masa görünümünü hemen güncelle
        const tableEl = document.querySelector(`.table[data-id="${tableId}"]`);
        if (tableEl) {
            tableEl.querySelector('.table-header').style.backgroundColor = color;
        }
    }

    // İyileştirilmiş Adet seçimi pop-up'ını göster
    function showNumberSelector(inputElement, title = "Değer Girin", maxLength = 5) {
        currentNumberInput = inputElement;
        numberSelectorTitle.textContent = title;
        numberDisplay.textContent = inputElement.value || "0";
        
        // Popup'ı göster
        numberSelectorOverlay.style.display = "flex";
        
        // Giriş işlemlerinde kullanılan değeri temizle
        numberDisplay.dataset.tempValue = numberDisplay.textContent;
        numberDisplay.dataset.maxLength = maxLength.toString();
    }
    
    // Sayı giriş butonlarını işle - İyileştirildi
    numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            const action = button.dataset.value;
            let currentValue = numberDisplay.textContent;
            const maxLength = parseInt(numberDisplay.dataset.maxLength || "5");
            
            if (action === "clear") {
                // Temizle
                numberDisplay.textContent = "0";
            } else if (action === "backspace") {
                // Son karakteri sil
                if (currentValue.length <= 1) {
                    numberDisplay.textContent = "0";
                } else {
                    numberDisplay.textContent = currentValue.slice(0, -1);
                }
            } else {
                // Sayı ekle
                if (currentValue === "0") {
                    numberDisplay.textContent = action;
                } else {
                    // Maksimum karakter kontrolü
                    if (currentValue.length < maxLength) {
                        numberDisplay.textContent = currentValue + action;
                    }
                }
            }
            
            // Geçici değeri güncelle
            numberDisplay.dataset.tempValue = numberDisplay.textContent;
        });
    });
    
    // Sayı seçimini onayla - İyileştirildi
    numberConfirmBtn.addEventListener('click', () => {
        if (currentNumberInput) {
            currentNumberInput.value = numberDisplay.textContent;
        // Sipariş adet değiştiğinde, maksimum değer kontrolü
        if (currentNumberInput.id === 'modalQuantity' || currentNumberInput.id === 'editOrderQuantity') {
            // Minimum 1 adet kontrolü
            if (parseInt(currentNumberInput.value) < 1) {
                currentNumberInput.value = "1";
            }
        }
    }
    
    numberSelectorOverlay.style.display = "none";
});

// Sayı seçimini iptal et
numberCancelBtn.addEventListener('click', () => {
    numberSelectorOverlay.style.display = "none";
});

// Adet butonlarını ilgili input alanlarına bağla
if (modalQuantityBtn) {
    modalQuantityBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showNumberSelector(document.getElementById('modalQuantity'), "Adet Seçin", 3);
    });
}

if (productPriceBtn) {
    productPriceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showNumberSelector(document.getElementById('productPrice'), "Fiyat Girin (₺)", 5);
    });
}

if (editOrderQuantityBtn) {
    editOrderQuantityBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showNumberSelector(document.getElementById('editOrderQuantity'), "Adet Seçin", 3);
    });
}

if (editPlayerCountValueBtn) {
    editPlayerCountValueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showNumberSelector(document.getElementById('editPlayerCountValue'), "Oyuncu Sayısı Seçin", 2);
    });
}

// Başlangıç saati değiştirme modalı
function showStartTimeModal() {
    // Mevcut saati al
    const currentTable = tables.find(t => t.id === currentTableId);
    if (currentTable && currentTable.startTime) {
        const startTime = new Date(currentTable.startTime);
        hourSelect.value = startTime.getHours();
        minuteSelect.value = Math.floor(startTime.getMinutes() / 5) * 5; // En yakın 5'in katına yuvarla
        
        updateSelectedTimeDisplay();
        startTimeModal.style.display = 'block';
    }
}

// Seçilen zaman görüntüsünü güncelle
function updateSelectedTimeDisplay() {
    const hour = hourSelect.value.toString().padStart(2, '0');
    const minute = minuteSelect.value.toString().padStart(2, '0');
    selectedTimeDisplay.textContent = `${hour}:${minute}`;
}

// Saat ve dakika seçicilere olay dinleyicileri ekle
if (hourSelect) hourSelect.addEventListener('change', updateSelectedTimeDisplay);
if (minuteSelect) minuteSelect.addEventListener('change', updateSelectedTimeDisplay);

// Dakika seçiciyi 5 dakikalık aralıklarla düzenle
function setupMinuteSelector() {
    if (!minuteSelect) return;
    
    minuteSelect.innerHTML = '';
    // 5 dakikalık aralıklarla seçenekleri oluştur
    for (let i = 0; i < 60; i += 5) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i.toString().padStart(2, '0');
        minuteSelect.appendChild(option);
    }
}

// Dakika seçici ayarla
setupMinuteSelector();

// Başlangıç saatini uygula
if (applyStartTimeBtn) {
    applyStartTimeBtn.addEventListener('click', async () => {
        const hour = parseInt(hourSelect.value);
        const minute = parseInt(minuteSelect.value);
        
        const currentTable = tables.find(t => t.id === currentTableId);
        if (!currentTable || !currentTable.startTime) {
            startTimeModal.style.display = 'none';
            return;
        }
        
        // Yeni başlangıç zamanını oluştur
        const startTime = new Date(currentTable.startTime);
        startTime.setHours(hour, minute, 0, 0);
        
        // Mevcut zamanın gelecekte olmamasını sağla
        const now = new Date();
        if (startTime > now) {
            alert('Başlangıç saati gelecek bir zaman olamaz!');
            return;
        }
        
        try {
            // Masayı güncelle
            await ipcRenderer.invoke('update-table', {
                id: currentTableId,
                startTime: startTime.toISOString()
            });
            
            // Modalı kapat ve masayı yenile
            startTimeModal.style.display = 'none';
            await loadTables();
            
            // Masa detaylarını güncelle
            const updatedTable = tables.find(t => t.id === currentTableId);
            if (updatedTable) {
                showTableModal(updatedTable);
            }
            
            alert('Başlangıç saati başarıyla güncellendi!');
        } catch (error) {
            console.error('Başlangıç saati güncellenirken hata oluştu:', error);
            alert('Başlangıç saati güncellenirken bir hata oluştu!');
        }
    });
}

// Başlangıç saati düzenlemeyi iptal et
if (cancelStartTimeBtn) {
    cancelStartTimeBtn.addEventListener('click', () => {
        startTimeModal.style.display = 'none';
    });
}

// Güncel saat gösterimi için interval
function startClock() {
    // Önce hemen bir kez göster
    updateCurrentTime();
    
    // Sonra her saniye güncelle
    clockIntervalId = setInterval(updateCurrentTime, 1000);
}

// Güncel saati güncelle
function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
    if (currentTimeDisplay) {
        currentTimeDisplay.textContent = `${timeString}`;
    }
}

// Başlangıçta saati başlat
startClock();

// Yeni ürün ekle butonu - Düzeltildi
if (document.getElementById('addProductBtn')) {
document.getElementById('addProductBtn').addEventListener('click', () => {
    showProductModal();
});
}

// Masa durdurma butonu - Satış mekanizması ve müşteri entegrasyonu iyileştirildi
stopTableBtn.addEventListener('click', async () => {
try {
    const currentTable = tables.find(t => t.id === currentTableId);

    if (currentTable && currentTable.startTime) {
        // Hesap detayı al
        const billDetails = await ipcRenderer.invoke('get-table-bill', {
            tableId: currentTableId,
            startTime: currentTable.startTime,
            playerCount: currentTable.playerCount
        });

        // Hesap detay modalını göster
        const billBilliardFee = document.getElementById('billBilliardFee');
        const billProductTotal = document.getElementById('billProductTotal');
        const billTotalAmount = document.getElementById('billTotalAmount');

        billBilliardFee.textContent = `${billDetails.billiardFee.toFixed(2)} ₺`;
        billProductTotal.textContent = `${billDetails.productTotal.toFixed(2)} ₺`;
        billTotalAmount.textContent = `${billDetails.totalBill.toFixed(2)} ₺`;

        billModal.style.display = 'block';

        // Hesap onay butonuna işlev ekle
        const confirmBillBtn = document.getElementById('confirmBillBtn');
        confirmBillBtn.onclick = async () => {
            const endTime = new Date().toISOString();
            
            // Önce satış kaydı oluştur
            const saleData = {
                tableId: currentTableId,
                tableNumber: currentTable.number,
                billiardFee: billDetails.billiardFee,
                productTotal: billDetails.productTotal,
                totalAmount: billDetails.totalBill,
                startTime: currentTable.startTime,
                endTime: endTime,
                duration: billDetails.duration.totalMinutes,
                customerName: currentTable.customerName || 'Müşteri',
                customerId: currentTable.customerId
            };
            
            // Satışı kaydet ve ID'sini al
            const sale = await ipcRenderer.invoke('create-sale', saleData);
            
            // Masa ücretini sipariş olarak ekle (bu sipariş satış ID'sine bağlı olacak)
            await ipcRenderer.invoke('save-order', {
                tableId: currentTableId,
                tableNumber: currentTable.number,
                productName: 'Masa Ücreti',
                quantity: 1,
                price: billDetails.billiardFee,
                duration: billDetails.duration.totalMinutes,
                paid: true,
                saleId: sale.id,
                customerId: currentTable.customerId // Müşteri ilişkisini koru
            });
            
            // Masa için tüm ödenmemiş siparişleri güncelle ve satış ID'sine bağla
            await ipcRenderer.invoke('update-table-orders', {
                tableId: currentTableId,
                saleId: sale.id,
                paid: true,
                customerId: currentTable.customerId // Müşteri ilişkisini koru
            });
            
            // Masayı güncelle
            await ipcRenderer.invoke('update-table', {
                id: currentTableId,
                status: 'available',
                endTime,
                startTime: null,
                playerCount: 0,
                customerId: null,
                customerName: null
            });
            
            // Masayı yeniden yükle
            loadTables();
            
            // Modalları kapat
            billModal.style.display = 'none';
            tableModal.style.display = 'none';
            
            // Müşteri harcama bilgilerini güncelleme - YENİ
            try {
                // Müşteri ID kontrolü
                if (currentTable.customerId) {
                    // Müşteri harcamasını güncelle
                    await ipcRenderer.invoke('update-customer-spending', {
                        customerId: currentTable.customerId,
                        amount: billDetails.totalBill,
                        date: endTime
                    });
                    
                    // Müşteri listesini güncelle
                    await loadCustomers();
                }
            } catch (error) {
                console.error('Müşteri harcama bilgileri güncellenirken hata oluştu:', error);
            }
        };

        // İptal butonu
        const cancelBillBtn = document.getElementById('cancelBillBtn');
        cancelBillBtn.onclick = () => {
            billModal.style.display = 'none';
        };
    }
} catch (error) {
    console.error('Masa durdurulurken hata oluştu:', error);
    alert('Masa durdurulurken bir hata oluştu!');
}
});

// Tarih formatı yardımcı fonksiyonu
function formatDateInput(date) {
    const d = new Date(date);
    const month = '' + (d.getMonth() + 1);
    const day = '' + d.getDate();
    const year = d.getFullYear();
    
    return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

// Rezervasyon formu tarih alanını bugünün tarihine ayarla
function setDefaultDates() {
    const today = new Date();
    const formattedDate = formatDateInput(today);
    
    // Rezervasyon formu tarih alanı
    const reservationDateInput = document.getElementById('reservationDate');
    if (reservationDateInput) {
        reservationDateInput.value = formattedDate;
    }
    
    // Rezervasyon modalı tarih alanı
    const reservationModalDateInput = document.getElementById('reservationModalDate');
    if (reservationModalDateInput) {
        reservationModalDateInput.value = formattedDate;
    }
    
    // Rezervasyon saati 10 dakikalık aralıklarla ayarla
    setupReservationTimeInput();
    
    // Sipariş tarihi seçimi bugün olarak ayarla
    if (orderDateSelector) {
        orderDateSelector.value = formattedDate;
    }
    
    // Rapor tarihleri - son 7 gün
    if (reportStartDate && reportEndDate) {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        reportStartDate.value = formatDateInput(lastWeek);
        reportEndDate.value = formattedDate;
    }
}

// Rezervasyon zamanını 10 dakikalık aralıklarla ayarlamak için
function setupReservationTimeInput() {
    const reservationTimeInput = document.getElementById('reservationModalTime');
    if (!reservationTimeInput) return;
    
    // Şimdiki saati al ve 10 dakikanın katına yuvarla
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const roundedMinute = Math.ceil(currentMinute / 10) * 10;
    let hour = currentHour;
    let minute = roundedMinute;
    
    // Eğer yuvarlanmış dakika 60 ise, saati arttır
    if (roundedMinute >= 60) {
        hour = (currentHour + 1) % 24;
        minute = 0;
    }
    
    reservationTimeInput.step = "600"; // 10 dakika = 600 saniye
    reservationTimeInput.value = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Sekme navigasyonu ayarla
navButtons.forEach(button => {
    button.addEventListener('click', () => {
        const sectionId = button.id.replace('Btn', 'Section');
        
        // Aktif sekmeyi değiştir
        navButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // Aktif bölümü değiştir
        sections.forEach(section => section.classList.remove('active'));
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Otomatik yenilemeyi kapat
            if (autoRefreshIntervalId) {
                clearInterval(autoRefreshIntervalId);
                autoRefreshIntervalId = null;
            }
            
            // Bölüme göre veri yükleme
            if (sectionId === 'masalarSection') {
                loadTables();
                
                // Masalar sayfasında oto-yenileme başlat, 5 saniyede bir
                autoRefreshIntervalId = setInterval(() => {
                    const activeSection = document.querySelector('.section.active');
                    const scrollPos = {
                        x: window.scrollX,
                        y: window.scrollY
                    };
                    
                    if (activeSection && activeSection.id === 'masalarSection') {
                        loadTables(true).then(() => {
                            // Scroll pozisyonunu koruyalım
                            window.scrollTo(scrollPos.x, scrollPos.y);
                        });
                    }
                }, 5000); // 5 saniye
                
            } else if (sectionId === 'rezervasyonlarSection') {
                loadReservations();
                
                // Tarih ve saat varsayılan değerleri ayarla
                setDefaultDates();
                
            } else if (sectionId === 'siparislerSection') {
                // Varsayılan olarak bugünün siparişlerini göster
                setDefaultDates();
                loadOrdersByDate(orderDateSelector.value);
                
            } else if (sectionId === 'raporSection') {
                // Rapor tarihini bugüne ayarla
                setDefaultDates();
                loadReportsByDateRange(reportStartDate.value, reportEndDate.value);
                // Raporlar görünümünü düzenle
                updateReportsUI();
                
            } else if (sectionId === 'adminSection') {
                loadProducts();
                loadSettings();
                
            } else if (sectionId === 'musterilerSection') {
                loadCustomers();
            }
        }
    });
});

// Modal kapatma işlevi
closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        tableModal.style.display = 'none';
        productModal.style.display = 'none';
        billModal.style.display = 'none';
        editOrderModal.style.display = 'none';
        editPlayerCountModal.style.display = 'none';
        customerModal.style.display = 'none';
        tableColorModal.style.display = 'none';
        backupModal.style.display = 'none';
        startTimeModal.style.display = 'none';
        
        // Yeni rezervasyon modalı eklendi
        if (reservationModal) {
            reservationModal.style.display = 'none';
            // Rezervasyon modal kapatıldığında dropdown temizlensin
            isReservationModalInitialized = false;
        }
    });
});

// Raporlar bölümünün görünümünü düzenle
function updateReportsUI() {
    // Rapor kartları düzeni
    const reportsSummary = document.querySelector('.reports-summary');
    if (reportsSummary) {
        reportsSummary.classList.add('reports-grid');
        reportsSummary.style.gridTemplateColumns = 'repeat(auto-fill, minmax(250px, 1fr))';
        reportsSummary.style.gap = '20px';
    }
    
    // Grafik konteynerleri için daha iyi düzen
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.style.marginBottom = '30px';
        container.style.padding = '15px';
        container.style.backgroundColor = 'white';
        container.style.borderRadius = '8px';
        container.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    });
    
    // Rapor tabloları için daha iyi düzen
    const reportTables = document.querySelectorAll('.report-table');
    reportTables.forEach(table => {
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '25px';
        table.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        
        // Tablo başlıklarını daha belirgin yap
        const tableHeaders = table.querySelectorAll('th');
        tableHeaders.forEach(header => {
            header.style.padding = '12px 15px';
            header.style.textAlign = 'left';
            header.style.backgroundColor = 'var(--primary-color)';
            header.style.color = 'white';
            header.style.fontWeight = 'bold';
            header.style.fontSize = '16px';
        });
        
        // Tablo satırlarını daha okunaklı yap
        const tableRows = table.querySelectorAll('tr');
        tableRows.forEach((row, index) => {
            if (index % 2 === 0) {
                row.style.backgroundColor = '#f9f9f9';
            }
            
            const cells = row.querySelectorAll('td');
            cells.forEach(cell => {
                cell.style.padding = '10px 15px';
                cell.style.borderBottom = '1px solid #ddd';
            });
        });
    });
    
    // Rapor sekmeleri iyileştirme
    const reportTabs = document.querySelector('.report-tabs');
    if (reportTabs) {
        reportTabs.style.display = 'flex';
        reportTabs.style.gap = '5px';
        reportTabs.style.marginBottom = '25px';
        reportTabs.style.borderBottom = '3px solid var(--primary-color)';
        
        const tabButtons = reportTabs.querySelectorAll('.report-tab-btn');
        tabButtons.forEach(btn => {
            btn.style.padding = '12px 25px';
            btn.style.fontSize = '16px';
            btn.style.fontWeight = 'bold';
            btn.style.border = 'none';
            btn.style.borderRadius = '5px 5px 0 0';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.3s';
            
            if (btn.classList.contains('active')) {
                btn.style.backgroundColor = 'var(--primary-color)';
                btn.style.color = 'white';
            } else {
                btn.style.backgroundColor = '#f5f5f5';
                btn.style.color = 'var(--dark-color)';
            }
            
            // Hover efekti için event listener
            btn.addEventListener('mouseenter', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.backgroundColor = '#e0e0e0';
                }
            });
            
            btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('active')) {
                    btn.style.backgroundColor = '#f5f5f5';
                }
            });
        });
    }
    
    // Rapor içeriklerini düzenle
    const reportContents = document.querySelectorAll('.report-content');
    reportContents.forEach(content => {
        content.style.padding = '20px';
        content.style.backgroundColor = 'white';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        content.style.marginBottom = '20px';
    });
    
    // Dark mode uyumluluğu için
    if (document.body.classList.contains('theme-dark')) {
        chartContainers.forEach(container => {
            container.style.backgroundColor = '#34495e';
            container.style.color = '#ecf0f1';
        });
        
        reportContents.forEach(content => {
            content.style.backgroundColor = '#34495e';
            content.style.color = '#ecf0f1';
        });
        
        reportTables.forEach(table => {
            table.querySelectorAll('th').forEach(header => {
                header.style.backgroundColor = '#2c3e50';
                header.style.color = '#ecf0f1';
            });
            
            table.querySelectorAll('tr:nth-child(even)').forEach(row => {
                row.style.backgroundColor = '#2c3e50';
            });
            
            table.querySelectorAll('td').forEach(cell => {
                cell.style.borderColor = '#7f8c8d';
            });
        });
    }
}

// Rezervasyon modalını göster - Açılır Menü (Dropdown) implementasyonu - Sorun Düzeltildi
function showReservationModal(customerId = null, customerName = null) {
    // Rezervasyon formunu ayarla
    const reservationForm = document.getElementById('reservationModalForm');
    
    // Müşteri seçimi için dropdown oluştur (eski müşteri adı gösterimi yerine)
    let customerSelectHTML = `
        <div class="form-group">
            <label for="reservationCustomerSelect">Müşteri:</label>
            <select id="reservationCustomerSelect" required>
                <option value="">Müşteri Seçin</option>
            </select>
        </div>
    `;
    
    // Eski müşteri adı alanını kontrol et ve değiştir
    const existingCustomerField = document.getElementById('reservationCustomerName');
    if (existingCustomerField) {
        // Müşteri adı alanını dropdown ile değiştir
        existingCustomerField.parentNode.innerHTML = customerSelectHTML;
    }
    
    // Müşterileri dropdown'a ekle - DROPDOWN DAHA ÖNCE DOLDURULDUYSA TEKRAR DOLDURMA
    const customerSelect = document.getElementById('reservationCustomerSelect');
    if (customerSelect && customerSelect.options.length <= 1) { // Sadece ilk seçenek varsa (Müşteri Seçin)
        // Tüm müşterileri ekle
        customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.phone || 'Telefon yok'})`;
            customerSelect.appendChild(option);
        });
    }
    
    // Eğer bir müşteri ID'si verilmişse, onu seç
    if (customerId && customerSelect) {
        customerSelect.value = customerId;
    }
    
    // Tarih ve saat varsayılanlarını ayarla
    const reservationDateInput = document.getElementById('reservationModalDate');
    const reservationTimeInput = document.getElementById('reservationModalTime');
    const playerCountInput = document.getElementById('reservationModalPlayerCount');
    
    if (reservationDateInput && reservationTimeInput && playerCountInput) {
        // Bugünün tarihini ayarla
        const today = new Date();
        reservationDateInput.value = formatDateInput(today);
        
        // Şimdiki saatten 1 saat sonrasını varsayılan yap
        const nextHour = (today.getHours() + 1) % 24;
        reservationTimeInput.value = `${nextHour.toString().padStart(2, '0')}:00`;
        
        // Varsayılan kişi sayısı
        playerCountInput.value = "2";
        
        // Mevcut müsait masaları göster
        loadAvailableTables();
        
        // Modalı göster
        reservationModal.style.display = 'block';
    }
}
// Mevcut müsait masaları yükle - YENİ
async function loadAvailableTables() {
    try {
        // Mevcut masaları al
        const allTables = await ipcRenderer.invoke('get-tables');
        
        // Müsait masaları filtrele
        const availableTables = allTables.filter(t => t.status === 'available');
        
        // Masa seçim alanını oluştur
        const tableSelectContainer = document.getElementById('reservationTableSelectContainer');
        if (tableSelectContainer) {
            // Masa seçim alanını temizle
            tableSelectContainer.innerHTML = '';
            
            // Masa seçim başlığını ekle
            const selectLabel = document.createElement('label');
            selectLabel.for = 'reservationTableSelect';
            selectLabel.textContent = 'Masa Seçin:';
            tableSelectContainer.appendChild(selectLabel);
            
            // Masa seçim listesini oluştur
            const tableSelect = document.createElement('select');
            tableSelect.id = 'reservationTableSelect';
            tableSelect.classList.add('form-control');
            
            // "Masa Atama" seçeneği
            const noTableOption = document.createElement('option');
            noTableOption.value = '';
            noTableOption.textContent = 'Masa Atama (Daha Sonra)';
            tableSelect.appendChild(noTableOption);
            
            // Müsait masaları ekle
            availableTables.forEach(table => {
                const option = document.createElement('option');
                option.value = table.id;
                option.textContent = `Masa ${table.number}`;
                tableSelect.appendChild(option);
            });
            
            tableSelectContainer.appendChild(tableSelect);
        }
    } catch (error) {
        console.error('Müsait masalar yüklenirken hata oluştu:', error);
    }
}

// Müşteri bazlı rezervasyon oluşturma - Düzeltilmiş
if (document.getElementById('reservationModalForm')) {
    document.getElementById('reservationModalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const date = document.getElementById('reservationModalDate').value;
        const time = document.getElementById('reservationModalTime').value;
        const playerCount = Number(document.getElementById('reservationModalPlayerCount').value);
        
        // Müşteri seçimi (dropdown'dan)
        const customerSelect = document.getElementById('reservationCustomerSelect');
        const selectedCustomerId = customerSelect ? parseInt(customerSelect.value) : null;
        
        // Masa seçimi
        const tableSelect = document.getElementById('reservationTableSelect');
        const selectedTableId = tableSelect ? parseInt(tableSelect.value) || null : null;
        
        // Seçilen müşteri ID'si
        if (!selectedCustomerId) {
            alert('Lütfen bir müşteri seçin.');
            return;
        }
        
        // Seçilen müşteriyi bul
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) {
            alert('Müşteri bilgisi bulunamadı.');
            return;
        }
        
        try {
            // Rezervasyon oluştur
            await ipcRenderer.invoke('create-reservation', {
                tableId: selectedTableId, 
                customerId: customer.id,
                customerName: customer.name,
                customerPhone: customer.phone,
                date,
                time,
                playerCount
            });
            
            // Eğer masa seçildiyse, masayı rezerve olarak işaretle
            if (selectedTableId) {
                await ipcRenderer.invoke('update-table', {
                    id: selectedTableId,
                    status: 'reserved'
                });
            }
            
            // Güncellemeler
            await loadReservations();
            await loadTables();
            
            // Modalı kapat
            reservationModal.style.display = 'none';
            isReservationModalInitialized = false;
            
            alert(`Rezervasyon başarıyla oluşturuldu. ${selectedTableId ? '' : 'Masa daha sonra atanacak.'}`);
       } catch (error) {
           console.error('Rezervasyon oluşturulurken hata oluştu:', error);
           alert('Rezervasyon oluşturulurken bir hata oluştu!');
       }
   });
}

// Müşteri modalını göster - İyileştirildi
function showCustomerModal(customer = null) {
   const customerModalTitle = document.getElementById('customerModalTitle');
   const customerId = document.getElementById('customerId');
   const customerName = document.getElementById('customerName');
   const customerPhone = document.getElementById('customerPhone');
   
   if (customer) {
       // Müşteriyi düzenle
       customerModalTitle.textContent = 'Müşteriyi Düzenle';
       customerId.value = customer.id;
       customerName.value = customer.name;
       customerPhone.value = customer.phone || '';
   } else {
       // Yeni müşteri ekle
       customerModalTitle.textContent = 'Yeni Müşteri Ekle';
       customerId.value = '';
       customerName.value = '';
       customerPhone.value = '';
   }
   
   customerModal.style.display = 'block';
}

// Asenkron müşteri yükleme fonksiyonu - İyileştirildi
async function loadCustomers() {
   try {
       customers = await ipcRenderer.invoke('get-customers');
       const customerList = document.getElementById('customerList');
       
       if (customerList) {
           customerList.innerHTML = '';
           
           if (customers.length === 0) {
               customerList.innerHTML = '<p>Henüz müşteri kaydı bulunmamaktadır.</p>';
               return;
           }
           
           // Toplam harcamaya göre sırala (en çok harcama yapan üstte)
           customers.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
           
           customers.forEach(customer => {
               const customerItem = document.createElement('div');
               customerItem.className = 'customer-item';
               customerItem.innerHTML = `
                   <div class="customer-info">
                       <h4>${customer.name}</h4>
                       <p><strong>Telefon:</strong> ${customer.phone || '-'}</p>
                       <p><strong>Toplam Harcama:</strong> ${customer.totalSpent ? customer.totalSpent.toFixed(2) : '0'} ₺</p>
                       <p><strong>Ziyaret Sayısı:</strong> ${customer.visitCount || 0}</p>
                       <p><strong>Son Ziyaret:</strong> ${customer.lastVisit ? formatDate(customer.lastVisit) : '-'}</p>
                   </div>
                   <div class="customer-actions">
                       <button class="edit-customer-btn btn small" data-id="${customer.id}"><i class="fas fa-edit"></i> Düzenle</button>
                       <button class="delete-customer-btn btn small danger" data-id="${customer.id}"><i class="fas fa-trash"></i> Sil</button>
                       <button class="add-reservation-btn btn small success" data-id="${customer.id}" data-name="${customer.name}">
                           <i class="fas fa-calendar-plus"></i> Rezervasyon
                       </button>
                   </div>
               `;
               
               customerList.appendChild(customerItem);
           });
           
           // Event listener'ları ekle
           document.querySelectorAll('.edit-customer-btn').forEach(btn => {
               btn.addEventListener('click', () => {
                   const customerId = Number(btn.dataset.id);
                   const customer = customers.find(c => c.id === customerId);
                   if (customer) {
                       showCustomerModal(customer);
                   }
               });
           });
           
           document.querySelectorAll('.delete-customer-btn').forEach(btn => {
               btn.addEventListener('click', () => {
                   const customerId = Number(btn.dataset.id);
                   deleteCustomer(customerId);
               });
           });
           
           // Rezervasyon butonu event listener
           document.querySelectorAll('.add-reservation-btn').forEach(btn => {
               btn.addEventListener('click', () => {
                   const customerId = Number(btn.dataset.id);
                   const customerName = btn.dataset.name;
                   showReservationModal(customerId, customerName);
               });
           });
       }
   } catch (error) {
       console.error('Müşteriler yüklenirken hata oluştu:', error);
   }
}

// Müşteri kaydet - E-posta alanı kaldırıldı
async function saveCustomer(customerId, name, phone) {
   try {
       const customer = {
           id: customerId ? Number(customerId) : null,
           name,
           phone
       };
       
       const updatedCustomers = await ipcRenderer.invoke('update-customer', customer);
       
       alert(`Müşteri başarıyla ${customerId ? 'güncellendi' : 'eklendi'}!`);
       return updatedCustomers;
   } catch (error) {
       console.error('Müşteri kaydedilirken hata oluştu:', error);
       alert('Müşteri kaydedilirken bir hata oluştu!');
       return null;
   }
}

// Müşteri sil
async function deleteCustomer(customerId) {
   if (confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) {
       try {
           const updatedCustomers = await ipcRenderer.invoke('delete-customer', customerId);
           alert('Müşteri başarıyla silindi!');
           loadCustomers();
           return updatedCustomers;
       } catch (error) {
           console.error('Müşteri silinirken hata oluştu:', error);
           alert('Müşteri silinirken bir hata oluştu!');
           return null;
       }
   }
}

// Müşteri ekleme butonu
if (addCustomerBtn) {
   addCustomerBtn.addEventListener('click', () => showCustomerModal());
}

// Müşteri formu - E-posta alanı kaldırıldı
if (customerForm) {
   customerForm.addEventListener('submit', async (e) => {
       e.preventDefault();
       
       const customerId = document.getElementById('customerId').value;
       const name = document.getElementById('customerName').value;
       const phone = document.getElementById('customerPhone').value;
       
       if (!name) {
           alert('Müşteri adı boş olamaz!');
           return;
       }
       
       try {
           const updatedCustomers = await saveCustomer(customerId, name, phone);
           
           if (updatedCustomers) {
               customerModal.style.display = 'none';
               loadCustomers();
           }
       } catch (error) {
           console.error('Müşteri kaydedilirken hata oluştu:', error);
           alert('Müşteri kaydedilirken bir hata oluştu!');
       }
   });
}

// Rapor tabları işle
if (reportTabButtons.length > 0) {
   reportTabButtons.forEach(button => {
       button.addEventListener('click', () => {
           // Aktif tab stilini değiştir
           reportTabButtons.forEach(btn => btn.classList.remove('active'));
           button.classList.add('active');
           
           // İlgili içeriği göster
           const tabId = button.dataset.tab;
           document.querySelectorAll('.report-content').forEach(content => {
               content.classList.remove('active');
               });
               document.getElementById(`${tabId}-content`).classList.add('active');
           });
       });
   }

   // Tarih aralığı ile raporları yükle - Düzeltilmiş
async function loadReportsByDateRange(startDate, endDate) {
    try {
        // Genel istatistikleri al
        const statsReport = await ipcRenderer.invoke('get-stats-by-date-range', startDate, endDate);
        
        // Ürün satış raporunu al
        const productReport = await ipcRenderer.invoke('get-product-sales-report', startDate, endDate);
        
        // Müşteri raporunu al
        const customerReport = await ipcRenderer.invoke('get-customer-sales-report', startDate, endDate);
        
        // Özet raporları güncelle
        document.getElementById('totalIncome').textContent = `${statsReport.totalStats.totalIncome.toFixed(2)} ₺`;
        document.getElementById('tableIncome').textContent = `${statsReport.totalStats.tableIncome.toFixed(2)} ₺`;
        document.getElementById('productIncome').textContent = `${statsReport.totalStats.productIncome.toFixed(2)} ₺`;
        document.getElementById('tableUsageTime').textContent = 
          `${statsReport.totalStats.tableUsage.hours} saat ${statsReport.totalStats.tableUsage.minutes} dakika`;
        
        // Günlük rapor listesini oluştur
        const dailyReportList = document.getElementById('dailyReportList');
        if (dailyReportList) {
          dailyReportList.innerHTML = `
            <table class="report-table improved-table">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Masa Geliri</th>
                  <th>Ürün Geliri</th>
                  <th>Toplam Gelir</th>
                  <th>Masa Süresi</th>
                </tr>
              </thead>
              <tbody>
                ${statsReport.dailyStats.map(day => `
                  <tr>
                    <td>${formatDate(day.date)}</td>
                    <td>${day.tableIncome.toFixed(2)} ₺</td>
                    <td>${day.productIncome.toFixed(2)} ₺</td>
                    <td>${day.totalIncome.toFixed(2)} ₺</td>
                    <td>${day.tableUsage.hours} saat ${day.tableUsage.minutes} dakika</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
        
        // Ürün rapor listesini oluştur
        const productReportList = document.getElementById('productReportList');
        if (productReportList) {
          productReportList.innerHTML = `
            <table class="report-table improved-table">
              <thead>
                <tr>
                  <th>Ürün Adı</th>
                  <th>Satış Adedi</th>
                  <th>Toplam Gelir</th>
                  <th>Sipariş Sayısı</th>
                </tr>
              </thead>
              <tbody>
                ${productReport.productReportData.map(product => `
                  <tr>
                    <td>${product.productName}</td>
                    <td>${product.quantity}</td>
                    <td>${product.totalAmount.toFixed(2)} ₺</td>
                    <td>${product.orders}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
        
        // Müşteri raporu oluştur
        const customerReportList = document.getElementById('customerReportList');
        if (customerReportList) {
            if (customerReport && !customerReport.error && customerReport.customerStats && customerReport.customerStats.length > 0) {
                customerReportList.innerHTML = `
                    <table class="report-table improved-table">
                        <thead>
                            <tr>
                                <th>Müşteri</th>
                                <th>Telefon</th>
                                <th>Toplam Harcama</th>
                                <th>Masa Harcaması</th>
                                <th>Ürün Harcaması</th>
                                <th>Sipariş Sayısı</th>
                                <th>Son Ziyaret</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${customerReport.customerStats.map(c => `
                                <tr>
                                    <td>${c.customerName}</td>
                                    <td>${c.customerPhone || '-'}</td>
                                    <td>${c.totalSpent.toFixed(2)} ₺</td>
                                    <td>${c.tableSpent.toFixed(2)} ₺</td>
                                    <td>${c.productSpent.toFixed(2)} ₺</td>
                                    <td>${c.orderCount}</td>
                                    <td>${formatDate(c.lastVisit)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            } else {
                customerReportList.innerHTML = '<p>Bu tarih aralığında müşteri harcaması bulunamadı.</p>';
            }
        }
        
        // Grafikler oluştur
        createIncomeChart(statsReport.chartData);
        createProductSalesChart(productReport.chartData);
        
        // Raporlar görünümünü düzenle
        updateReportsUI();
        
    } catch (error) {
        console.error('Raporlar yüklenirken hata oluştu:', error);
        alert('Raporlar yüklenirken bir hata oluştu!');
    }
}
   // Gelir grafiği oluştur
   function createIncomeChart(chartData) {
       const ctx = document.getElementById('incomeChart').getContext('2d');
       
       // Daha önce bir grafik varsa yenisi ile değiştir
       if (window.incomeChart instanceof Chart) {
           window.incomeChart.destroy();
       }
       
       window.incomeChart = new Chart(ctx, {
           type: 'bar',
           data: {
               labels: chartData.dates,
               datasets: [
                   {
                       label: 'Masa Geliri',
                       data: chartData.tableIncomes,
                       backgroundColor: 'rgba(54, 162, 235, 0.5)',
                       borderColor: 'rgba(54, 162, 235, 1)',
                       borderWidth: 1
                   },
                   {
                       label: 'Ürün Geliri',
                       data: chartData.productIncomes,
                       backgroundColor: 'rgba(255, 99, 132, 0.5)',
                       borderColor: 'rgba(255, 99, 132, 1)',
                       borderWidth: 1
                   }
               ]
           },
           options: {
               responsive: true,
               scales: {
                   y: {
                       beginAtZero: true,
                       title: {
                           display: true,
                           text: 'Gelir (₺)'
                       }
                   },
                   x: {
                       title: {
                           display: true,
                           text: 'Tarih'
                       }
                   }
               },
               plugins: {
                   title: {
                       display: true,
                       text: 'Günlük Gelir Grafiği'
                   },
                   tooltip: {
                       callbacks: {
                           label: function(context) {
                               return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} ₺`;
                           }
                       }
                   }
               }
           }
       });
   }

   // Ürün satış grafiği oluştur
   function createProductSalesChart(chartData) {
       const ctx = document.getElementById('productSalesChart').getContext('2d');
       
       // Daha önce bir grafik varsa yenisi ile değiştir
       if (window.productSalesChart instanceof Chart) {
           window.productSalesChart.destroy();
       }
       
       window.productSalesChart = new Chart(ctx, {
           type: 'pie',
           data: {
               labels: chartData.productNames,
               datasets: [
                   {
                       data: chartData.productSales,
                       backgroundColor: [
                           'rgba(255, 99, 132, 0.5)',
                           'rgba(54, 162, 235, 0.5)',
                           'rgba(255, 206, 86, 0.5)',
                           'rgba(75, 192, 192, 0.5)',
                           'rgba(153, 102, 255, 0.5)',
                           'rgba(255, 159, 64, 0.5)',
                           'rgba(199, 199, 199, 0.5)',
                           'rgba(83, 102, 255, 0.5)',
                           'rgba(40, 159, 64, 0.5)',
                           'rgba(210, 199, 199, 0.5)'
                       ],
                       borderColor: [
                           'rgba(255, 99, 132, 1)',
                           'rgba(54, 162, 235, 1)',
                           'rgba(255, 206, 86, 1)',
                           'rgba(75, 192, 192, 1)',
                           'rgba(153, 102, 255, 1)',
                           'rgba(255, 159, 64, 1)',
                           'rgba(199, 199, 199, 1)',
                           'rgba(83, 102, 255, 1)',
                           'rgba(40, 159, 64, 1)',
                           'rgba(210, 199, 199, 1)'
                       ],
                       borderWidth: 1
                   }
               ]
           },
           options: {
               responsive: true,
               plugins: {
                   title: {
                       display: true,
                       text: 'Ürün Satış Dağılımı'
                   },
                   tooltip: {
                       callbacks: {
                           label: function(context) {
                               const value = context.parsed;
                               const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                               const percentage = ((value / total) * 100).toFixed(1);
                               return `${context.label}: ${value.toFixed(2)} ₺ (${percentage}%)`;
                           }
                       }
                   }
               }
           }
       });
   }

   // Gelişmiş rapor yükleme butonu
   if (loadReportBtn) {
       loadReportBtn.addEventListener('click', async () => {
           const startDate = reportStartDate.value;
           const endDate = reportEndDate.value;
           
           if (!startDate || !endDate) {
               alert('Lütfen başlangıç ve bitiş tarihlerini seçin.');
               return;
           }
           
           if (new Date(startDate) > new Date(endDate)) {
               alert('Başlangıç tarihi bitiş tarihinden sonra olamaz.');
               return;
           }
           
           // Rapor verilerini yükle
           await loadReportsByDateRange(startDate, endDate);
       });
   }

   // Masa renk ayarlama modalını göster
   function showTableColorModal(tableId, tableNumber) {
       document.getElementById('tableColorPicker').value = '#d9221c'; // Varsayılan renk
       
       // Mevcut rengi kontrol et
       const customColors = JSON.parse(localStorage.getItem('tableCustomColors') || '{}');
       if (customColors[tableId]) {
           document.getElementById('tableColorPicker').value = customColors[tableId];
       }
       
       // Renk önayar seçimlerini ayarla
       document.querySelectorAll('.color-preset').forEach(preset => {
           preset.classList.remove('active');
           preset.addEventListener('click', () => {
               const color = preset.dataset.color;
               document.getElementById('tableColorPicker').value = color;
               document.querySelectorAll('.color-preset').forEach(p => p.classList.remove('active'));
               preset.classList.add('active');
           });
       });
       
       // Uygula butonunu ayarla
       const applyBtn = document.getElementById('applyTableColorBtn');
       applyBtn.onclick = () => {
           const color = document.getElementById('tableColorPicker').value;
           setTableColor(tableId, color);
           tableColorModal.style.display = 'none';
           alert(`Masa ${tableNumber} için renk ayarı kaydedildi.`);
       };
       
       // Sıfırla butonunu ayarla
       const resetBtn = document.getElementById('resetTableColorBtn');
       resetBtn.onclick = () => {
           // Özel renk ayarını localStorage'dan kaldır
           const customColors = JSON.parse(localStorage.getItem('tableCustomColors') || '{}');
           if (customColors[tableId]) {
               delete customColors[tableId];
               localStorage.setItem('tableCustomColors', JSON.stringify(customColors));
           }
           
           // Masayı yenile
           loadTables();
           
           tableColorModal.style.display = 'none';
           alert(`Masa ${tableNumber} için renk ayarı varsayılana döndürüldü.`);
       };
       
       tableColorModal.style.display = 'block';
   }

   // Veritabanı yedekleme/geri yükleme butonları
   if (showBackupModalBtn) {
       showBackupModalBtn.addEventListener('click', () => {
           backupModal.style.display = 'block';
       });
   }

   if (createBackupBtn) {
       createBackupBtn.addEventListener('click', async () => {
           const result = await ipcRenderer.invoke('backup-database');
           if (result.success) {
               alert(`Veritabanı başarıyla yedeklendi!\nYedek dosyası: ${result.filePath}`);
           } else {
               alert(`Hata: ${result.message}`);
           }
       });
   }

   if (restoreBackupBtn) {
       restoreBackupBtn.addEventListener('click', async () => {
           if (confirm('Veritabanını geri yüklemek istediğinizden emin misiniz? Mevcut veriler kaybolabilir.')) {
               const result = await ipcRenderer.invoke('restore-database');
               if (result.success) {
                   alert('Veritabanı başarıyla geri yüklendi! Uygulama yeniden başlatılacak.');
                   window.location.reload();
               } else {
                   alert(`Hata: ${result.message}`);
               }
           }
       });
   }

   // Masaları yükle fonksiyonu
   async function loadTables(isAutoRefresh = false) {
       const tablesContainer = document.getElementById('tablesContainer');
       const sidebarReservationsList = document.getElementById('sidebarReservationsList');
       
       if (!tablesContainer) return;
       
       try {
           tables = await ipcRenderer.invoke('get-tables');
           reservations = await ipcRenderer.invoke('get-reservations');
           
           // Eğer otomatik yenileme ise ve hiçbir masa aktif değilse gereksiz yere DOM'u güncelleme
           if (isAutoRefresh) {
               const hasActiveTable = tables.some(t => t.status === 'active');
               if (!hasActiveTable) return;
           }
           
           tablesContainer.innerHTML = '';
           
           // Masa numarasına göre sırala
           tables.sort((a, b) => a.number - b.number);
           
           // Her masa için güncel ücretleri ve süreleri hesapla
           const currentTime = new Date();
           for (let i = 0; i < tables.length; i++) {
               const table = tables[i];
               
               if (table.status === 'active' && table.startTime) {
                   // Aktif masalarda güncel ücreti ve süreyi hesapla
                   const priceInfo = await ipcRenderer.invoke('calculate-table-price', {
                       startTime: table.startTime,
                       playerCount: table.playerCount
                   });
                   table.currentPrice = priceInfo.totalPrice;
                   
                   // Süreyi hesapla
                   const startTime = new Date(table.startTime);
                   const durationMs = currentTime - startTime;
                   const totalMinutes = Math.floor(durationMs / (1000 * 60));
                   table.hours = Math.floor(totalMinutes / 60);
                   table.minutes = totalMinutes % 60;
                   
                   // Siparişleri hesapla
                   const orders = await ipcRenderer.invoke('get-orders-for-table', table.id);
                   let orderTotal = 0;
                   orders.forEach(order => {
                       if (!order.paid) { // Sadece ödenmemiş siparişleri topla
                           orderTotal += order.price * order.quantity;
                       }
                   });
                   table.orderTotal = orderTotal;
                   table.grandTotal = table.currentPrice + orderTotal;
               }
           }
           
           tables.forEach(table => {
               const tableEl = document.createElement('div');
               tableEl.className = `table ${table.status}`;
               tableEl.dataset.id = table.id;
               
               // Masa başlığı
               const tableHeader = document.createElement('div');
               tableHeader.className = 'table-header';
               tableHeader.textContent = `MASA ${table.number}`;
               
               // Masa içeriği
               const tableContent = document.createElement('div');
               tableContent.className = 'table-content';
               
               // Başlangıç saati bölümü
               const timeSection = document.createElement('div');
               timeSection.className = 'time-section';
               
               const timeLabel = document.createElement('div');
               timeLabel.className = 'section-label';
               timeLabel.textContent = 'Başlangıç Saati';
               
               const timeDisplay = document.createElement('div');
               timeDisplay.className = 'time-display';
               
               // Geçen süre bölümü
               const durationSection = document.createElement('div');
               durationSection.className = 'duration-section';
               
               const durationLabel = document.createElement('div');
               durationLabel.className = 'section-label';
               durationLabel.textContent = 'Geçen Süre';
               
               const durationDisplay = document.createElement('div');
               durationDisplay.className = 'duration-display';
               
               // Kişi sayısı bölümü
               const playerSection = document.createElement('div');
               playerSection.className = 'player-section';
               
               const playerLabel = document.createElement('div');
               playerLabel.className = 'section-label';
               playerLabel.textContent = 'Kişi Sayısı';
               
               const playerDisplay = document.createElement('div');
               playerDisplay.className = 'player-display';
               
               // Ücret bölümleri - Yan yana
               const feesSection = document.createElement('div');
               feesSection.className = 'fees-section';
               
               const feeLabels = document.createElement('div');
               feeLabels.className = 'fee-labels';
               
               const tableFeeLabel = document.createElement('div');
               tableFeeLabel.className = 'fee-label';
               tableFeeLabel.textContent = 'Masa Ücreti';
               
               const orderFeeLabel = document.createElement('div');
               orderFeeLabel.className = 'fee-label';
               orderFeeLabel.textContent = 'Diğer Ücret';
               
               feeLabels.appendChild(tableFeeLabel);
               feeLabels.appendChild(orderFeeLabel);
               
               const feeDisplays = document.createElement('div');
               feeDisplays.className = 'fee-displays';
               
               const tableFeeDisplay = document.createElement('div');
               tableFeeDisplay.className = 'fee-display table-fee';
               
               const orderFeeDisplay = document.createElement('div');
               orderFeeDisplay.className = 'fee-display order-fee';
               
               feeDisplays.appendChild(tableFeeDisplay);
               feeDisplays.appendChild(orderFeeDisplay);
               
               // Toplam ücret bölümü
               const totalSection = document.createElement('div');
               totalSection.className = 'total-section';
               
               const totalLabel = document.createElement('div');
               totalLabel.className = 'section-label';
               totalLabel.textContent = 'Toplam Ücret';
               
               const totalDisplay = document.createElement('div');
               totalDisplay.className = 'total-display';
               
               // Aktif masalar için değerleri doldur
               if (table.status === 'active' && table.startTime) {
                   const start = new Date(table.startTime);
                   const startTime = start.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
                   
                   timeDisplay.textContent = startTime;
                   durationDisplay.textContent = `${table.hours} saat ${table.minutes} dakika`;
                   playerDisplay.textContent = table.playerCount;
                   
                   // Ücretleri göster
                   tableFeeDisplay.textContent = Math.round(table.currentPrice).toString();
                   orderFeeDisplay.textContent = Math.round(table.orderTotal).toString();
                   totalDisplay.textContent = Math.round(table.grandTotal).toString();
               } else if (table.status === 'reserved') {
                   // Rezerve edilmiş masa
                   const reservation = reservations.find(r => r.tableId === table.id);
                   if (reservation) {
                       timeDisplay.innerHTML = reservation.time;
                       durationDisplay.textContent = `Rezerve`;
                       playerDisplay.textContent = reservation.playerCount;
                       
                       tableFeeDisplay.textContent = '---';
                       orderFeeDisplay.textContent = '---';
                       totalDisplay.textContent = '---';
                   } else {
                       timeDisplay.innerHTML = '--:--';
                       timeDisplay.classList.add('empty-display');
                       
                       durationDisplay.textContent = '-';
                       
                       playerDisplay.textContent = '-';
                       
                       tableFeeDisplay.textContent = '---';
                       orderFeeDisplay.textContent = '---';
                       totalDisplay.textContent = '---';
                       totalDisplay.classList.add('empty-display');
                   }
               } else {
                   // Boş masa için değerleri göster
                   timeDisplay.innerHTML = '--:--';
                   timeDisplay.classList.add('empty-display');
                   
                   durationDisplay.textContent = '-';
                   
                   playerDisplay.textContent = '-';
                   
                   tableFeeDisplay.textContent = '---';
                   orderFeeDisplay.textContent = '---';
                   totalDisplay.textContent = '---';
                   totalDisplay.classList.add('empty-display');
               }
               // Elementleri birleştir
               timeSection.appendChild(timeLabel);
               timeSection.appendChild(timeDisplay);
               
               durationSection.appendChild(durationLabel);
               durationSection.appendChild(durationDisplay);
               
               playerSection.appendChild(playerLabel);
               playerSection.appendChild(playerDisplay);
               
               feesSection.appendChild(feeLabels);
               feesSection.appendChild(feeDisplays);
               
               totalSection.appendChild(totalLabel);
               totalSection.appendChild(totalDisplay);
               
               tableContent.appendChild(timeSection);
               tableContent.appendChild(durationSection);
               tableContent.appendChild(playerSection);
               tableContent.appendChild(feesSection);
               tableContent.appendChild(totalSection);
               
               tableEl.appendChild(tableHeader);
               tableEl.appendChild(tableContent);
               
               // Masa renklerini özelleştir
               customizeTableStyle(tableEl, table);
               
               tableEl.addEventListener('click', () => showTableModal(table));
               tablesContainer.appendChild(tableEl);
           });
           
           // Yan taraftaki rezervasyonları güncelle
           if (sidebarReservationsList) {
               sidebarReservationsList.innerHTML = '';
               
               // Tarihe göre sırala (önce bugünkü rezervasyonlar)
               const today = new Date().toISOString().split('T')[0];
               reservations.sort((a, b) => {
                   if (a.date === today && b.date !== today) return -1;
                   if (a.date !== today && b.date === today) return 1;
                   
                   // Aynı gün içindeki rezervasyonlar saate göre sıralansın
                   if (a.date === b.date) {
                       return a.time.localeCompare(b.time);
                   }
                   
                   // Diğer günler tarihe göre sıralansın
                   return new Date(a.date) - new Date(b.date);
               });
               
               // İlk 5 rezervasyonu göster
               const visibleReservations = reservations.slice(0, 5);
               
               if (visibleReservations.length === 0) {
                   sidebarReservationsList.innerHTML = '<p style="text-align: center;">Aktif rezervasyon bulunmamaktadır.</p>';
               } else {
                   visibleReservations.forEach(reservation => {
                       const reservationCard = document.createElement('div');
                       reservationCard.className = 'reservation-card';
                       
                       // Rezervasyon zamanı
                       const timeDiv = document.createElement('div');
                       timeDiv.className = 'time';
                       timeDiv.textContent = reservation.time;
                       
                       // Müşteri adı
                       const nameDiv = document.createElement('div');
                       nameDiv.className = 'name';
                       nameDiv.textContent = reservation.customerName;
                       
                       // Rezervasyon tarihi (bugün değilse göster)
                       if (reservation.date !== today) {
                           const dateDiv = document.createElement('div');
                           dateDiv.className = 'date';
                           dateDiv.textContent = formatDate(reservation.date);
                           reservationCard.appendChild(dateDiv);
                       }
                       
                       reservationCard.appendChild(timeDiv);
                       reservationCard.appendChild(nameDiv);
                       
                       sidebarReservationsList.appendChild(reservationCard);
                   });
               }
           }
       } catch (error) {
           console.error('Masalar yüklenirken hata oluştu:', error);
           if (tablesContainer) {
               tablesContainer.innerHTML = '<p>Masalar yüklenirken bir hata oluştu!</p>';
           }
       }
   }

   // Masa detay modalı gösterme fonksiyonu - renk ayarı ve başlangıç düzenleme butonu ekliyoruz
   async function showTableModal(table) {
       currentTableId = table.id;
       currentTableStartTime = table.startTime; // Başlangıç zamanını sakla
       
       const modalTitle = document.getElementById('modalTitle');
       const tableStatus = document.getElementById('tableStatus');
       const tableStart = document.getElementById('tableStart');
       const tableDuration = document.getElementById('tableDuration');
       const playerCount = document.getElementById('playerCount');
       const tableFee = document.getElementById('tableFee');
       
       modalTitle.textContent = `Masa ${table.number}`;
       tableStatus.textContent = getStatusText(table.status);
       tableStatus.className = table.status;
       
       // Oyuncu sayısı düzenleme butonunu görünür/gizli yap
       if (table.status === 'active') {
           editPlayerCountBtn.style.display = 'inline-block';
           editStartTimeBtn.style.display = 'inline-block';
       } else {
           editPlayerCountBtn.style.display = 'none';
           editStartTimeBtn.style.display = 'none';
       }
       
       // Başlangıç zamanı
       if (table.startTime) {
           const start = new Date(table.startTime);
           tableStart.textContent = start.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'});
           playerCount.textContent = table.playerCount;
           
           // Süre ve ücreti hesapla
           const priceInfo = await ipcRenderer.invoke('calculate-table-price', {
               startTime: table.startTime,
               playerCount: table.playerCount
           });
           
           tableDuration.textContent = `${priceInfo.duration.hours}s ${priceInfo.duration.minutes}dk`;
           tableFee.textContent = `${priceInfo.totalPrice.toFixed(2)} ₺`;
       } else {
           tableStart.textContent = '-';
           tableDuration.textContent = '-';
           playerCount.textContent = '-';
           tableFee.textContent = '0 ₺';
       }
       
       // Masa siparişlerini yükle
       loadTableOrders(table.id);
       
       // Button durumlarını güncelle
       if (table.status === 'active') {
           startTableBtn.disabled = true;
           stopTableBtn.disabled = false;
           playerCountSelector.style.display = 'none';
       } else {
           startTableBtn.disabled = false;
           stopTableBtn.disabled = true;
           playerCountSelector.style.display = 'none';
       }
       
       // Masa renk ayarı butonu ekle
       const tableActions = document.querySelector('.table-actions');
       // Önceki renk butonunu temizle
       const existingColorBtn = document.getElementById('colorizeTableBtn');
       if (existingColorBtn) {
           existingColorBtn.remove();
       }
       
       // Yeni renk butonu ekle
       const colorizeTableBtn = document.createElement('button');
       colorizeTableBtn.id = 'colorizeTableBtn';
       colorizeTableBtn.className = 'btn';
       colorizeTableBtn.innerHTML = '<i class="fas fa-paint-brush"></i> Renk Ayarla';
       colorizeTableBtn.addEventListener('click', (e) => {
           e.stopPropagation(); // Modal kapanmasın
           showTableColorModal(table.id, table.number);
       });
       
       // Butonu en sona ekle
       if (tableActions) {
           tableActions.appendChild(colorizeTableBtn);
       }
       
       // Başlangıç saati düzenleme butonu event listener
       editStartTimeBtn.addEventListener('click', showStartTimeModal);
       
       // Modalı göster
       tableModal.style.display = 'block';
   }

   // Sipariş düzenleme modalını göster
   function showEditOrderModal(order) {
       currentOrder = order;
       document.getElementById('editOrderId').value = order.id;
       document.getElementById('editOrderQuantity').value = order.quantity;
       document.getElementById('editOrderInfo').textContent = `${order.productName} - ${order.price} ₺`;
       
       editOrderModal.style.display = 'block';
   }

   // Masa siparişlerini yükle - Sipariş silme ve düzenleme eklendi
   async function loadTableOrders(tableId) {
       const tableOrdersList = document.getElementById('tableOrdersList');
       const tableOrdersTotal = document.getElementById('tableOrdersTotal');
       const tableGrandTotal = document.getElementById('tableGrandTotal');
       
       try {
           const orders = await ipcRenderer.invoke('get-orders');
           const tableOrders = orders.filter(order => order.tableId === tableId && order.productName !== 'Masa Ücreti' && !order.paid);
           
           tableOrdersList.innerHTML = '';
           
           if (tableOrders.length === 0) {
               tableOrdersList.innerHTML = '<p>Bu masa için sipariş bulunmamaktadır.</p>';
               tableOrdersTotal.textContent = '0 ₺';
               tableGrandTotal.textContent = '0 ₺';
               return;
           }
           
           let total = 0;
           
           tableOrders.forEach(order => {
               const orderItem = document.createElement('div');
               orderItem.className = 'order-item';
               const orderTotal = order.price * order.quantity;
               total += orderTotal;
               
               orderItem.innerHTML = `
                   <div class="order-info">
                       <p>${order.productName} x ${order.quantity} = ${orderTotal.toFixed(2)} ₺</p>
                       <p class="order-time">${formatTime(order.timestamp)}</p>
                   </div>
                   <div class="order-actions">
                       <button class="edit-order-btn" data-id="${order.id}"><i class="fas fa-edit"></i></button>
                       <button class="delete-order-btn" data-id="${order.id}"><i class="fas fa-trash"></i></button>
                   </div>
               `;
               
               const editBtn = orderItem.querySelector('.edit-order-btn');
               const deleteBtn = orderItem.querySelector('.delete-order-btn');
               
               editBtn.addEventListener('click', (e) => {
                   e.stopPropagation(); // Yayılımı engelle
                   showEditOrderModal(order);
               });
               
               deleteBtn.addEventListener('click', async (e) => {
                   e.stopPropagation(); // Yayılımı engelle
                   if (confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
                       await ipcRenderer.invoke('delete-order', order.id);
                       loadTableOrders(tableId);
                       loadTables(); // Masaları güncelle
                   }
               });
               
               tableOrdersList.appendChild(orderItem);
           });
           
           tableOrdersTotal.textContent = `${total.toFixed(2)} ₺`;
           
           // Aktif masalarda mevcut hesaplanan ücreti de ekle
           const currentTable = tables.find(t => t.id === tableId);
           if (currentTable && currentTable.status === 'active') {
               const priceInfo = await ipcRenderer.invoke('calculate-table-price', {
                   startTime: currentTable.startTime,
                   playerCount: currentTable.playerCount
               });
               tableGrandTotal.textContent = `${(total + priceInfo.totalPrice).toFixed(2)} ₺`;
           } else {
               tableGrandTotal.textContent = `${total.toFixed(2)} ₺`;
           }
       } catch (error) {
           console.error('Masa siparişleri yüklenirken hata oluştu:', error);
           tableOrdersList.innerHTML = '<p>Siparişler yüklenirken hata oluştu.</p>';
       }
   }

   // Oyuncu sayısı butonları
   playerButtons.forEach(button => {
       button.addEventListener('click', () => {
           selectedPlayerCount = Number(button.dataset.count);
           
           // Tüm butonlardan aktif sınıfı kaldır
           playerButtons.forEach(btn => btn.classList.remove('active'));
           
           // Seçilen butona aktif sınıfı ekle
           button.classList.add('active');
       });
   });

   // Oyuncu sayısı düzenleme butonu
   editPlayerCountBtn.addEventListener('click', () => {
       const currentTable = tables.find(t => t.id === currentTableId);
       if (currentTable && currentTable.status === 'active') {
           document.getElementById('editPlayerCountValue').value = currentTable.playerCount;
           editPlayerCountModal.style.display = 'block';
       }
   });

   // Oyuncu sayısı düzenleme formu
   editPlayerCountForm.addEventListener('submit', async (e) => {
       e.preventDefault();
       
       const newPlayerCount = Number(document.getElementById('editPlayerCountValue').value);
       if (newPlayerCount < 1) {
           alert('Oyuncu sayısı en az 1 olmalıdır.');
           return;
       }
       
       try {
           const currentTable = tables.find(t => t.id === currentTableId);
           if (currentTable && currentTable.status === 'active') {
               await ipcRenderer.invoke('update-table', {
                   id: currentTableId,
                   playerCount: newPlayerCount
               });
               
               alert('Oyuncu sayısı başarıyla güncellendi!');
               editPlayerCountModal.style.display = 'none';
               
               // Masaları ve modal bilgilerini güncelle
               loadTables();
               const updatedTable = { ...currentTable, playerCount: newPlayerCount };
               showTableModal(updatedTable);
           }
       } catch (error) {
           console.error('Oyuncu sayısı güncellenirken hata oluştu:', error);
           alert('Oyuncu sayısı güncellenirken bir hata oluştu!');
       }
   });

   // Masa başlatma butonu
   startTableBtn.addEventListener('click', () => {
       // Oyuncu sayısı seçimini göster
       playerCountSelector.style.display = 'block';
       startTableBtn.style.display = 'none';
       
       // Oyuncu sayısı seçildiğinde başlatma işlemi
       playerButtons.forEach(button => {
           button.addEventListener('click', async function startTableWithPlayerCount() {
               const playerCount = Number(button.dataset.count);
               
               try {
                   const startTime = new Date().toISOString();
                   await ipcRenderer.invoke('update-table', {
                       id: currentTableId,
                       status: 'active',
                       startTime,
                       endTime: null,
                       playerCount
                   });
                   
                   // Masayı yeniden yükle
                   loadTables();
                   
                   // Modalı kapat
                   tableModal.style.display = 'none';
                   
                   // Event listener'ı kaldır
                   playerButtons.forEach(btn => {
                       btn.removeEventListener('click', startTableWithPlayerCount);
                   });
                   
                   // UI'ı sıfırla
                   playerCountSelector.style.display = 'none';
                   startTableBtn.style.display = 'block';
               } catch (error) {
                   console.error('Masa başlatılırken hata oluştu:', error);
                   alert('Masa başlatılırken bir hata oluştu!');
               }
           }, { once: true }); // Her buton için sadece bir kez tetiklensin
       });
   });

   // Masa yenileme butonu
   refreshTableBtn.addEventListener('click', async () => {
       const currentTable = tables.find(t => t.id === currentTableId);
       if (currentTable) {
           // Tabloyu yenile
           await loadTables();
           
           // En son veriyi al ve modalı güncelle
           const updatedTable = tables.find(t => t.id === currentTableId);
           if (updatedTable) {
               showTableModal(updatedTable);
           }
       }
   });

   // Telefon numarasından müşteri bulma özelliği - Rezervasyon sisteminde
   if (document.getElementById('customerPhone')) {
       document.getElementById('customerPhone').addEventListener('blur', async function() {
           const phone = this.value;
           if (phone.length >= 10) {
               try {
                   const customer = await ipcRenderer.invoke('find-customer-by-phone', phone);
                   if (customer) {
                       document.getElementById('customerName').value = customer.name;
                       
                       // Müşteri kaydedilsin
                       if (!customer.id) {
                           // Müşteri veritabanında yoksa kaydet
                           const name = document.getElementById('customerName').value;
                           if (name) {
                               try {
                                   await saveCustomer(null, name, phone);
                               } catch (error) {
                                   console.error('Müşteri kaydedilirken hata oluştu:', error);
                               }
                           }
                       }
                   }
               } catch (error) {
                   console.error('Müşteri aranırken hata oluştu:', error);
               }
           }
       });
   }

   // Sipariş düzenleme formu
   editOrderForm.addEventListener('submit', async (e) => {
       e.preventDefault();
       
       const orderId = Number(document.getElementById('editOrderId').value);
       const newQuantity = Number(document.getElementById('editOrderQuantity').value);
       
       if (newQuantity < 1) {
           alert('Adet en az 1 olmalıdır.');
           return;
       }
       
       try {
           const updatedOrder = {
               ...currentOrder,
               quantity: newQuantity
           };
           
           await ipcRenderer.invoke('update-order', updatedOrder);
           
           alert('Sipariş başarıyla güncellendi!');
           editOrderModal.style.display = 'none';
           
           // Sipariş listesi açıksa güncelle
           if (document.getElementById('siparislerSection').classList.contains('active')) {
               const orderDateSelector = document.getElementById('orderDateSelector');
               if (orderDateSelector && orderDateSelector.value) {
                   loadOrdersByDate(orderDateSelector.value);
               }
           }
           
           // Eğer masa detay sayfası açıksa, siparişleri güncelle
           if (tableModal.style.display === 'block' && currentTableId) {
               loadTableOrders(currentTableId);
           }
           
           // Masaları güncelle
           loadTables();
           
           // Eğer siparişe müşteri bağlıysa, müşteri harcamasını güncelle
           if (updatedOrder.customerId) {
               // Eski adet ve yeni adet arasındaki fark kadar bir harcama güncelleme yap
               const priceDifference = updatedOrder.price * (newQuantity - currentOrder.quantity);
               
               // Müşteri harcamasını güncelle
               await ipcRenderer.invoke('update-customer-spending', {
                   customerId: updatedOrder.customerId,
                   amount: priceDifference, // Fark miktarı
                   date: new Date().toISOString(),
                   updateSpendingOnly: true
               });
               
               // Müşteri listesini güncelle
               await loadCustomers();
           }
           
       } catch (error) {
           console.error('Sipariş güncellenirken hata oluştu:', error);
           alert('Sipariş güncellenirken bir hata oluştu!');
       }
   });

   // Yeni sipariş ekleme formu
   modalOrderForm.addEventListener('submit', async (e) => {
       e.preventDefault();
       
       const productId = Number(document.getElementById('modalProductSelect').value);
       const quantity = Number(document.getElementById('modalQuantity').value);
       
       if (quantity < 1) {
           alert('Adet en az 1 olmalıdır.');
           return;
       }
       
       // Ürün ve masa bilgileri
       const product = products.find(p => p.id === productId);
       const table = tables.find(t => t.id === currentTableId);
       
       if (!product || !table) {
           alert('Ürün veya masa bulunamadı!');
           return;
       }
       
       try {
           await ipcRenderer.invoke('save-order', {
               tableId: currentTableId,
               tableNumber: table.number,
               productId,
               productName: product.name,
               quantity,
               price: product.price,
               paid: false,
               customerId: table.customerId // Müşteri ilişkisini koru
           });
           
           // Formu sıfırla ve siparişleri yeniden yükle
           document.getElementById('modalQuantity').value = "1";
           loadTableOrders(currentTableId);
           
           // Masaları da güncelle (sipariş eklendiğinde toplam ücret değişir)
           loadTables();
           
           alert('Sipariş başarıyla eklendi!');
       } catch (error) {
           console.error('Sipariş eklenirken hata oluştu:', error);
           alert('Sipariş eklenirken bir hata oluştu!');
       }
   });

   // Rezervasyonları yükle - Yeni masa seçimi eklendi
   async function loadReservations() {
       const reservationsList = document.getElementById('reservationsList');
       
       if (!reservationsList) return;
       
       try {
           // Tüm rezervasyonları al
           reservations = await ipcRenderer.invoke('get-reservations');
           
           // Rezervasyonları listele
           reservationsList.innerHTML = '';
           
           if (reservations.length === 0) {
               reservationsList.innerHTML = '<p>Aktif rezervasyon bulunmamaktadır.</p>';
               return;
           }
           
           // Tarihe göre sırala (yakın tarihli önce)
           reservations.sort((a, b) => {
               const dateA = new Date(`${a.date}T${a.time}`);
               const dateB = new Date(`${b.date}T${b.time}`);
               return dateA - dateB;
           });
           
           reservations.forEach(async reservation => {
               const reservationEl = document.createElement('div');
               reservationEl.className = 'reservation-item';
               
               // Eğer rezervasyonun bağlı olduğu masa yoksa, masaları al
               if (!tables || tables.length === 0) {
                   tables = await ipcRenderer.invoke('get-tables');
               }
               
               // Tabloya atanan masa var mı?
               const reservedTable = tables.find(t => t.id === reservation.tableId);
               const tableNumber = reservedTable ? reservedTable.number : 'Henüz atanmadı';
               
               reservationEl.innerHTML = `
                   <div class="reservation-info">
                       <h4>${reservation.tableId ? `Masa ${tableNumber}` : 'Masa Atanmadı'}</h4>
                       <p><strong>Müşteri:</strong> ${reservation.customerName}</p>
                       <p><strong>Telefon:</strong> ${reservation.customerPhone || '-'}</p>
                       <p><strong>Tarih:</strong> ${formatDate(reservation.date)}</p>
                       <p><strong>Saat:</strong> <span class="editable-time" data-id="${reservation.id}">${reservation.time}</span></p>
                       <p><strong>Kişi Sayısı:</strong> ${reservation.playerCount}</p>
                   </div>
                   <div class="reservation-actions">
                       <button class="btn cancel-reservation" data-id="${reservation.id}">İptal Et</button>
                       ${reservation.tableId ? 
                           `<button class="btn start-reservation" data-id="${reservation.id}" data-table="${reservation.tableId}" data-players="${reservation.playerCount}" data-customer-id="${reservation.customerId}" data-customer-name="${reservation.customerName}">Başlat</button>` : 
                           `<button class="btn assign-table" data-id="${reservation.id}" data-players="${reservation.playerCount}">Masa Ata</button>`
                       }
                   </div>
               `;
               
               reservationsList.appendChild(reservationEl);
               
               // Saat düzenleme için event listener
               const timeElement = reservationEl.querySelector('.editable-time');
               if (timeElement) {
                   timeElement.addEventListener('click', function() {
                       const currentTime = this.textContent;
                       const reservationId = this.dataset.id;
                       
                       // Basit bir inline edit oluştur
                       this.innerHTML = `<input type="time" class="edit-time-input" value="${currentTime}" step="600">`; // 10 dakikalık adımlar (600 saniye)
                       const inputElement = this.querySelector('.edit-time-input');
                       
                       inputElement.focus();
                       
                       // Blur olduğunda veya Enter tuşuna basıldığında kaydet
                       inputElement.addEventListener('blur', async function() {
                           const newTime = this.value;
                           if (newTime && newTime !== currentTime) {
                               try {
                                   // Rezervasyon zamanını güncelle
                                   await updateReservationTime(reservationId, newTime);
                                   timeElement.textContent = newTime;
                               } catch (error) {
                                   console.error('Rezervasyon zamanı güncellenirken hata oluştu:', error);
                                   timeElement.textContent = currentTime; // Hatada orjinal değere dön
                               }
                           } else {
                               timeElement.textContent = currentTime; // İptal edildiğinde orjinal değere dön
                           }
                       });
                       
                       inputElement.addEventListener('keydown', function(e) {
                           if (e.key === 'Enter') {
                               this.blur(); // Enter tuşuna basıldığında blur tetikle
                           } else if (e.key === 'Escape') {
                               timeElement.textContent = currentTime; // İptal et
                           }
                       });
                   });
               }
           });
           
           // İptal butonu için event listener ekle
           document.querySelectorAll('.cancel-reservation').forEach(btn => {
               btn.addEventListener('click', async () => {
                   const reservationId = Number(btn.dataset.id);
                   if (confirm('Bu rezervasyonu iptal etmek istediğinizden emin misiniz?')) {
                       await ipcRenderer.invoke('delete-reservation', reservationId);
                       loadReservations();
                       loadTables(); // Masaları da güncelle
                       alert('Rezervasyon başarıyla iptal edildi.');
                   }
               });
           });
           
           // Masa atama butonu için event listener - YENİ
           document.querySelectorAll('.assign-table').forEach(btn => {
               btn.addEventListener('click', async () => {
                   const reservationId = Number(btn.dataset.id);
                   const playerCount = Number(btn.dataset.players);
                   
                   // Müsait masaları al
                   const availableTables = tables.filter(t => t.status === 'available');
                   
                   if (availableTables.length === 0) {
                       alert('Müsait masa bulunmamaktadır.');
                       return;
                   }
                   
                   // Masa seçimini göster
                   showTableSelectionModal(reservationId, playerCount, availableTables);
               });
           });
           
           // Başlat butonu için event listener
           document.querySelectorAll('.start-reservation').forEach(btn => {
               btn.addEventListener('click', async () => {
                   const reservationId = Number(btn.dataset.id);
                   const tableId = Number(btn.dataset.table);
                   const playerCount = Number(btn.dataset.players);
                   const customerId = btn.dataset.customerId ? Number(btn.dataset.customerId) : null;
                   const customerName = btn.dataset.customerName || '';
                   
                   try {
                       const result = await ipcRenderer.invoke('start-reservation', {
                           reservationId,
                           tableId,
                           playerCount,
                           customerId,
                           customerName
                       });
                       
                       if (result.success) {
                           alert('Rezervasyon başarıyla başlatıldı.');
                           loadTables();
                           loadReservations();
                       } else {
                           alert('Hata: ' + result.message);
                       }
                   } catch (error) {
                       console.error('Rezervasyon başlatılırken hata oluştu:', error);
                       alert('Rezervasyon başlatılırken bir hata oluştu!');
                   }
               });
           });
       } catch (error) {
           console.error('Rezervasyonlar yüklenirken hata oluştu:', error);
       }
   }
   
   // Masa Seçim Modalı Göster - YENİ
   function showTableSelectionModal(reservationId, playerCount, availableTables) {
       // Masa seçim modalı HTML
       const tableSelectionHTML = `
           <div id="tableSelectionModal" class="modal" style="display: block;">
               <div class="modal-content">
                   <span id="closeTableSelectionModal" class="close">&times;</span>
                   <h2>Masa Seçin</h2>
                   <div id="availableTablesList" class="available-tables-list">
                       ${availableTables.map(table => `
                           <div class="table-selection-item">
                               <div class="table-info">
                                   <h4>Masa ${table.number}</h4>
                               </div>
                               <div class="table-actions">
                                   <button class="select-table-btn btn" data-id="${table.id}" data-number="${table.number}">Seç</button>
                               </div>
                           </div>
                       `).join('')}
                   </div>
               </div>
           </div>
       `;
       
       // Modalı göster
       document.body.insertAdjacentHTML('beforeend', tableSelectionHTML);
       
       // Modalı kapatma olayı
       document.getElementById('closeTableSelectionModal').addEventListener('click', () => {
           document.getElementById('tableSelectionModal').remove();
       });
       
       // Masa seçme butonlarına event listener ekle
       document.querySelectorAll('.select-table-btn').forEach(btn => {
           btn.addEventListener('click', async () => {
               const tableId = Number(btn.dataset.id);
               const tableNumber = Number(btn.dataset.number);
               
               try {
                // Rezervasyonu güncelle
                await ipcRenderer.invoke('assign-table-to-reservation', {
                    reservationId,
                    tableId
                });
                
                // Masayı rezerve olarak işaretle
                await ipcRenderer.invoke('update-table', {
                    id: tableId,
                    status: 'reserved'
                });
                
                alert(`Rezervasyon Masa ${tableNumber}'a atandı.`);
                loadReservations();
                loadTables();
                
                // Modalı kapat
                document.getElementById('tableSelectionModal').remove();
            } catch (error) {
                console.error('Masa atama işlemi sırasında hata oluştu:', error);
                alert('Masa atama işlemi sırasında bir hata oluştu.');
            }
        });
    });
}

// Rezervasyon zamanını güncelle - YENİ
async function updateReservationTime(reservationId, newTime) {
    try {
        // Rezervasyonu bul
        const reservation = reservations.find(r => r.id === Number(reservationId));
        if (!reservation) {
            throw new Error('Rezervasyon bulunamadı.');
        }
        
        // Saati güncelle
        const updatedReservation = { ...reservation, time: newTime };
        
        // Sunucuya gönder
        await ipcRenderer.invoke('update-reservation', updatedReservation);
        
        // Rezervasyonları güncelle
        loadReservations();
        
        return true;
    } catch (error) {
        console.error('Rezervasyon zamanı güncellenirken hata oluştu:', error);
        alert('Rezervasyon zamanı güncellenirken bir hata oluştu!');
        return false;
    }
}

// Ürünleri yükle
async function loadProducts() {
    const productsList = document.getElementById('productsList');
    if (!productsList) return;
    
    try {
        products = await ipcRenderer.invoke('get-products');
        productsList.innerHTML = '';
        
        products.forEach(product => {
            const productEl = document.createElement('div');
            productEl.className = 'product-item';
            productEl.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${product.name}</span>
                    <span class="product-price">${product.price} ₺</span>
                </div>
                <div class="product-actions">
                    <button class="edit-btn" data-id="${product.id}"><i class="fas fa-edit"></i></button>
                    <button class="delete-btn" data-id="${product.id}"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            const editBtn = productEl.querySelector('.edit-btn');
            const deleteBtn = productEl.querySelector('.delete-btn');
            
            editBtn.addEventListener('click', () => showProductModal(product));
            deleteBtn.addEventListener('click', () => deleteProduct(product.id));
            
            productsList.appendChild(productEl);
        });
        
        // Masa modalındaki ürün seçimini de güncelle
        updateProductSelect();
    } catch (error) {
        console.error('Ürünler yüklenirken hata oluştu:', error);
    }
}

// Ürün seçimini güncelle
function updateProductSelect() {
    const modalProductSelect = document.getElementById('modalProductSelect');
    if (!modalProductSelect) return;
    
    modalProductSelect.innerHTML = '';
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} - ${product.price} ₺`;
        modalProductSelect.appendChild(option);
    });
}

// Ayarları yükle
async function loadSettings() {
    try {
        settings = await ipcRenderer.invoke('get-settings');
        
        // Ücretlendirme formunu doldur
        document.getElementById('oneOrTwoPeople').value = settings.pricing.oneOrTwoPeople;
        document.getElementById('threeOrFourPeople').value = settings.pricing.threeOrFourPeople;
        document.getElementById('additionalPersonFee').value = settings.pricing.additionalPersonFee;
    } catch (error) {
        console.error('Ayarlar yüklenirken hata oluştu:', error);
    }
}

// Ürün modalını göster
function showProductModal(product = null) {
    const productModalTitle = document.getElementById('productModalTitle');
    const productId = document.getElementById('productId');
    const productName = document.getElementById('productName');
    const productPrice = document.getElementById('productPrice');
    
    if (product) {
        // Ürünü düzenle
        productModalTitle.textContent = 'Ürünü Düzenle';
        productId.value = product.id;
        productName.value = product.name;
        productPrice.value = product.price;
    } else {
        // Yeni ürün ekle
        productModalTitle.textContent = 'Yeni Ürün Ekle';
        productId.value = '';
        productName.value = '';
        productPrice.value = '';
    }
    
    productModal.style.display = 'block';
}

// Ürün silme
async function deleteProduct(productId) {
    if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
        try {
            const updatedProducts = await ipcRenderer.invoke('delete-product', productId);
            products = updatedProducts;
            loadProducts();
            alert('Ürün başarıyla silindi!');
        } catch (error) {
            console.error('Ürün silinirken hata oluştu:', error);
            alert('Ürün silinirken bir hata oluştu!');
        }
    }
}

// Ürün formu gönderimi
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const productId = document.getElementById('productId').value;
    const name = document.getElementById('productName').value;
    const price = Number(document.getElementById('productPrice').value);
    
    if (price <= 0) {
        alert('Ürün fiyatı sıfırdan büyük olmalıdır.');
        return;
    }
    
    try {
        const product = {
            id: productId ? Number(productId) : null,
            name,
            price
        };
        
        const updatedProducts = await ipcRenderer.invoke('update-product', product);
        products = updatedProducts;
        
        // Formu sıfırla ve ürünleri yeniden yükle
        productForm.reset();
        loadProducts();
        
        // Modalı kapat
        productModal.style.display = 'none';
        
        alert('Ürün başarıyla kaydedildi!');
    } catch (error) {
        console.error('Ürün kaydedilirken hata oluştu:', error);
        alert('Ürün kaydedilirken bir hata oluştu!');
    }
});

// Ücretlendirme formu gönderimi
pricingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const oneOrTwoPeople = Number(document.getElementById('oneOrTwoPeople').value);
    const threeOrFourPeople = Number(document.getElementById('threeOrFourPeople').value);
    const additionalPersonFee = Number(document.getElementById('additionalPersonFee').value);
    
    try {
        const updatedSettings = {
            pricing: {
                oneOrTwoPeople,
                threeOrFourPeople,
                additionalPersonFee
            }
        };
        
        await ipcRenderer.invoke('update-settings', updatedSettings);
        settings = updatedSettings;
        
        alert('Ücretlendirme ayarları başarıyla güncellendi!');
    } catch (error) {
        console.error('Ayarlar güncellenirken hata oluştu:', error);
        alert('Ayarlar güncellenirken bir hata oluştu!');
    }
});

// Yardımcı fonksiyonlar
function getStatusText(status) {
    switch (status) {
        case 'available': return 'MÜSAİT';
        case 'active': return 'AKTİF';
        case 'reserved': return 'REZERVE';
        default: return status;
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR');
}

function formatTime(timeStr) {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleTimeString('tr-TR');
}

function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('tr-TR');
}

// Sayfa kapatılırken interval'i temizle
window.addEventListener('beforeunload', () => {
    if (autoRefreshIntervalId) {
        clearInterval(autoRefreshIntervalId);
    }
    if (clockIntervalId) {
        clearInterval(clockIntervalId);
    }
});

// Uygulama başlatıldığında veri yükleme ve varsayılanları ayarlama
loadTables();
loadSettings();
loadProducts();
loadCustomers();
setDefaultDates();

// Sayfa yüklendiğinde tüm masaları kapat
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await window.electron.invoke('close-all-tables');
    console.log('Tüm masalar kapatıldı');
  } catch (error) {
    console.error('Masalar kapatılırken hata:', error);
  }
});
});