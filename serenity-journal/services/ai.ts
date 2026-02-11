import { DiaryEntry } from '../types';

// Gemini API 配置
const getApiKey = (): string => {
  // 支持 Vite 环境变量
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) {
    return import.meta.env.VITE_GEMINI_API_KEY;
  }
  return '';
};

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

export interface AIAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  emotions: string[];
  summary: string;
  suggestions: string[];
  themes: string[];
}

export interface AIPrompt {
  type: 'analyze' | 'suggest' | 'summarize' | 'inspire';
  content: string;
  context?: string;
}

// 检查 API Key 是否有效
export const isAIAvailable = (): boolean => {
  const apiKey = getApiKey();
  return !!(apiKey && apiKey !== 'PLACEHOLDER_API_KEY');
};

// 调用 Gemini API
const callGeminiAPI = async (prompt: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    throw new Error('Gemini API Key 未配置');
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API 请求失败');
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      throw new Error('AI 未返回有效响应');
    }

    return text;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};

// 分析日记情感
export const analyzeDiaryEntry = async (entry: DiaryEntry): Promise<AIAnalysis> => {
  const prompt = `请分析以下日记的情感和主题。返回 JSON 格式的分析结果。

日记内容：
标题：${entry.title || '无标题'}
日期：${entry.date}
心情：${entry.mood}
天气：${entry.weather}
内容：${entry.content}
标签：${entry.tags?.join(', ') || '无'}

请返回以下格式的 JSON（不要包含 markdown 代码块标记）：
{
  "sentiment": "positive/negative/neutral/mixed",
  "emotions": ["情感1", "情感2"],
  "summary": "一句话总结",
  "suggestions": ["建议1", "建议2"],
  "themes": ["主题1", "主题2"]
}`;

  const response = await callGeminiAPI(prompt);
  
  try {
    // 清理可能的 markdown 代码块标记
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleanedResponse);
  } catch {
    // 如果解析失败，返回默认值
    return {
      sentiment: 'neutral',
      emotions: [entry.mood],
      summary: entry.content.slice(0, 50) + '...',
      suggestions: ['继续保持写日记的习惯'],
      themes: entry.tags || [],
    };
  }
};

// 获取写作灵感
export const getWritingInspiration = async (mood?: string, weather?: string): Promise<string[]> => {
  const context = [];
  if (mood) context.push(`心情：${mood}`);
  if (weather) context.push(`天气：${weather}`);
  
  const prompt = `作为一个日记写作助手，请给用户提供3-5个写作灵感或提示。
${context.length > 0 ? `用户当前的状态：${context.join('，')}` : ''}

请用温暖、鼓励的语气，提供具体且有启发性的写作提示。
每个提示一行，不要编号，不要使用引号。`;

  const response = await callGeminiAPI(prompt);
  return response.split('\n').filter(line => line.trim()).slice(0, 5);
};

// 生成日记摘要
export const generateEntrySummary = async (entries: DiaryEntry[]): Promise<string> => {
  if (entries.length === 0) return '';

  const entriesText = entries.slice(0, 10).map(e => 
    `${e.date}: ${e.mood} - ${e.content.slice(0, 100)}`
  ).join('\n');

  const prompt = `请对以下近期日记进行整体分析和总结，用2-3句温暖的话语描述用户最近的情感状态和生活主题。

近期日记：
${entriesText}

请直接返回总结文字，不要使用引号或其他格式标记。`;

  return await callGeminiAPI(prompt);
};

// 智能标签建议
export const suggestTags = async (content: string): Promise<string[]> => {
  const prompt = `根据以下日记内容，建议3-5个合适的标签词。

日记内容：
${content.slice(0, 500)}

请返回标签词，用逗号分隔，不要使用#符号，不要解释。
例如：感恩,成长,工作,灵感`;

  const response = await callGeminiAPI(prompt);
  return response
    .split(/[,，]/)
    .map(tag => tag.trim())
    .filter(tag => tag && tag.length < 10)
    .slice(0, 5);
};

// 情感趋势分析
export const analyzeEmotionTrend = async (entries: DiaryEntry[]): Promise<string> => {
  if (entries.length < 3) {
    return '日记数量较少，还无法分析情感趋势。继续写日记，我会帮你发现更多有趣的规律！';
  }

  const recentEntries = entries.slice(0, 20);
  const moodData = recentEntries.map(e => `${e.date}: ${e.mood}`).join('\n');

  const prompt = `请分析用户最近的心情变化趋势，给出温暖且有洞察力的分析。

心情记录：
${moodData}

请用2-3句话描述情感趋势，语气要温暖积极，最后可以给一个小建议。`;

  return await callGeminiAPI(prompt);
};
