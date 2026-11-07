import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export type ModelProvider = 'deepseek' | 'qwen' | 'claude' | 'openai' | 'gemini' | 'ollama' | 'native';

export interface ModelPricing {
  inputPerMillion: number;  // Giá USD cho 1 triệu input tokens
  outputPerMillion: number; // Giá USD cho 1 triệu output tokens
}

export const MODEL_PRICING_TABLE: Record<string, ModelPricing> = {
  // Antigravity IDE Models
  'gemini 3.8 flash (medium)': { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  'gemini 3.8 flash (high)': { inputPerMillion: 0.15, outputPerMillion: 0.60 },
  'gemini 3.8 flash': { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  'gemini 4 argon (medium)': { inputPerMillion: 0.30, outputPerMillion: 1.20 },
  'gemini 4 argon (high)': { inputPerMillion: 0.50, outputPerMillion: 2.00 },

  // Gemini Standard API
  'gemini-2.0-flash': { inputPerMillion: 0.10, outputPerMillion: 0.40 },
  'gemini-1.5-pro': { inputPerMillion: 1.25, outputPerMillion: 5.00 },
  'gemini-1.5-flash': { inputPerMillion: 0.075, outputPerMillion: 0.30 },

  // DeepSeek
  'deepseek-chat': { inputPerMillion: 0.14, outputPerMillion: 0.28 },
  'deepseek-reasoner': { inputPerMillion: 0.55, outputPerMillion: 2.19 },

  // Qwen
  'qwen-2.5-vl': { inputPerMillion: 0.20, outputPerMillion: 0.60 },
  'qwen-vl-max': { inputPerMillion: 0.40, outputPerMillion: 1.20 },
  'qwen-plus': { inputPerMillion: 0.12, outputPerMillion: 0.36 },

  // Claude
  'claude-3-5-sonnet': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-3-7-sonnet': { inputPerMillion: 3.00, outputPerMillion: 15.00 },
  'claude-3-5-haiku': { inputPerMillion: 0.80, outputPerMillion: 4.00 },

  // OpenAI
  'gpt-4o': { inputPerMillion: 2.50, outputPerMillion: 10.00 },
  'gpt-4o-mini': { inputPerMillion: 0.15, outputPerMillion: 0.60 },

  // Local / Native
  'ollama': { inputPerMillion: 0.00, outputPerMillion: 0.00 },
  'native': { inputPerMillion: 0.00, outputPerMillion: 0.00 }
};

export interface TokenUsageStats {
  modelName: string;
  provider: ModelProvider;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  isEstimated: boolean;
  sourceDescription: string;
}

export class ModelConfigManager {
  private currentProvider: ModelProvider = 'native';
  private currentModelName = 'Playwright Native Heuristics';
  private sourceDescription = 'Native';
  private totalInputTokens = 0;
  private totalOutputTokens = 0;
  private hasDirectApiTokens = false;

  constructor() {
    this.detectAndConfigureProvider();
  }

  /**
   * Tự động phát hiện model đang được chọn trực tiếp trong Antigravity IDE UI
   */
  public detectIdeEnvironment(): { model: string; provider: ModelProvider; source: string } | null {
    const appDataDir = process.env.ANTIGRAVITY_APP_DATA_DIR || path.join(os.homedir(), '.gemini', 'antigravity');
    const convId = process.env.ANTIGRAVITY_CONVERSATION_ID;

    // 1. Quét transcript active session của Antigravity IDE
    if (convId) {
      const transcriptPath = path.join(appDataDir, 'brain', convId, '.system_generated', 'logs', 'transcript.jsonl');
      if (fs.existsSync(transcriptPath)) {
        try {
          const content = fs.readFileSync(transcriptPath, 'utf8');
          const lines = content.trim().split('\n');

          // Quét từ dưới lên trên (gần nhất) để lấy model selection mới nhất mà user đã click chọn
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            const match = line.match(/The user changed setting `Model Selection` (?:from .*? )?to (.+?)\.\s+No need/i);
            if (match && match[1]) {
              const detectedModel = match[1].trim();
              const lower = detectedModel.toLowerCase();
              const provider: ModelProvider = lower.includes('gemini') ? 'gemini'
                : lower.includes('claude') ? 'claude'
                : lower.includes('deepseek') ? 'deepseek'
                : lower.includes('qwen') ? 'qwen'
                : 'native';

              return {
                model: detectedModel,
                provider,
                source: `Antigravity IDE UI Selector (${convId.slice(0, 8)})`
              };
            }
          }
        } catch (e) {
          // ignore read error
        }
      }
    }

    // 2. Quét cài đặt toàn cục trong ~/.gemini/antigravity-cli/settings.json
    const cliSettingsPath = path.join(os.homedir(), '.gemini', 'antigravity-cli', 'settings.json');
    if (fs.existsSync(cliSettingsPath)) {
      try {
        const cliSettings = JSON.parse(fs.readFileSync(cliSettingsPath, 'utf8'));
        if (cliSettings.model) {
          const detectedModel = String(cliSettings.model).trim();
          const lower = detectedModel.toLowerCase();
          const provider: ModelProvider = lower.includes('gemini') ? 'gemini'
            : lower.includes('claude') ? 'claude'
            : lower.includes('deepseek') ? 'deepseek'
            : lower.includes('qwen') ? 'qwen'
            : 'native';

          return {
            model: detectedModel,
            provider,
            source: 'Antigravity CLI Config'
          };
        }
      } catch {}
    }

    return null;
  }

  public detectAndConfigureProvider(): void {
    const providerEnv = (process.env.QA_MODEL_PROVIDER || '').toLowerCase();
    
    // 1. DeepSeek (Ngoại vi)
    if (providerEnv === 'deepseek' || process.env.DEEPSEEK_API_KEY) {
      this.currentProvider = 'deepseek';
      this.currentModelName = process.env.QA_MODEL_NAME || 'deepseek-chat';
      this.sourceDescription = 'DeepSeek API Direct Key';
      process.env.OPENAI_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
      process.env.OPENAI_API_KEY = process.env.DEEPSEEK_API_KEY || process.env.QA_API_KEY;
      process.env.MIDSCENE_MODEL_NAME = this.currentModelName;
      this.hasDirectApiTokens = true;
      return;
    }

    // 2. Qwen (Ngoại vi)
    if (providerEnv === 'qwen' || process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY) {
      this.currentProvider = 'qwen';
      this.currentModelName = process.env.QA_MODEL_NAME || 'qwen-2.5-vl';
      this.sourceDescription = 'DashScope Qwen API Key';
      process.env.OPENAI_BASE_URL = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
      process.env.OPENAI_API_KEY = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || process.env.QA_API_KEY;
      process.env.MIDSCENE_MODEL_NAME = this.currentModelName;
      process.env.MIDSCENE_USE_QWEN_VL = '1';
      this.hasDirectApiTokens = true;
      return;
    }

    // 3. Claude (Ngoại vi)
    if (providerEnv === 'claude' || process.env.ANTHROPIC_API_KEY) {
      this.currentProvider = 'claude';
      this.currentModelName = process.env.QA_MODEL_NAME || 'claude-3-5-sonnet';
      this.sourceDescription = 'Anthropic Claude API Key';
      if (process.env.ANTHROPIC_BASE_URL) {
        process.env.OPENAI_BASE_URL = process.env.ANTHROPIC_BASE_URL;
      }
      process.env.OPENAI_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.QA_API_KEY;
      process.env.MIDSCENE_MODEL_NAME = this.currentModelName;
      this.hasDirectApiTokens = true;
      return;
    }

    // 4. Ollama (Local)
    if (providerEnv === 'ollama' || process.env.OLLAMA_HOST) {
      this.currentProvider = 'ollama';
      this.currentModelName = process.env.QA_MODEL_NAME || 'qwen2.5:latest';
      this.sourceDescription = 'Local Ollama Runtime';
      process.env.OPENAI_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1';
      process.env.OPENAI_API_KEY = 'ollama';
      process.env.MIDSCENE_MODEL_NAME = this.currentModelName;
      return;
    }

    // 5. OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.currentProvider = 'openai';
      this.currentModelName = process.env.QA_MODEL_NAME || process.env.MIDSCENE_MODEL_NAME || 'gpt-4o-mini';
      this.sourceDescription = 'OpenAI API Direct Key';
      this.hasDirectApiTokens = true;
      return;
    }

    // 6. Gemini External API
    if (process.env.GEMINI_API_KEY) {
      this.currentProvider = 'gemini';
      this.currentModelName = process.env.QA_MODEL_NAME || 'gemini-2.0-flash';
      this.sourceDescription = 'Gemini Developer API Key';
      process.env.MIDSCENE_USE_GEMINI = '1';
      this.hasDirectApiTokens = true;
      return;
    }

    // 7. 🔥 TỰ ĐỘNG PHÁT HIỆN TỪ ANTIGRAVITY IDE ĐANG CHẠY 🔥
    const ideDetected = this.detectIdeEnvironment();
    if (ideDetected) {
      this.currentProvider = ideDetected.provider;
      this.currentModelName = ideDetected.model;
      this.sourceDescription = ideDetected.source;
      return;
    }

    // 8. Fallback
    this.currentProvider = 'native';
    this.currentModelName = 'Antigravity IDE Assistant';
    this.sourceDescription = 'IDE Default Context';
  }

  public recordUsage(inputTokens: number, outputTokens: number): void {
    this.totalInputTokens += inputTokens;
    this.totalOutputTokens += outputTokens;
  }

  /**
   * Tự động ước lượng tokens trao đổi giữa IDE và MCP Tool khi không có direct API billing
   */
  public recordTurnEstimation(inputText: string, outputText: string): void {
    if (!this.hasDirectApiTokens) {
      const estimatedIn = Math.max(120, Math.round((inputText.length + 500) / 3.6));
      const estimatedOut = Math.max(30, Math.round(outputText.length / 3.6));
      this.totalInputTokens += estimatedIn;
      this.totalOutputTokens += estimatedOut;
    }
  }

  public getUsageStats(): TokenUsageStats {
    const normalizedKey = this.currentModelName.toLowerCase().trim();
    let pricing = MODEL_PRICING_TABLE[normalizedKey];

    if (!pricing) {
      for (const [k, v] of Object.entries(MODEL_PRICING_TABLE)) {
        if (normalizedKey.includes(k) || k.includes(normalizedKey)) {
          pricing = v;
          break;
        }
      }
    }
    if (!pricing) {
      pricing = { inputPerMillion: 0.10, outputPerMillion: 0.40 };
    }

    const cost = (this.totalInputTokens / 1_000_000) * pricing.inputPerMillion +
                 (this.totalOutputTokens / 1_000_000) * pricing.outputPerMillion;

    return {
      modelName: this.currentModelName,
      provider: this.currentProvider,
      inputTokens: this.totalInputTokens,
      outputTokens: this.totalOutputTokens,
      totalTokens: this.totalInputTokens + this.totalOutputTokens,
      estimatedCostUsd: Number(cost.toFixed(6)),
      isEstimated: !this.hasDirectApiTokens,
      sourceDescription: this.sourceDescription
    };
  }

  public resetUsage(): void {
    this.totalInputTokens = 0;
    this.totalOutputTokens = 0;
    // Re-detect in case user changed model in IDE mid-session
    this.detectAndConfigureProvider();
  }

  public setManualConfig(provider: ModelProvider, modelName: string, source: string = 'Manual Override'): void {
    this.currentProvider = provider;
    this.currentModelName = modelName;
    this.sourceDescription = source;
  }
}

export const modelConfigManager = new ModelConfigManager();
