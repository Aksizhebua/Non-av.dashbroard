// Booking Event - Supabase Integration
// Table: BOOKING_EVENT

const supabaseUrl = 'https://cvjzkdzuuuutgbobiwju.supabase.co';
const supabaseKey = 'sb_publishable_do3L5iqYASgCW0OowBaj3w__46lHRCX';
const supabase = window.supabase || {};
const supabaseClient = supabase.createClient ? supabase.createClient(supabaseUrl, supabaseKey) : null;

async function submitBookingEvent(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        id_booking: form.id_booking.value,
        nama_event: form.nama_event.value,
        jenis_event: form.jenis_event.value,
        tanggal_event: form.tanggal_event.value,
        jam_mulai: form.jam_mulai.value,
        jam_selesai: form.jam_selesai.value,
        pic_penyewa: form.pic_penyewa.value,
        no_hp_pic: form.no_hp_pic.value,
        status_alur: form.status_alur.value,
        total_nilai_kontra: form.total_nilai_kontra.value,
        dokumen_pks: form.dokumen_pks.value,
        created_at: new Date().toISOString()
    };
    
    if (!supabaseClient) {
        alert('Supabase client not initialized!');
        return;
    }
    const { error } = await supabaseClient.from('BOOKING_EVENT').insert([data]);
    if (error) {
        alert('Gagal menyimpan booking: ' + error.message);
    } else {
        alert('Booking berhasil disimpan!');
        form.reset();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('form-booking-event');
    if (form) {
        form.addEventListener('submit', submitBookingEvent);
    }
});
