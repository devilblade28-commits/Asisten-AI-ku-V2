// api/ollama/chat.js — Funixx AI Backend
const VALID_MODELS = new Set([
    'glm-5.1', 'glm-5', 'gemma4', 'qwen3.5', 'kimi-k2.5',
    'qwen3-coder-next', 'devstral-2', 'devstral-small-2',
    'minimax-m2.7', 'minimax-m2.5', 'ministral-3',
    'nemotron-3-nano', 'nemotron-3-super', 'rnj-1',
    'deepseek-v3.2', 'minimax-m2', 'cogito-2.1',
    'gemini-3-flash-preview', 'glm-4.7'
]);

export default async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'METHOD_NOT_ALLOWED' });

    const apiKey = process.env.OLLAMA_API_KEY;
    if (!apiKey) {
        return res.status(401).json({ success: false, error: 'API_KEY_MISSING', message: 'Ollama API key belum dikonfigurasi di server.' });
    }

    let body;
    try {
        body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (_) {
        return res.status(400).json({ success: false, error: 'INVALID_JSON' });
    }

    const { model = 'qwen3.5', messages, temperature = 0.7 } = body || {};

    // Validasi messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ success: false, error: 'INVALID_MESSAGES', message: 'Field messages harus berupa array tidak kosong.' });
    }

    // Validasi ukuran payload
    const payloadSize = JSON.stringify(messages).length;
    if (payloadSize > 10240) {
        return res.status(400).json({ success: false, error: 'PAYLOAD_TOO_LARGE', message: 'Pesan terlalu panjang (max 10KB).' });
    }

    // Validasi model (fallback ke default jika tidak valid)
    const modelAktif = VALID_MODELS.has(model) ? model : 'qwen3.5';

    try {
        const ollamaResp = await fetch('https://ollama.com/api/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelAktif,
                messages,
                temperature,
                stream: false
            }),
            signal: AbortSignal.timeout(30000)
        });

        if (ollamaResp.status === 401) {
            return res.status(401).json({ success: false, error: 'API_KEY_INVALID', message: 'API key Ollama tidak valid.' });
        }

        if (ollamaResp.status === 429) {
            const retryAfter = ollamaResp.headers.get('retry-after') || '60';
            return res.status(429).json({
                success: false,
                error: 'RATE_LIMITED',
                message: 'Quota Ollama habis. Coba lagi dalam beberapa saat.',
                retryAfter: parseInt(retryAfter, 10)
            });
        }

        if (!ollamaResp.ok) {
            let errData = {};
            try { errData = await ollamaResp.json(); } catch (_) {}
            return res.status(500).json({
                success: false,
                error: 'OLLAMA_ERROR',
                message: errData.error || `HTTP ${ollamaResp.status}`
            });
        }

        const data = await ollamaResp.json();
        return res.status(200).json({ success: true, data });

    } catch (err) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            return res.status(504).json({ success: false, error: 'TIMEOUT', message: 'Request ke Ollama timeout (>30s).' });
        }
        return res.status(500).json({ success: false, error: 'NETWORK_ERROR', message: err.message });
    }
};
