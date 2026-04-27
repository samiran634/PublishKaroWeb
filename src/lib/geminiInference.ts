/**
 * Gemini 2.0 Flash AI inference utility for research paper analysis.
 * Accepts a PDF File object directly — no client-side extraction needed.
 */

export interface AnalysisResult {
  extractedTitle: string;
  extractedAbstract: string;
  keywords: string[];
  summary: string;
  suggestions: string[];
  confidence: number; // 0–100
  rawResponse: string;
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Convert a File to a base64 string for Gemini inline data.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URI prefix (e.g. "data:application/pdf;base64,")
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Send a research paper PDF + metadata to Gemini 2.0 Flash for analysis.
 * Returns structured extraction result.
 */
export async function analyzeSubmission(
  pdfFile: File,
  title: string,
  abstract: string
): Promise<AnalysisResult> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('VITE_GEMINI_API_KEY is not set. Please add it to your .env file.');
  }

  const pdfBase64 = await fileToBase64(pdfFile);

  const prompt = `You are an expert academic paper analyst. Analyze this research paper PDF and the provided metadata.

Provided Title: "${title}"
Provided Abstract: "${abstract}"

Please extract and analyze the paper and return a JSON response with this exact structure:
{
  "extractedTitle": "the actual paper title found in the PDF",
  "extractedAbstract": "the actual abstract found in the PDF",
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "summary": "a 2-3 sentence plain language summary of the paper's contribution",
  "suggestions": ["suggestion for improving submission readiness 1", "suggestion 2"],
  "confidence": 85
}

Rules:
- If the title/abstract in the PDF matches what was provided, keep the provided values
- keywords: extract 4-6 key technical terms
- suggestions: give 1-3 actionable tips for journal submission readiness
- confidence: your confidence score (0-100) that the metadata is accurate
- Return ONLY the JSON, no markdown code blocks, no extra text`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  let parsed: Omit<AnalysisResult, 'rawResponse'>;
  try {
    // Gemini sometimes wraps in markdown fences despite instructions
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: return what we can
    parsed = {
      extractedTitle: title,
      extractedAbstract: abstract,
      keywords: [],
      summary: rawText.slice(0, 300),
      suggestions: ['Could not parse AI suggestions. Please review manually.'],
      confidence: 0,
    };
  }

  return {
    ...parsed,
    rawResponse: rawText,
  };
}
