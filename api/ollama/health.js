// api/ollama/health.js — Funixx AI Backend
export default async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const apiKey = process.env.OLLAMA_API_KEY;

    if (!apiKey) {
        return res.status(401).json({ valid: false, error: 'KEY_MISSING' });
    }

    try {
        const testResp = await fetch('https://ollama.com/api/chat', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen3.5',
                messages: [{ role: 'user', content: 'test' }],
                stream: false
            }),
            signal: AbortSignal.timeout(10000)
        });

        if (testResp.ok) {
            return res.status(200).json({ valid: true });
        } else if (testResp.status === 401) {
            return res.status(401).json({ valid: false, error: 'KEY_INVALID' });
        } else {
            return res.status(200).json({ valid: false, error: 'OLLAMA_ERROR', status: testResp.status });
        }
    } catch (err) {
        return res.status(500).json({ valid: false, error: 'NETWORK_ERROR', message: err.message });
    }
};
