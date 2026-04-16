/* ═══════════════════════════════════════════════════
   api.js — Fase 5 (PERBAIKAN)
   Semua network call ke Gemini & Claude.
   Aturan ketat: ZERO DOM, ZERO document.getElementById.
   Input: payload + callbacks. Output: stream chunks via onChunk(delta).
   ═══════════════════════════════════════════════════ */

// ── SYSTEM PROMPT ──

function buatSystemPrompt(teksMemori, degraded, provider) {
    const base = `Kamu adalah asisten AI yang helpful dan ahli coding. Jawab dalam Bahasa Indonesia.

Saat diminta memperbaiki atau mengedit kode:
- Gunakan format CARI/GANTI untuk perubahan kecil-sedang
- Tulis ulang hanya jika perubahan >80% atau diminta eksplisit
- Jelaskan singkat apa & kenapa sebelum setiap blok edit
- Format CARI/GANTI:
  **CARI:**
  \`\`\`
  [kode lama]
  \`\`\`
  **GANTI:**
  \`\`\`
  [kode baru]
  \`\`\``;

    const memoriBlock = teksMemori ? '\nAturan tambahan:\n' + teksMemori : '';
    const degradedNote = degraded
        ? '\n\nSebagian riwayat percakapan sebelumnya dipulihkan dari snapshot penyimpanan browser dan mungkin tidak lengkap. Jika konteks penting terasa hilang atau ambigu, katakan dengan jelas dan minta pengguna mengirim ulang detail yang relevan.'
        : '';

    return base + memoriBlock + degradedNote;
}

// ── HISTORY BUILDER ──

function modelTextAdalahSnapshot(teks) {
    return typeof teks === 'string' && (
        teks.includes('[Catatan: konteks user ini hanya snapshot untuk restore.]') ||
        teksStorageTerpotong(teks)
    );
}

function pesanRiwayatTerdegradasi(pesan) {
    if (!pesan) return false;
    if (pesan.pengirim === 'user' && modelTextAdalahSnapshot(pesan.modelText || '')) return true;
    if (pesan.pengirim === 'ai'   && requestDataTidakLengkap(pesan.requestData))      return true;
    return false;
}

function ambilKontenPesanUntukModel(pesan) {
    if (!pesan) return '';
    if (pesan.pengirim === 'user' && typeof pesan.modelText === 'string' && pesan.modelText.trim()) {
        return pesan.modelText
            .replace(/\n*\[Catatan: konteks user ini hanya snapshot untuk restore\.\]\s*$/, '')
            .trim();
    }
    return String(pesan.teks || '').replace(/<[^>]*>/g, '').trim();
}

function ambilRiwayatInfoUntukModel(promptSekarang) {
    const sesi = ambilSesiAktif().filter(p => p.pengirim === 'user' || p.pengirim === 'ai');
    let riwayat = sesi.slice();

    // Buang pesan user terakhir kalau sama dengan prompt sekarang (hindari duplikat)
    if (riwayat.length) {
        const terakhir = riwayat[riwayat.length - 1];
        if (terakhir && terakhir.pengirim === 'user') {
            const teksTerakhir = ambilKontenPesanUntukModel(terakhir);
            const promptBersih = String(promptSekarang || '').trim();
            if (teksTerakhir && promptBersih && (teksTerakhir === promptBersih || promptBersih.startsWith(teksTerakhir))) {
                riwayat.pop();
            }
        }
    }

    const riwayatTerbatas = riwayat.slice(-20);
    const degraded = riwayatTerbatas.some(pesanRiwayatTerdegradasi);
    return {
        degraded,
        messages: riwayatTerbatas.map(p => ({
            role: p.pengirim === 'user' ? 'user' : 'assistant',
            content: ambilKontenPesanUntukModel(p).substring(0, 2000)
        }))
    };
}

// ── RIWAYAT: SIMPAN KE HISTORY ──

function ambilJudulRiwayatDariPesan(teks) {
    let s = String(teks || '');
    s = s.replace(/\[Konteks file aktif\s*[—-]\s*"[^"]+":\s*[\s\S]*?\]$/i, '');
    s = s.replace(/<img\b[^>]*>/gi, ' ');
    s = s.replace(/<div class="code-block-wrap">[\s\S]*?<\/div>/gi, ' ');
    s = s.replace(/<br\s*\/?>/gi, ' ');
    s = s.replace(/<[^>]*>/g, ' ');
    s = s.replace(/\s+/g, ' ').trim();
    return s.substring(0, 50) || 'Percakapan';
}

function simpanSesiKeRiwayat() {
    const sesi = ambilSesiAktif();
    if (sesi.length === 0) return;
    const semua = ambilSemuaRiwayat();
    const pertama = sesi.find(p => p.pengirim === 'user');
    const judul = pertama ? ambilJudulRiwayatDariPesan(pertama.teks) : 'Percakapan';

    const normalizePesan = arr => arr.map(p => ({
        id: p && p.id || '',
        teks: potongTeksStorage(p && p.teks || '', 2000),
        modelText: potongTeksStorage(p && p.modelText || '', 2000),
        pengirim: p && p.pengirim || '',
        label: p && p.label || '',
        renderAsHtml: !!(p && p.renderAsHtml),
        aborted: !!(p && p.aborted),
        error: !!(p && p.error),
        retryable: !!(p && p.retryable),
        errorMessage: potongTeksStorage(p && p.errorMessage || '', 500),
        requestData: p && p.requestData ? {
            prompt: potongTeksStorage(p.requestData.prompt || '', 2000),
            imageData: p.requestData.imageData ? ('[image:' + String(p.requestData.imageData).length + ']') : null,
            imageMime: p.requestData.imageMime || null,
            label: p.requestData.label || '',
            mode: p.requestData.mode || '',
            provider: p.requestData.provider || ''
        } : null
    }));

    const pesanTersalin = safeParseStorage(JSON.stringify((sesi || []).map(normalisasiPesanUntukStorage)), '[]');
    const signature = JSON.stringify(normalizePesan(pesanTersalin));
    const sudahAda = semua.some(r => JSON.stringify(normalizePesan(r.pesan || [])) === signature);
    if (sudahAda) return;

    semua.unshift({ id: Date.now(), judul, tanggal: Date.now(), pesan: pesanTersalin });
    if (semua.length > 50) semua.splice(50);
    simpanSemuaRiwayat(semua);
}

// ── ERROR HELPERS ──

async function bacaErrorHttp(res) {
    let errMsg = 'HTTP ' + res.status;
    try {
        const cloned = res.clone();
        const errData = await cloned.json();
        errMsg = errData?.error?.message || errData?.message || errData?.jawaban || errMsg;
    } catch (_) {
        try {
            const errText = await res.text();
            if (errText) errMsg = errText.substring(0, 300);
        } catch (_) {}
    }
    return errMsg;
}

function errorLayakRetry(err) {
    const msg = String(err && err.message || '').toLowerCase();
    const status = err && typeof err.statusCode === 'number' ? err.statusCode : null;
    if (status && [408, 409, 425, 429, 500, 502, 503, 504, 522, 524].includes(status)) return true;
    return !!msg && (
        msg.includes('upstream')          ||
        msg.includes('stream')            ||
        msg.includes('network')           ||
        msg.includes('fetch')             ||
        msg.includes('failed to fetch')   ||
        msg.includes('timeout')           ||
        msg.includes('temporar')          ||
        msg.includes('rate limit')        ||
        msg.includes('too many requests') ||
        msg.includes('bad gateway')       ||
        msg.includes('service unavailable') ||
        msg.includes('gateway timeout')
    );
}

// ── REQUEST STATE HELPERS ──

function labelKonfigurasiRequest(requestData) {
    if (!requestData) return 'konfigurasi lama';
    if (requestData.label) return requestData.label;
    if (requestData.provider === 'claude') return 'Claude Sonnet';
    if (requestData.mode === 'thinking')   return 'Gemini Thinking';
    return 'Gemini Flash';
}

function requestBerbedaDenganKonfigurasiAktif(requestData) {
    if (!requestData) return false;
    return (requestData.provider || 'gemini') !== (AppState.providerAktif || 'gemini') ||
           (requestData.mode || '')            !== (AppState.modeAktif || '');
}

// ── PROMPT HELPERS ──

function tambahKonteksFileKePrompt(promptDasar, fileObj) {
    if (!fileObj || !fileObj.name || typeof fileObj.content !== 'string') return promptDasar;
    const prefix = promptDasar ? promptDasar + '\n\n' : 'Analisis file berikut:\n\n';
    return prefix + 'File "' + fileObj.name + '":\n```' + (fileObj.ext || String(fileObj.name).split('.').pop() || 'txt') + '\n' + fileObj.content + '\n```';
}

function buatSnapshotModelText(promptLengkap) {
    const raw = promptLengkap || '';
    const snap = potongTeksStorage(raw, 8000);
    return teksStorageTerpotong(snap) ? (snap + '\n\n[Catatan: konteks user ini hanya snapshot untuk restore.]') : snap;
}

function normalisasiModelTextUntukStorage(modelText) {
    const raw = typeof modelText === 'string' ? modelText : '';
    if (!raw.trim()) return '';
    return modelTextAdalahSnapshot(raw) ? raw : buatSnapshotModelText(raw);
}

// ── STREAM GEMINI ──

async function streamGemini({ prompt, imgData, imgMime, mode, teksMemori, riwayatInfo, signal, onChunk }) {
    const settings = ambilSettings();
    const systemInstruction = 'Kamu adalah asisten AI yang helpful dan ahli coding. Jawab dalam Bahasa Indonesia.\n\nSaat diminta memperbaiki atau mengedit kode:\n- Gunakan format CARI/GANTI untuk perubahan kecil-sedang\n- Tulis ulang hanya jika perubahan >80% atau diminta eksplisit\n- Jelaskan singkat apa & kenapa sebelum setiap blok edit'
        + (teksMemori ? '\n\nAturan tambahan:\n' + teksMemori : '')
        + (riwayatInfo.degraded ? '\n\nSebagian riwayat percakapan sebelumnya dipulihkan dari snapshot dan mungkin tidak lengkap.' : '');

    const geminiContents = [];
    for (const msg of (riwayatInfo.messages || [])) {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        geminiContents.push({ role, parts: [{ text: msg.content }] });
    }

    const currentParts = [];
    if (imgData) currentParts.push({ inline_data: { mime_type: imgMime || 'image/jpeg', data: imgData } });
    const promptAkhir = riwayatInfo.degraded
        ? (prompt + '\n\n[Catatan sistem: sebagian konteks percakapan sebelumnya hanya snapshot penyimpanan browser dan mungkin tidak lengkap.]')
        : prompt;
    currentParts.push({ text: promptAkhir });
    geminiContents.push({ role: 'user', parts: currentParts });

    const generationConfig = mode === 'thinking' ? { thinkingConfig: { thinkingBudget: -1 } } : {};
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${settings.geminiKey}`;

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({
            system_instruction: { parts: [{ text: systemInstruction }] },
            contents: geminiContents,
            generationConfig
        })
    });

    if (!res.ok) { const err = new Error(await bacaErrorHttp(res)); err.statusCode = res.status; throw err; }
    if (!res.body) { const err = new Error('Respons streaming Gemini tidak tersedia'); err.statusCode = 502; throw err; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) { buffer += decoder.decode(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') return;
            try {
                const json = JSON.parse(raw);
                const delta = json?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (delta) onChunk(delta);
            } catch (e) {}
        }
    }
}

// ── OLLAMA (via Backend Proxy) ──
// PERBAIKAN: Path akses data yang konsisten + fallback yang benar

async function streamOllama({ prompt, teksMemori, riwayatInfo, signal, onChunk }) {
    const systemContent = buatSystemPrompt(teksMemori, riwayatInfo.degraded, 'ollama');
    const ollamaModel = AppState.ollamaModelAktif || 'qwen3.5';

    let historyMessages = (riwayatInfo.messages || []).filter(Boolean);
    while (historyMessages.length > 0 && historyMessages[0].role === 'assistant') {
        historyMessages = historyMessages.slice(1);
    }

    const messages = [
        { role: 'system', content: systemContent },
        ...historyMessages,
        { role: 'user', content: prompt || 'Halo' }
    ];

    const res = await fetch('/api/ollama/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal,
        body: JSON.stringify({ model: ollamaModel, messages, temperature: 0.7 })
    });

    let resData;
    try { resData = await res.json(); } catch (_) {
        const err = new Error('Respons backend tidak valid'); err.statusCode = 502; throw err;
    }

    if (!res.ok || !resData.success) {
        const code = resData.error || 'OLLAMA_ERROR';
        const msg = resData.message || ('HTTP ' + res.status);
        const err = new Error(msg);
        err.statusCode = res.status;
        // Rate limit: tandai biar errorLayakRetry false (jangan auto-retry)
        if (code === 'RATE_LIMITED') err.statusCode = 429;
        if (code === 'API_KEY_MISSING' || code === 'API_KEY_INVALID') err.statusCode = 401;
        throw err;
    }

    // PERBAIKAN: Path akses yang konsisten - coba format wrapper dulu, lalu format native Ollama
    // Backend wrapper format: { success: true, data: { message: { content: "..." } } }
    // Ollama native format: { message: { content: "..." } }
    let content = '';
    
    if (resData.data?.message?.content) {
        content = resData.data.message.content;
    } else if (resData.message?.content) {
        // Format native Ollama
        content = resData.message.content;
    } else if (typeof resData.data === 'string') {
        // Jika data langsung string
        content = resData.data;
    } else if (resData.data?.choices?.[0]?.message?.content) {
        // Format OpenAI-kompatibel
        content = resData.data.choices[0].message.content;
    }

    if (content && typeof content === 'string') {
        onChunk(content);
    } else {
        // Jika tidak ada path yang cocok, throw error yang informatif
        const err = new Error('Format respons Ollama tidak dikenali. Periksa backend API response structure.');
        err.statusCode = 502;
        throw err;
    }
}

// ── STREAM CLAUDE ──

async function streamClaude({ prompt, imgData, imgMime, teksMemori, riwayatInfo, signal, onChunk }) {
    const settings = ambilSettings();
    const claudeUrl = (settings.claudeUrl || 'https://api.enowxlabs.com/v1').replace(/\/$/, '');
    const systemContent = buatSystemPrompt(teksMemori, riwayatInfo.degraded, 'claude');

    let historyMessages = (riwayatInfo.messages || []).filter(Boolean);
    while (historyMessages.length > 0 && historyMessages[0].role === 'assistant') {
        historyMessages = historyMessages.slice(1);
    }

    const messages = [...historyMessages];
    messages.push({
        role: 'user',
        content: imgData
            ? [{ type: 'image', source: { type: 'base64', media_type: imgMime || 'image/jpeg', data: imgData } }, { type: 'text', text: prompt || 'Analisis gambar ini' }]
            : prompt
    });

    const res = await fetch(claudeUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + settings.claudeKey },
        signal,
        body: JSON.stringify({
            model: settings.claudeModel || 'claude-3-5-sonnet-20241022',
            messages: [{ role: 'system', content: systemContent }, ...messages],
            stream: true,
            max_tokens: 4096
        })
    });

    if (!res.ok) { const err = new Error(await bacaErrorHttp(res)); err.statusCode = res.status; throw err; }
    if (!res.body) { const err = new Error('Respons streaming Claude tidak tersedia'); err.statusCode = 502; throw err; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
        const { done, value } = await reader.read();
        if (done) { buffer += decoder.decode(); break; }
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') return;
            try {
                const json = JSON.parse(raw);
                const delta = json?.choices?.[0]?.delta?.content;
                if (delta) onChunk(delta);
            } catch (e) {}
        }
    }
}
