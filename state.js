/* ═══════════════════════════════════════════════════
   state.js — Fase 3
   Satu-satunya sumber kebenaran untuk semua state app.
   Tidak boleh ada DOM manipulation atau fetch di sini.
   ═══════════════════════════════════════════════════ */

// ── STATE UTAMA ──
// Dibaca dari storage saat init, lalu di-update lewat setState()

const _modelPref = ambilModelPref();

const _ollamaDefault = 'glm-5.1';

const AppState = {
    // Chat
    sedangLoading:    false,
    abortController:  null,
    lastPromptData:   null,

    // Model aktif
    modeAktif:     _modelPref.mode     || 'instan',
    providerAktif: _modelPref.provider || 'gemini',
    labelAktif:    _modelPref.label    || 'Gemini Flash',

    // Ollama
    ollamaModelAktif: _modelPref.ollamaModel || _ollamaDefault,
    ollamaModelsList: [],

    // File & gambar upload (transient, tidak disimpan ke storage)
    imageData:     null,
    imageMime:     null,
    fileContent:   null,
    fileName:      null,
    persistedFile: ambilFilePersisten(),

    // UI flags
    pinnedOpen:              true,
    suppressHistoryClickUntil: 0,
    contextTargetIdx:        -1,
    riwayatAktifDibuka:      false,
};

// ── SATU FUNGSI UPDATE ──
// Semua kode yang ingin mengubah state WAJIB lewat sini.
// Tidak boleh mutate AppState langsung dari luar file ini.

function setState(patch) {
    Object.assign(AppState, patch);
}

// ── SHORTCUT GETTER (biar kode lama tetap jalan) ──
// Ini memungkinkan migrasi bertahap — kode inline masih bisa
// baca variabel langsung, tapi sekarang semuanya satu sumber.

Object.defineProperties(window, {
    sedangLoading:    { get: () => AppState.sedangLoading,    set: v => setState({ sedangLoading: v }),    configurable: true },
    abortController:  { get: () => AppState.abortController,  set: v => setState({ abortController: v }),  configurable: true },
    lastPromptData:   { get: () => AppState.lastPromptData,   set: v => setState({ lastPromptData: v }),   configurable: true },
    modeAktif:        { get: () => AppState.modeAktif,        set: v => setState({ modeAktif: v }),        configurable: true },
    providerAktif:    { get: () => AppState.providerAktif,    set: v => setState({ providerAktif: v }),    configurable: true },
    labelAktif:       { get: () => AppState.labelAktif,       set: v => setState({ labelAktif: v }),       configurable: true },
    imageData:        { get: () => AppState.imageData,        set: v => setState({ imageData: v }),        configurable: true },
    imageMime:        { get: () => AppState.imageMime,        set: v => setState({ imageMime: v }),        configurable: true },
    fileContent:      { get: () => AppState.fileContent,      set: v => setState({ fileContent: v }),      configurable: true },
    fileName:         { get: () => AppState.fileName,         set: v => setState({ fileName: v }),         configurable: true },
    persistedFile:    { get: () => AppState.persistedFile,    set: v => setState({ persistedFile: v }),    configurable: true },
    pinnedOpen:       { get: () => AppState.pinnedOpen,       set: v => setState({ pinnedOpen: v }),       configurable: true },
    suppressHistoryClickUntil: { get: () => AppState.suppressHistoryClickUntil, set: v => setState({ suppressHistoryClickUntil: v }), configurable: true },
    contextTargetIdx: { get: () => AppState.contextTargetIdx, set: v => setState({ contextTargetIdx: v }), configurable: true },
    riwayatAktifDibuka:  { get: () => AppState.riwayatAktifDibuka,  set: v => setState({ riwayatAktifDibuka: v }),  configurable: true },
    ollamaModelAktif:    { get: () => AppState.ollamaModelAktif,    set: v => setState({ ollamaModelAktif: v }),    configurable: true },
    ollamaModelsList:    { get: () => AppState.ollamaModelsList,    set: v => setState({ ollamaModelsList: v }),    configurable: true },
});
