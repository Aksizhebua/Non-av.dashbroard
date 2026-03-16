function loadJenisEventDropdown() {
    const select = document.getElementById('jenis_event_dropdown');
    if (!select) return;
    const pilihanEvent = ['Wedding', 'Corporate', 'Seminar', 'Komunitas', 'Lainnya'];
    select.innerHTML = '<option value="">Pilih Jenis Event</option>';
    pilihanEvent.forEach(jenis => {
        select.innerHTML += `<option value="${jenis}">${jenis}</option>`;
    });
}

document.addEventListener('DOMContentLoaded', loadJenisEventDropdown);
