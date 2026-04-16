/* ═══════════════════════════════════════════════════
   storage.js — Fase 2
   Semua baca/tulis localStorage & sessionStorage.
   Tidak boleh ada logic DOM atau UI di sini.
   ═══════════════════════════════════════════════════ */

// ── KUNCI STORAGE ──
const KUNCI_MEMORI     = 'funixx_memori';
const KUNCI_RIWAYAT    = 'funixx_semua_riwayat';
const KUNCI_SESI       = 'funixx_sesi_aktif';
const KUNCI_SETTINGS   = 'funixx_settings';
const KUNCI_FILE_AKTIF = 'funixx_file_aktif';
const KUNCI_PIN        = 'funixx_pinned';
const KUNCI_MODEL      = 'funixx_model';

// ── BATAS PENYIMPANAN ──
const BATAS_POTONG_STORAGE         = 12000;
const BATAS_POTONG_FILE_PERSISTEN  = 20000;

// ── UTILITAS DASAR ──

function safeParseStorage(raw, fallback) {
    try {
        const parsed = JSON.parse(raw || fallback);
        return parsed === null && fallback !== 'null' ? JSON.parse(fallback) : parsed;
    } catch (e) {
        try { return JSON.parse(fallback); } catch (e2) { return fallback; }
    }
}

function safeSetItem(storage, key, value) {
    try { storage.setItem(key, value); return true; }
    catch (e) { console.warn('Gagal menyimpan storage', key, e); return false; }
}

function potongTeksStorage(teks, batas) {
    const limit = batas || BATAS_POTONG_STORAGE;
    const raw = typeof teks === 'string' ? teks : String(teks || '');
    if (raw.length <= limit) return raw;
    return raw.substring(0, limit) + '\n\n[... dipotong ' + (raw.length - limit) + ' karakter untuk menghemat penyimpanan ...]';
}

function teksStorageTerpotong(teks) {
    return typeof teks === 'string' && teks.includes('[... dipotong ');
}

// ── NORMALISASI & RINGKAS ──

function ringkasFileUntukStorage(fileObj) {
    if (!fileObj || !fileObj.name || typeof fileObj.content !== 'string') return null;
    const content = potongTeksStorage(fileObj.content, BATAS_POTONG_FILE_PERSISTEN);
    return {
        name: fileObj.name,
        ext: fileObj.ext || String(fileObj.name).split('.').pop() || 'txt',
        content,
        truncated: teksStorageTerpotong(content)
    };
}

function ringkasRequestDataUntukStorage(d) {
    if (!d) return null;
    const promptRingkas = potongTeksStorage(d.prompt || '', BATAS_POTONG_STORAGE);
    const out = {
        prompt: promptRingkas,
        imageData: d.imageData || null,
        imageMime: d.imageMime || null,
        label: d.label || '',
        mode: d.mode || '',
        provider: d.provider || '',
        promptTruncated: teksStorageTerpotong(promptRingkas),
        imageOmitted: false,
        storageSnapshot: false
    };
    if (out.promptTruncated) out.storageSnapshot = true;
    return out;
}

function normalisasiPesanUntukStorage(entry) {
    if (!entry || typeof entry !== 'object') return entry;
    const out = { ...entry };
    if (typeof out.teks === 'string')         out.teks         = potongTeksStorage(out.teks, BATAS_POTONG_STORAGE);
    if (typeof out.modelText === 'string')    out.modelText    = potongTeksStorage(out.modelText, BATAS_POTONG_STORAGE);
    if (typeof out.errorMessage === 'string') out.errorMessage = potongTeksStorage(out.errorMessage, 1200);
    out.error    = !!out.error;
    out.retryable = !!out.retryable;
    out.aborted  = !!out.aborted;
    if (out.requestData) out.requestData = ringkasRequestDataUntukStorage(out.requestData);
    return out;
}

function requestDataTidakLengkap(d) {
    return !!(d && (d.storageSnapshot || d.promptTruncated || d.imageOmitted));
}

function alasanRequestDataTidakLengkap(d) {
    if (!d) return 'Prompt tidak tersedia';
    const alasan = [];
    if (d.promptTruncated) alasan.push('prompt tersimpan sebagai snapshot');
    if (d.imageOmitted)    alasan.push('data gambar tidak lagi tersedia');
    return alasan.join(', ') || 'konteks tersimpan tidak lengkap';
}

function filePersistenTidakLengkap(fileObj) {
    if (!fileObj) return false;
    return !!(fileObj.truncated || teksStorageTerpotong(fileObj.content || ''));
}

// ── MEMORI ──

function ambilMemori()     { return safeParseStorage(localStorage.getItem(KUNCI_MEMORI), '[]'); }
function simpanMemori(d)   { safeSetItem(localStorage, KUNCI_MEMORI, JSON.stringify(d)); }

// ── RIWAYAT ──

function ambilSemuaRiwayat()   { return safeParseStorage(localStorage.getItem(KUNCI_RIWAYAT), '[]'); }
function simpanSemuaRiwayat(d) { safeSetItem(localStorage, KUNCI_RIWAYAT, JSON.stringify(d)); }

// ── SESI AKTIF ──

function ambilSesiAktif() {
    return safeParseStorage(sessionStorage.getItem(KUNCI_SESI), '[]');
}

function simpanSesiAktif(d) {
    const normalized = Array.isArray(d) ? d.map(normalisasiPesanUntukStorage) : [];
    if (safeSetItem(sessionStorage, KUNCI_SESI, JSON.stringify(normalized))) return true;
    // Fallback: buang gambar besar, ambil 20 pesan terakhir
    const fallback = normalized.slice(-20).map(item => {
        const clone = normalisasiPesanUntukStorage(item);
        if (clone?.requestData?.imageData?.length > 150000) {
            clone.requestData.imageData = null;
            clone.requestData.prompt = potongTeksStorage(clone.requestData.prompt || '', 6000)
                + '\n\n[Catatan: data gambar dilepas dari sesi karena batas penyimpanan browser]';
        }
        return clone;
    });
    safeSetItem(sessionStorage, KUNCI_SESI, JSON.stringify(fallback));
    return false;
}

// ── SETTINGS ──

function ambilSettings()   { return safeParseStorage(localStorage.getItem(KUNCI_SETTINGS), '{}'); }
function simpanSettings(d) { safeSetItem(localStorage, KUNCI_SETTINGS, JSON.stringify(d)); }

// ── FILE PERSISTEN ──

function ambilFilePersisten() {
    return safeParseStorage(sessionStorage.getItem(KUNCI_FILE_AKTIF), 'null');
}

function simpanFilePersisten(d) {
    if (d) {
        safeSetItem(sessionStorage, KUNCI_FILE_AKTIF, JSON.stringify(ringkasFileUntukStorage(d)));
    } else {
        sessionStorage.removeItem(KUNCI_FILE_AKTIF);
    }
}

// ── PIN ──

function ambilPinned()   { return safeParseStorage(localStorage.getItem(KUNCI_PIN), '[]'); }
function simpanPinned(d) { localStorage.setItem(KUNCI_PIN, JSON.stringify(d)); }

// ── MODEL PREFERENCE ──

function ambilModelPref()   { return safeParseStorage(localStorage.getItem(KUNCI_MODEL), '{}'); }
function simpanModelPref(d) { safeSetItem(localStorage, KUNCI_MODEL, JSON.stringify(d)); }

// ── HELPER TANGGAL ──

function formatTanggal(ts) {
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
