/* ═══════════════════════════════════════════════════
   app.js — Fase 6
   Init app + semua event listeners.
   Ini satu-satunya file yang boleh memanggil
   document.getElementById untuk binding events.
   ═══════════════════════════════════════════════════ */

// ── INIT ──

window.addEventListener('beforeunload', simpanSesiKeRiwayat);

muatSesiAktif();
sinkronkanStateDariSesiAktif();
renderFilePreview();
renderPinned();
renderRiwayatSidebar();

// Set model label di header sesuai state
document.getElementById('teksModeTampil').innerText = AppState.labelAktif;
document.querySelectorAll('.dropdown-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-mode') === AppState.modeAktif);
});

// ── CHAT INPUT ──

document.getElementById('tombolKirim').addEventListener('click', kirimPesan);

document.getElementById('kolomTanya').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); kirimPesan(); }
});

document.getElementById('kolomTanya').addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});

// ── MODEL DROPDOWN ──

document.getElementById('tombolDropdown').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('menuDropdown').classList.toggle('show');
});

document.addEventListener('click', () => document.getElementById('menuDropdown').classList.remove('show'));

document.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        AppState.modeAktif     = item.getAttribute('data-mode');
        AppState.providerAktif = item.getAttribute('data-provider') || 'gemini';
        const labels = { instan: 'Gemini Flash', thinking: 'Gemini Thinking', claude: 'Claude Sonnet', ollama: 'Ollama' };
        AppState.labelAktif    = labels[AppState.modeAktif] || 'Funixx AI';
        document.getElementById('teksModeTampil').innerText = AppState.labelAktif;
        simpanModelPref({ mode: AppState.modeAktif, provider: AppState.providerAktif, label: AppState.labelAktif, ollamaModel: AppState.ollamaModelAktif });
        document.getElementById('menuDropdown').classList.remove('show');
        updateOllamaBar();
    });
});

// ── OLLAMA BAR ──

function updateOllamaBar() {
    const bar = document.getElementById('ollamaBar');
    const isOllama = AppState.providerAktif === 'ollama';
    bar.style.display = isOllama ? 'flex' : 'none';
    if (!isOllama) return;

    // Fetch models dari API jika belum tersimpan
    if (!AppState.ollamaModelsList || AppState.ollamaModelsList.length === 0) {
        isiOllamaSelect();
    } else {
        // Jika sudah ada data, langsung render options
        const select = document.getElementById('ollamaModelSelect');
        const models = AppState.ollamaModelsList || [];
        select.innerHTML = models.length
            ? models.map(m => `<option value="${m}" ${m === AppState.ollamaModelAktif ? 'selected' : ''}>${m}</option>`).join('')
            : `<option value="${AppState.ollamaModelAktif}">${AppState.ollamaModelAktif}</option>`;
    }
}

document.getElementById('ollamaModelSelect').addEventListener('change', function () {
    AppState.ollamaModelAktif = this.value;
    simpanModelPref({ mode: AppState.modeAktif, provider: AppState.providerAktif, label: AppState.labelAktif, ollamaModel: this.value });
});

updateOllamaBar(); // init saat load

// ── SIDEBAR ──

document.getElementById('btnMenu').addEventListener('click', () => {
    renderRiwayatSidebar();
    document.getElementById('sidebarMenu').classList.add('open');
    document.getElementById('sidebarOverlay').classList.add('show');
});

document.getElementById('sidebarOverlay').addEventListener('click', () => {
    document.getElementById('sidebarMenu').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
});

document.getElementById('btnPengaturan').addEventListener('click', () => {
    document.getElementById('submenuPengaturan').classList.toggle('show');
});

document.getElementById('btnChatBaru').addEventListener('click', () => {
    simpanSesiKeRiwayat();
    sessionStorage.removeItem(KUNCI_SESI);
    resetTransientState();
    document.getElementById('chatBox').innerHTML = '';
    document.getElementById('welcome-screen').style.display = 'block';
    document.getElementById('sidebarMenu').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
    renderRiwayatSidebar();
});

document.getElementById('btnHapusSemua').addEventListener('click', () => {
    if (confirm('Yakin hapus semua riwayat?')) { simpanSemuaRiwayat([]); renderRiwayatSidebar(); }
});

// ── CONTEXT MENU RIWAYAT ──

document.getElementById('btnHapusRiwayatCtx').addEventListener('click', () => {
    if (AppState.contextTargetIdx === -1) return;
    const d = ambilSemuaRiwayat();
    d.splice(AppState.contextTargetIdx, 1);
    simpanSemuaRiwayat(d);
    renderRiwayatSidebar();
    tutupContextMenu();
});

document.addEventListener('touchstart', (e) => {
    const menu = document.getElementById('contextMenuRiwayat');
    if (menu.classList.contains('show') && !menu.contains(e.target)) tutupContextMenu();
});

// ── MODAL RIWAYAT ──

document.getElementById('tutupRiwayat').addEventListener('click', () => {
    document.getElementById('modalRiwayat').classList.remove('show');
});

document.getElementById('btnLanjutkanChat').addEventListener('click', () => {
    if (!AppState.riwayatAktifDibuka) return;
    resetTransientState();
    const clonedPesan = safeParseStorage(JSON.stringify(AppState.riwayatAktifDibuka.pesan || []), '[]');
    const semua = ambilSemuaRiwayat();
    const idx   = semua.findIndex(r => r.id === AppState.riwayatAktifDibuka.id);
    if (idx !== -1) { semua.splice(idx, 1); simpanSemuaRiwayat(semua); }
    simpanSesiKeRiwayat();
    sessionStorage.removeItem(KUNCI_SESI);
    simpanSesiAktif(clonedPesan);
    document.getElementById('modalRiwayat').classList.remove('show');
    document.getElementById('sidebarMenu').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    document.getElementById('welcome-screen').style.display = 'none';
    clonedPesan.forEach(p => tambahPesan(p.teks, p.pengirim, false, p.pengirim==='ai'?(p.label||''):'', !!p.renderAsHtml, p.requestData||null, p.id||null, p.modelText||null, !!p.error, !!p.retryable, !!p.aborted, p.errorMessage||''));
    chatBox.scrollTop = chatBox.scrollHeight;
    sinkronkanStateDariSesiAktif();
    AppState.riwayatAktifDibuka = null;
    renderRiwayatSidebar();
});

// ── MODAL MEMORI ──

document.getElementById('btnBukaMemori').addEventListener('click', () => {
    document.getElementById('sidebarMenu').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
    document.getElementById('modalMemori').classList.add('show');
    tampilkanDaftarMemori();
});

document.getElementById('tutupMemori').addEventListener('click', () => {
    document.getElementById('modalMemori').classList.remove('show');
});

document.getElementById('btnTambahMemori').addEventListener('click', () => {
    const teks = document.getElementById('inputMemoriBaru').value.trim();
    if (!teks) return;
    const d = ambilMemori(); d.push(teks);
    simpanMemori(d);
    document.getElementById('inputMemoriBaru').value = '';
    tampilkanDaftarMemori();
});

document.getElementById('btnHapusSemua2').addEventListener('click', () => {
    if (confirm('Yakin hapus semua memori AI?')) { simpanMemori([]); tampilkanDaftarMemori(); }
});

// ── MODAL SETTINGS ──

document.getElementById('btnBukaSettings').addEventListener('click', () => {
    document.getElementById('sidebarMenu').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
    const s = ambilSettings();
    document.getElementById('inputGeminiKey').value  = s.geminiKey  || '';
    document.getElementById('inputClaudeKey').value  = s.claudeKey  || '';
    document.getElementById('inputClaudeUrl').value  = s.claudeUrl  || 'https://api.enowxlabs.com/v1';
    document.getElementById('inputOllamaUrl').value  = s.ollamaUrl  || 'http://localhost:11434';
    document.getElementById('modalSettings').classList.add('show');
});

document.getElementById('tutupSettings').addEventListener('click', () => {
    document.getElementById('modalSettings').classList.remove('show');
});

document.getElementById('btnSimpanSettings').addEventListener('click', () => {
    simpanSettings({
        geminiKey: document.getElementById('inputGeminiKey').value.trim(),
        claudeKey: document.getElementById('inputClaudeKey').value.trim(),
        claudeUrl: document.getElementById('inputClaudeUrl').value.trim() || 'https://api.enowxlabs.com/v1',
        ollamaUrl: document.getElementById('inputOllamaUrl').value.trim() || 'http://localhost:11434'
    });
    document.getElementById('modalSettings').classList.remove('show');
    showToast('API Key tersimpan ✓');
});

// ── FILE & GAMBAR UPLOAD ──

document.getElementById('btnAttach').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const ext      = file.name.split('.').pop().toLowerCase();
    const imgExts  = ['png','jpg','jpeg','webp','gif'];
    const textExts = ['html','htm','txt','js','css','json','md','ts','jsx','tsx','py','php','java','cpp','c','xml','csv','yaml','yml'];

    if (imgExts.includes(ext)) {
        if (file.size > 5000000) { showToast('Gambar terlalu besar (maks 5MB)'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            AppState.imageData = ev.target.result.split(',')[1];
            AppState.imageMime = file.type;
            document.getElementById('imgPreviewThumb').src = ev.target.result;
            document.getElementById('imgPreviewWrap').classList.add('show');
        };
        reader.readAsDataURL(file);
    } else if (textExts.includes(ext)) {
        if (file.size > 100000) { showToast('File terlalu besar (maks 100KB)'); e.target.value = ''; return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            AppState.fileContent   = ev.target.result;
            AppState.fileName      = file.name;
            AppState.persistedFile = ringkasFileUntukStorage({ name: file.name, content: ev.target.result, ext });
            simpanFilePersisten(AppState.persistedFile);
            renderFilePreview();
        };
        reader.readAsText(file);
    } else {
        showToast('File ' + ext.toUpperCase() + ' tidak didukung');
    }
    e.target.value = '';
});

document.getElementById('btnHapusImg').addEventListener('click', () => {
    AppState.imageData = null; AppState.imageMime = null;
    document.getElementById('imgPreviewWrap').classList.remove('show');
    document.getElementById('imgPreviewThumb').src = '';
});

document.getElementById('btnHapusFile').addEventListener('click', () => {
    AppState.fileContent = null; AppState.fileName = null; AppState.persistedFile = null;
    simpanFilePersisten(null);
    document.getElementById('filePreview').classList.remove('show');
    document.getElementById('filePreviewName').innerHTML = '';
    showToast('File dihapus dari sesi');
});
