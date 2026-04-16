/* ═══════════════════════════════════════════════════
   render.js — Fase 5
   Semua fungsi yang generate HTML string atau
   manipulasi DOM. Boleh baca AppState, tapi
   tidak boleh ada fetch/network di sini.
   ═══════════════════════════════════════════════════ */

// ── MARKED SETUP ──

if (typeof marked !== 'undefined') {
    const r = new marked.Renderer();
    r.code = function (t) {
        const lang = ((t.lang || '') + '').trim().split('\n')[0] || 'code';
        const raw  = (t.text || t.raw || t + '');
        const id   = 'cb' + Math.random().toString(36).substr(2, 8);
        const esc  = raw.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return '<div class="code-block-wrap">'
            + '<div class="code-block-header">'
            + '<span class="code-lang">' + lang + '</span>'
            + '<button class="btn-copy-code" onclick="copyKode(\'' + id + '\')">Copy</button>'
            + '</div><pre><code id="' + id + '">' + esc + '</code></pre></div>';
    };
    marked.use({ renderer: r, breaks: true, gfm: true });
}

// ── UTILITY ──

function escapeHtml(teks) {
    return String(teks)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:110px;left:50%;transform:translateX(-50%);background:var(--accent);color:#fff;padding:9px 20px;border-radius:20px;font-size:0.85rem;font-weight:700;z-index:999;font-family:Nunito,sans-serif;pointer-events:none;';
    t.textContent = msg;
    document.querySelector('.app-container').appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ── MARKDOWN & CODE ──

function renderOutput(t) {
    return typeof marked !== 'undefined' ? marked.parse(t) : t.replace(/\n/g, '<br>');
}

function copyKode(id) {
    const el  = document.getElementById(id);
    if (!el) return;
    const wrap = el.closest('.code-block-wrap');
    const btn  = wrap && wrap.querySelector('.btn-copy-code');
    const ta   = document.createElement('textarea');
    ta.value   = el.textContent;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
    if (btn) { btn.textContent = 'Disalin!'; setTimeout(() => btn.textContent = 'Copy', 2000); }
}

// ── ARTIFACT HELPERS ──

function ikonArtifact(lang) {
    const icons = { html:'🌐',js:'⚡',javascript:'⚡',css:'🎨',json:'📋',py:'🐍',python:'🐍',md:'📝',markdown:'📝',sql:'🗄️',ts:'⚡',typescript:'⚡',jsx:'⚛️',tsx:'⚛️',php:'🐘',java:'☕',cpp:'⚙️',c:'⚙️',bash:'💻',sh:'💻' };
    return icons[lang.toLowerCase()] || '📄';
}

function namaLang(lang) {
    const labels = { html:'HTML',css:'CSS',js:'JavaScript',javascript:'JavaScript',ts:'TypeScript',typescript:'TypeScript',jsx:'JSX',tsx:'TSX',py:'Python',python:'Python',json:'JSON',md:'Markdown',markdown:'Markdown',sql:'SQL',php:'PHP',java:'Java',cpp:'C++',c:'C',bash:'Bash',sh:'Shell' };
    return labels[lang.toLowerCase()] || lang.toUpperCase();
}

function kelasLang(lang) {
    const l = lang.toLowerCase();
    const map = { html:'html',css:'css',js:'js',javascript:'js',ts:'js',typescript:'js',jsx:'js',tsx:'js',py:'py',python:'py',json:'json',md:'md',markdown:'md',sql:'sql' };
    return 'lang-' + (map[l] || 'default');
}

function buatArtifactCard(lang, kode, idx) {
    const id          = 'artifact-' + Date.now() + '-' + idx;
    const ikon        = ikonArtifact(lang);
    const nama        = namaLang(lang);
    const kelas       = kelasLang(lang);
    const jumlahBaris = kode.split('\n').length;
    const escaped     = kode.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const firstLine   = kode.split('\n')[0];
    const namaFile    = firstLine.match(/<!--\s*([\w.-]+)\s*-->/) || firstLine.match(/\/\/\s*([\w.-]+\.[\w]+)/);
    const judul       = namaFile ? namaFile[1] : (nama + ' File');

    const hljsLang = { html:'html',css:'css',js:'javascript',javascript:'javascript',ts:'typescript',typescript:'typescript',jsx:'javascript',tsx:'typescript',py:'python',python:'python',json:'json',md:'markdown',markdown:'markdown',sql:'sql',php:'php',java:'java',cpp:'cpp',c:'c',bash:'bash',sh:'bash' }[lang.toLowerCase()] || 'plaintext';
    const extMap   = { html:'html',css:'css',js:'js',javascript:'js',ts:'ts',typescript:'ts',jsx:'jsx',tsx:'tsx',py:'py',python:'py',json:'json',md:'md',markdown:'md',sql:'sql',php:'php',java:'java',cpp:'cpp',c:'c',bash:'sh',sh:'sh' };
    const downloadExt  = extMap[lang.toLowerCase()] || 'txt';
    const downloadNama = namaFile ? namaFile[1] : ('kode.' + downloadExt);

    return '<div class="artifact-card" id="' + id + '">'
        + '<div class="artifact-header" onclick="toggleArtifact(\'' + id + '\')">'
        + '<div class="artifact-icon ' + kelas + '">' + ikon + '</div>'
        + '<div class="artifact-info">'
        + '<div class="artifact-title">' + judul + ' <span class="lang-badge ' + kelas + '">' + nama + '</span></div>'
        + '<div class="artifact-subtitle"><span>' + jumlahBaris + ' baris</span></div>'
        + '</div>'
        + '<button class="artifact-dl-btn" onclick="downloadArtifact(\'' + id + '\',\'' + downloadNama + '\');event.stopPropagation()" title="Download">⬇️</button>'
        + '<button class="artifact-toggle" onclick="toggleArtifact(\'' + id + '\');event.stopPropagation()">Buka</button>'
        + '</div>'
        + '<div class="artifact-body" id="body-' + id + '">'
        + '<pre><code class="language-' + hljsLang + '" id="code-' + id + '">' + escaped + '</code></pre>'
        + '<div class="artifact-actions">'
        + '<button onclick="downloadArtifact(\'' + id + '\',\'' + downloadNama + '\')">⬇️ Download</button>'
        + '<button onclick="copyArtifact(\'' + id + '\')">📋 Copy</button>'
        + '<button onclick="tutupArtifact(\'' + id + '\')">✕ Tutup</button>'
        + '</div></div></div>';
}

function deteksiArtifact(teks) {
    const regex = /```(\w*)\n([\s\S]+?)```/g;
    let match, artifacts = [];
    while ((match = regex.exec(teks)) !== null) {
        if (match[2].split('\n').length >= 5) artifacts.push({ lang: match[1]||'code', kode: match[2], full: match[0] });
    }
    return artifacts;
}

function renderDenganArtifact(teks) {
    if (deteksiArtifact(teks).length === 0) return renderOutput(teks);
    let finalHtml = '', lastIndex = 0, artIdx = 0;
    const regex = /```(\w*)\n([\s\S]+?)```/g;
    let m;
    while ((m = regex.exec(teks)) !== null) {
        const sebelum = teks.substring(lastIndex, m.index);
        if (sebelum.trim()) finalHtml += renderOutput(sebelum);
        finalHtml += m[2].split('\n').length >= 5
            ? buatArtifactCard(m[1]||'code', m[2], artIdx++)
            : renderOutput(m[0]);
        lastIndex = m.index + m[0].length;
    }
    const sisa = teks.substring(lastIndex);
    if (sisa.trim()) finalHtml += renderOutput(sisa);
    return finalHtml || renderOutput(teks);
}

function renderStreaming(teks) {
    let hasil = '', lastIndex = 0;
    const regexLengkap = /```(\w*)\n([\s\S]+?)```/g;
    let match;
    while ((match = regexLengkap.exec(teks)) !== null) {
        const sebelum = teks.substring(lastIndex, match.index);
        if (sebelum.trim()) hasil += renderOutput(sebelum);
        const baris = match[2].split('\n').length;
        hasil += baris >= 5 ? buatArtifactCard(match[1]||'code', match[2], Math.random()) : renderOutput(match[0]);
        lastIndex = match.index + match[0].length;
    }
    const sisa = teks.substring(lastIndex);
    if (sisa) {
        const bukaMatch = sisa.match(/```(\w*)\n([\s\S]*)$/);
        if (bukaMatch) {
            const sebelumBuka = sisa.substring(0, sisa.indexOf(bukaMatch[0]));
            if (sebelumBuka.trim()) hasil += renderOutput(sebelumBuka);
            const escaped = bukaMatch[2].replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
            hasil += '<div class="code-block-wrap"><div class="code-block-header">'
                + '<span class="code-lang">' + (bukaMatch[1]||'code') + '</span>'
                + '<span style="color:var(--muted);font-size:0.72rem;">menulis...</span>'
                + '</div><pre><code style="font-family:\'JetBrains Mono\',monospace;font-size:0.8rem;line-height:1.6;color:#e2e8f0;display:block;padding:14px;">'
                + escaped + '<span class="streaming-cursor"></span></code></pre></div>';
        } else {
            hasil += renderOutput(sisa) + '<span class="streaming-cursor"></span>';
        }
    }
    return hasil || '<span class="streaming-cursor"></span>';
}

// ── ARTIFACT ACTIONS ──

function highlightArtifact(id) {
    if (typeof hljs === 'undefined') return;
    const el = document.getElementById('code-' + id);
    if (el && !el.dataset.highlighted) { hljs.highlightElement(el); el.dataset.highlighted = '1'; }
}

function toggleArtifact(id) {
    const body = document.getElementById('body-' + id);
    const btn  = document.querySelector('#' + id + ' .artifact-toggle');
    if (!body) return;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open');
    if (btn) btn.textContent = isOpen ? 'Buka' : 'Tutup';
    if (!isOpen) highlightArtifact(id);
}

function tutupArtifact(id) {
    const body = document.getElementById('body-' + id);
    const btn  = document.querySelector('#' + id + ' .artifact-toggle');
    if (body) body.classList.remove('open');
    if (btn)  btn.textContent = 'Buka';
}

function downloadArtifact(id, namaFile) {
    const body = document.getElementById('body-' + id);
    if (!body) return;
    const kode = body.querySelector('code').textContent;
    try {
        const blob = new Blob([kode], { type: 'text/plain;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = namaFile;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('⬇️ Mendownload ' + namaFile + '…');
    } catch (e) { bukaKodeTab(kode, namaFile); }
}

function bukaKodeTab(kode, namaFile) {
    const win = window.open('data:text/plain;charset=utf-8,' + encodeURIComponent(kode), '_blank');
    if (!win) tampilkanModalKode(kode, namaFile);
    else showToast('📄 Buka tab baru → tekan ⋮ → Simpan halaman');
}

function tampilkanModalKode(kode, namaFile) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:9999;display:flex;flex-direction:column;font-family:Nunito,sans-serif;';
    overlay.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;background:#1c1c1e;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="flex:1;font-size:0.9rem;font-weight:700;color:#ededef;">${escapeHtml(namaFile)}</span>
            <button id="modalCopyBtn" style="background:var(--accent);border:none;color:#fff;padding:7px 14px;border-radius:20px;font-size:0.82rem;font-weight:700;cursor:pointer;">📋 Salin Semua</button>
            <button id="modalCloseBtn" style="background:rgba(255,255,255,0.08);border:none;color:#ededef;width:32px;height:32px;border-radius:50%;font-size:1rem;cursor:pointer;">✕</button>
        </div>
        <div style="flex:1;overflow:auto;padding:16px;">
            <pre style="font-family:'JetBrains Mono',monospace;font-size:0.75rem;line-height:1.65;color:#cdd6f4;margin:0;white-space:pre-wrap;word-break:break-all;">${escapeHtml(kode)}</pre>
        </div>
        <div style="padding:12px 16px;background:#1c1c1e;border-top:1px solid rgba(255,255,255,0.08);font-size:0.78rem;color:#5c5c66;text-align:center;">Salin kode → paste ke editor (Acode, dll)</div>`;
    overlay.querySelector('#modalCopyBtn').addEventListener('click', () => {
        navigator.clipboard ? navigator.clipboard.writeText(kode).then(() => showToast('✓ Kode disalin!')).catch(() => fallbackCopy(kode)) : fallbackCopy(kode);
    });
    overlay.querySelector('#modalCloseBtn').addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
}

function fallbackCopy(teks) {
    const ta = document.createElement('textarea');
    ta.value = teks; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); showToast('✓ Kode disalin!'); } catch (e) { showToast('Gagal menyalin'); }
    document.body.removeChild(ta);
}

function copyArtifact(id) {
    const body = document.getElementById('body-' + id);
    if (!body) return;
    const kode = body.querySelector('code').textContent;
    navigator.clipboard?.writeText(kode).then(() => showToast('Kode disalin ✓')).catch(() => fallbackCopy(kode)) || fallbackCopy(kode);
}

// ── BUBBLE RENDERING ──

function isTrustedUserHtml(teks) {
    if (typeof teks !== 'string') return false;
    const stripped = teks.trim()
        .replace(/<br\s*\/?>/gi, '')
        .replace(/<img\s+class="chat-img"[^>]*>/gi, '')
        .replace(/<div class="code-block-wrap">[\s\S]*?<\/div>/gi, '');
    return !/<[^>]+>/.test(stripped);
}

function renderUserContent(bubble, teks, allowHtml) {
    if (allowHtml && isTrustedUserHtml(teks)) bubble.innerHTML = teks;
    else bubble.textContent = teks;
}

function buatPreviewFileHtml(namaFile, isiFile) {
    if (!namaFile || typeof isiFile !== 'string') return '';
    const ext     = String(namaFile).split('.').pop() || 'txt';
    const preview = isiFile.length > 400 ? isiFile.substring(0, 400) + '\n...' : isiFile;
    const esc     = preview.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    return '<div class="code-block-wrap"><div class="code-block-header"><span class="code-lang">'
        + escapeHtml(ext + ' — ' + namaFile) + '</span></div><pre><code>' + esc + '</code></pre></div>';
}

function statusPesanAi(p) {
    if (!p || p.pengirim !== 'ai') return '';
    if (p.error)   return p.retryable ? 'error-retryable' : 'error-fixed';
    if (p.aborted) return 'aborted';
    if (requestDataTidakLengkap(p.requestData)) return 'snapshot';
    return '';
}

function metaStatusPesanAi(p) {
    const st = statusPesanAi(p);
    if (st === 'error-retryable') return { label: 'Error · bisa retry',      tone: '#f59e0b' };
    if (st === 'error-fixed')     return { label: 'Error · perlu diperbaiki', tone: 'var(--danger)' };
    if (st === 'aborted')         return { label: 'Terputus',                 tone: 'var(--muted)' };
    if (st === 'snapshot')        return { label: 'Snapshot',                 tone: '#f59e0b' };
    return null;
}

function renderMetaStatusPesanAi(p) {
    const meta = metaStatusPesanAi(p);
    if (!meta) return '';
    return '<div class="msg-status" style="margin-top:8px;font-size:0.76rem;font-weight:800;color:' + meta.tone + ';">' + escapeHtml(meta.label) + '</div>';
}

// ── CLIPBOARD ──

function salinKeClipboard(teks) {
    const ta = document.createElement('textarea');
    ta.value = teks || ''; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
}

function cloneBubbleUntukEkstraksi(bubble) {
    if (!bubble) return null;
    const clone = bubble.cloneNode(true);
    clone.querySelectorAll('.model-badge, .msg-status, button, script, style').forEach(el => el.remove());
    return clone;
}

function ambilIsiBubbleBersih(row) {
    if (!row) return { teks: '', html: '' };
    const bubble = row.querySelector('.bubble');
    if (!bubble) return { teks: '', html: '' };
    const clone = cloneBubbleUntukEkstraksi(bubble);
    if (!clone) return { teks: '', html: '' };
    const teks = (clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
    return { teks, html: clone.innerHTML };
}

function copyBubble(btn) {
    const isi = ambilIsiBubbleBersih(btn.closest('.msg-row'));
    salinKeClipboard(isi.teks);
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = '📋', 2000);
}

// ── PIN UI ──

function ambilPreviewBubble(row) {
    const isi = ambilIsiBubbleBersih(row);
    return { teks: (isi.teks || '').substring(0, 300), html: isi.html || '' };
}

function sinkronkanPinnedEntryByRow(row) {
    if (!row) return;
    const id = row.getAttribute('data-msg-id');
    if (!id) return;
    const pinned = ambilPinned();
    const idx = pinned.findIndex(p => p && p.id === id);
    if (idx === -1) return;
    const preview = ambilPreviewBubble(row);
    pinned[idx] = { ...pinned[idx], teks: preview.teks, html: preview.html };
    simpanPinned(pinned);
    renderPinned();
}

function pinBubble(btn) {
    const row      = btn.closest('.msg-row');
    const preview  = ambilPreviewBubble(row);
    const isPinned = btn.classList.contains('pinned-btn');
    if (isPinned) {
        const id = row.getAttribute('data-msg-id');
        simpanPinned(ambilPinned().filter(p => p.id !== id));
        btn.textContent = '📌'; btn.classList.remove('pinned-btn');
        renderPinned();
    } else {
        const id = row.getAttribute('data-msg-id') || ('pin-' + Date.now());
        row.setAttribute('data-msg-id', id);
        const d = ambilPinned();
        if (d.length >= 10) { showToast('Maks 10 pin'); return; }
        d.push({ id, teks: preview.teks, html: preview.html });
        simpanPinned(d);
        btn.classList.add('pinned-btn'); btn.textContent = '📌';
        renderPinned();
        showToast('Pesan disematkan 📌');
    }
}

function renderPinned() {
    const d       = ambilPinned();
    const section = document.getElementById('pinnedSection');
    const list    = document.getElementById('pinnedList');
    if (d.length === 0) { section.classList.remove('show'); return; }
    section.classList.add('show');
    list.innerHTML = '';
    d.forEach((p, idx) => {
        const div = document.createElement('div');
        div.classList.add('pinned-item');
        div.innerHTML = '<div class="pinned-item-preview">' + escapeHtml(p.teks) + '</div>'
            + '<button class="pinned-item-unpin" onclick="unpinItem(' + idx + ')">✕</button>';
        const previewEl = div.querySelector('.pinned-item-preview');
        if (previewEl) {
            previewEl.style.cursor = 'pointer';
            previewEl.title = 'Buka pesan asal';
            previewEl.addEventListener('click', () => scrollKePinned(p && p.id));
        }
        list.appendChild(div);
    });
}

function scrollKePinned(msgId) {
    if (!msgId) return;
    const row = document.getElementById('chatBox').querySelector('[data-msg-id="' + msgId + '"]');
    if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.style.transition = 'outline 0.2s';
        row.style.outline = '2px solid var(--accent)';
        setTimeout(() => { row.style.outline = ''; }, 1200);
    }
}

function unpinItem(idx) {
    const d = ambilPinned();
    const removed = d[idx];
    d.splice(idx, 1);
    simpanPinned(d);
    renderPinned();
    if (removed && removed.id) {
        const row = document.getElementById('chatBox').querySelector('.msg-row[data-msg-id="' + removed.id.replace(/"/g, '\\"') + '"]');
        if (row) updatePinnedButtonState(row);
    }
}

function togglePinnedSection() {
    AppState.pinnedOpen = !AppState.pinnedOpen;
    document.getElementById('pinnedList').style.display = AppState.pinnedOpen ? '' : 'none';
    document.getElementById('pinnedToggleIcon').textContent = AppState.pinnedOpen ? '▲' : '▼';
}

// ── CHAT BUBBLE ACTIONS ──

function updatePinnedButtonState(row) {
    if (!row) return;
    const pinBtn = row.querySelector('.bubble-action-btn[onclick*="pinBubble"]');
    if (!pinBtn) return;
    const id = row.getAttribute('data-msg-id');
    const pinned = !!id && ambilPinned().some(p => p.id === id);
    pinBtn.classList.toggle('pinned-btn', pinned);
    pinBtn.textContent = '📌';
}

function updateRequestActionState(row) {
    if (!row) return;
    let requestData = null;
    try { requestData = row.dataset.request ? JSON.parse(row.dataset.request) : null; } catch (e) {}
    const regenBtn = row.querySelector('.bubble-action-btn[onclick*="regenerateBubble"]');
    if (!regenBtn) return;
    const tidakLengkap = requestDataTidakLengkap(requestData);
    regenBtn.classList.toggle('disabled-btn', tidakLengkap);
    regenBtn.style.opacity = tidakLengkap ? '0.45' : '';
    if (tidakLengkap) regenBtn.title = 'Ulangi dinonaktifkan: ' + alasanRequestDataTidakLengkap(requestData);
    else if (requestBerbedaDenganKonfigurasiAktif(requestData)) regenBtn.title = 'Ulangi dengan konfigurasi asli bubble: ' + labelKonfigurasiRequest(requestData);
    else regenBtn.title = 'Ulangi';
}

function setRowBusyState(row, isBusy) {
    if (!row) return;
    row.classList.toggle('row-busy', !!isBusy);
    row.querySelectorAll('.bubble-action-btn').forEach(btn => {
        btn.disabled = !!isBusy;
        btn.style.pointerEvents = isBusy ? 'none' : '';
        btn.style.opacity = isBusy ? '0.45' : '';
    });
}

function renderErrorBubble(elemenLoading, errMsg, opts) {
    opts = opts || {};
    const retryable   = !!opts.retryable;
    const requestData = opts.requestData || null;
    const row         = opts.row || (elemenLoading ? elemenLoading.closest('.msg-row') : null);
    const statusLabel = retryable ? 'Bisa dicoba lagi' : 'Perlu diperbaiki dulu';
    const note        = requestBerbedaDenganKonfigurasiAktif(requestData)
        ? '<div style="margin-top:6px;color:var(--muted);font-size:0.78rem;">Bubble ini terkait ' + escapeHtml(labelKonfigurasiRequest(requestData)) + ', bukan mode yang sedang aktif sekarang.</div>'
        : '';
    const retryBtn = retryable
        ? '<div style="margin-top:8px;"><button onclick="retryManual(this)" style="background:transparent;border:1px solid var(--border2);color:var(--text2);font-size:0.78rem;padding:4px 14px;border-radius:20px;cursor:pointer;font-family:Nunito,sans-serif;font-weight:700;">🔄 Coba lagi</button></div>'
        : '';
    elemenLoading.innerHTML = '<span style="color:var(--danger);font-size:0.88rem;">⚠️ ' + escapeHtml(errMsg || 'Terjadi kesalahan') + '</span>'
        + '<div style="margin-top:6px;color:var(--muted);font-size:0.78rem;">' + statusLabel + '</div>'
        + note + retryBtn;
    if (row) {
        const msgId = row.getAttribute('data-msg-id') || ('msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));
        row.setAttribute('data-msg-id', msgId);
        const sesi  = ambilSesiAktif();
        const entry = normalisasiPesanUntukStorage({ id: msgId, teks: errMsg||'Terjadi kesalahan', pengirim: 'ai', label: requestData?.label||'', requestData: requestData||null, error: true, retryable, errorMessage: errMsg||'Terjadi kesalahan' });
        let idx = row.dataset.sessionIndex ? parseInt(row.dataset.sessionIndex, 10) : -1;
        if (!(Number.isInteger(idx) && idx >= 0 && idx < sesi.length && sesi[idx]?.id === msgId)) idx = sesi.findIndex(p => p?.id === msgId);
        if (Number.isInteger(idx) && idx >= 0 && sesi[idx]) { sesi[idx] = entry; row.dataset.sessionIndex = String(idx); }
        else { sesi.push(entry); row.dataset.sessionIndex = String(sesi.length - 1); }
        simpanSesiAktif(sesi);
        try { row.dataset.request = JSON.stringify(ringkasRequestDataUntukStorage(requestData) || null); } catch (e) {}
        updateRequestActionState(row);
    }
}

function tambahPesan(teks, pengirim, simpan, label, allowHtml, requestData, msgId, modelText, errorFlag, retryableFlag, abortedFlag, errorMessage) {
    const chatBox  = document.getElementById('chatBox');
    const row      = document.createElement('div');
    const bubble   = document.createElement('div');
    row.classList.add('msg-row', pengirim === 'user' ? 'msg-user' : 'msg-ai');
    bubble.classList.add('bubble');
    const finalMsgId = msgId || ('msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5));
    row.setAttribute('data-msg-id', finalMsgId);
    const aiMeta = pengirim === 'ai' ? { pengirim: 'ai', requestData: requestData||null, error: !!errorFlag, retryable: !!retryableFlag, aborted: !!abortedFlag, errorMessage: errorMessage||'' } : null;

    if (pengirim === 'ai') {
        if (requestData) { try { row.dataset.request = JSON.stringify(requestData); } catch (e) {} }
        row.appendChild(bubble);
        if (aiMeta.error) {
            renderErrorBubble(bubble, errorMessage||teks||'Terjadi kesalahan', { retryable: !!retryableFlag, requestData: requestData||null, row });
        } else {
            bubble.innerHTML = (label ? '<div class="model-badge">' + label + '</div>' : '') + renderDenganArtifact(teks) + renderMetaStatusPesanAi(aiMeta);
        }
        const actions = document.createElement('div');
        actions.classList.add('bubble-actions');
        actions.innerHTML = '<button class="bubble-action-btn" onclick="copyBubble(this)" title="Copy">📋</button>'
            + '<button class="bubble-action-btn" onclick="pinBubble(this)" title="Pin">📌</button>'
            + '<button class="bubble-action-btn" onclick="regenerateBubble(this)" title="Ulangi">🔄</button>';
        row.appendChild(actions);
    } else {
        renderUserContent(bubble, teks, !!allowHtml);
        row.appendChild(bubble);
    }

    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;

    if (simpan) {
        const sesi  = ambilSesiAktif();
        const entry = { id: finalMsgId, teks, pengirim, label: label||'', renderAsHtml: !!allowHtml, requestData: ringkasRequestDataUntukStorage(requestData)||null, error: !!errorFlag, retryable: !!retryableFlag, aborted: !!abortedFlag, errorMessage: errorMessage||'' };
        if (pengirim === 'user' && typeof modelText === 'string' && modelText) entry.modelText = normalisasiModelTextUntukStorage(modelText);
        sesi.push(normalisasiPesanUntukStorage(entry));
        simpanSesiAktif(sesi);
    }
    sinkronkanSessionIndexKeRow(row);
    if (pengirim === 'ai') { updatePinnedButtonState(row); updateRequestActionState(row); }
}

// ── SIDEBAR & MODAL RENDER ──

function renderRiwayatSidebar() {
    const semua = ambilSemuaRiwayat();
    const el    = document.getElementById('daftarRiwayatSidebar');
    el.innerHTML = '';
    if (semua.length === 0) {
        el.innerHTML = '<p style="color:var(--muted);font-size:0.83rem;padding:8px 12px;">Belum ada riwayat.</p>';
        return;
    }
    semua.forEach((r, idx) => {
        const div = document.createElement('div');
        div.classList.add('riwayat-item');
        div.innerHTML = '<div class="riwayat-item-info"><div class="riwayat-item-judul">' + escapeHtml(r.judul) + '</div><div class="riwayat-item-tanggal">' + formatTanggal(r.tanggal) + '</div></div>';
        div.addEventListener('click', () => {
            if (Date.now() < AppState.suppressHistoryClickUntil) return;
            bukaModalRiwayat(r);
        });
        let pressTimer, longPressTriggered = false;
        div.addEventListener('touchstart', (e) => {
            longPressTriggered = false;
            pressTimer = setTimeout(() => {
                longPressTriggered = true;
                AppState.suppressHistoryClickUntil = Date.now() + 700;
                e.preventDefault();
                AppState.contextTargetIdx = idx;
                const menu    = document.getElementById('contextMenuRiwayat');
                const touch   = e.touches[0];
                const appRect = document.querySelector('.app-container').getBoundingClientRect();
                let x = touch.clientX - appRect.left;
                let y = touch.clientY - appRect.top;
                if (x + 170 > appRect.width)  x = appRect.width - 175;
                if (y + 60  > appRect.height) y = appRect.height - 65;
                menu.style.left = x + 'px'; menu.style.top = y + 'px';
                menu.classList.add('show');
            }, 500);
        }, { passive: false });
        div.addEventListener('touchend',  () => { clearTimeout(pressTimer); if (longPressTriggered) AppState.suppressHistoryClickUntil = Date.now() + 700; });
        div.addEventListener('touchmove', () => { clearTimeout(pressTimer); longPressTriggered = false; });
        el.appendChild(div);
    });
}

function bukaModalRiwayat(r) {
    AppState.riwayatAktifDibuka = r;
    document.getElementById('judulRiwayatModal').textContent = r.judul;
    const body = document.getElementById('isiRiwayatModal');
    body.innerHTML = '';
    r.pesan.forEach(p => {
        const row    = document.createElement('div');
        const bubble = document.createElement('div');
        row.classList.add('msg-row', p.pengirim === 'user' ? 'msg-user' : 'msg-ai');
        bubble.classList.add('bubble');
        if (p.pengirim === 'ai') {
            if (p.error) {
                bubble.innerHTML = '<span style="color:var(--danger);font-size:0.88rem;">⚠️ ' + escapeHtml(p.errorMessage||p.teks||'Terjadi kesalahan') + '</span>' + renderMetaStatusPesanAi(p);
            } else {
                bubble.innerHTML = (p.label ? '<div class="model-badge">' + p.label + '</div>' : '') + renderDenganArtifact(p.teks) + renderMetaStatusPesanAi(p);
            }
        } else {
            renderUserContent(bubble, p.teks, !!p.renderAsHtml);
        }
        row.appendChild(bubble);
        body.appendChild(row);
    });
    document.getElementById('modalRiwayat').classList.add('show');
    document.getElementById('sidebarMenu').classList.remove('open');
    document.getElementById('sidebarOverlay').classList.remove('show');
}

function tampilkanDaftarMemori() {
    const daftar = ambilMemori();
    const el     = document.getElementById('daftarMemori');
    el.innerHTML = '';
    if (daftar.length === 0) {
        el.innerHTML = '<p style="color:var(--muted);text-align:center;font-size:0.88rem;">Belum ada memori permanen.</p>';
        return;
    }
    daftar.forEach((teks, index) => {
        const div = document.createElement('div');
        div.classList.add('memory-item');
        div.innerHTML = '<span class="memory-item-teks">' + escapeHtml(teks) + '</span>'
            + '<button class="btn-hapus-item" data-index="' + index + '">&#128465;</button>';
        el.appendChild(div);
    });
    document.querySelectorAll('.btn-hapus-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const d = ambilMemori();
            d.splice(parseInt(btn.getAttribute('data-index')), 1);
            simpanMemori(d);
            tampilkanDaftarMemori();
        });
    });
}

// ── FILE & INPUT UI ──

function renderFilePreview() {
    const el     = document.getElementById('filePreview');
    const nameEl = document.getElementById('filePreviewName');
    if (AppState.persistedFile) {
        nameEl.innerHTML = '<span style="color:var(--text);font-weight:700;">' + escapeHtml(AppState.persistedFile.name) + '</span>'
            + ' <span style="color:var(--accent);font-size:0.72rem;font-weight:600;">· aktif</span>'
            + (filePersistenTidakLengkap(AppState.persistedFile) ? ' <span style="color:#f59e0b;font-size:0.72rem;font-weight:700;">· snapshot</span>' : '');
        el.classList.add('show');
    } else {
        el.classList.remove('show');
    }
}

function setSedangLoading(val) {
    AppState.sedangLoading = val;
    const btn = document.getElementById('tombolKirim');
    if (val) { btn.classList.add('stop-mode'); btn.innerHTML = '■'; btn.title = 'Stop'; }
    else     { btn.classList.remove('stop-mode'); btn.innerHTML = '➤'; btn.title = 'Kirim'; }
}

function pakaiQuickPrompt(el) {
    const teks  = el.textContent.replace(/^[\p{Emoji}\s]+/u, '').trim();
    const kolom = document.getElementById('kolomTanya');
    kolom.value = teks; kolom.focus();
    kolom.dispatchEvent(new Event('input'));
}

function tutupContextMenu() {
    document.getElementById('contextMenuRiwayat').classList.remove('show');
    AppState.contextTargetIdx = -1;
}

// ── INIT ──

function muatSesiAktif() {
    const sesi = ambilSesiAktif();
    if (sesi.length > 0) {
        document.getElementById('welcome-screen').style.display = 'none';
        sesi.forEach(p => tambahPesan(p.teks, p.pengirim, false, p.pengirim==='ai'?(p.label||''):'', !!p.renderAsHtml, p.requestData||null, p.id||null, p.modelText||null, !!p.error, !!p.retryable, !!p.aborted, p.errorMessage||''));
    }
}

function sinkronkanStateDariSesiAktif() {
    const sesi = ambilSesiAktif();
    const aiDenganRequest = [...sesi].reverse().find(p => p && p.pengirim === 'ai' && p.requestData);
    AppState.lastPromptData = aiDenganRequest?.requestData || null;
}

function resetTransientState(opts) {
    const keepLastPrompt = !!(opts && opts.keepLastPrompt);
    AppState.fileContent   = null; AppState.fileName    = null;
    AppState.imageData     = null; AppState.imageMime   = null;
    AppState.persistedFile = null;
    simpanFilePersisten(null);
    document.getElementById('imgPreviewWrap').classList.remove('show');
    document.getElementById('imgPreviewThumb').src = '';
    document.getElementById('filePreview').classList.remove('show');
    document.getElementById('filePreviewName').innerHTML = '';
    document.getElementById('fileInput').value = '';
    if (!keepLastPrompt) AppState.lastPromptData = null;
}

function cariIndexSesiById(msgId) {
    if (!msgId) return -1;
    return ambilSesiAktif().findIndex(p => p && p.id === msgId);
}

function sinkronkanSessionIndexKeRow(row) {
    if (!row) return -1;
    const idx = cariIndexSesiById(row.getAttribute('data-msg-id'));
    if (idx >= 0) row.dataset.sessionIndex = String(idx);
    else delete row.dataset.sessionIndex;
    return idx;
}
