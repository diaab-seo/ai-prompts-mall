/**
 * redistribute-categories.mjs
 * 
 * Re-assigns primary_category for repos using topic-based rules.
 * This fixes the 10 empty categories by analysing each repo's topics
 * and choosing the best matching category.
 * 
 * Run: node scripts/redistribute-categories.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const REPOS_DIR = join(__dir, '../src/data/repos');
const MANIFEST_PATH = join(__dir, '../src/data/manifest.json');

// Topic → category mapping (ordered by specificity)
const TOPIC_RULES = [
  // ai-safety (check first — safety topics are specific)
  { cat: 'ai-safety', topics: ['ai-safety', 'alignment', 'red-teaming', 'jailbreak', 'adversarial', 'responsible-ai', 'trustworthy-ai', 'explainability', 'bias', 'fairness', 'guardrails', 'safety'] },
  // ai-evaluation
  { cat: 'ai-evaluation', topics: ['evaluation', 'benchmark', 'leaderboard', 'evals', 'llm-evaluation', 'red-teaming', 'metrics', 'testing', 'llm-benchmark', 'evals', 'assessment'] },
  // ai-datasets
  { cat: 'ai-datasets', topics: ['dataset', 'datasets', 'data-collection', 'synthetic-data', 'annotation', 'data-labeling', 'nlp-dataset', 'huggingface-datasets', 'corpus', 'training-data', 'pretraining'] },
  // prompt-engineering
  { cat: 'prompt-engineering', topics: ['prompt', 'prompts', 'prompt-engineering', 'chatgpt', 'chatbot', 'chat', 'conversation', 'gpt', 'system-prompt', 'few-shot', 'chain-of-thought', 'jailbreak', 'awesome-prompts', 'prompt-injection'] },
  // fine-tuning
  { cat: 'fine-tuning', topics: ['fine-tuning', 'finetuning', 'lora', 'qlora', 'instruction-tuning', 'rlhf', 'dpo', 'peft', 'sft', 'rl', 'reinforcement-learning-from-human-feedback', 'alpaca', 'vicuna', 'unsloth', 'finetune'] },
  // multimodal-ai
  { cat: 'multimodal-ai', topics: ['multimodal', 'vision', 'image', 'video', 'audio', 'speech', 'text-to-image', 'image-generation', 'stable-diffusion', 'diffusion', 'clip', 'vqa', 'vlm', 'visual', 'ocr', 'asr', 'tts', 'whisper', 'dall-e', 'midjourney-alternative', 'image-to-text', 'text-to-video', 'text-to-speech', 'computer-vision', 'object-detection', 'segmentation'] },
  // open-source-llms
  { cat: 'open-source-llms', topics: ['llama', 'llama2', 'llama3', 'mistral', 'gemma', 'phi', 'falcon', 'bloom', 'gpt2', 'gpt-neox', 'mpt', 'qwen', 'deepseek', 'baichuan', 'chatglm', 'yi', 'mixtral', 'mixtral', 'open-llm', 'local-llm', 'llm-inference', 'ollama', 'vllm', 'inference', 'gguf', 'ggml', 'quantization', 'quantization', 'llm-serving'] },
  // ai-infrastructure
  { cat: 'ai-infrastructure', topics: ['mlops', 'infrastructure', 'deployment', 'serving', 'monitoring', 'orchestration', 'pipeline', 'workflow', 'kubernetes', 'docker', 'cloud', 'gpu', 'distributed', 'training', 'model-serving', 'ml-platform', 'feature-store', 'experiment-tracking', 'wandb', 'mlflow', 'ray', 'dask', 'spark', 'airflow', 'prefect', 'kubeflow', 'seldon', 'triton', 'tensorrt', 'onnx'] },
  // ai-frameworks
  { cat: 'ai-frameworks', topics: ['framework', 'library', 'sdk', 'api', 'openai', 'anthropic', 'langchain', 'llamaindex', 'haystack', 'semantic-kernel', 'autogen', 'crewai', 'dspy', 'guidance', 'pytorch', 'tensorflow', 'jax', 'keras', 'transformers', 'huggingface', 'accelerate', 'deepspeed'] },
  // ai-agents
  { cat: 'ai-agents', topics: ['agent', 'agents', 'autonomous-agent', 'multi-agent', 'agentic', 'tool-use', 'function-calling', 'code-generation', 'coding-agent', 'browser-agent', 'web-agent', 'computer-use', 'task-automation'] },
  // rag-retrieval
  { cat: 'rag-retrieval', topics: ['rag', 'retrieval', 'retrieval-augmented-generation', 'vector-search', 'semantic-search', 'embedding', 'embeddings', 'document', 'knowledge-base', 'chunking', 'indexing', 'reranking'] },
  // vector-databases
  { cat: 'vector-databases', topics: ['vector-database', 'vector-db', 'embeddings', 'similarity-search', 'pinecone', 'weaviate', 'chroma', 'milvus', 'qdrant', 'faiss', 'ann', 'hnsw', 'vector-store', 'pgvector'] },
  // large-language-models (fallback)
  { cat: 'large-language-models', topics: ['llm', 'large-language-model', 'language-model', 'nlp', 'text-generation', 'gpt', 'openai', 'chatgpt'] },
];

// Keyword rules for description matching (if topics don't match)  
const DESC_RULES = [
  { cat: 'ai-safety', keywords: ['safety', 'alignment', 'guardrail', 'jailbreak', 'red team', 'adversarial'] },
  { cat: 'ai-evaluation', keywords: ['evaluat', 'benchmark', 'leaderboard', 'metric', 'assessment'] },
  { cat: 'ai-datasets', keywords: ['dataset', 'data collection', 'synthetic data', 'annotation', 'corpus'] },
  { cat: 'prompt-engineering', keywords: ['prompt', 'chatgpt', 'chat template', 'system prompt', 'jailbreak'] },
  { cat: 'fine-tuning', keywords: ['fine-tun', 'finetuning', 'lora', 'rlhf', 'instruction tun', 'dpo', 'qlora', 'peft'] },
  { cat: 'multimodal-ai', keywords: ['multimodal', 'image generation', 'stable diffusion', 'text-to-image', 'vision', 'audio', 'speech', 'video generation', 'dall-e', 'midjourney', 'diffusion model', 'vlm', 'visual language'] },
  { cat: 'open-source-llms', keywords: ['llama', 'mistral', 'gemma', 'open-source llm', 'local llm', 'quantiz', 'gguf', 'ollama', 'vllm', 'run locally', 'llm inference'] },
  { cat: 'ai-infrastructure', keywords: ['mlops', 'model serving', 'deployment', 'orchestrat', 'ml pipeline', 'monitoring', 'ml platform', 'training infrastructure', 'distributed training'] },
  { cat: 'ai-frameworks', keywords: ['framework', 'sdk', 'api wrapper', 'langchain', 'llamaindex', 'haystack', 'pytorch', 'tensorflow', 'build ai', 'ai library'] },
  { cat: 'ai-applications', keywords: ['application', 'assistant', 'productivity', 'writing', 'coding assistant', 'code assistant', 'ide', 'search engine', 'knowledge management', 'note', 'browser extension'] },
];

function determineBestCategory(repo) {
  const topics = (repo.topics || []).map(t => t.toLowerCase());
  const desc = (repo.description || '').toLowerCase();
  const name = (repo.repo || '').toLowerCase();

  // Topic-based matching
  for (const rule of TOPIC_RULES) {
    for (const topic of rule.topics) {
      if (topics.includes(topic)) return rule.cat;
    }
  }

  // Description-based matching
  for (const rule of DESC_RULES) {
    for (const kw of rule.keywords) {
      if (desc.includes(kw) || name.includes(kw.replace(/[^a-z]/g, ''))) return rule.cat;
    }
  }

  // Keep current category as fallback
  return repo.primary_category;
}

// Load manifest
const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));

let changed = 0;
const catCounts = {};

for (const repo of manifest) {
  const newCat = determineBestCategory(repo);
  if (newCat !== repo.primary_category) {
    changed++;
  }
  repo.primary_category = newCat;
  catCounts[newCat] = (catCounts[newCat] || 0) + 1;
}

// Save updated manifest
writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

// Also update each repo JSON file
let fileUpdated = 0;
const files = readdirSync(REPOS_DIR).filter(f => f.endsWith('.json'));
for (const file of files) {
  const path = join(REPOS_DIR, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const matched = manifest.find(r => r.full_name === data.full_name);
  if (matched && matched.primary_category !== data.primary_category) {
    data.primary_category = matched.primary_category;
    writeFileSync(path, JSON.stringify(data, null, 2));
    fileUpdated++;
  }
}

console.log(`✅ Redistributed categories. Changed: ${changed} repos, Updated ${fileUpdated} files.`);
console.log('\nCategory counts:');
Object.entries(catCounts).sort((a, b) => b[1] - a[1]).forEach(([cat, n]) => {
  console.log(`  ${cat}: ${n}`);
});
