export interface ProviderMeta {
  name: string;
  color: string;
  icon?: string;
  hidden?: boolean;
}

export type ProviderStyleLookup = (provider: string) => { name: string; color: string };

// Curated display names and brand colors. Provider colors are semantic
// identifiers on the topology, not interface accents.
export const PROVIDER_META: Record<string, ProviderMeta> = {
  antigravity: { name: "Antigravity", color: "#f5b942" },
  openrouter: { name: "OpenRouter", color: "#8f84ff" },
  gemini: { name: "Gemini", color: "#4f9cf9" },
  "gemini-cli": { name: "Gemini CLI", color: "#6bb8ff" },
  nvidia: { name: "NVIDIA NIM", color: "#76b900" },
  cline: { name: "Cline", color: "#5aa9ff" },
  "clinepass": { name: "Cline Pass", color: "#5aa9ff" },
  kiro: { name: "Kiro AI", color: "#b06bff" },
  opencode: { name: "OpenCode Free", color: "#b7c0cc" },
  agnes: { name: "Agnes AI", color: "#b98cff" },
  claude: { name: "Claude", color: "#d97757", icon: "claude.png" },
  anthropic: { name: "Anthropic", color: "#d97757" },
  codex: { name: "Codex", color: "#10a37f" },
  openai: { name: "OpenAI", color: "#10a37f" },
  copilot: { name: "GitHub Copilot", color: "#c9d1d9" },
  github: { name: "GitHub", color: "#c9d1d9" },
  glm: { name: "GLM", color: "#5a8dee" },
  "glm-cn": { name: "GLM CN", color: "#5a8dee" },
  minimax: { name: "MiniMax", color: "#ff6b5f" },
  "minimax-cn": { name: "MiniMax CN", color: "#ff6b5f" },
  kimi: { name: "Kimi", color: "#ffb84d" },
  "kimi-coding": { name: "Kimi Coding", color: "#ffb84d" },
  deepseek: { name: "DeepSeek", color: "#4d6bfe" },
  "deepseek-tui": { name: "DeepSeek TUI", color: "#4d6bfe" },
  groq: { name: "Groq", color: "#f55036" },
  xai: { name: "xAI", color: "#e5e7eb" },
  "grok-cli": { name: "Grok CLI", color: "#e5e7eb" },
  mistral: { name: "Mistral", color: "#ffaf00" },
  perplexity: { name: "Perplexity", color: "#20b8cd" },
  together: { name: "Together AI", color: "#8f84ff" },
  fireworks: { name: "Fireworks", color: "#ff7a45" },
  cerebras: { name: "Cerebras", color: "#f8a15a" },
  cohere: { name: "Cohere", color: "#d18ee2" },
  siliconflow: { name: "SiliconFlow", color: "#5ad1c8" },
  nebius: { name: "Nebius", color: "#5aa9ff" },
  chutes: { name: "Chutes", color: "#b98cff" },
  hyperbolic: { name: "Hyperbolic", color: "#8f84ff" },
  ollama: { name: "Ollama", color: "#b7c0cc" },
  "ollama-local": { name: "Ollama Local", color: "#b7c0cc" },
  "cloudflare-ai": { name: "Cloudflare AI", color: "#f6821f" },
  iflow: { name: "iFlow", color: "#6bb8ff" },
  qwen: { name: "Qwen", color: "#6f5cff" },
  kilocode: { name: "Kilo Code", color: "#f5b942" },
  "kilo-gateway": { name: "Kilo Gateway", color: "#f5b942" },
  cursor: { name: "Cursor", color: "#c9d1d9" },
  continue: { name: "Continue", color: "#b7c0cc" },
  droid: { name: "Droid", color: "#5aa9ff" },
  roo: { name: "Roo", color: "#5aa9ff" },
  opendesign: { name: "OpenDesign", color: "#b98cff" },
  jcode: { name: "jcode", color: "#5ad1c8" },
  "devin-cli": { name: "Devin CLI", color: "#8f84ff" },
  codebuddy: { name: "CodeBuddy", color: "#5aa9ff" },
  "codebuddy-intl": { name: "CodeBuddy Intl", color: "#5aa9ff" },
  amp: { name: "Amp", color: "#f5b942" },
  blackbox: { name: "Blackbox", color: "#c9d1d9" },
  "github-copilot": { name: "GitHub Copilot", color: "#c9d1d9" },
};

const SVG_ICONS = new Set(["codewhale.svg", "kimchi.svg", "pi.svg"]);

function prettify(id: string): string {
  return id
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function providerMeta(id: string, fallbackName?: string): ProviderMeta {
  const key = (id || "unknown").toLowerCase();
  const meta = PROVIDER_META[key];
  return {
    name: meta?.name || fallbackName || prettify(key),
    color: meta?.color || "#8b95a4",
  };
}

export function providerIcon(id: string): string | null {
  const key = (id || "").toLowerCase();
  if (!key) return null;
  const meta = PROVIDER_META[key];
  if (meta?.icon) return `/providers/${meta.icon}`;
  return `/providers/${SVG_ICONS.has(`${key}.svg`) ? `${key}.svg` : `${key}.png`}`;
}
