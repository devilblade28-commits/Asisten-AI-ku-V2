// api/ollama/models.js — Funixx AI Backend
const MODELS = [
    { name: 'glm-5.1',               category: 'Reasoning', desc: 'Agentic engineering' },
    { name: 'glm-5',                  category: 'Reasoning', desc: 'Complex tasks' },
    { name: 'gemma4',                 category: 'Frontier',  desc: 'Multimodal + reasoning' },
    { name: 'qwen3.5',                category: 'General',   desc: 'Multimodal family' },
    { name: 'kimi-k2.5',              category: 'Multimodal',desc: 'Vision + language' },
    { name: 'qwen3-coder-next',       category: 'Coding',    desc: 'Code generation' },
    { name: 'devstral-2',             category: 'Coding',    desc: 'Multi-file editing' },
    { name: 'devstral-small-2',       category: 'Coding',    desc: 'Lightweight coding' },
    { name: 'minimax-m2.7',           category: 'Coding',    desc: 'Coding + productivity' },
    { name: 'minimax-m2.5',           category: 'General',   desc: 'Coding + productivity' },
    { name: 'ministral-3',            category: 'Edge',      desc: 'Small footprint' },
    { name: 'nemotron-3-nano',        category: 'Efficient', desc: 'Small efficient' },
    { name: 'nemotron-3-super',       category: 'MoE',       desc: '120B efficient' },
    { name: 'rnj-1',                  category: 'Code+STEM', desc: '8B dense' },
    { name: 'deepseek-v3.2',          category: 'Reasoning', desc: 'High efficiency' },
    { name: 'minimax-m2',             category: 'General',   desc: 'General LLM' },
    { name: 'cogito-2.1',             category: 'General',   desc: '671B dense' },
    { name: 'gemini-3-flash-preview', category: 'Frontier',  desc: 'Google Gemini 3' },
    { name: 'glm-4.7',                category: 'Coding',    desc: 'Coding tuned' }
];

export default (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();
    res.status(200).json({ models: MODELS });
};
