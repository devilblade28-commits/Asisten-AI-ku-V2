/* ═══════════════════════════════════════════════════
   chat.js — Fase 7
   Orchestrator chat: kirimPesan, _eksekusiKirim,
   regenerateBubble, retryManual.
   Pakai fungsi dari api.js + render.js + storage.js.
   ═══════════════════════════════════════════════════ */

function regenerateBubble(btn) {
    if (AppState.sedangLoading) return;
    const row = btn.closest('.msg-row');
    let requestData = null;
    try { requestData = row.dataset.request ? JSON.parse(row.dataset.request) : null; } catch (e) {}
    requestData = requestData || AppState.lastPromptData;
    if (!requestData) { showToast('Prompt untuk bubble ini tidak tersedia'); return; }
    if (requestDataTidakLengkap(requestData)) { showToast('Tidak aman mengulangi bubble ini: ' + alasanRequestDataTidakLengkap(requestData)); return; }
    if (requestBerbedaDenganKonfigurasiAktif(requestData)) { showToast('Bubble ini diulang dengan konfigurasi aslinya: ' + labelKonfigurasiRequest(requestData)); }

    const msgId = row.getAttribute('data-msg-id');
    row.remove();
    const sesi = ambilSesiAktif();
    const targetIdx = cariIndexSesiById(msgId);
    if (targetIdx >= 0 && sesi[targetIdx]?.pengirim === 'ai') {
        sesi.splice(targetIdx, 1);
    } else {
        const fallbackIdx = sesi.findIndex(p => p?.id === msgId);
        if (fallbackIdx >= 0) sesi.splice(fallbackIdx, 1);
        else {
            const lastAiIdx = sesi.map(p => p?.pengirim).lastIndexOf('ai');
            if (lastAiIdx !== -1) sesi.splice(lastAiIdx, 1);
        }
    }
    simpanSesiAktif(sesi);
    AppState.lastPromptData = requestData;
    _eksekusiKirim({ ...requestData, _reuseLastUser: true });
}

async function kirimPesan() {
    if (AppState.sedangLoading) {
        if (AppState.abortController) AppState.abortController.abort();
        return;
    }
    const teks = document.getElementById('kolomTanya').value.trim();
    if (!teks && !AppState.fileContent && !AppState.imageData) return;

    document.getElementById('welcome-screen').style.display = 'none';
    document.getElementById('kolomTanya').value = '';
    document.getElementById('kolomTanya').style.height = 'auto';

    const localImageData = AppState.imageData;
    const localImageMime = AppState.imageMime;
    let prompt = teks;
    let promptSudahMemakaiCurrentFile = false;

    // Inject file ke prompt
    if (AppState.fileContent && AppState.fileName) {
        const currentFile = AppState.persistedFile?.name === AppState.fileName
            ? AppState.persistedFile
            : { name: AppState.fileName, content: AppState.fileContent, ext: AppState.fileName.split('.').pop() };
        prompt = tambahKonteksFileKePrompt(prompt, currentFile);
        promptSudahMemakaiCurrentFile = true;
        if (!AppState.persistedFile || AppState.persistedFile.name !== AppState.fileName) {
            AppState.persistedFile = ringkasFileUntukStorage({ name: AppState.fileName, content: AppState.fileContent, ext: AppState.fileName.split('.').pop() });
            simpanFilePersisten(AppState.persistedFile);
            renderFilePreview();
        }
    }

    // Inject persisted file
    if (AppState.persistedFile && !promptSudahMemakaiCurrentFile) {
        const catatan = filePersistenTidakLengkap(AppState.persistedFile) ? '\n[Catatan: isi file aktif ini hanya snapshot penyimpanan browser dan mungkin tidak lengkap.]' : '';
        const konteks = '[Konteks file aktif — "' + AppState.persistedFile.name + '":\n```' + AppState.persistedFile.ext + '\n' + AppState.persistedFile.content + '\n```' + catatan + ']';
        prompt = prompt ? prompt + '\n\n' + konteks : konteks;
    }

    // Render bubble user
    const userParts = [];
    if (teks) userParts.push(escapeHtml(teks));
    if (AppState.fileContent && AppState.fileName) userParts.push(buatPreviewFileHtml(AppState.fileName, AppState.fileContent));
    if (localImageData) userParts.push('<img class="chat-img" src="data:' + localImageMime + ';base64,' + localImageData + '" alt="gambar">');

    if (userParts.length && (localImageData || (AppState.fileContent && AppState.fileName))) {
        tambahPesan(userParts.join('<br>'), 'user', true, '', true, null, null, buatSnapshotModelText(prompt));
        document.getElementById('imgPreviewWrap').classList.remove('show');
        document.getElementById('imgPreviewThumb').src = '';
    } else {
        tambahPesan(teks, 'user', true, '', false, null, null, buatSnapshotModelText(prompt));
    }

    // Reset transient state
    AppState.fileContent = null; AppState.fileName = null;
    if (!AppState.persistedFile) document.getElementById('filePreview').classList.remove('show');
    AppState.imageData = null; AppState.imageMime = null;
    document.getElementById('imgPreviewWrap').classList.remove('show');

    const data = { prompt, imageData: localImageData, imageMime: localImageMime, label: AppState.labelAktif, mode: AppState.modeAktif, provider: AppState.providerAktif };
    AppState.lastPromptData = data;
    await _eksekusiKirim(data);
}

async function _eksekusiKirim(data, rowLoadingExt, elemenLoadingExt) {
    const { prompt, imageData: imgData, imageMime: imgMime, label, mode, provider } = data;
    let balasan = '';
    setSedangLoading(true);
    AppState.abortController = new AbortController();

    // Setup bubble loading
    let rowLoading, elemenLoading;
    if (rowLoadingExt && elemenLoadingExt) {
        rowLoading = rowLoadingExt; elemenLoading = elemenLoadingExt;
        elemenLoading.innerHTML = '<span class="thinking-dots"><span></span><span></span><span></span></span>';
    } else {
        rowLoading = document.createElement('div');
        const bubbleLoading = document.createElement('div');
        rowLoading.classList.add('msg-row', 'msg-ai');
        bubbleLoading.classList.add('bubble');
        bubbleLoading.innerHTML = '<span class="thinking-dots"><span></span><span></span><span></span></span>';
        rowLoading.appendChild(bubbleLoading);
        document.getElementById('chatBox').appendChild(rowLoading);
        document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
        elemenLoading = bubbleLoading;
    }
    try { rowLoading.dataset.request = JSON.stringify({ prompt, imageData: imgData||null, imageMime: imgMime||null, label, mode, provider }); } catch (e) {}
    setRowBusyState(rowLoading, true);

    let _delegatedToRetry = false;
    try {
        const teksMemori  = ambilMemori().map(m => '- ' + m).join('\n');
        const riwayatInfo = ambilRiwayatInfoUntukModel(prompt);

        // Cek API key
        if (provider === 'claude' && !ambilSettings().claudeKey) {
            renderErrorBubble(elemenLoading, 'API Key Claude belum diset. Buka ☰ → Pengaturan → API Key', { retryable: false, requestData: data, row: rowLoading });
            return;
        }
        if (provider === 'gemini' && !ambilSettings().geminiKey) {
            renderErrorBubble(elemenLoading, 'API Key Gemini belum diset. Buka ☰ → Pengaturan → API Key', { retryable: false, requestData: data, row: rowLoading });
            return;
        }
        // Ollama: key disimpan di backend (Vercel env), frontend tidak perlu cek
        if (riwayatInfo.degraded) showToast('Sebagian konteks lama hanya snapshot; riwayat mungkin tidak lengkap.');

        // Setup stream UI
        elemenLoading.innerHTML = '<div class="model-badge">' + label + '</div>';
        const streamDiv = document.createElement('div');
        elemenLoading.appendChild(streamDiv);

        const streamFn = provider === 'claude' ? streamClaude
                       : provider === 'ollama' ? streamOllama
                       : streamGemini;
        await streamFn({
            prompt, imgData, imgMime, mode, teksMemori, riwayatInfo,
            signal: AppState.abortController.signal,
            onChunk: delta => {
                balasan += delta;
                streamDiv.innerHTML = renderStreaming(balasan);
                document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
            }
        });

        // Finalize
        elemenLoading.innerHTML = '<div class="model-badge">' + label + '</div>' + renderDenganArtifact(balasan);
        elemenLoading.querySelectorAll('code[id^="code-"]').forEach(el => {
            if (!el.dataset.highlighted && typeof hljs !== 'undefined') { hljs.highlightElement(el); el.dataset.highlighted = '1'; }
        });
        document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;

        // Simpan ke sesi
        const reqPayload = ringkasRequestDataUntukStorage({ prompt, imageData: imgData||null, imageMime: imgMime||null, label, mode, provider });
        let msgId = rowLoading.getAttribute('data-msg-id') || ('msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));
        rowLoading.setAttribute('data-msg-id', msgId);
        const sesi = ambilSesiAktif();
        let ei = rowLoading.dataset.sessionIndex ? parseInt(rowLoading.dataset.sessionIndex, 10) : -1;
        if (!(Number.isInteger(ei) && ei >= 0 && ei < sesi.length && sesi[ei]?.id === msgId)) ei = sesi.findIndex(p => p?.id === msgId);
        const aiEntry = { id: msgId, teks: balasan, pengirim: 'ai', label, requestData: reqPayload };
        if (Number.isInteger(ei) && ei >= 0 && sesi[ei]) { sesi[ei] = aiEntry; rowLoading.dataset.sessionIndex = String(ei); }
        else { sesi.push(aiEntry); rowLoading.dataset.sessionIndex = String(sesi.length - 1); }
        simpanSesiAktif(sesi);
        try { rowLoading.dataset.request = JSON.stringify(reqPayload); } catch (e) {}

        // Action buttons
        let actions = rowLoading.querySelector('.bubble-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.classList.add('bubble-actions');
            actions.innerHTML = '<button class="bubble-action-btn" onclick="copyBubble(this)" title="Copy">📋</button>'
                + '<button class="bubble-action-btn" onclick="pinBubble(this)" title="Pin">📌</button>'
                + '<button class="bubble-action-btn" onclick="regenerateBubble(this)" title="Ulangi">🔄</button>';
            rowLoading.appendChild(actions);
        }
        sinkronkanPinnedEntryByRow(rowLoading);
        updatePinnedButtonState(rowLoading);
        updateRequestActionState(rowLoading);

    } catch (err) {
        if (err.name === 'AbortError') {
            const partial = typeof balasan === 'string' ? balasan.trim() : '';
            if (partial) {
                elemenLoading.innerHTML = '<div class="model-badge">' + label + '</div>' + renderDenganArtifact(balasan)
                    + '<div style="margin-top:8px;color:var(--muted);font-size:0.82rem;">⏹ Dihentikan sebelum selesai</div>'
                    + '<div style="margin-top:8px;"><button onclick="retryManual(this)" style="background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:0.78rem;padding:4px 14px;border-radius:20px;cursor:pointer;font-family:Nunito,sans-serif;font-weight:700;">🔄 Lanjutkan / ulangi</button></div>';
                elemenLoading.querySelectorAll('code[id^="code-"]').forEach(el => { if (!el.dataset.highlighted && typeof hljs !== 'undefined') { hljs.highlightElement(el); el.dataset.highlighted = '1'; } });
                const sesiA = ambilSesiAktif();
                const midA = rowLoading.getAttribute('data-msg-id') || ('msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));
                rowLoading.setAttribute('data-msg-id', midA);
                const rpA = ringkasRequestDataUntukStorage({ prompt, imageData: imgData||null, imageMime: imgMime||null, label, mode, provider });
                const entA = { id: midA, teks: balasan, pengirim: 'ai', label, requestData: rpA, aborted: true };
                let eiA = rowLoading.dataset.sessionIndex ? parseInt(rowLoading.dataset.sessionIndex, 10) : -1;
                if (!(Number.isInteger(eiA) && eiA >= 0 && eiA < sesiA.length && sesiA[eiA]?.id === midA)) eiA = sesiA.findIndex(p => p?.id === midA);
                if (Number.isInteger(eiA) && eiA >= 0 && sesiA[eiA]) { sesiA[eiA] = entA; rowLoading.dataset.sessionIndex = String(eiA); }
                else { sesiA.push(entA); rowLoading.dataset.sessionIndex = String(sesiA.length - 1); }
                simpanSesiAktif(sesiA);
                try { rowLoading.dataset.request = JSON.stringify(rpA); } catch (e) {}
                sinkronkanPinnedEntryByRow(rowLoading); updatePinnedButtonState(rowLoading); updateRequestActionState(rowLoading);
            } else {
                elemenLoading.innerHTML = '<span style="color:var(--muted);font-size:0.85rem;">⏹ Dihentikan</span>'
                    + '<div style="margin-top:8px;"><button onclick="retryManual(this)" style="background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:0.78rem;padding:4px 14px;border-radius:20px;cursor:pointer;font-family:Nunito,sans-serif;font-weight:700;">🔄 Coba lagi</button></div>';
            }
        } else {
            const isRetry = errorLayakRetry(err);
            if (isRetry && !data._retried) {
                elemenLoading.innerHTML = '<span style="color:var(--muted);font-size:0.82rem;">⟳ Koneksi terputus, mencoba ulang…</span>';
                await new Promise(r => setTimeout(r, 1500));
                setSedangLoading(false); AppState.abortController = null; _delegatedToRetry = true;
                await _eksekusiKirim({ ...data, _retried: true }, rowLoading, elemenLoading);
                return;
            }
            renderErrorBubble(elemenLoading, err.message || 'Koneksi terputus', { retryable: isRetry, requestData: data, row: rowLoading });
        }
    } finally {
        if (!_delegatedToRetry) { setRowBusyState(rowLoading, false); setSedangLoading(false); AppState.abortController = null; }
    }
}

function retryManual(btn) {
    if (AppState.sedangLoading) return;
    const rowLoading   = btn.closest('.msg-row');
    const elemenLoading = rowLoading.querySelector('.bubble');
    sinkronkanSessionIndexKeRow(rowLoading);
    let requestData = null;
    try { requestData = rowLoading.dataset.request ? JSON.parse(rowLoading.dataset.request) : null; } catch (e) {}
    requestData = requestData || AppState.lastPromptData;
    if (!requestData) { showToast('Prompt untuk retry tidak tersedia'); return; }
    if (requestDataTidakLengkap(requestData)) { showToast('Retry tidak aman: ' + alasanRequestDataTidakLengkap(requestData)); return; }
    if (requestBerbedaDenganKonfigurasiAktif(requestData)) { showToast('Retry memakai konfigurasi asli bubble: ' + labelKonfigurasiRequest(requestData)); }
    const msgId = rowLoading.getAttribute('data-msg-id');
    if (msgId) {
        const sesi = ambilSesiAktif();
        const idxLama = sesi.findIndex(p => p?.id === msgId);
        if (idxLama >= 0) { sesi.splice(idxLama, 1); simpanSesiAktif(sesi); delete rowLoading.dataset.sessionIndex; }
    }
    const retriedData = { ...requestData };
    delete retriedData._retried;
    AppState.lastPromptData = retriedData;
    _eksekusiKirim(retriedData, rowLoading, elemenLoading);
}
