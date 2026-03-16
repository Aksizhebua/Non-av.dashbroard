// 1. Inisialisasi Supabase Client
const supabaseUrl = 'https://cvjzkdzuuuutgbobiwju.supabase.co';
const supabaseKey = 'sb_publishable_do3L5iqYASgCW0OowBaj3w__46lHRCX';

// Menggunakan Supabase client dari CDN
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

// Page configuration — detects which system is active
const PAGE_CONFIG = (() => {
    const page = window.location.pathname.toLowerCase();
    const isAtmacanteen = page.includes('kelola-atmacanteen.html');
    return {
        isAtmacanteen,
        tablePembayaran: isAtmacanteen ? 'PEMBAYARAN AC' : 'PEMBAYARAN AJS',
        tableTenant:     isAtmacanteen ? 'TENANT AC'     : 'TENANT AJS',
        storageFolder:   isAtmacanteen ? 'ATMACANTEEN/'  : '',
    };
})();

// Test koneksi ke Supabase
async function testSupabaseConnection() {
    try {
        console.log('🔄 Testing Supabase connection...');
        
        // Test basic connection
        const { data, error } = await supabaseClient
            .from('payments')
            .select('count', { count: 'exact', head: true });
        
        if (error && !error.message.includes('table')) {
            throw error;
        }
        
        console.log('✅ Supabase connection successful!');
        console.log('📡 URL:', supabaseUrl);
        console.log('🔑 API Key configured');
        
        // Test auth service
        const { data: { session }, error: authError } = await supabaseClient.auth.getSession();
        if (authError) {
            console.log('⚠️ Auth service check:', authError.message);
        } else {
            console.log('🔐 Auth service: Ready');
            if (session) {
                console.log('👤 Current session:', session.user.email);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
        console.log('🔧 Please check your Supabase configuration');
        return false;
    }
}

// Jalankan test koneksi saat app dimuat
testSupabaseConnection();

// Check storage status saat app dimuat
(async () => {
    const storageOK = await checkStorageStatus();
    if (storageOK) {
        // If storage is OK, test upload functionality
        await testStorageUpload();
    }
})();

// Check storage availability
async function checkStorageStatus() {
    try {
        console.log('🔍 Checking Supabase Storage status...');
        
        // List all buckets
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
            console.error('❌ Error fetching buckets:', bucketsError);
            return false;
        }
        
        console.log('📦 Available buckets:', buckets.map(b => b.name));
        
        // Check if bukti_transfer bucket exists
        const buktiBucket = buckets.find(bucket => bucket.name === 'bukti_transfer');
        if (!buktiBucket) {
            console.warn('⚠️ Bucket "bukti_transfer" not found!');
            return false;
        }
        
        console.log('✅ Bucket "bukti_transfer" found:', buktiBucket);
        
        // Test bucket access by listing files (should work even if empty)
        const { data: files, error: listError } = await supabase.storage
            .from('bukti_transfer')
            .list('', { limit: 1 });
            
        if (listError) {
            console.error('❌ Error accessing bucket:', listError);
            return false;
        }
        
        console.log('✅ Storage access confirmed. Files in bucket:', files.length);
        return true;
        
    } catch (error) {
        console.error('❌ Storage check failed:', error);
        return false;
    }
}

// Test upload functionality with a small dummy file
async function testStorageUpload() {
    try {
        console.log('🧪 Testing upload functionality...');
        
        // Create a small text file for testing
        const testContent = `Test upload at ${new Date().toISOString()}`;
        const testFile = new Blob([testContent], { type: 'text/plain' });
        const testFileName = `test-upload-${Date.now()}.txt`;
        
        // Attempt upload
        const { data, error } = await supabase.storage
            .from('bukti_transfer')
            .upload(`test/${testFileName}`, testFile, {
                cacheControl: '3600',
                upsert: false
            });
            
        if (error) {
            console.error('❌ Test upload failed:', error);
            return false;
        }
        
        console.log('✅ Test upload successful:', data);
        
        // Try to get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('bukti_transfer')
            .getPublicUrl(`test/${testFileName}`);
            
        console.log('📎 Test file URL:', publicUrl);
        
        // Clean up test file
        const { error: deleteError } = await supabase.storage
            .from('bukti_transfer')
            .remove([`test/${testFileName}`]);
            
        if (deleteError) {
            console.warn('⚠️ Could not delete test file:', deleteError);
        } else {
            console.log('🗑️ Test file cleaned up');
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Upload test failed:', error);
        return false;
    }
}

// Check authentication status when page loads
async function checkAuthStatus() {
    try {
        const { data: { user }, error } = await supabaseClient.auth.getUser();
        
        if (error || !user) {
            console.log('❌ User not authenticated:', error?.message || 'No user session');
            
            // Show auth alert if on kelola page
            const authAlert = document.getElementById('authAlert');
            if (authAlert) {
                authAlert.classList.remove('d-none');
                
                // Disable form
                const paymentForm = document.getElementById('formPembayaran');
                if (paymentForm) {
                    const inputs = paymentForm.querySelectorAll('input, select, textarea, button');
                    inputs.forEach(input => input.disabled = true);
                }
            }
            
            return false;
        } else {
            console.log('✅ User authenticated:', user.email);
            
            // Hide auth alert if visible
            const authAlert = document.getElementById('authAlert');
            if (authAlert) {
                authAlert.classList.add('d-none');
            }
            
            return true;
        }
    } catch (error) {
        console.error('❌ Auth check failed:', error);
        return false;
    }
}

// Initialize authentication check when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Check auth status first
    checkAuthStatus();
    
    // If this is kelola page, check auth and load tenants
    if (window.location.pathname.includes('kelola')) {
        loadTenantList();
        
        // Setup tab handlers for smooth navigation
        setupSmoothTabNavigation();
    }
});

// Fungsi untuk Login Admin
async function loginAdmin(emailAdmin, passwordAdmin) {
    console.log("Mencoba login...");

    const loginPromise = supabaseClient.auth.signInWithPassword({
        email: emailAdmin,
        password: passwordAdmin,
    });

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 10000)
    );

    try {
        const { data, error } = await Promise.race([loginPromise, timeoutPromise]);
        if (error) {
            console.error("Gagal Login:", error.message);
            return { success: false, message: error.message };
        }
        console.log("Berhasil Login!", data.session);
        return { success: true };
    } catch (e) {
        console.error("Login error:", e.message);
        return { success: false, message: e.message === 'timeout' ? 'Koneksi timeout. Coba lagi.' : e.message };
    }
}

// Fungsi untuk mengecek apakah admin sedang login atau tidak
async function cekStatusLogin() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        console.log("Admin sedang login:", session.user.email);
        // Di sini nanti kita bisa tampilkan form input datanya
    } else {
        console.log("Belum ada admin yang login.");
        // Di sini nanti kita sembunyikan form input datanya
    }
}

// Jalankan pengecekan status saat halaman web pertama kali dibuka
cekStatusLogin();

// Fungsi untuk Logout Admin
async function logoutAdmin() {
    try {
        const { error } = await supabaseClient.auth.signOut();
        
        if (error) {
            console.error("Error saat logout:", error.message);
            alert("Gagal logout: " + error.message);
            return false;
        }
        
        console.log("Berhasil logout!");
        alert("Anda telah logout. Sampai jumpa!");
        
        // Redirect ke halaman login
        window.location.href='/';
        return true;
    } catch (error) {
        console.error("Error logout:", error);
        return false;
    }
}

// Fungsi untuk proteksi halaman - cek apakah user sudah login
async function protectPage() {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            console.log("Akses ditolak! User belum login.");
            window.location.href='/';
            return false;
        }
        
        console.log("Akses diterima! User sudah login:", session.user.email);
        return true;
    } catch (error) {
        console.error("Error checking session:", error);
        window.location.href='/';
        return false;
    }
}

// Fungsi untuk menampilkan/menyembunyikan elemen berdasarkan status login
async function toggleAuthElements() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // Cari elemen yang memerlukan auth
    const protectedElements = document.querySelectorAll('[data-auth="required"]');
    const loginElements = document.querySelectorAll('[data-auth="login-only"]');
    const userInfoElements = document.querySelectorAll('[data-user-info]');
    
    if (session) {
        // User sudah login - tampilkan elemen protected
        protectedElements.forEach(el => {
            el.style.display = '';
            el.classList.remove('d-none');
        });
        
        // Sembunyikan elemen login
        loginElements.forEach(el => {
            el.style.display = 'none';
            el.classList.add('d-none');
        });
        
        // Tampilkan info user
        userInfoElements.forEach(el => {
            if (el.hasAttribute('data-user-email')) {
                el.textContent = session.user.email;
            }
            if (el.hasAttribute('data-user-name')) {
                el.textContent = session.user.user_metadata?.full_name || 'Admin';
            }
        });
        
    } else {
        // User belum login - sembunyikan elemen protected
        protectedElements.forEach(el => {
            el.style.display = 'none';
            el.classList.add('d-none');
        });
        
        // Tampilkan elemen login
        loginElements.forEach(el => {
            el.style.display = '';
            el.classList.remove('d-none');
        });
    }
}

// Fungsi untuk load data tenant ke dropdown - Enhanced version
async function loadTenantList() {
    const selectElement = document.getElementById('inputTenant');
    if (!selectElement) {
        console.log('❌ Dropdown inputTenant tidak ditemukan di halaman ini');
        return;
    }
    
    console.log('🔄 Loading tenant data from database...');
    
    try {
        // Update placeholder menjadi loading
        selectElement.innerHTML = '<option value="" disabled selected>Memuat data tenant...</option>';
        
        // Test 1: Check if RLS is properly disabled
        console.log('🔍 Testing TENANT table access...');
        
        // Ambil data tenant dari database Supabase - specific fields only
        const { data, error } = await supabaseClient
            .from(PAGE_CONFIG.tableTenant)
            .select('id, nama_tenant')
            .order('id', { ascending: true });
        
        if (error) {
            console.error('❌ Tenant query error:', error);
            
            if (error.message.includes('row-level security')) {
                selectElement.innerHTML = '<option value="" disabled selected>RLS Error: Akses ditolak</option>';
                alert(`❌ RLS masih aktif untuk tabel TENANT!\n\nSolusi:\n1. Buka Supabase Dashboard\n2. Table Editor → TENANT → Settings\n3. DISABLE Row Level Security untuk tabel TENANT`);
                return;
            } else {
                throw error;
            }
        }
        
        // Simulasi delay loading untuk UX yang smooth
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Kosongkan dropdown
        selectElement.innerHTML = '<option value="" disabled selected>Pilih tenant...</option>';
        
        // Tambahkan opsi tenant dari database
        if (data && data.length > 0) {
            console.log(`📦 Raw tenant data:`, data);
            
            data.forEach(tenant => {
                if (tenant.nama_tenant) { // Validasi field exists
                    const option = document.createElement('option');
                    option.value = tenant.nama_tenant;
                    option.textContent = tenant.nama_tenant;
                    option.dataset.tenantId = tenant.id;
                    selectElement.appendChild(option);
                }
            });
            
            console.log(`✅ ${data.length} data tenant berhasil dimuat dari database!`);
            
            // Log loaded options for debugging
            console.log('🎯 Dropdown options loaded:');
            Array.from(selectElement.options).forEach((opt, idx) => {
                if (opt.value) console.log(`   ${idx}. "${opt.value}"`);
            });
            
        } else {
            selectElement.innerHTML = '<option value="" disabled selected>Belum ada data tenant</option>';
            console.log('⚠️ Tidak ada data tenant di database');
        }
        
    } catch (error) {
        console.error('❌ Error loading tenants from database:', error);
        selectElement.innerHTML = '<option value="" disabled selected>Error loading data - coba refresh</option>';
        
        // Fallback ke data sample jika database error
        console.log('🔄 Loading fallback data...');
        setTimeout(() => {
            loadTenantFallback();
        }, 1000);
    }
}

// Fungsi fallback dengan data sample
function loadTenantFallback() {
    const selectElement = document.getElementById('inputTenant');
    if (!selectElement) return;
    
    const fallbackTenants = [
        'Ayam Penyet Indra Lee',
        'Gado Gado Bu As',
        'Madam Yenni',
        'Mie Ayam',
        'Nasi Pecel Rusmiati',
        'Obuso Rice Bowl',
        'Ok Steak',
        'Sambel Penyet'
    ];
    
    selectElement.innerHTML = '<option value="" disabled selected>Pilih tenant...</option>';
    
    fallbackTenants.forEach(tenantName => {
        const option = document.createElement('option');
        option.value = tenantName;
        option.textContent = tenantName;
        selectElement.appendChild(option);
    });
    
    console.log('✅ Fallback tenant data loaded');
}

// Fungsi untuk menyimpan data pembayaran baru dengan file upload
async function savePaymentData(formData, fileGambar = null) {
    try {
        console.log('💾 Menyimpan data pembayaran...');
        
        // Check authentication first
        const isAuthenticated = await checkAuthStatus();
        if (!isAuthenticated) {
            throw new Error('Anda harus login terlebih dahulu untuk menyimpan data pembayaran.');
        }
        
        // Hitung status berdasarkan tagihan vs dibayar
        const tagihan = parseInt(formData.tagihan);
        const dibayar = parseInt(formData.dibayar);
        const status = dibayar >= tagihan ? 'LUNAS' : 'BELUM LUNAS';
        
        let linkBukti = null;
        let namaFileUnik = null;
        
        // 1. UPLOAD GAMBAR KE STORAGE jika ada file
        if (fileGambar) {
            console.log('📸 Mengupload bukti transfer...');
            console.log('📁 File info:', {
                name: fileGambar.name,
                size: fileGambar.size + ' bytes', 
                type: fileGambar.type
            });
            
            // Validasi file
            if (!fileGambar.type.startsWith('image/') && fileGambar.type !== 'application/pdf') {
                throw new Error('File harus berupa gambar (JPG, PNG, GIF, dll.) atau PDF');
            }
            
            if (fileGambar.size > 5 * 1024 * 1024) {
                throw new Error('Ukuran file tidak boleh lebih dari 5MB');
            }
            
            // Bikin nama file unik pakai waktu sekarang biar gak ketimpa kalau namanya sama
            namaFileUnik = `${PAGE_CONFIG.storageFolder}payment-${Date.now()}-${fileGambar.name}`;
            console.log('🏷️ Unique filename:', namaFileUnik);
            
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('bukti_transfer')
                .upload(namaFileUnik, fileGambar);

            if (uploadError) {
                console.error('❌ Error upload file:', uploadError);
                throw new Error('Gagal upload bukti transfer: ' + uploadError.message);
            }
            
            console.log("✅ Gambar berhasil di-upload:", uploadData);

            // 2. DAPATKAN LINK URL PUBLIK GAMBARNYA
            const { data: publicUrlData } = supabaseClient
                .storage
                .from('bukti_transfer')
                .getPublicUrl(namaFileUnik);

            linkBukti = publicUrlData.publicUrl;
            console.log("✅ Link gambar didapatkan:", linkBukti);
        } else {
            console.log('📝 No file uploaded, saving payment data without attachment');
        }
        
        // Prepare data untuk database sesuai struktur tabel PEMBAYARAN
        const paymentData = {
            tanggal_input: new Date().toISOString().split('T')[0], // Format YYYY-MM-DD
            tenant: formData.tenant,
            periode: formData.periode,
            jenis: formData.jenis,
            tagihan: tagihan,
            dibayar: dibayar,
            status: status,
            metode: formData.metode,
            keterangan: formData.keterangan || null,
            link_bukti: linkBukti // Link gambar dari storage
        };
        
        console.log('📤 Data yang akan disimpan:', paymentData);
        
        // 3. SIMPAN SEMUA DATA KE TABEL 'PEMBAYARAN'
        const { data, error } = await supabaseClient
            .from(PAGE_CONFIG.tablePembayaran)
            .insert([paymentData])
            .select();
        
        if (error) {
            // Jika gagal insert tapi file sudah diupload, hapus file
            if (linkBukti && namaFileUnik) {
                try {
                    await supabaseClient.storage
                        .from('bukti_transfer')
                        .remove([namaFileUnik]);
                    console.log('🗑️ File cleanup successful');
                } catch (cleanupError) {
                    console.error('❌ File cleanup failed:', cleanupError);
                }
            }
            
            // Handle RLS (Row Level Security) error
            if (error.message.includes('row-level security policy')) {
                throw new Error(
                    `❌ Permission denied: Row Level Security aktif di tabel ${PAGE_CONFIG.tablePembayaran}.\n\n` +
                    '🛠️ SOLUSI:\n' +
                    '1. Buka Supabase dashboard → Authentication → Policies\n' +
                    `2. Disable RLS untuk tabel ${PAGE_CONFIG.tablePembayaran}, atau\n` +
                    '3. Buat policy yang membolehkan INSERT untuk authenticated users\n\n' +
                    '💡 QUICK FIX: Jalankan SQL command:\n' +
                    `ALTER TABLE "${PAGE_CONFIG.tablePembayaran}" DISABLE ROW LEVEL SECURITY;\n\n` +
                    'Error detail: ' + error.message
                );
            }
            throw error;
        }
        
        console.log('✅ Data pembayaran berhasil disimpan:', data);
        return { success: true, data: data[0] };
        
    } catch (error) {
        console.error('❌ Error saving payment:', error);
        return { success: false, error: error.message };
    }
}

// Global variable untuk menyimpan data payments (untuk filtering)
let allPaymentsData = [];

// Fungsi untuk load history pembayaran - Enhanced version dengan filtering
async function loadPaymentHistory(selectedTenant = '') {
    const tableBody = document.getElementById('tabelData');
    if (!tableBody) return;
    
    try {
        console.log('📊 Loading payment history...');
        
        // Show loading state
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <div class="spinner-border text-warning" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <div class="mt-2">Memuat data pembayaran...</div>
                </td>
            </tr>
        `;
        
        const { data: payments, error } = await supabaseClient
            .from(PAGE_CONFIG.tablePembayaran)
            .select('*')
            .order('tanggal_input', { ascending: false })
            .limit(50); // Increase limit for better filtering
        
        if (error) {
            throw error;
        }
        
        console.log('📊 Raw payment data from database:', payments);
        
        // Store data globally for filtering
        allPaymentsData = payments || [];
        
        // Populate filter dropdown with unique tenants
        populateFilterDropdown();
        
        // Apply filtering if tenant selected
        const filteredData = selectedTenant ? 
            allPaymentsData.filter(payment => payment.tenant === selectedTenant) :
            allPaymentsData;
        
        // Render filtered data
        renderPaymentTable(filteredData);
        
        // Update filter info
        updateFilterInfo(selectedTenant, filteredData.length, allPaymentsData.length);
        
        console.log(`✅ ${filteredData.length} dari ${allPaymentsData.length} data pembayaran berhasil dimuat!`);
        
    } catch (error) {
        console.error('❌ Error loading payments:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle mb-2" style="font-size: 2rem;"></i><br>
                    <strong>Error loading data</strong><br>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    }
}

// Function untuk render payment table
function renderPaymentTable(payments) {
    const tableBody = document.getElementById('tabelData');
    if (!tableBody) return;
    
    // Kosongkan tabel
    tableBody.innerHTML = '';
    
    if (!payments || payments.length === 0) {
        const filterTenant = document.getElementById('filterTenant');
        const isFiltered = filterTenant && filterTenant.value;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-5">
                    <i class="bi bi-${isFiltered ? 'funnel' : 'inbox'}" style="font-size: 3rem; color: #ffa726; opacity: 0.6;"></i>
                    <div class="mt-2" style="color: #ff8c42; font-weight: 500;">
                        ${isFiltered ? 'Tidak ada data untuk tenant yang dipilih' : 'Belum ada transaksi bulan ini'}
                    </div>
                    <small style="color: #ffa726;">
                        ${isFiltered ? 'Coba pilih tenant lain atau clear filter' : 'Data akan muncul setelah input pertama'}
                    </small>
                </td>
            </tr>
        `;
        return;
    }
    
    // Generate table rows
    payments.forEach((payment, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.1}s`;
        row.className = 'fade-in-row';
        
        // Format tanggal
        const tanggal = payment.tanggal_input ? 
            new Date(payment.tanggal_input).toLocaleDateString('id-ID') : 
            'N/A';
        
        // Status badge
        const statusBadge = payment.status === 'LUNAS' 
            ? '<span class="badge bg-success">LUNAS</span>' 
            : '<span class="badge bg-warning text-dark">BELUM LUNAS</span>';
            
        // Jenis badge
        const jenisBadge = `<span class="badge bg-info">${payment.jenis || 'N/A'}</span>`;
        
        row.innerHTML = `
            <td>${tanggal}</td>
            <td><strong style="color: #ff8c42;">${payment.tenant || 'N/A'}</strong></td>
            <td>${payment.periode || 'N/A'}</td>
            <td>${jenisBadge}</td>
            <td><strong>Rp ${(payment.tagihan || 0).toLocaleString('id-ID')}</strong></td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-outline-warning btn-sm rounded-pill" onclick="viewPayment(${JSON.stringify(payment).replace(/"/g, '&quot;')})">
                    <i class="bi bi-eye"></i> Detail
                </button>
            </td>
            <td>
                <button class="btn btn-outline-danger btn-sm rounded-pill" title="Hapus" onclick="deletePayment('${payment.id_trans}')">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Function untuk populate filter dropdown dengan tenant unik
function populateFilterDropdown() {
    const filterTenant = document.getElementById('filterTenant');
    if (!filterTenant || !allPaymentsData) return;
    
    // Get unique tenants from payments data
    const uniqueTenants = [...new Set(allPaymentsData.map(payment => payment.tenant))].filter(tenant => tenant);
    
    // Keep the "Semua Tenant" option and add unique tenants
    const currentValue = filterTenant.value;
    filterTenant.innerHTML = '<option value="">Semua Tenant</option>';
    
    uniqueTenants.forEach(tenant => {
        const option = document.createElement('option');
        option.value = tenant;
        option.textContent = tenant;
        filterTenant.appendChild(option);
    });
    
    // Restore selected value
    filterTenant.value = currentValue;
    
    console.log(`🏷️ Filter dropdown populated with ${uniqueTenants.length} unique tenants`);
}

// Function untuk filter berdasarkan tenant yang dipilih  
function filterByTenant() {
    const filterTenant = document.getElementById('filterTenant');
    if (!filterTenant) return;
    
    const selectedTenant = filterTenant.value;
    console.log('🔍 Filtering by tenant:', selectedTenant || 'All');
    
    // Filter data based on selected tenant
    const filteredData = selectedTenant ? 
        allPaymentsData.filter(payment => payment.tenant === selectedTenant) :
        allPaymentsData;
    
    // Render filtered data
    renderPaymentTable(filteredData);
    
    // Update filter info badge
    updateFilterInfo(selectedTenant, filteredData.length, allPaymentsData.length);
}

// Function untuk clear filter
function clearFilter() {
    const filterTenant = document.getElementById('filterTenant');
    if (!filterTenant) return;
    
    filterTenant.value = '';
    renderPaymentTable(allPaymentsData);
    updateFilterInfo('', allPaymentsData.length, allPaymentsData.length);
    
    console.log('🔄 Filter cleared - showing all data');
}

// Function untuk update filter info badge
function updateFilterInfo(selectedTenant, filteredCount, totalCount) {
    const filterInfo = document.getElementById('filterInfo');
    if (!filterInfo) return;
    
    if (selectedTenant) {
        filterInfo.innerHTML = `<i class="bi bi-funnel-fill me-1"></i>Menampilkan ${filteredCount} dari ${totalCount} data untuk "${selectedTenant}"`;
        filterInfo.classList.remove('d-none');
    } else {
        filterInfo.classList.add('d-none');
    }
}

async function deletePayment(paymentId) {
    if (!confirm('⚠️ Yakin ingin menghapus data ini?\nTindakan ini tidak dapat dibatalkan!')) return;

    try {
        const { error } = await supabaseClient
            .from(PAGE_CONFIG.tablePembayaran)
            .delete()
            .eq('id_trans', paymentId);

        if (error) throw error;

        loadPaymentHistory();
        alert('✅ Data berhasil dihapus!');
    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        alert('❌ Gagal hapus: ' + error.message);
    }
}

// Function untuk menampilkan detail pembayaran dalam modal
function viewPayment(paymentData) {
    let payment;
    
    // Handle both JSON string and object input
    if (typeof paymentData === 'string') {
        try {
            payment = JSON.parse(paymentData);
        } catch (e) {
            console.error('❌ Error parsing payment data:', e);
            alert('Error: Data pembayaran tidak valid');
            return;
        }
    } else {
        payment = paymentData;
    }
    
    console.log('📋 Viewing payment details:', payment);
    
    // Find existing payment data from allPaymentsData if ID is provided
    if (typeof paymentData === 'number' && allPaymentsData.length > 0) {
        const foundPayment = allPaymentsData.find(p => String(p.id_trans) === String(paymentData)) || allPaymentsData[paymentData];
        if (foundPayment) payment = foundPayment;
    }
    
    if (!payment) {
        alert('❌ Data pembayaran tidak ditemukan');
        return;
    }
    
    // Format data untuk ditampilkan
    const formatDate = (dateStr) => {
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch {
            return dateStr || 'N/A';
        }
    };
    
    const formatCurrency = (amount) => {
        return `Rp ${(amount || 0).toLocaleString('id-ID')}`;
    };
    
    const getStatusBadge = (status) => {
        return status === 'LUNAS' ? 
            '<span class="badge bg-success fs-6 px-3 py-2"><i class="bi bi-check-circle me-1"></i>LUNAS</span>' : 
            '<span class="badge bg-warning text-dark fs-6 px-3 py-2"><i class="bi bi-clock me-1"></i>BELUM LUNAS</span>';
    };
    
    const getJenisBadge = (jenis) => {
        const jenisMap = {
            'SEWA': 'bg-primary',
            'LISTRIK': 'bg-warning text-dark', 
            'AIR': 'bg-info',
            'SERVICE': 'bg-secondary',
            'LAINNYA': 'bg-dark'
        };
        const badgeClass = jenisMap[jenis?.toUpperCase()] || 'bg-secondary';
        return `<span class="badge ${badgeClass} fs-6 px-3 py-2">${jenis || 'N/A'}</span>`;
    };
    
    // Buat konten modal
    const modalContent = `
        <div class="modal fade" id="paymentDetailModal" tabindex="-1" aria-labelledby="paymentDetailModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content" style="border: none; border-radius: 1rem; box-shadow: 0 20px 40px rgba(255, 140, 66, 0.2);">
                    <div class="modal-header" style="background: linear-gradient(135deg, #ff8c42, #ffa726); color: white; border-radius: 1rem 1rem 0 0;">
                        <h5 class="modal-title fw-bold" id="paymentDetailModalLabel">
                            <i class="bi bi-receipt me-2"></i>Detail Pembayaran
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-4">
                            <!-- Payment Info Section -->
                            <div class="col-md-6">
                                <div class="card h-100" style="border: 2px solid rgba(255, 140, 66, 0.2); border-radius: 0.8rem;">
                                    <div class="card-body">
                                        <h6 class="card-title fw-bold mb-3" style="color: #ff8c42;">
                                            <i class="bi bi-info-circle me-2"></i>Informasi Pembayaran
                                        </h6>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">ID Transaksi:</label>
                                            <div class="fs-6">#${payment.id_trans || 'N/A'}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Tenant:</label>
                                            <div class="fs-5 fw-bold" style="color: #ff8c42;">${payment.tenant || 'N/A'}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Periode:</label>
                                            <div class="fs-6">${payment.periode || 'N/A'}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Jenis Pembayaran:</label>
                                            <div>${getJenisBadge(payment.jenis)}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Metode Pembayaran:</label>
                                            <div class="fs-6">${payment.metode || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Amount & Status Section -->
                            <div class="col-md-6">
                                <div class="card h-100" style="border: 2px solid rgba(255, 140, 66, 0.2); border-radius: 0.8rem;">
                                    <div class="card-body">
                                        <h6 class="card-title fw-bold mb-3" style="color: #ff8c42;">
                                            <i class="bi bi-cash-coin me-2"></i>Detail Nominal
                                        </h6>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Jumlah Tagihan:</label>
                                            <div class="fs-4 fw-bold text-danger">${formatCurrency(payment.tagihan)}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Jumlah Dibayar:</label>
                                            <div class="fs-4 fw-bold text-success">${formatCurrency(payment.dibayar)}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Status Pembayaran:</label>
                                            <div>${getStatusBadge(payment.status)}</div>
                                        </div>
                                        
                                        <div class="payment-info-item mb-3">
                                            <label class="fw-bold text-muted mb-1">Tanggal Input:</label>
                                            <div class="fs-6">${formatDate(payment.tanggal_input)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Notes & Proof Section -->
                            <div class="col-12">
                                <div class="card" style="border: 2px solid rgba(255, 140, 66, 0.2); border-radius: 0.8rem;">
                                    <div class="card-body">
                                        <h6 class="card-title fw-bold mb-3" style="color: #ff8c42;">
                                            <i class="bi bi-file-text me-2"></i>Catatan & Bukti Transfer
                                        </h6>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="payment-info-item mb-3">
                                                    <label class="fw-bold text-muted mb-2">Keterangan:</label>
                                                    <div class="p-3 bg-light rounded" style="min-height: 80px;">
                                                        ${payment.keterangan || 'Tidak ada keterangan tambahan'}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6">
                                                <div class="payment-info-item">
                                                    <label class="fw-bold text-muted mb-2">Bukti Transfer:</label>
                                                    <div class="text-center p-3 bg-light rounded">
                                                        ${payment.link_bukti ? 
                                                            `<div class="bukti-transfer-container">
                                                                ${payment.link_bukti.toLowerCase().includes('.pdf') ? 
                                                                    `<div class="pdf-preview mb-3" style="max-width: 100%; height: 200px; display: flex; align-items: center; justify-content: center; border: 2px solid #ddd; border-radius: 0.5rem; background: #f8f9fa;">
                                                                        <div class="text-center">
                                                                            <i class="bi bi-file-pdf" style="font-size: 3rem; color: #dc3545;"></i><br>
                                                                            <small class="text-muted">File PDF</small>
                                                                        </div>
                                                                     </div>` :
                                                                    `<div class="image-preview mb-3" style="max-width: 100%; height: 200px; overflow: hidden; border-radius: 0.5rem; border: 2px solid #ddd;">
                                                                        <img src="${payment.link_bukti}" 
                                                                             alt="Bukti Transfer" 
                                                                             class="img-fluid w-100 h-100" 
                                                                             style="object-fit: cover; cursor: pointer;"
                                                                             onclick="openImageModal('${payment.link_bukti}')"
                                                                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                                                             onload="this.nextElementSibling.style.display='none';">
                                                                        <div class="image-error text-muted p-4" style="display: none;">
                                                                            <i class="bi bi-exclamation-triangle" style="font-size: 2rem;"></i><br>
                                                                            <small>Gambar tidak dapat dimuat</small>
                                                                        </div>
                                                                     </div>`
                                                                }
                                                                <div class="d-flex gap-2 justify-content-center">
                                                                    ${payment.link_bukti.toLowerCase().includes('.pdf') ?
                                                                        `<a href="${payment.link_bukti}" target="_blank" class="btn btn-outline-primary btn-sm">
                                                                            <i class="bi bi-file-pdf me-2"></i>Buka PDF
                                                                         </a>` :
                                                                        `<button class="btn btn-outline-primary btn-sm" onclick="openImageModal('${payment.link_bukti}')">
                                                                            <i class="bi bi-zoom-in me-2"></i>Lihat Ukuran Penuh
                                                                         </button>`
                                                                    }
                                                                    <a href="${payment.link_bukti}" target="_blank" class="btn btn-outline-success btn-sm">
                                                                        <i class="bi bi-download me-2"></i>Download
                                                                    </a>
                                                                </div>
                                                             </div>` : 
                                                            `<div class="text-muted">
                                                                <i class="bi bi-image" style="font-size: 2rem; opacity: 0.5;"></i><br>
                                                                <small>Belum ada bukti transfer</small>
                                                             </div>`
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top: 2px solid rgba(255, 140, 66, 0.1);">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Tutup
                        </button>
                        <button type="button" class="btn btn-orange" onclick="printPaymentDetail()">
                            <i class="bi bi-printer me-2"></i>Print Detail
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('paymentDetailModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalContent);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('paymentDetailModal'));
    modal.show();
    
    // Store payment data for printing
    window.currentPaymentData = payment;
    
    console.log('✅ Payment detail modal displayed');
}

// Function untuk print payment detail
function printPaymentDetail() {
    if (!window.currentPaymentData) {
        alert('❌ Data pembayaran tidak tersedia untuk print');
        return;
    }
    
    const payment = window.currentPaymentData;
    
    // Create print content
    const printContent = `
        <html>
        <head>
            <title>Detail Pembayaran - ${payment.tenant}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #ff8c42; }
                .info-row { display: flex; margin-bottom: 10px; }
                .label { font-weight: bold; width: 150px; }
                .value { flex: 1; }
                .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
                .amount { font-size: 18px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${PAGE_CONFIG.isAtmacanteen ? 'ATMAcanteen Payment System' : 'AJSquare Payment System'}</h2>
                <h3>Detail Pembayaran</h3>
            </div>
            
            <div class="section">
                <h4>Informasi Pembayaran</h4>
                <div class="info-row"><div class="label">ID Transaksi:</div><div class="value">#${payment.id_trans || 'N/A'}</div></div>
                <div class="info-row"><div class="label">Tenant:</div><div class="value">${payment.tenant || 'N/A'}</div></div>
                <div class="info-row"><div class="label">Periode:</div><div class="value">${payment.periode || 'N/A'}</div></div>
                <div class="info-row"><div class="label">Jenis:</div><div class="value">${payment.jenis || 'N/A'}</div></div>
                <div class="info-row"><div class="label">Metode:</div><div class="value">${payment.metode || 'N/A'}</div></div>
            </div>
            
            <div class="section">
                <h4>Detail Nominal</h4>
                <div class="info-row"><div class="label">Tagihan:</div><div class="value amount">Rp ${(payment.tagihan || 0).toLocaleString('id-ID')}</div></div>
                <div class="info-row"><div class="label">Dibayar:</div><div class="value amount">Rp ${(payment.dibayar || 0).toLocaleString('id-ID')}</div></div>
                <div class="info-row"><div class="label">Status:</div><div class="value">${payment.status || 'N/A'}</div></div>
            </div>
            
            <div class="section">
                <h4>Informasi Tambahan</h4>
                <div class="info-row"><div class="label">Tanggal Input:</div><div class="value">${new Date(payment.tanggal_input).toLocaleDateString('id-ID')}</div></div>
                <div class="info-row"><div class="label">Keterangan:</div><div class="value">${payment.keterangan || 'Tidak ada keterangan'}</div></div>
            </div>
            
            <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #666;">
                Dicetak pada: ${new Date().toLocaleString('id-ID')}
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

// Function untuk membuka modal gambar ukuran penuh
function openImageModal(imageUrl) {
    console.log('🖼️ Opening image modal for:', imageUrl);
    
    // Create image modal HTML
    const imageModalContent = `
        <div class="modal fade" id="imageViewModal" tabindex="-1" aria-labelledby="imageViewModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content" style="background: transparent; border: none;">
                    <div class="modal-header" style="background: rgba(0,0,0,0.8); color: white; border: none;">
                        <h5 class="modal-title" id="imageViewModalLabel">
                            <i class="bi bi-image me-2"></i>Bukti Transfer
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center p-0" style="background: rgba(0,0,0,0.9);">
                        <div class="position-relative">
                            <img src="${imageUrl}" 
                                 alt="Bukti Transfer Ukuran Penuh" 
                                 class="img-fluid" 
                                 style="max-height: 80vh; max-width: 100%; object-fit: contain;"
                                 onload="hideImageLoader()"
                                 onerror="showImageError()">
                            
                            <!-- Loading spinner -->
                            <div id="imageLoader" class="position-absolute top-50 start-50 translate-middle text-white">
                                <div class="spinner-border text-light" role="status">
                                    <span class="visually-hidden">Loading...</span>
                                </div>
                                <div class="mt-2">Memuat gambar...</div>
                            </div>
                            
                            <!-- Error message -->
                            <div id="imageErrorMsg" class="position-absolute top-50 start-50 translate-middle text-white text-center d-none">
                                <i class="bi bi-exclamation-triangle" style="font-size: 3rem;"></i>
                                <div class="mt-2">Gagal memuat gambar</div>
                                <small>URL: ${imageUrl}</small>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="background: rgba(0,0,0,0.8); border: none;">
                        <a href="${imageUrl}" target="_blank" class="btn btn-outline-light btn-sm">
                            <i class="bi bi-box-arrow-up-right me-2"></i>Buka di Tab Baru
                        </a>
                        <a href="${imageUrl}" download class="btn btn-success btn-sm">
                            <i class="bi bi-download me-2"></i>Download Gambar
                        </a>
                        <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Tutup
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing image modal if any
    const existingImageModal = document.getElementById('imageViewModal');
    if (existingImageModal) {
        existingImageModal.remove();
    }
    
    // Add image modal to body
    document.body.insertAdjacentHTML('beforeend', imageModalContent);
    
    // Show image modal
    const imageModal = new bootstrap.Modal(document.getElementById('imageViewModal'));
    imageModal.show();
}

// Helper functions for image modal
function hideImageLoader() {
    const loader = document.getElementById('imageLoader');
    if (loader) loader.style.display = 'none';
}

function showImageError() {
    const loader = document.getElementById('imageLoader');
    const errorMsg = document.getElementById('imageErrorMsg');
    
    if (loader) loader.style.display = 'none';
    if (errorMsg) errorMsg.classList.remove('d-none');
}

// ============ PHOTO MERGER DEBUGGING FUNCTIONS ============

// Function untuk debug dan cleanup duplikasi
function debugPhotoMerger() {
    console.log('🔍 PHOTO MERGER DEBUG REPORT:');
    console.log('📊 Merger Files Count:', mergerFiles.length);
    console.log('📝 Merger Files Details:', mergerFiles.map(f => ({
        id: f.id,
        name: f.name,
        size: f.size,
        hasUrl: !!f.url,
        hasImage: !!f.image
    })));
    
    // Check for duplicates
    const duplicates = [];
    const seen = new Set();
    
    mergerFiles.forEach(file => {
        const key = `${file.name}_${file.size}`;
        if (seen.has(key)) {
            duplicates.push(file);
        } else {
            seen.add(key);
        }
    });
    
    if (duplicates.length > 0) {
        console.warn('⚠️ Duplicate files found:', duplicates);
        return { status: 'duplicates_found', duplicates };
    } else {
        console.log('✅ No duplicates found');
        return { status: 'clean', duplicates: [] };
    }
}

// Function untuk cleanup duplikasi
function cleanupDuplicateFiles() {
    console.log('🧹 Cleaning up duplicate files...');
    const debugResult = debugPhotoMerger();
    
    if (debugResult.status === 'duplicates_found') {
        // Keep only unique files (first occurrence)
        const uniqueFiles = [];
        const seen = new Set();
        
        mergerFiles.forEach(file => {
            const key = `${file.name}_${file.size}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueFiles.push(file);
            } else {
                // Revoke URL for duplicate
                if (file.url) {
                    URL.revokeObjectURL(file.url);
                }
                console.log('🗑️ Removed duplicate:', file.name, file.id);
            }
        });
        
        mergerFiles = uniqueFiles;
        console.log('✅ Cleanup complete. Files now:', mergerFiles.length);
        
        // Update UI
        updateFilesList();
        updateMergeButton();
        
        return true;
    }
    
    return false;
}

// ============ END DEBUGGING FUNCTIONS ============

// ============ PHOTO MERGER TOOL ============
// Function untuk membuka photo merger tool
function openPhotoMerger() {
    console.log('🔗 Opening photo merger tool...');
    
    const photomergerModalContent = `
        <div class="modal fade" id="photoMergerModal" tabindex="-1" aria-labelledby="photoMergerModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content" style="border: none; border-radius: 1rem; box-shadow: 0 20px 40px rgba(255, 140, 66, 0.3);">
                    <div class="modal-header" style="background: linear-gradient(135deg, #ff8c42, #ffa726); color: white; border-radius: 1rem 1rem 0 0;">
                        <h5 class="modal-title fw-bold" id="photoMergerModalLabel">
                            <i class="bi bi-images me-2"></i>Photo Merger Tool
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="row g-4">
                            <!-- Upload Section -->
                            <div class="col-12">
                                <div class="card border-0" style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 0.8rem;">
                                    <div class="card-body p-4">
                                        <h6 class="card-title fw-bold mb-3" style="color: #ff8c42;">
                                            <i class="bi bi-cloud-upload me-2"></i>Upload Multiple Photos
                                        </h6>
                                        
                                        <div class="upload-area text-center p-4 mb-3" style="border: 3px dashed #ff8c42; border-radius: 0.8rem; background: rgba(255, 140, 66, 0.05); cursor: pointer;" onclick="document.getElementById('mergerFileInput').click()">
                                            <i class="bi bi-plus-circle" style="font-size: 3rem; color: #ff8c42; opacity: 0.7;"></i>
                                            <p class="mb-2 mt-3 fw-bold" style="color: #ff8c42;">Klik untuk memilih gambar atau drag & drop</p>
                                            <small class="text-muted">Pilih 2-10 gambar (JPG, PNG, GIF • Max 5MB per file)<br>Gambar akan disusun secara <strong>vertikal</strong> (atas ke bawah)</small>
                                            <input type="file" id="mergerFileInput" accept="image/*" multiple style="display: none;" onchange="handleFileSelection(event)">
                                        </div>
                                        
                                        <!-- File Preview Area -->
                                        <div id="filePreviewArea" class="row g-2" style="display: none;">
                                            <div class="col-12 mb-2">
                                                <div class="d-flex justify-content-between align-items-center">
                                                    <small class="text-muted fw-bold">Preview Gambar (urutan vertikal):</small>
                                                    <button type="button" class="btn btn-outline-danger btn-sm" onclick="clearAllFiles()">
                                                        <i class="bi bi-trash me-1"></i>Hapus Semua
                                                    </button>
                                                </div>
                                            </div>
                                            <div id="filesList" class="col-12">
                                                <!-- Dynamic file list will be inserted here -->
                                            </div>
                                        </div>
                                        
                                        <!-- Spacing Control -->
                                        <div class="mt-4">
                                            <label class="form-label fw-bold mb-2">
                                                <i class="bi bi-distribute-vertical me-2"></i>Jarak Antar Gambar:
                                            </label>
                                            <div class="row g-2 align-items-center">
                                                <div class="col">
                                                    <input type="range" class="form-range" id="spacingRange" min="0" max="50" value="10" oninput="updateSpacingValue(this.value)">
                                                </div>
                                                <div class="col-auto">
                                                    <span id="spacingValue" class="badge bg-secondary">10px</span>
                                                </div>
                                                </div>
                                                <div class="col-auto">
                                                    <span id="spacingValue" class="badge bg-secondary">10px</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Preview & Download -->
                            <div class="col-md-6">
                                <div class="card border-0" style="background: linear-gradient(135deg, #fff3e0, #fce4ec); border-radius: 0.8rem;">
                                    <div class="card-body p-4">
                                        <h6 class="card-title fw-bold mb-3" style="color: #ff8c42;">
                                            <i class="bi bi-eye me-2"></i>Preview & Download
                                        </h6>
                                        
                                        <!-- Preview Area -->
                                        <div id="mergePreview" class="text-center p-3 mb-3" style="border: 2px solid #ddd; border-radius: 0.5rem; background: #f8f9fa; min-height: 200px; display: flex; align-items: center; justify-content: center;">
                                            <div class="text-muted">
                                                <i class="bi bi-image" style="font-size: 3rem; opacity: 0.3;"></i>
                                                <p class="mt-2 mb-0">Preview akan muncul di sini</p>
                                            </div>
                                        </div>
                                        
                                        <!-- Control Buttons -->
                                        <div class="d-grid gap-2">
                                            <button type="button" class="btn btn-orange fw-bold" onclick="generateMergedPhoto()" disabled id="mergeBtn">
                                                <i class="bi bi-magic me-2"></i>Gabung Foto
                                            </button>
                                            
                                            <button type="button" class="btn btn-success fw-bold" onclick="downloadMergedPhoto()" disabled id="downloadBtn" style="display: none;">
                                                <i class="bi bi-download me-2"></i>Download Foto Gabungan
                                            </button>
                                            
                                            <!-- Debug buttons -->
                                            <div class="mt-2">
                                                <button type="button" class="btn btn-outline-info btn-sm me-2" onclick="debugPhotoMerger()" title="Debug info">
                                                    <i class="bi bi-bug me-1"></i>Debug
                                                </button>
                                                <button type="button" class="btn btn-outline-warning btn-sm" onclick="cleanupDuplicateFiles()" title="Cleanup duplicates">
                                                    <i class="bi bi-arrow-repeat me-1"></i>Cleanup
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <!-- Info Stats -->
                                        <div id="mergeStats" class="mt-3 p-2 rounded" style="background: rgba(255, 140, 66, 0.1); display: none;">
                                            <small class="text-muted">
                                                <i class="bi bi-info-circle me-1"></i>
                                                <span id="finalDimensions">Final Size: -</span> • 
                                                <span id="totalFiles">Files: 0</span>
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top: 2px solid rgba(255, 140, 66, 0.1);">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-2"></i>Tutup
                        </button>
                        <button type="button" class="btn btn-outline-info" onclick="openPhotoMergerHelp()">
                            <i class="bi bi-question-circle me-2"></i>Panduan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('photoMergerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', photomergerModalContent);
    
    // Initialize photo merger variables
    initializePhotoMerger();
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('photoMergerModal'));
    modal.show();
    
    console.log('✅ Photo merger modal displayed');
}

// Photo merger global variables
let mergerFiles = [];
let mergedCanvas = null;

// Initialize photo merger
function initializePhotoMerger() {
    console.log('\ud83d\udd04 Initializing photo merger...');
    
    // Clear previous state
    mergerFiles = [];
    mergedCanvas = null;
    
    console.log('\u2705 Photo merger state cleared:', {
        mergerFiles: mergerFiles.length,
        mergedCanvas: mergedCanvas
    });
    
    // Setup drag & drop
    const uploadArea = document.querySelector('#photoMergerModal .upload-area');
    if (uploadArea) {
        // Remove any existing event listeners to prevent duplicates
        uploadArea.removeEventListener('dragover', handleDragOver);
        uploadArea.removeEventListener('dragleave', handleDragLeave);  
        uploadArea.removeEventListener('drop', handleDrop);
        
        // Add fresh event listeners
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        
        console.log('✅ Drag & drop event listeners setup');
    }
}

// Drag event handlers to prevent duplication
function handleDragOver(e) {
    e.preventDefault();
    this.style.backgroundColor = 'rgba(255, 140, 66, 0.15)';
    this.style.borderColor = '#ff8c42';
}

function handleDragLeave(e) {
    e.preventDefault();
    this.style.backgroundColor = 'rgba(255, 140, 66, 0.05)';
    this.style.borderColor = '#ff8c42';
}

function handleDrop(e) {
    e.preventDefault();
    this.style.backgroundColor = 'rgba(255, 140, 66, 0.05)';
    this.style.borderColor = '#ff8c42';
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
        console.log('📥 Files dropped:', files.map(f => f.name));
        handleFileSelection({ target: { files: files } });
    }
}

// Handle file selection for merger
function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    
    console.log('📥 File selection started:', {
        totalFiles: files.length,
        currentMergerFiles: mergerFiles.length,
        files: files.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });
    
    // Extra validation: clear any existing duplicates first
    console.log('🧹 Pre-validation cleanup...');
    cleanupDuplicateFiles();
    
    const validFiles = files.filter(file => {
        if (!file.type.startsWith('image/')) {
            console.warn('⚠️ Skipping non-image file:', file.name);
            return false;
        }
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            console.warn('⚠️ File too large (>5MB):', file.name);
            alert(`❌ File "${file.name}" terlalu besar (>5MB)`);
            return false;
        }
        
        // Check for duplicate files (same name and size)
        const isDuplicate = mergerFiles.some(existing => 
            existing.name === file.name && existing.size === file.size
        );
        
        if (isDuplicate) {
            console.warn('⚠️ Skipping duplicate file:', file.name);
            alert(`❌ File "${file.name}" sudah ada dalam list`);
            return false;
        }
        
        return true;
    });
    
    if (validFiles.length === 0) {
        alert('❌ Tidak ada file gambar valid yang dipilih (mungkin semua file sudah ada atau tidak valid)');
        return;
    }
    
    if (mergerFiles.length + validFiles.length > 10) {
        alert('❌ Maksimal 10 gambar yang dapat digabung');
        return;
    }
    
    console.log('📁 Adding valid files to merger:', validFiles.map(f => f.name));
    
    // Add files to merger array
    let addedCount = 0;
    validFiles.forEach((file, index) => {
        const fileObj = {
            file: file,
            id: 'file_' + Date.now() + '_' + index + '_' + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            url: null,
            image: null
        };
        
        // Create object URL for preview
        try {
            fileObj.url = URL.createObjectURL(file);
            mergerFiles.push(fileObj);
            addedCount++;
            console.log(`✅ Added file ${addedCount}:`, fileObj.name, 'ID:', fileObj.id);
        } catch (error) {
            console.error('❌ Failed to create URL for file:', file.name, error);
        }
    });
    
    console.log('📊 File addition complete:', {
        addedFiles: addedCount,
        totalMergerFiles: mergerFiles.length,
        mergerFilesList: mergerFiles.map(f => ({ id: f.id, name: f.name }))
    });
    
    // Update UI
    updateFilesList();
    updateMergeButton();
    
    // Reset file input
    event.target.value = '';
}

// Update files list display
function updateFilesList() {
    const filesList = document.getElementById('filesList');
    const filePreviewArea = document.getElementById('filePreviewArea');
    
    console.log('\ud83d\udd04 Updating files list:', {
        totalFiles: mergerFiles.length,
        filesList: mergerFiles.map(f => ({ id: f.id, name: f.name }))
    });
    
    if (!filesList || !filePreviewArea) {
        console.warn('\u26a0\ufe0f Files list elements not found');
        return;
    }
    
    if (mergerFiles.length === 0) {
        filePreviewArea.style.display = 'none';
        console.log('\ud83d\udcce No files to display, hiding preview area');
        return;
    }
    
    filePreviewArea.style.display = 'block';
    
    // Create unique set to prevent duplicate display
    const uniqueFiles = [];
    const seenIds = new Set();
    
    mergerFiles.forEach(fileObj => {
        if (!seenIds.has(fileObj.id)) {
            seenIds.add(fileObj.id);
            uniqueFiles.push(fileObj);
        } else {
            console.warn('\u26a0\ufe0f Duplicate file ID found in display:', fileObj.id, fileObj.name);
        }
    });
    
    console.log('\ud83d\udd0d Files after duplicate check:', {
        original: mergerFiles.length,
        unique: uniqueFiles.length,
        uniqueFiles: uniqueFiles.map(f => ({ id: f.id, name: f.name }))
    });
    
    const filesHTML = uniqueFiles.map((fileObj, index) => `
        <div class="col-6 col-sm-4 col-md-3 mb-3" id="fileItem_${fileObj.id}">
            <div class="card border-0 shadow-sm position-relative" style="border-radius: 0.5rem; overflow: hidden;">
                <div class="image-container" style="height: 120px; overflow: hidden; background: #f8f9fa;">
                    <img src="${fileObj.url}" alt="${fileObj.name}" class="w-100 h-100" style="object-fit: cover;">
                </div>
                <div class="card-body p-2">
                    <small class="text-muted d-block text-truncate" title="${fileObj.name}">${fileObj.name}</small>
                    <small class="text-muted">${(fileObj.size / 1024).toFixed(1)} KB</small>
                    <div class="text-center mt-2">
                        <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeFile('${fileObj.id}')" title="Hapus file">
                            <i class="bi bi-trash"></i>
                        </button>
                        <span class="badge bg-secondary ms-1">#${index + 1}</span>
                        <small class="d-block text-muted mt-1" title="ID: ${fileObj.id}">${fileObj.id.substring(0, 8)}...</small>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    filesList.innerHTML = filesHTML;
    
    // Update total files count
    const totalFilesElement = document.getElementById('totalFiles');
    if (totalFilesElement) {
        totalFilesElement.textContent = `Files: ${uniqueFiles.length}`;
    }
    
    console.log('\u2705 Files list updated successfully with', uniqueFiles.length, 'unique files');
}

// Remove file from merger
function removeFile(fileId) {
    const fileIndex = mergerFiles.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;
    
    // Revoke object URL to free memory
    const fileObj = mergerFiles[fileIndex];
    if (fileObj.url) {
        URL.revokeObjectURL(fileObj.url);
    }
    
    // Remove from array
    mergerFiles.splice(fileIndex, 1);
    
    console.log('🗑️ File removed:', fileObj.name);
    
    // Update UI
    updateFilesList();
    updateMergeButton();
    
    // Clear preview if no files left
    if (mergerFiles.length === 0) {
        clearMergePreview();
    }
}

// Clear all files
function clearAllFiles() {
    if (mergerFiles.length === 0) return;
    
    if (confirm('❓ Hapus semua gambar yang dipilih?')) {
        // Revoke all object URLs
        mergerFiles.forEach(fileObj => {
            if (fileObj.url) {
                URL.revokeObjectURL(fileObj.url);
            }
        });
        
        // Clear array
        mergerFiles = [];
        
        // Update UI
        updateFilesList();
        updateMergeButton();
        clearMergePreview();
        
        console.log('🗑️ All files cleared');
    }
}

// Update merge button state
function updateMergeButton() {
    const mergeBtn = document.getElementById('mergeBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (!mergeBtn) return;
    
    if (mergerFiles.length >= 2) {
        mergeBtn.disabled = false;
        mergeBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Gabung Foto';
    } else {
        mergeBtn.disabled = true;
        mergeBtn.innerHTML = '<i class="bi bi-magic me-2"></i>Pilih Min. 2 Gambar';
    }
    
    // Hide download button if no merged result
    if (downloadBtn) {
        downloadBtn.style.display = mergedCanvas ? 'block' : 'none';
    }
}

// Update spacing value display
function updateSpacingValue(value) {
    const spacingValue = document.getElementById('spacingValue');
    if (spacingValue) {
        spacingValue.textContent = `${value}px`;
    }
}

// Generate merged photo
async function generateMergedPhoto() {
    if (mergerFiles.length < 2) {
        alert('❌ Pilih minimal 2 gambar untuk digabung');
        return;
    }
    
    const mergeBtn = document.getElementById('mergeBtn');
    const originalBtnText = mergeBtn.innerHTML;
    
    try {
        mergeBtn.disabled = true;
        mergeBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i>Memproses...';
        
        console.log('🎨 Starting photo merge process...');
        
        // Clean up any duplicates before processing
        const hadDuplicates = cleanupDuplicateFiles();
        if (hadDuplicates) {
            console.log('🧹 Duplicates were found and cleaned up before merging');
        }
        
        // Load all images first
        const loadedImages = await loadMergerImages();
        
        console.log('🖼️ Images loaded for merging:', {
            loadedCount: loadedImages.length,
            expectedCount: mergerFiles.length,
            loadedImagesList: loadedImages.map(img => ({ id: img.id, name: img.name, dimensions: `${img.image.width}x${img.image.height}` }))
        });
        
        if (loadedImages.length === 0) {
            throw new Error('Gagal memuat gambar');
        }
        
        if (loadedImages.length !== mergerFiles.length) {
            console.warn('⚠️ Mismatch between merged files and loaded images:', {
                mergerFiles: mergerFiles.length,
                loadedImages: loadedImages.length
            });
        }
        
        // Use fixed vertical layout only
        const layout = 'vertical';
        const spacing = parseInt(document.getElementById('spacingRange')?.value) || 10;
        
        console.log('📐 Merge settings:', { layout, spacing, imageCount: loadedImages.length });
        
        // Create merged canvas
        mergedCanvas = await createMergedCanvas(loadedImages, layout, spacing);
        
        // Show preview
        displayMergePreview(mergedCanvas);
        
        // Update buttons
        updateMergeButton();
        
        console.log('✅ Photo merge completed successfully');
        
    } catch (error) {
        console.error('❌ Photo merge error:', error);
        alert('❌ Terjadi kesalahan saat menggabung foto: ' + error.message);
    }
    
    // Reset button
    mergeBtn.disabled = false;
    mergeBtn.innerHTML = originalBtnText;
}

// Load all merger images into Image objects
async function loadMergerImages() {
    console.log('🖼️ Loading merger images:', {
        totalFiles: mergerFiles.length,
        fileList: mergerFiles.map(f => ({ id: f.id, name: f.name, hasUrl: !!f.url }))
    });
    
    const promises = mergerFiles.map((fileObj, index) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function() {
                fileObj.image = img;
                console.log(`✅ Image ${index + 1} loaded:`, fileObj.name, `${img.width}x${img.height}px`, 'ID:', fileObj.id);
                resolve(fileObj);
            };
            img.onerror = function() {
                console.error(`❌ Failed to load image ${index + 1}:`, fileObj.name, 'ID:', fileObj.id);
                reject(new Error(`Gagal memuat gambar: ${fileObj.name}`));
            };
            
            if (!fileObj.url) {
                console.error(`❌ No URL for image ${index + 1}:`, fileObj.name);
                reject(new Error(`URL tidak tersedia untuk: ${fileObj.name}`));
                return;
            }
            
            img.src = fileObj.url;
        });
    });
    
    try {
        const results = await Promise.all(promises);
        const validResults = results.filter(result => result && result.image);
        
        console.log('📊 Image loading complete:', {
            totalPromises: promises.length,
            successfulLoads: validResults.length,
            loadedImages: validResults.map(r => ({ 
                id: r.id, 
                name: r.name, 
                dimensions: `${r.image.width}x${r.image.height}` 
            }))
        });
        
        if (validResults.length !== mergerFiles.length) {
            console.warn('⚠️ Some images failed to load:', {
                expected: mergerFiles.length,
                actual: validResults.length
            });
        }
        
        return validResults;
    } catch (error) {
        console.error('❌ Error loading images:', error);
        return [];
    }
}

// Create merged canvas based on layout
async function createMergedCanvas(loadedImages, layout, spacing) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate canvas dimensions based on layout
    const dimensions = calculateCanvasDimensions(loadedImages, layout, spacing);
    
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    
    console.log('📏 Canvas dimensions:', dimensions);
    
    // Fill white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw images based on layout
    switch (layout) {
        case 'horizontal':
            drawHorizontalLayout(ctx, loadedImages, spacing, dimensions);
            break;
        case 'vertical':
            drawVerticalLayout(ctx, loadedImages, spacing, dimensions);
            break;
        case 'grid':
            drawGridLayout(ctx, loadedImages, spacing, dimensions);
            break;
        default:
            throw new Error('Layout tidak dikenal: ' + layout);
    }
    
    return canvas;
}

// Calculate canvas dimensions for different layouts
function calculateCanvasDimensions(images, layout, spacing) {
    let totalWidth = 0;
    let totalHeight = 0;
    let maxWidth = 0;
    let maxHeight = 0;
    
    // Find max dimensions and calculate totals
    images.forEach(imageObj => {
        const img = imageObj.image;
        maxWidth = Math.max(maxWidth, img.width);
        maxHeight = Math.max(maxHeight, img.height);
        totalWidth += img.width;
        totalHeight += img.height;
    });
    
    const imageCount = images.length;
    
    switch (layout) {
        case 'horizontal':
            return {
                width: totalWidth + (spacing * (imageCount - 1)),
                height: maxHeight,
                maxWidth,
                maxHeight
            };
            
        case 'vertical':
            return {
                width: maxWidth,
                height: totalHeight + (spacing * (imageCount - 1)),
                maxWidth,
                maxHeight
            };
            
        case 'grid':
            const cols = Math.ceil(Math.sqrt(imageCount));
            const rows = Math.ceil(imageCount / cols);
            return {
                width: (maxWidth * cols) + (spacing * (cols - 1)),
                height: (maxHeight * rows) + (spacing * (rows - 1)),
                maxWidth,
                maxHeight,
                cols,
                rows
            };
            
        default:
            return { width: maxWidth, height: maxHeight, maxWidth, maxHeight };
    }
}

// Draw images in horizontal layout
function drawHorizontalLayout(ctx, images, spacing, dimensions) {
    let currentX = 0;
    
    images.forEach(imageObj => {
        const img = imageObj.image;
        const y = (dimensions.height - img.height) / 2; // Center vertically
        
        ctx.drawImage(img, currentX, y);
        currentX += img.width + spacing;
    });
}

// Draw images in vertical layout
function drawVerticalLayout(ctx, images, spacing, dimensions) {
    console.log('🎨 Drawing vertical layout:', {
        imageCount: images.length,
        spacing: spacing,
        canvasSize: `${dimensions.width}x${dimensions.height}`,
        images: images.map(img => ({ 
            name: img.name, 
            id: img.id,
            dimensions: `${img.image.width}x${img.image.height}` 
        }))
    });
    
    let currentY = 0;
    
    images.forEach((imageObj, index) => {
        const img = imageObj.image;
        const x = (dimensions.width - img.width) / 2; // Center horizontally
        
        console.log(`🖼️ Drawing image ${index + 1}:`, {
            name: imageObj.name,
            id: imageObj.id,
            position: { x, y: currentY },
            size: { width: img.width, height: img.height }
        });
        
        ctx.drawImage(img, x, currentY);
        currentY += img.height + spacing;
    });
}

// Draw images in grid layout
function drawGridLayout(ctx, images, spacing, dimensions) {
    const cols = dimensions.cols;
    
    images.forEach((imageObj, index) => {
        const img = imageObj.image;
        
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const x = col * (dimensions.maxWidth + spacing);
        const y = row * (dimensions.maxHeight + spacing);
        
        // Center image in its grid cell
        const offsetX = (dimensions.maxWidth - img.width) / 2;
        const offsetY = (dimensions.maxHeight - img.height) / 2;
        
        ctx.drawImage(img, x + offsetX, y + offsetY);
    });
}

// Display merge preview
function displayMergePreview(canvas) {
    const previewArea = document.getElementById('mergePreview');
    const statsArea = document.getElementById('mergeStats');
    const dimensionsSpan = document.getElementById('finalDimensions');
    
    if (!previewArea) return;
    
    // Create preview image
    const previewImg = document.createElement('img');
    previewImg.src = canvas.toDataURL('image/png');
    previewImg.className = 'img-fluid';
    previewImg.style.maxHeight = '180px';
    previewImg.style.borderRadius = '0.5rem';
    previewImg.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
    previewImg.style.cursor = 'pointer';
    previewImg.onclick = function() {
        openImageModal(this.src);
    };
    
    // Clear and update preview area
    previewArea.innerHTML = '';
    previewArea.appendChild(previewImg);
    
    // Update stats
    if (dimensionsSpan) {
        const fileSizeKB = Math.round(canvas.toDataURL('image/png').length * 0.75 / 1024);
        dimensionsSpan.textContent = `Final Size: ${canvas.width}x${canvas.height}px (≈${fileSizeKB} KB)`;
    }
    
    if (statsArea) {
        statsArea.style.display = 'block';
    }
    
    console.log('✅ Merge preview displayed');
}

// Clear merge preview
function clearMergePreview() {
    const previewArea = document.getElementById('mergePreview');
    const statsArea = document.getElementById('mergeStats');
    const downloadBtn = document.getElementById('downloadBtn');
    
    if (previewArea) {
        previewArea.innerHTML = `
            <div class="text-muted">
                <i class="bi bi-image" style="font-size: 3rem; opacity: 0.3;"></i>
                <p class="mt-2 mb-0">Preview akan muncul di sini</p>
            </div>
        `;
    }
    
    if (statsArea) {
        statsArea.style.display = 'none';
    }
    
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
    
    mergedCanvas = null;
}

// Download merged photo
// Download merged photo
function downloadMergedPhoto() {
    if (!mergedCanvas) {
        alert('❌ Belum ada foto gabungan untuk diunduh');
        return;
    }
    
    console.log('📥 Starting download process...', {
        canvasSize: `${mergedCanvas.width}x${mergedCanvas.height}`,
        filesUsed: mergerFiles.length
    });
    
    try {
        // Method 1: Try direct canvas download
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
        const filename = `merged-photos-vertical-${timestamp}.png`;
        
        // Try modern download API first
        if (mergedCanvas.toBlob && typeof mergedCanvas.toBlob === 'function') {
            mergedCanvas.toBlob(function(blob) {
                if (!blob) {
                    console.error('❌ Failed to create blob from canvas');
                    tryFallbackDownload();
                    return;
                }
                
                console.log('✅ Canvas converted to blob:', {
                    blobSize: (blob.size / 1024).toFixed(2) + ' KB',
                    blobType: blob.type
                });
                
                // Create download link with multiple approaches
                const url = URL.createObjectURL(blob);
                
                // Try HTML5 download attribute
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                link.style.display = 'none';
                
                document.body.appendChild(link);
                
                // Force click with user event simulation
                const clickEvent = new MouseEvent('click', {
                    view: window,
                    bubbles: true,
                    cancelable: false
                });
                
                console.log('🎯 Triggering download:', filename);
                
                try {
                    link.dispatchEvent(clickEvent);
                    console.log('✅ Download event dispatched');
                    alert('✅ Download dimulai! Cek folder Download Anda untuk file: ' + filename);
                } catch (err) {
                    console.error('❌ Event dispatch failed:', err);
                    // Try direct click
                    link.click();
                    alert('✅ Download alternatif dimulai!');
                }
                
                // Cleanup
                setTimeout(() => {
                    try {
                        if (document.body.contains(link)) {
                            document.body.removeChild(link);
                        }
                        URL.revokeObjectURL(url);
                        console.log('✅ Download cleanup completed');
                    } catch (cleanupError) {
                        console.warn('⚠️ Cleanup warning:', cleanupError);
                    }
                }, 2000);
                
            }, 'image/png', 0.95);
        } else {
            tryFallbackDownload();
        }
        
        // Fallback download method
        function tryFallbackDownload() {
            console.log('🔄 Trying fallback download method...');
            try {
                // Method 2: Convert to data URL and open in new window
                const dataURL = mergedCanvas.toDataURL('image/png', 0.95);
                
                if (dataURL && dataURL.length > 100) {
                    const newWindow = window.open('', '_blank');
                    if (newWindow) {
                        newWindow.document.write(`
                            <html>
                                <head>
                                    <title>${filename}</title>
                                    <style>
                                        body { margin: 0; text-align: center; background: #f0f0f0; }
                                        img { max-width: 100%; height: auto; margin: 20px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
                                        .download-btn { 
                                            display: inline-block; 
                                            padding: 10px 20px; 
                                            background: #28a745; 
                                            color: white; 
                                            text-decoration: none; 
                                            border-radius: 5px; 
                                            margin: 20px;
                                            font-family: Arial;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <h2>Foto Gabungan Berhasil!</h2>
                                    <img src="${dataURL}" alt="Merged Photos">
                                    <br>
                                    <a href="${dataURL}" download="${filename}" class="download-btn">💾 Download Foto</a>
                                    <br><br>
                                    <p><em>Atau klik kanan pada gambar → Save Image As</em></p>
                                </body>
                            </html>
                        `);
                        newWindow.document.close();
                        alert('✅ Foto dibuka di tab baru! Klik tombol download hijau atau klik kanan → Save Image As');
                    } else {
                        // Method 3: Force download via data URL
                        const link = document.createElement('a');
                        link.href = dataURL;
                        link.download = filename;
                        link.click();
                        alert('✅ Download paksa dimulai! Jika tidak berhasil, coba izinkan popup dan ulangi.');
                    }
                } else {
                    throw new Error('Canvas toDataURL failed');
                }
            } catch (fallbackError) {
                console.error('❌ All download methods failed:', fallbackError);
                alert('❌ Download gagal. Silakan:\n1. Refresh halaman\n2. Coba upload ulang foto\n3. Gunakan browser lain (Chrome/Firefox)');
            }
        }
        
    } catch (error) {
        console.error('❌ Download error:', error);
        alert('❌ Terjadi kesalahan saat mengunduh: ' + error.message);
    }
}

// Open photo merger help
function openPhotoMergerHelp() {
    const helpContent = `
        <div class="modal fade" id="photoMergerHelpModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-info text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-question-circle me-2"></i>Panduan Photo Merger
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <h6 class="fw-bold text-primary">🎯 Cara Menggunakan:</h6>
                        <ol class="mb-4">
                            <li><strong>Upload Gambar:</strong> Klik area upload atau drag & drop 2-10 gambar</li>
                            <li><strong>Pilih Layout:</strong> Pilih horizontal, vertical, atau grid</li>
                            <li><strong>Atur Jarak:</strong> Sesuaikan jarak antar gambar dengan slider</li>
                            <li><strong>Gabung:</strong> Klik tombol "Gabung Foto"</li>
                            <li><strong>Download:</strong> Unduh hasil gabungan dalam format PNG</li>
                        </ol>
                        
                        <h6 class="fw-bold text-success">✅ Tips & Trik:</h6>
                        <ul class="mb-4">
                            <li>Gunakan gambar dengan resolusi yang seimbang untuk hasil terbaik</li>
                            <li>Layout <strong>horizontal</strong> cocok untuk timeline foto</li>
                            <li>Layout <strong>vertical</strong> bagus untuk kolase story</li>
                            <li>Layout <strong>grid</strong> ideal untuk koleksi foto</li>
                            <li>Urutkan gambar dengan cara drag sebelum menggabung</li>
                        </ul>
                        
                        <h6 class="fw-bold text-warning">⚠️ Keterbatasan:</h6>
                        <ul>
                            <li>Maksimal 10 gambar per gabungan</li>
                            <li>Ukuran file maksimal 5MB per gambar</li>
                            <li>Format yang didukung: JPG, PNG, GIF</li>
                            <li>Hasil download dalam format PNG</li>
                        </ul>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Tutup</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing help modal
    const existingHelp = document.getElementById('photoMergerHelpModal');
    if (existingHelp) existingHelp.remove();
    
    // Add help modal
    document.body.insertAdjacentHTML('beforeend', helpContent);
    
    // Show help modal
    const helpModal = new bootstrap.Modal(document.getElementById('photoMergerHelpModal'));
    helpModal.show();
}

// ============ END PHOTO MERGER TOOL ============

// Expose debugging functions to console for easy access
if (typeof window !== 'undefined') {
    window.photoMergerDebug = {
        debug: debugPhotoMerger,
        cleanup: cleanupDuplicateFiles,
        files: () => mergerFiles,
        canvas: () => mergedCanvas,
        reset: () => {
            mergerFiles.forEach(file => {
                if (file.url) URL.revokeObjectURL(file.url);
            });
            mergerFiles = [];
            mergedCanvas = null;
            if (document.getElementById('filePreviewArea')) {
                updateFilesList();
                updateMergeButton();
                clearMergePreview();
            }
            console.log('🔄 Photo merger state reset');
        }
    };
    console.log('🔧 Photo merger debugging tools available at window.photoMergerDebug');
}

// Setup form handler untuk halaman pembayaran
function setupPaymentForm() {
    const form = document.getElementById('formPembayaran');
    if (!form) {
        console.log('Form pembayaran tidak ditemukan');
        return;
    }
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('📝 Form pembayaran disubmit');
        
        // Ambil data dari form
        const formData = {
            tenant: document.getElementById('inputTenant').value,
            periode: document.getElementById('inputPeriode').value,
            jenis: document.getElementById('inputJenis').value,
            tagihan: document.getElementById('inputTagihan').value,
            dibayar: document.getElementById('inputDibayar').value,
            metode: document.getElementById('inputMetode').value,
            keterangan: document.getElementById('inputKeterangan').value
        };
        
        // Ambil file gambar jika ada
        const fileInput = document.getElementById('inputBukti');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        
        console.log('🔍 File input element:', fileInput);
        console.log('📁 File selected:', file);
        if (file) {
            console.log('📊 File details:', {
                name: file.name,
                size: file.size,
                type: file.type
            });
        }
        
        // Validasi form
        if (!formData.tenant || !formData.periode || !formData.jenis || !formData.tagihan || !formData.dibayar) {
            alert('❌ Silakan lengkapi semua field yang wajib diisi!');
            return;
        }
        
        // Update tombol submit
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-hourglass-split me-2"></i> Menyimpan...';
        
        try {
            // Simpan data dengan file upload (jika ada)
            const result = await savePaymentData(formData, file);
            
            if (result.success) {
                alert('✅ Data pembayaran berhasil disimpan!');
                
                // Reset form
                form.reset();
                
                // Reload tenant list
                loadTenantList();
                
                // Refresh history jika sedang di tab progres
                const activeTab = document.querySelector('.nav-link.active');
                if (activeTab && activeTab.id === 'pills-progres-tab') {
                    loadPaymentHistory();
                }
                
                console.log('✅ Form berhasil diproses dan direset');
                
            } else {
                alert('❌ Error: ' + result.error);
                console.error('Form submission error:', result.error);
            }
            
        } catch (error) {
            alert('❌ Terjadi kesalahan sistem: ' + error.message);
            console.error('Form submission error:', error);
        }
        
        // Reset tombol submit
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    });
    
    // Setup file input preview
    const fileInput = document.getElementById('inputBukti');
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const fileLabel = fileInput.parentElement.querySelector('.file-label');
            
            if (file) {
                console.log('📁 File selected:', file.name, file.type, file.size + ' bytes');
                
                // Show file info next to input
                let fileInfo = fileInput.parentElement.querySelector('.file-info');
                if (!fileInfo) {
                    fileInfo = document.createElement('small');
                    fileInfo.className = 'file-info text-muted mt-1 d-block';
                    fileInput.parentElement.appendChild(fileInfo);
                }
                
                const fileSize = (file.size / 1024 / 1024).toFixed(2);
                fileInfo.innerHTML = `✅ ${file.name} (${fileSize} MB)`;
                fileInfo.style.color = '#28a745';
            } else {
                // Remove file info if no file
                const fileInfo = fileInput.parentElement.querySelector('.file-info');
                if (fileInfo) fileInfo.remove();
            }
        });
    }
    
    console.log('✅ Form pembayaran handler setup complete');
}

// Setup smooth tab navigation without page jumping
function setupSmoothTabNavigation() {
    console.log('🔧 Setting up smooth tab navigation...');
    
    // Get tab elements
    const inputTab = document.getElementById('pills-input-tab');
    const progressTab = document.getElementById('pills-progres-tab');
    const inputContent = document.getElementById('pills-input');
    const progressContent = document.getElementById('pills-progres');
    
    if (!inputTab || !progressTab || !inputContent || !progressContent) {
        console.error('❌ Tab elements not found');
        return;
    }
    
    // Determine sessionStorage key based on current page
    const tabKey = window.location.pathname.includes('ajsquare')
        ? 'ajsquare_aktif_tab'
        : 'atmacanteen_aktif_tab';
    
    // Prevent default Bootstrap behavior and handle manually for smooth transition
    let isTabSwitching = false;
    
    // Handle Form Input tab
    inputTab.addEventListener('click', function(e) {
        e.preventDefault();
        if (isTabSwitching) return;
        
        isTabSwitching = true;
        console.log('📝 Switching to Form Input tab');
        
        // Smooth transition
        switchToTab(inputTab, inputContent, progressTab, progressContent);
        sessionStorage.setItem(tabKey, 'pills-input');
        
        setTimeout(() => {
            isTabSwitching = false;
        }, 300);
    });
    
    // Handle Lihat Progres tab
    progressTab.addEventListener('click', function(e) {
        e.preventDefault();
        if (isTabSwitching) return;
        
        isTabSwitching = true;
        console.log('📊 Switching to Progress tab');
        
        // Smooth transition
        switchToTab(progressTab, progressContent, inputTab, inputContent);
        sessionStorage.setItem(tabKey, 'pills-progres');
        
        // Load payment history after transition
        setTimeout(() => {
            loadPaymentHistory();
            isTabSwitching = false;
        }, 300);
    });
    
    // Restore saved tab from sessionStorage, default to 'pills-input'
    const savedTab = sessionStorage.getItem(tabKey) || 'pills-input';
    if (savedTab === 'pills-progres') {
        switchToTab(progressTab, progressContent, inputTab, inputContent);
        setTimeout(() => loadPaymentHistory(), 500);
    }
    
    console.log('✅ Smooth tab navigation setup complete');
}

// Function to handle smooth tab switching
function switchToTab(activeTab, activeContent, inactiveTab, inactiveContent) {
    // Update tab states
    inactiveTab.classList.remove('active');
    inactiveTab.setAttribute('aria-selected', 'false');
    activeTab.classList.add('active');
    activeTab.setAttribute('aria-selected', 'true');
    
    // Smooth content transition
    inactiveContent.classList.remove('show', 'active');
    inactiveContent.style.opacity = '0';
    
    setTimeout(() => {
        activeContent.classList.add('show', 'active');
        activeContent.style.opacity = '1';
        activeContent.style.transition = 'opacity 0.3s ease-in-out';
    }, 150);
}
    
// Setup refresh button functionality
document.addEventListener('click', function(e) {
    if (e.target.closest('button')?.innerHTML.includes('Refresh Data')) {
        console.log('🔄 Manual refresh triggered');
        loadPaymentHistory();
    }
});

console.log('✅ Tab handlers setup complete');

// Setup protection untuk halaman dashboard dan kelola
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.toLowerCase();
    
    // Proteksi halaman yang memerlukan login (bukan halaman login itu sendiri)
    const isLoginPage = currentPage === '/' || currentPage.endsWith('/index.html') && !currentPage.includes('/dashboard') && !currentPage.includes('/kelola') && !currentPage.includes('/event');
    const isProtectedPage = currentPage.includes('/dashboard') || currentPage.includes('/kelola-ajsquare') || currentPage.includes('/kelola-atmacanteen') || currentPage.includes('/event-nonav-ajmn');
    
    if (isProtectedPage) {
        protectPage().then(isAuthenticated => {
            if (isAuthenticated) {
                toggleAuthElements();
                
                // Load tenant data khusus untuk halaman kelola
                if (currentPage.includes('/kelola-ajsquare') || currentPage.includes('/kelola-atmacanteen')) {
                    console.log('📄 Halaman kelola detected, loading tenant data...');
                    loadTenantList();
                    
                    // Setup form handler untuk pembayaran
                    setupPaymentForm();
                }
                
                // Setup logout buttons
                const logoutButtons = document.querySelectorAll('[data-logout]');
                logoutButtons.forEach(btn => {
                    btn.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        if (confirm('Yakin ingin logout?')) {
                            logoutAdmin();
                        }
                    });
                });
            }
        });
    }
    
    // Auto refresh auth elements jika ada perubahan
    supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event, session);
        
        if (event === 'SIGNED_OUT') {
            window.location.href='/';
        } else if (event === 'SIGNED_IN') {
            toggleAuthElements();
            
            // Load tenant data jika di halaman kelola setelah login
            if (window.location.pathname.toLowerCase().includes('/kelola-ajsquare') || window.location.pathname.toLowerCase().includes('/kelola-atmacanteen')) {
                setTimeout(() => loadTenantList(), 100);
            }
        }
    });
    
    // Fallback: Load tenant data langsung jika di halaman kelola (untuk development)
    if (currentPage.includes('kelola-ajsquare.html') || currentPage.includes('kelola-atmacanteen.html')) {
        setTimeout(() => {
            const selectElement = document.getElementById('inputTenant');
            if (selectElement && selectElement.innerHTML.includes('Memuat data tenant dari server')) {
                console.log('🔄 Fallback: Loading tenant data...');
                loadTenantList();
            }
        }, 1000);
    }
});


