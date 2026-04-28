/**
 * Email Analysis Service
 * Analyzes research emails with AI and generates actionable insights
 */

import type { EmailStatus, Paper } from '@/types/types';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export type EmailCategory = 
  | 'revision_request'
  | 'reviewer_feedback'
  | 'decision_notification'
  | 'deadline_notification'
  | 'query_response'
  | 'general_inquiry'
  | 'not_research_related';

export interface EmailAnalysis {
  category: EmailCategory;
  isResearchRelated: boolean;
  relevanceScore: number; // 0-100
  keyPoints: string[];
  suggestedPaperKeywords: string[];
  urgency: 'critical' | 'high' | 'medium' | 'low';
  summary: string;
}

export interface PaperMatch {
  paperId: string;
  paperTitle: string;
  matchScore: number; // 0-100
  matchReasons: string[];
}

export interface EmailNextStep {
  action: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  dueInDays?: number;
  estimatedTimeMinutes?: number;
  description: string;
}

export interface EmailAnalysisResult {
  emailId: string;
  analysis: EmailAnalysis;
  paperMatches: PaperMatch[];
  nextSteps: EmailNextStep[];
  rawAnalysis: string;
}

/**
 * Analyze email content with AI
 */
export async function analyzeEmailContent(
  email: EmailStatus
): Promise<EmailAnalysis> {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
    throw new Error('VITE_GEMINI_API_KEY is not set');
  }

  const emailText = `
Subject: ${email.subject}
From: ${email.sender}
Snippet: ${email.email_snippet || ''}
Body: ${email.full_body || ''}
  `.trim();

  const prompt = `You are an expert research assistant. Analyze this academic/research-related email and return a JSON response.

Email Content:
${emailText}

Please analyze and return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "category": "revision_request" | "reviewer_feedback" | "decision_notification" | "deadline_notification" | "query_response" | "general_inquiry" | "not_research_related",
  "isResearchRelated": true | false,
  "relevanceScore": 85,
  "keyPoints": [
    "key point or action item 1",
    "key point or action item 2"
  ],
  "suggestedPaperKeywords": ["keyword1", "keyword2", "keyword3"],
  "urgency": "critical" | "high" | "medium" | "low",
  "summary": "2-3 sentence summary of what the email is about and what action it requires"
}

Rules:
- isResearchRelated: true only if email is about academic research, papers, or publication
- relevanceScore: 0-100, how clearly related to academic research
- keyPoints: extract 2-4 specific action items or important information
- suggestedPaperKeywords: terms that would help match this to a research paper
- urgency: critical if deadline imminent, high if action needed soon, otherwise medium/low
- If not research related, return category "not_research_related", relevanceScore 0, other fields as empty/false

Do not include any markdown code blocks or extra formatting.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Gemini API error: ${errorData.error?.message || 'Unknown error'}`);
  }

  const result = await response.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('No response from Gemini API');
  }

  try {
    const analysis = JSON.parse(content) as EmailAnalysis;
    return analysis;
  } catch (error) {
    console.error('Failed to parse analysis:', content);
    throw new Error('Failed to parse email analysis response');
  }
}

/**
 * Match email to relevant papers based on analysis
 */
export function matchEmailToPapers(
  analysis: EmailAnalysis,
  papers: Paper[]
): PaperMatch[] {
  if (!analysis.isResearchRelated || analysis.relevanceScore < 20) {
    return [];
  }

  const emailKeywords = analysis.suggestedPaperKeywords.map(k => k.toLowerCase());

  const matches = papers.map(paper => {
    let score = 0;
    const reasons: string[] = [];

    // Check title keywords
    const paperTitleLower = (paper.title || '').toLowerCase();
    const titleMatches = emailKeywords.filter(k => paperTitleLower.includes(k));
    if (titleMatches.length > 0) {
      score += titleMatches.length * 20;
      reasons.push(`Title contains: ${titleMatches.join(', ')}`);
    }

    // Check abstract keywords
    const abstractLower = (paper.abstract || '').toLowerCase();
    const abstractMatches = emailKeywords.filter(k => abstractLower.includes(k));
    if (abstractMatches.length > 0) {
      score += abstractMatches.length * 15;
      reasons.push(`Abstract mentions: ${abstractMatches.join(', ')}`);
    }

    // Check existing keywords
    if (paper.keywords && paper.keywords.length > 0) {
      const paperKeywordsLower = paper.keywords.map(k => k.toLowerCase());
      const keywordMatches = emailKeywords.filter(k =>
        paperKeywordsLower.some(pk => pk.includes(k) || k.includes(pk))
      );
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 10;
        reasons.push(`Paper keywords match: ${keywordMatches.join(', ')}`);
      }
    }

    // Check content
    if (paper.content) {
      const contentLower = paper.content.toLowerCase();
      const contentMatches = emailKeywords.filter(k => contentLower.includes(k));
      if (contentMatches.length > 0) {
        score += Math.min(contentMatches.length * 5, 30);
        reasons.push(`Content contains related terms`);
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    return {
      paperId: paper.id,
      paperTitle: paper.title,
      matchScore: score,
      matchReasons: reasons,
    };
  });

  // Return only matches above threshold, sorted by score
  return matches
    .filter(m => m.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Generate next steps based on email analysis
 */
export function generateNextSteps(
  analysis: EmailAnalysis,
  paperMatches: PaperMatch[]
): EmailNextStep[] {
  const steps: EmailNextStep[] = [];

  // Category-specific actions
  switch (analysis.category) {
    case 'revision_request':
      steps.push(
        {
          action: 'Review reviewer comments in detail',
          priority: 'critical',
          estimatedTimeMinutes: 45,
          dueInDays: 7,
          description: 'Carefully read and understand all feedback from reviewers before starting revisions',
        },
        {
          action: 'Create revision plan and timeline',
          priority: 'critical',
          estimatedTimeMinutes: 30,
          dueInDays: 7,
          description: 'Document which changes need to be made and estimate how long each will take',
        },
        {
          action: 'Update paper with revisions',
          priority: 'high',
          estimatedTimeMinutes: 180,
          dueInDays: 14,
          description: 'Implement the required revisions based on reviewer feedback',
        },
        {
          action: 'Write revision response document',
          priority: 'high',
          estimatedTimeMinutes: 90,
          dueInDays: 14,
          description: 'Explain how you addressed each reviewer comment point by point',
        }
      );
      break;

    case 'reviewer_feedback':
      steps.push(
        {
          action: 'Analyze reviewer feedback',
          priority: 'high',
          estimatedTimeMinutes: 60,
          dueInDays: 3,
          description: 'Understand key points and suggestions from reviewers',
        },
        {
          action: 'Note constructive suggestions',
          priority: 'high',
          estimatedTimeMinutes: 30,
          dueInDays: 7,
          description: 'Extract actionable improvements that can strengthen your paper',
        }
      );
      break;

    case 'decision_notification':
      steps.push(
        {
          action: 'Review decision letter',
          priority: 'high',
          estimatedTimeMinutes: 20,
          description: 'Read and understand the full decision and any comments',
        }
      );
      if (analysis.keyPoints.some(p => p.toLowerCase().includes('accept'))) {
        steps.push(
          {
            action: 'Check for camera-ready requirements',
            priority: 'high',
            estimatedTimeMinutes: 30,
            dueInDays: 7,
            description: 'Look for formatting guidelines and submission deadlines',
          }
        );
      }
      if (analysis.keyPoints.some(p => p.toLowerCase().includes('reject'))) {
        steps.push(
          {
            action: 'Plan next steps for resubmission or alternative venues',
            priority: 'medium',
            estimatedTimeMinutes: 45,
            dueInDays: 7,
            description: 'Decide whether to revise and resubmit elsewhere',
          }
        );
      }
      break;

    case 'deadline_notification':
      steps.push(
        {
          action: 'Note deadline details',
          priority: 'critical',
          estimatedTimeMinutes: 15,
          dueInDays: 1,
          description: 'Record exact deadline date, time, and submission requirements',
        },
        {
          action: 'Schedule preparation time',
          priority: 'high',
          estimatedTimeMinutes: 20,
          dueInDays: 2,
          description: 'Create calendar reminders for final preparations before deadline',
        }
      );
      break;

    case 'query_response':
      steps.push(
        {
          action: 'Review response to your inquiry',
          priority: 'medium',
          estimatedTimeMinutes: 20,
          description: 'Understand the answer or resolution to your question',
        }
      );
      break;

    default:
      steps.push(
        {
          action: 'Review email content',
          priority: 'medium',
          estimatedTimeMinutes: 15,
          description: 'Read and understand the full email message',
        }
      );
  }

  // Add paper-specific actions if matches found
  if (paperMatches.length > 0) {
    const topMatch = paperMatches[0];
    if (topMatch.matchScore >= 70) {
      steps.unshift(
        {
          action: `Update paper: ${topMatch.paperTitle}`,
          priority: analysis.urgency === 'critical' ? 'critical' : 'high',
          estimatedTimeMinutes: 60,
          dueInDays: analysis.urgency === 'critical' ? 3 : 7,
          description: `This email appears to be related to this paper. Review and make necessary updates.`,
        }
      );
    }
  }

  // Add follow-up communication step if needed
  if (['revision_request', 'reviewer_feedback'].includes(analysis.category)) {
    steps.push(
      {
        action: 'Prepare follow-up communication',
        priority: 'medium',
        estimatedTimeMinutes: 30,
        dueInDays: 21,
        description: 'Draft response or status update to send to the journal/venue after completing revisions',
      }
    );
  }

  return steps;
}

/**
 * Complete email analysis pipeline
 */
export async function analyzeEmail(
  email: EmailStatus,
  papers: Paper[]
): Promise<EmailAnalysisResult> {
  // Step 1: Analyze email
  const analysis = await analyzeEmailContent(email);

  // Step 2: Match to papers
  const paperMatches = matchEmailToPapers(analysis, papers);

  // Step 3: Generate next steps
  const nextSteps = generateNextSteps(analysis, paperMatches);

  return {
    emailId: email.id,
    analysis,
    paperMatches,
    nextSteps,
    rawAnalysis: JSON.stringify(analysis, null, 2),
  };
}

/**
 * Batch analyze multiple emails
 */
export async function analyzeEmailsBatch(
  emails: EmailStatus[],
  papers: Paper[]
): Promise<EmailAnalysisResult[]> {
  const results: EmailAnalysisResult[] = [];

  for (const email of emails) {
    try {
      const result = await analyzeEmail(email, papers);
      results.push(result);
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to analyze email ${email.id}:`, error);
    }
  }

  return results;
}
