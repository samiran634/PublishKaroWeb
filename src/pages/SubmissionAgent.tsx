import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileText,
  FileUp,
  FolderOpen,
  Loader2,
  Lock,
  LogIn,
  Monitor,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/db/supabase';
import { type AnalysisResult, analyzeSubmission } from '@/lib/geminiInference';
import type { Credential, Paper, Venue } from '@/types/types';

type WizardStep = 'auth' | 'draft' | 'venue' | 'error';
type PaperSource = 'library' | 'manual';
type AutomationPhase = 'idle' | 'running' | 'success' | 'manual' | 'error';
type PortalStage = 'login' | 'dashboard' | 'submission-entry' | 'submission-form' | 'file-upload' | 'verification' | 'review' | 'unknown';
type PortalAction =
  | 'auto-login'
  | 'open-dashboard'
  | 'open-draft'
  | 'open-submission'
  | 'prefill-metadata'
  | 'attach-manuscript'
  | 'ask-user-login'
  | 'ask-user-verification'
  | 'ask-user-file-upload'
  | 'review-and-submit'
  | 'manual-investigation';
type AgentState = 'idle' | 'thinking' | 'ready' | 'running' | 'blocked' | 'done';

interface AgentInventoryItem {
  key: 'inference' | 'instruction' | 'execution';
  title: string;
  state: AgentState;
  summary: string;
  detail: string;
}

interface EmbedStatus {
  status: 'idle' | 'loading' | 'loaded' | 'error' | 'destroyed';
  url?: string;
  error?: string;
}

interface SubmissionDraft {
  source: PaperSource;
  paperId: string | null;
  title: string;
  abstract: string;
  pdfFileName: string | null;
  pdfFileSizeBytes: number | null;
  pdfLocalPath: string | null;
  analysisResult: AnalysisResult | null;
  storedAt: string;
}

interface AutomationStatus {
  phase: AutomationPhase;
  summary: string;
  reason?: string;
  logs: string[];
  submitButtonLabel?: string;
}

interface PageInference {
  stage: PortalStage;
  recommendedAction: PortalAction;
  summary: string;
  confidence: number;
  currentUrl?: string;
  cues: string[];
  loginRequired: boolean;
  nextButtonLabel?: string;
  userInputPrompt?: string;
  visibleButtons: string[];
  visibleHeadings: string[];
  visibleFields: string[];
  hasDialog: boolean;
}

interface PortalScriptResult {
  success: boolean;
  reason?: string;
  shouldRetry?: boolean;
  clickedLabel?: string;
  submitLabel?: string;
  currentUrl?: string;
  userInputPrompt?: string;
  filledTitle?: boolean;
  filledAbstract?: boolean;
}

interface InstructionStep {
  id: string;
  action: PortalAction;
  title: string;
  detail: string;
  targetLabel?: string;
  status: 'ready' | 'pending';
}

interface InstructionPlan {
  strategy: 'rule-chain';
  summary: string;
  primaryAction: PortalAction;
  rationale: string[];
  steps: InstructionStep[];
  userInputPrompt?: string;
}

const DRAFT_STORAGE_KEY = 'publishkaro-submission-draft';
const DEFAULT_AUTOMATION_SUMMARY = 'Store a draft, load the publication, then run the agent.';

const STEPS = [
  { key: 'auth', label: 'Sign In', icon: Lock },
  { key: 'draft', label: 'Draft Storage', icon: FileText },
  { key: 'venue', label: 'Publication Portal', icon: Building2 },
] as const;

const PORTAL_STAGE_LABELS: Record<PortalStage, string> = {
  login: 'Login Page',
  dashboard: 'Dashboard',
  'submission-entry': 'Submission Entry',
  'submission-form': 'Submission Form',
  'file-upload': 'File Upload',
  verification: 'Verification',
  review: 'Review Step',
  unknown: 'Unknown Page',
};

const PORTAL_ACTION_LABELS: Record<PortalAction, string> = {
  'auto-login': 'Use stored login',
  'open-dashboard': 'Open dashboard',
  'open-draft': 'Open draft',
  'open-submission': 'Open submission flow',
  'prefill-metadata': 'Fill title and abstract',
  'attach-manuscript': 'Attach manuscript',
  'ask-user-login': 'Ask user to sign in',
  'ask-user-verification': 'Ask user for verification',
  'ask-user-file-upload': 'Ask user to upload file',
  'review-and-submit': 'Review and continue',
  'manual-investigation': 'Manual check needed',
};

const AGENT_STATE_LABELS: Record<AgentState, string> = {
  idle: 'Idle',
  thinking: 'Thinking',
  ready: 'Ready',
  running: 'Running',
  blocked: 'Blocked',
  done: 'Done',
};

function normalisePortalText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function findPortalLabel(labels: string[], patterns: string[]): string {
  return labels.find((label) => patterns.some((pattern) => normalisePortalText(label).includes(pattern))) ?? '';
}

function createIdleAutomationStatus(summary = DEFAULT_AUTOMATION_SUMMARY): AutomationStatus {
  return {
    phase: 'idle',
    summary,
    logs: [],
  };
}

function getLocalFilePath(file: File | null): string | null {
  if (!file) return null;
  const fileWithPath = file as File & { path?: string };
  return typeof fileWithPath.path === 'string' && fileWithPath.path.trim().length > 0
    ? fileWithPath.path
    : null;
}

function buildInstructionPlan(
  inference: PageInference,
  options: { hasCredential: boolean; hasCredentialPassword: boolean; hasManuscriptPath: boolean },
): InstructionPlan {
  const normalizedButtons = inference.visibleButtons.map(normalisePortalText);
  const draftLabel = findPortalLabel(
    inference.visibleButtons,
    ['continue draft', 'resume draft', 'draft submission', 'my drafts', 'draft', 'resume'],
  );
  const submissionLabel = findPortalLabel(
    inference.visibleButtons,
    ['new submission', 'start submission', 'submit manuscript', 'submit paper', 'create submission', 'begin submission'],
  );
  const dashboardLabel = findPortalLabel(
    inference.visibleButtons,
    ['author center', 'author dashboard', 'dashboard', 'my manuscripts', 'submissions'],
  );
  const nextLabel = inference.nextButtonLabel || findPortalLabel(inference.visibleButtons, ['continue', 'next', 'review', 'submit']);

  if (inference.recommendedAction === 'ask-user-login' || inference.recommendedAction === 'ask-user-verification' || inference.recommendedAction === 'ask-user-file-upload') {
    return {
      strategy: 'rule-chain',
      summary: inference.summary,
      primaryAction: inference.recommendedAction,
      userInputPrompt: inference.userInputPrompt,
      rationale: [inference.summary],
      steps: [
        {
          id: 'user-input',
          action: inference.recommendedAction,
          title: PORTAL_ACTION_LABELS[inference.recommendedAction],
          detail: inference.userInputPrompt || inference.summary,
          status: 'ready',
        },
      ],
    };
  }

  if (inference.stage === 'file-upload') {
    return {
      strategy: 'rule-chain',
      summary: options.hasManuscriptPath
        ? 'The portal is on the manuscript upload step, so the next move is to attach the local PDF from the app.'
        : 'The portal is on the manuscript upload step, but no local manuscript file is ready yet.',
      primaryAction: options.hasManuscriptPath ? 'attach-manuscript' : 'ask-user-file-upload',
      userInputPrompt: options.hasManuscriptPath
        ? undefined
        : 'Choose the manuscript PDF from this app or upload it manually in the portal, then rerun the agent chain.',
      rationale: [
        'The inference agent found a visible file upload control.',
        options.hasManuscriptPath
          ? 'A local manuscript path is available for the execution agent.'
          : 'A local manuscript path is not available yet.',
      ],
      steps: [
        {
          id: 'attach-manuscript',
          action: options.hasManuscriptPath ? 'attach-manuscript' : 'ask-user-file-upload',
          title: options.hasManuscriptPath ? 'Attach manuscript PDF' : 'Choose manuscript PDF',
          detail: options.hasManuscriptPath
            ? 'Send the selected local PDF into the visible portal upload input.'
            : 'Pick a local manuscript PDF from PublishKaro or use the portal chooser manually.',
          status: 'ready',
        },
      ],
    };
  }

  if (inference.stage === 'login') {
    return {
      strategy: 'rule-chain',
      summary: options.hasCredential && options.hasCredentialPassword
        ? 'The portal is on the login step, so the instruction agent will submit the stored credentials first.'
        : 'The portal is on the login step, but a usable credential is not available.',
      primaryAction: options.hasCredential && options.hasCredentialPassword ? 'auto-login' : 'ask-user-login',
      userInputPrompt: options.hasCredential && options.hasCredentialPassword
        ? undefined
        : 'Sign in manually or update Credential Vault, then rerun the agent.',
      rationale: [
        'The inference agent found visible username and password controls.',
        options.hasCredential && options.hasCredentialPassword
          ? 'A stored credential is available for this venue.'
          : 'The stored credential is missing or incomplete.',
      ],
      steps: [
        {
          id: 'login',
          action: options.hasCredential && options.hasCredentialPassword ? 'auto-login' : 'ask-user-login',
          title: options.hasCredential && options.hasCredentialPassword ? 'Submit venue login' : 'Ask user to log in',
          detail: options.hasCredential && options.hasCredentialPassword
            ? 'Fill the login form with the saved username and password, then re-check the portal.'
            : 'This portal needs a manual sign-in before automation can continue.',
          status: 'ready',
        },
      ],
    };
  }

  if (inference.stage === 'submission-form') {
    return {
      strategy: 'rule-chain',
      summary: 'The portal is already on the metadata step, so the next move is to fill the stored title and abstract.',
      primaryAction: 'prefill-metadata',
      userInputPrompt: inference.userInputPrompt,
      rationale: [
        'The inference agent found metadata or abstract cues on the current page.',
        nextLabel ? `A next action is visible: "${nextLabel}".` : 'The next step will be highlighted after the fields are filled.',
      ],
      steps: [
        {
          id: 'prefill',
          action: 'prefill-metadata',
          title: 'Fill stored metadata',
          detail: 'Insert the stored title and abstract into the visible manuscript fields.',
          status: 'ready',
        },
        {
          id: 'highlight-next',
          action: 'review-and-submit',
          title: 'Highlight the next portal action',
          detail: nextLabel
            ? `Highlight "${nextLabel}" so the user can continue after the fields are filled.`
            : 'Find the next visible review or continue button after metadata is inserted.',
          targetLabel: nextLabel || undefined,
          status: 'pending',
        },
      ],
    };
  }

  if (inference.stage === 'review') {
    return {
      strategy: 'rule-chain',
      summary: 'The portal looks ready for review, so the agent should highlight the last continue or submit action.',
      primaryAction: 'review-and-submit',
      userInputPrompt: inference.userInputPrompt,
      rationale: ['The current page looks like a review or submit step.'],
      steps: [
        {
          id: 'review',
          action: 'review-and-submit',
          title: 'Highlight final action',
          detail: nextLabel
            ? `Highlight "${nextLabel}" for the user.`
            : 'Find the most likely review, continue, or submit button.',
          targetLabel: nextLabel || undefined,
          status: 'ready',
        },
      ],
    };
  }

  if (draftLabel) {
    return {
      strategy: 'rule-chain',
      summary: 'The portal still shows a dashboard-style page, but a draft route is visible, so the chain should open that first and then re-scan for the form.',
      primaryAction: 'open-draft',
      rationale: [
        `The inference agent found a draft-like action: "${draftLabel}".`,
        'Draft or resume links are the shortest path to the metadata form on many publisher portals.',
      ],
      steps: [
        {
          id: 'open-draft',
          action: 'open-draft',
          title: 'Open the draft step',
          detail: `Click "${draftLabel}" and wait for the modal or draft editor to open.`,
          targetLabel: draftLabel,
          status: 'ready',
        },
        {
          id: 'recheck-after-draft',
          action: 'prefill-metadata',
          title: 'Re-scan and fill metadata',
          detail: 'After the draft page opens, look again for title and abstract fields and fill them from storage.',
          status: 'pending',
        },
      ],
    };
  }

  if (submissionLabel) {
    return {
      strategy: 'rule-chain',
      summary: 'A new-submission route is visible, so the chain should open it and then continue into the metadata form.',
      primaryAction: 'open-submission',
      rationale: [
        `The inference agent found a submission entry point: "${submissionLabel}".`,
        'Opening the submission flow should expose the metadata step next.',
      ],
      steps: [
        {
          id: 'open-submission',
          action: 'open-submission',
          title: 'Open the submission flow',
          detail: `Click "${submissionLabel}" and then re-check the page for metadata fields.`,
          targetLabel: submissionLabel,
          status: 'ready',
        },
        {
          id: 'recheck-after-open',
          action: 'prefill-metadata',
          title: 'Re-scan and fill metadata',
          detail: 'After the submission flow opens, look for title and abstract fields and fill them from storage.',
          status: 'pending',
        },
      ],
    };
  }

  if (dashboardLabel || inference.stage === 'dashboard' || normalizedButtons.some((button) => button.includes('dashboard'))) {
    return {
      strategy: 'rule-chain',
      summary: 'The portal is still on a dashboard route, so the chain should open the dashboard area and then search again for drafts or submission actions.',
      primaryAction: 'open-dashboard',
      rationale: [
        dashboardLabel
          ? `The inference agent found a dashboard route: "${dashboardLabel}".`
          : 'The current page still looks like a dashboard.',
        'Some publication portals need one more navigation step before drafts or metadata become visible.',
      ],
      steps: [
        {
          id: 'open-dashboard',
          action: 'open-dashboard',
          title: 'Open dashboard area',
          detail: dashboardLabel
            ? `Click "${dashboardLabel}" and re-check the visible actions.`
            : 'Open the dashboard or author center and look again for draft or submission actions.',
          targetLabel: dashboardLabel || undefined,
          status: 'ready',
        },
        {
          id: 'recheck-dashboard',
          action: 'open-draft',
          title: 'Search for draft or submission entry',
          detail: 'After the dashboard opens, pick the most direct draft or new-submission action and continue the chain.',
          status: 'pending',
        },
      ],
    };
  }

  return {
    strategy: 'rule-chain',
    summary: 'The portal does not match a reliable automation path yet, so the instruction agent is asking for a manual check.',
    primaryAction: 'manual-investigation',
    userInputPrompt: inference.userInputPrompt,
    rationale: [inference.summary],
    steps: [
      {
        id: 'manual-check',
        action: 'manual-investigation',
        title: 'Manual check needed',
        detail: inference.userInputPrompt || inference.summary,
        status: 'ready',
      },
    ],
  };
}

function readStoredDraft(): SubmissionDraft | null {
  if (typeof window === 'undefined') return null;

  const rawValue = window.sessionStorage.getItem(DRAFT_STORAGE_KEY);
  if (!rawValue) return null;

  try {
    return JSON.parse(rawValue) as SubmissionDraft;
  } catch {
    return null;
  }
}

function persistStoredDraft(draft: SubmissionDraft | null) {
  if (typeof window === 'undefined') return;

  if (!draft) {
    window.sessionStorage.removeItem(DRAFT_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function decodeCredentialPassword(credential: Credential | null): string {
  if (!credential?.encrypted_password) return '';

  try {
    return atob(credential.encrypted_password);
  } catch {
    return '';
  }
}

function buildPortalHelperScript(): string {
  return `
    const normalise = (value) => String(value ?? '').toLowerCase().replace(/\\s+/g, ' ').trim();
    const isVisible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && element.offsetParent !== null;
    };
    const getNearbyText = (element) => {
      if (!(element instanceof HTMLElement)) return '';
      const parentText = element.parentElement?.innerText || element.parentElement?.textContent || '';
      const groupText = element.closest('[role="dialog"], [aria-modal="true"], form, fieldset, .modal, .dialog, .form-group, .field, .input-group')?.textContent || '';
      return normalise([parentText, groupText].join(' ')).slice(0, 240);
    };
    const getLabelText = (element) => {
      const id = element.getAttribute('id');
      const explicit = id
        ? Array.from(document.querySelectorAll('label')).find((label) => label.getAttribute('for') === id)
        : null;
      const implicit = element.closest('label');
      return normalise((explicit?.textContent || '') + ' ' + (implicit?.textContent || ''));
    };
    const getDescriptor = (element) => normalise([
      element.getAttribute('name'),
      element.getAttribute('id'),
      element.getAttribute('type'),
      element.getAttribute('placeholder'),
      element.getAttribute('aria-label'),
      element.getAttribute('data-testid'),
      getLabelText(element),
      getNearbyText(element),
      element.textContent,
      element.innerText,
    ].join(' '));
    const scoreCandidate = (element, positivePatterns, negativePatterns = []) => {
      const descriptor = getDescriptor(element);
      let score = 0;
      for (const pattern of positivePatterns) {
        if (descriptor.includes(pattern)) score += 2;
      }
      for (const pattern of negativePatterns) {
        if (descriptor.includes(pattern)) score -= 2;
      }
      return score;
    };
    const pickField = (selectors, positivePatterns, negativePatterns = []) => {
      const candidates = Array.from(document.querySelectorAll(selectors)).filter(isVisible);
      return candidates
        .map((element) => ({ element, score: scoreCandidate(element, positivePatterns, negativePatterns) }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0]?.element || null;
    };
    const setNativeValue = (element, value) => {
      if (element instanceof HTMLInputElement) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        descriptor?.set?.call(element, value);
        if (!descriptor?.set) element.value = value;
        element.setAttribute('value', value);
        element.setSelectionRange?.(value.length, value.length);
        return;
      }
      if (element instanceof HTMLTextAreaElement) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
        descriptor?.set?.call(element, value);
        if (!descriptor?.set) element.value = value;
        element.setAttribute('value', value);
        element.setSelectionRange?.(value.length, value.length);
        return;
      }
      element.textContent = value;
    };
    const readFieldValue = (element) => {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        return String(element.value || '');
      }
      if (element instanceof HTMLElement && element.isContentEditable) {
        return String(element.innerText || element.textContent || '');
      }
      return String(element?.textContent || '');
    };
    const fillField = (element, value) => {
      if (!(element instanceof HTMLElement)) return false;
      highlightElement(element);
      element.focus();
      setNativeValue(element, value);
      const inputEvent = typeof InputEvent !== 'undefined'
        ? new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })
        : new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
      element.dispatchEvent(new Event('change', { bubbles: true }));
      element.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'End' }));
      element.dispatchEvent(new Event('blur', { bubbles: true }));
      return true;
    };
    const pickButton = (positivePatterns, negativePatterns = []) => {
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')).filter(isVisible);
      return candidates
        .map((element) => ({
          element,
          score: scoreCandidate(element, positivePatterns, negativePatterns),
          text: normalise(
            element instanceof HTMLInputElement
              ? element.value
              : element.getAttribute('aria-label') || element.innerText || element.textContent || ''
          ),
        }))
        .filter((entry) => entry.score > 0 || positivePatterns.some((pattern) => entry.text.includes(pattern)))
        .sort((left, right) => right.score - left.score)[0] || null;
    };
    const pickButtonByText = (preferredLabels, negativePatterns = []) => {
      const targets = preferredLabels.map((label) => normalise(label)).filter(Boolean);
      if (targets.length === 0) return null;
      const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a, [role="button"]')).filter(isVisible);
      return candidates
        .map((element) => {
          const text = normalise(
            element instanceof HTMLInputElement
              ? element.value
              : element.getAttribute('aria-label') || element.innerText || element.textContent || ''
          );
          let score = 0;
          for (const target of targets) {
            if (text === target) score += 8;
            else if (text.includes(target) || target.includes(text)) score += 5;
          }
          for (const pattern of negativePatterns) {
            if (text.includes(pattern)) score -= 6;
          }
          return { element, text, score };
        })
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)[0] || null;
    };
    const collectVisibleTexts = (selector, mapper, limit = 10) => Array.from(document.querySelectorAll(selector))
      .filter(isVisible)
      .map(mapper)
      .map((value) => normalise(value))
      .filter(Boolean)
      .slice(0, limit);
    const collectVisibleButtons = () => collectVisibleTexts(
      'button, input[type="submit"], input[type="button"], a, [role="button"]',
      (element) => element instanceof HTMLInputElement
        ? element.value
        : element.getAttribute('aria-label') || element.innerText || element.textContent || '',
      16
    );
    const collectVisibleFields = () => collectVisibleTexts(
      'input, textarea, select, [contenteditable="true"]',
      (element) => getDescriptor(element),
      16
    );
    const getVisibleFieldCandidates = (selectors, positivePatterns, negativePatterns = []) => Array.from(document.querySelectorAll(selectors))
      .filter(isVisible)
      .map((element) => ({
        element,
        descriptor: getDescriptor(element),
        score: scoreCandidate(element, positivePatterns, negativePatterns),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);
    const highlightElement = (element) => {
      if (!(element instanceof HTMLElement)) return;
      element.style.outline = '3px solid #f97316';
      element.style.outlineOffset = '2px';
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    };
    const pageText = normalise(document.body?.innerText || '');
  `;
}

function buildLoginAutomationScript(username: string, password: string): string {
  return `
    (() => {
      const username = ${JSON.stringify(username)};
      const password = ${JSON.stringify(password)};
      ${buildPortalHelperScript()}
      if (!username || !password) {
        return { success: false, reason: 'Stored credentials are incomplete for this venue.' };
      }
      const usernameField = pickField(
        'input, textarea',
        ['email', 'user', 'username', 'login', 'account', 'orcid'],
        ['title', 'abstract', 'search']
      );
      const passwordField = pickField(
        'input[type="password"], input',
        ['password', 'passwd', 'passcode'],
        ['search', 'title', 'abstract']
      );
      if (!usernameField) {
        return { success: false, reason: 'Could not find the username or email field on the portal.' };
      }
      if (!passwordField) {
        return { success: false, reason: 'Could not find the password field on the portal.' };
      }
      fillField(usernameField, username);
      fillField(passwordField, password);
      const loginButton = pickButton(
        ['log in', 'login', 'sign in', 'signin', 'continue', 'next', 'access', 'submit'],
        ['forgot', 'cancel', 'create account', 'register']
      );
      if (loginButton?.element) {
        highlightElement(loginButton.element);
        loginButton.element.click();
        return {
          success: true,
          currentUrl: window.location.href,
          clickedLabel: loginButton.text || 'submit',
        };
      }
      const loginForm = passwordField instanceof HTMLInputElement || passwordField instanceof HTMLTextAreaElement
        ? passwordField.form
        : null;
      if (loginForm) {
        if (typeof loginForm.requestSubmit === 'function') {
          loginForm.requestSubmit();
        } else {
          loginForm.submit();
        }
        return {
          success: true,
          currentUrl: window.location.href,
          clickedLabel: 'form submit',
        };
      }
      return { success: false, reason: 'Could not find a login button or form submit action.' };
    })();
  `;
}

function buildPrefillAutomationScript(title: string, abstract: string): string {
  return `
    (() => {
      const manuscriptTitle = ${JSON.stringify(title)};
      const manuscriptAbstract = ${JSON.stringify(abstract)};
      ${buildPortalHelperScript()}
      const normalisedTitle = normalise(manuscriptTitle);
      const normalisedAbstract = normalise(manuscriptAbstract);
      const getDialogRoot = () => Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .dialog'))
        .filter(isVisible)
        .slice(-1)[0] || null;
      const uniqueElements = (items) => Array.from(new Set(items.filter(Boolean)));
      const verifyFilled = (element, expectedValue) => {
        const actualValue = normalise(readFieldValue(element));
        const expectedNormalised = normalise(expectedValue);
        if (!actualValue || !expectedNormalised) return false;
        return actualValue.includes(expectedNormalised.slice(0, Math.min(expectedNormalised.length, 40)))
          || expectedNormalised.includes(actualValue);
      };
      const fallbackTitleField = () => {
        const dialogRoot = getDialogRoot();
        const dialogInputs = dialogRoot
          ? Array.from(dialogRoot.querySelectorAll('input:not([type]), input[type="text"], input[type="search"], input[type="url"], [contenteditable="true"]')).filter(isVisible)
          : [];
        const pageInputs = Array.from(document.querySelectorAll('input:not([type]), input[type="text"], input[type="search"], input[type="url"], [contenteditable="true"]')).filter(isVisible);
        if (dialogInputs.length === 1) return dialogInputs[0];
        if (pageInputs.length === 1) return pageInputs[0];
        return dialogInputs[0] || pageInputs[0] || null;
      };
      const fallbackAbstractField = () => {
        const dialogRoot = getDialogRoot();
        const dialogTextareas = dialogRoot
          ? Array.from(dialogRoot.querySelectorAll('textarea, [contenteditable="true"]')).filter(isVisible)
          : [];
        const pageTextareas = Array.from(document.querySelectorAll('textarea, [contenteditable="true"]')).filter(isVisible);
        if (dialogTextareas.length === 1) return dialogTextareas[0];
        if (pageTextareas.length === 1) return pageTextareas[0];
        return dialogTextareas[0] || pageTextareas[0] || null;
      };
      const fillCandidates = (candidates, expectedValue) => {
        const attempted = [];
        for (const candidate of candidates) {
          if (!(candidate instanceof HTMLElement)) continue;
          attempted.push(getDescriptor(candidate));
          fillField(candidate, expectedValue);
          if (verifyFilled(candidate, expectedValue)) {
            return {
              success: true,
              attempted,
              element: candidate,
            };
          }
        }
        return {
          success: false,
          attempted,
          element: null,
        };
      };
      const verificationRequired = ['captcha', 'verification code', 'one-time password', 'two-factor', '2 factor', 'multi-factor', 'mfa']
        .some((term) => pageText.includes(term));
      if (verificationRequired) {
        return {
          success: false,
          shouldRetry: false,
          reason: 'The portal requires captcha or verification before automation can continue.',
          currentUrl: window.location.href,
        };
      }
      const titleCandidates = getVisibleFieldCandidates(
        'input, textarea, [contenteditable="true"]',
        ['manuscript title', 'article title', 'paper title', 'submission title', 'title'],
        ['search', 'email', 'user', 'password', 'abstract']
      ).map((entry) => entry.element);
      const abstractCandidates = getVisibleFieldCandidates(
        'textarea, [contenteditable="true"], input',
        ['abstract', 'summary', 'description'],
        ['search', 'email', 'user', 'password', 'title']
      ).map((entry) => entry.element);
      const titleTargets = uniqueElements([
        ...titleCandidates,
        fallbackTitleField(),
      ]);
      const abstractTargets = uniqueElements([
        ...abstractCandidates,
        fallbackAbstractField(),
      ]);
      if (!titleTargets.length || !abstractTargets.length) {
        const navigationButton = pickButton(
          ['new submission', 'start submission', 'submit manuscript', 'submit paper', 'paper submission', 'manuscript', 'article', 'continue', 'next'],
          ['logout', 'sign out', 'cancel', 'delete', 'remove']
        );
        if (navigationButton?.element) {
          highlightElement(navigationButton.element);
          navigationButton.element.click();
          return {
            success: false,
            shouldRetry: true,
            reason: 'Automation opened a likely submission entry point and will retry.',
            clickedLabel: navigationButton.text || 'continue',
            currentUrl: window.location.href,
          };
        }
        return {
          success: false,
          shouldRetry: false,
          reason: 'Could not find the title and abstract fields on the current page.',
          currentUrl: window.location.href,
        };
      }
      const titleFillResult = fillCandidates(titleTargets, manuscriptTitle);
      const abstractFillResult = fillCandidates(abstractTargets, manuscriptAbstract);
      if (!titleFillResult.success || !abstractFillResult.success) {
        return {
          success: false,
          shouldRetry: false,
          reason: !titleFillResult.success && !abstractFillResult.success
            ? 'The portal form was detected, but the title and abstract fields did not accept the stored values.'
            : !titleFillResult.success
              ? 'The portal form did not accept the stored paper title.'
              : 'The portal form did not accept the stored abstract.',
          currentUrl: window.location.href,
          filledTitle: titleFillResult.success,
          filledAbstract: abstractFillResult.success,
        };
      }
      const submitButton = pickButton(
        ['submit', 'review', 'save and continue', 'continue', 'next', 'proceed'],
        ['logout', 'sign out', 'cancel', 'delete', 'remove']
      );
      if (submitButton?.element) {
        highlightElement(submitButton.element);
      }
      const uploadFieldVisible = Array.from(document.querySelectorAll('input[type="file"]')).some(isVisible);
      return {
        success: true,
        currentUrl: window.location.href,
        submitLabel: submitButton?.text || '',
        filledTitle: normalisedTitle.length > 0,
        filledAbstract: normalisedAbstract.length > 0,
        userInputPrompt: uploadFieldVisible
          ? 'Select the manuscript PDF manually on this page before continuing.'
          : '',
      };
    })();
  `;
}

function buildPageInferenceScript(draft: SubmissionDraft | null, hasManuscriptPath: boolean): string {
  return `
    (() => {
      const storedTitle = ${JSON.stringify(draft?.title ?? '')};
      const storedAbstractLength = ${draft?.abstract?.length ?? 0};
      const hasStoredManuscript = ${JSON.stringify(hasManuscriptPath)};
      ${buildPortalHelperScript()}
      const visibleButtons = collectVisibleButtons();
      const visibleFields = collectVisibleFields();
      const visibleTextareas = Array.from(document.querySelectorAll('textarea')).filter(isVisible);
      const visibleTextInputs = Array.from(document.querySelectorAll('input:not([type]), input[type="text"], input[type="search"], input[type="url"], input[type="number"], [contenteditable="true"]')).filter(isVisible);
      const usernameField = pickField(
        'input, textarea',
        ['email', 'user', 'username', 'login', 'account', 'orcid'],
        ['title', 'abstract', 'search']
      );
      const passwordField = pickField(
        'input[type="password"], input',
        ['password', 'passwd', 'passcode'],
        ['search', 'title', 'abstract']
      );
      const titleField = pickField(
        'input, textarea, [contenteditable="true"]',
        ['manuscript title', 'article title', 'paper title', 'submission title', 'title'],
        ['search', 'email', 'user', 'password', 'abstract']
      );
      const abstractField = pickField(
        'textarea, [contenteditable="true"], input',
        ['abstract', 'summary', 'description'],
        ['search', 'email', 'user', 'password', 'title']
      );
      const uploadFieldVisible = Array.from(document.querySelectorAll('input[type="file"]')).some(isVisible);
      const headingText = Array.from(document.querySelectorAll('h1, h2, h3, [role="heading"]'))
        .filter(isVisible)
        .map((element) => normalise(element.textContent || ''))
        .filter(Boolean)
        .slice(0, 8);
      const hasDialog = Array.from(document.querySelectorAll('[role="dialog"], [aria-modal="true"], .modal, .dialog')).some(isVisible);
      const draftButton = pickButton(
        ['continue draft', 'resume draft', 'draft submission', 'draft', 'my drafts', 'resume'],
        ['logout', 'sign out', 'delete', 'remove']
      );
      const dashboardButton = pickButton(
        ['author center', 'author dashboard', 'dashboard', 'my manuscripts', 'submissions'],
        ['logout', 'sign out', 'delete', 'remove']
      );
      const submissionButton = pickButton(
        ['new submission', 'start submission', 'submit manuscript', 'submit paper', 'create submission', 'continue draft', 'continue submission', 'begin submission'],
        ['logout', 'sign out', 'cancel', 'delete', 'remove']
      );
      const nextButton = pickButton(
        ['continue', 'next', 'proceed', 'review', 'submit', 'save and continue'],
        ['logout', 'sign out', 'cancel', 'delete', 'remove']
      );
      const hasVerificationCue = [
        'captcha',
        'verification code',
        'one-time password',
        'two-factor',
        '2 factor',
        'multi-factor',
        'mfa',
        'authenticator app',
      ].some((term) => pageText.includes(term));
      const hasReviewCue = [
        'review submission',
        'proof and submit',
        'final review',
        'submit your manuscript',
        'ready to submit',
      ].some((term) => pageText.includes(term));
      const hasDashboardCue = [
        'author center',
        'author dashboard',
        'my manuscripts',
        'submissions awaiting',
        'draft submissions',
        'welcome back',
      ].some((term) => pageText.includes(term));
      const hasMetadataCue = headingText.some((heading) => (
        heading.includes('submit new paper')
        || heading.includes('paper details')
        || heading.includes('manuscript details')
        || heading.includes('metadata')
      ));
      const hasAbstractCue = pageText.includes('abstract') && visibleTextareas.length > 0;
      const cues = [];
      let stage = 'unknown';
      let recommendedAction = 'manual-investigation';
      let summary = 'The page does not clearly match a known publication step yet.';
      let confidence = 0.35;
      let loginRequired = false;
      let userInputPrompt = '';
      let nextButtonLabel = '';

      if (usernameField && passwordField) {
        stage = 'login';
        recommendedAction = 'auto-login';
        summary = 'A login form is visible on the portal.';
        confidence = 0.96;
        loginRequired = true;
        const loginButton = pickButton(
          ['log in', 'login', 'sign in', 'signin', 'continue', 'next', 'access'],
          ['forgot', 'cancel', 'register']
        );
        nextButtonLabel = loginButton?.text || '';
        cues.push('Username and password fields are visible.');
        if (nextButtonLabel) cues.push('A login button is available.');
      } else if (hasVerificationCue) {
        stage = 'verification';
        recommendedAction = 'ask-user-verification';
        summary = 'The portal is waiting for verification before automation can continue.';
        confidence = 0.93;
        userInputPrompt = 'Complete the captcha, code verification, or MFA challenge manually, then inspect the page again.';
        cues.push('Verification text is visible on the page.');
      } else if (
        titleField
        || abstractField
        || hasAbstractCue
        || (hasMetadataCue && (visibleTextareas.length > 0 || visibleTextInputs.length > 0))
        || (hasDialog && (visibleTextareas.length > 0 || visibleFields.some((field) => field.includes('title'))))
      ) {
        stage = 'submission-form';
        recommendedAction = 'prefill-metadata';
        summary = 'The manuscript metadata form is open and ready for prefill.';
        confidence = titleField && abstractField ? 0.95 : hasMetadataCue || hasDialog ? 0.9 : 0.82;
        nextButtonLabel = nextButton?.text || '';
        cues.push(titleField ? 'A title field is visible.' : 'The title field may be on a later step.');
        cues.push(abstractField || hasAbstractCue ? 'An abstract field is visible.' : 'The abstract field may be on a later step.');
        if (hasDialog) {
          cues.push('The metadata form appears inside a modal or dialog.');
        }
        if (uploadFieldVisible) {
          userInputPrompt = 'The file chooser is also visible here. Upload the manuscript PDF manually after the metadata is filled.';
          cues.push('A file upload control is visible on this page.');
        }
      } else if (uploadFieldVisible) {
        stage = 'file-upload';
        recommendedAction = 'ask-user-file-upload';
        summary = 'The portal appears to be on a manuscript upload step.';
        confidence = 0.9;
        nextButtonLabel = nextButton?.text || '';
        userInputPrompt = 'Select the manuscript PDF manually from your computer, then inspect the page again.';
        cues.push('A file upload control is visible.');
      } else if (draftButton?.element || submissionButton?.element || hasDashboardCue || dashboardButton?.element) {
        const portalButton = draftButton?.element
          ? draftButton
          : submissionButton?.element
            ? submissionButton
            : dashboardButton;
        const portalLabel = portalButton?.text || '';
        stage = draftButton?.element ? 'dashboard' : submissionButton?.element ? 'submission-entry' : 'dashboard';
        recommendedAction = draftButton?.element ? 'open-draft' : 'open-submission';
        summary = draftButton?.element
          ? 'A draft or resume route is visible and should be opened before filling the form.'
          : submissionButton?.element
          ? 'A submission entry point is visible and can be opened automatically.'
          : 'The portal looks like a dashboard with routes to drafts or submissions.';
        confidence = draftButton?.element ? 0.92 : submissionButton?.element ? 0.88 : 0.76;
        nextButtonLabel = portalLabel;
        cues.push(draftButton?.element
          ? 'A draft or resume action is visible.'
          : submissionButton?.element
          ? 'A likely new submission or continue submission action is visible.'
          : 'Dashboard or draft cues are visible.');
        if (pageText.includes('sign out') || pageText.includes('logout')) {
          cues.push('A signed-in session appears to be active.');
        }
      } else if (hasReviewCue || (nextButton?.text || '').includes('submit')) {
        stage = 'review';
        recommendedAction = 'review-and-submit';
        summary = 'The portal looks close to the final review or submit step.';
        confidence = 0.78;
        nextButtonLabel = nextButton?.text || '';
        userInputPrompt = 'Review the form details and use the highlighted button to continue or submit.';
        cues.push('Review or submit wording is visible on the page.');
      } else if (pageText.includes('sign out') || pageText.includes('logout')) {
        stage = 'dashboard';
        recommendedAction = 'open-submission';
        summary = 'A signed-in session appears to be active, so login may be skipped.';
        confidence = 0.64;
        nextButtonLabel = draftButton?.text || submissionButton?.text || dashboardButton?.text || nextButton?.text || '';
        cues.push('The portal already shows a signed-in state.');
      }

      if (storedTitle) {
        cues.push('Stored draft title context is available for prefill.');
      }
      if (storedAbstractLength > 0) {
        cues.push('Stored abstract context is available for prefill.');
      }
      if (hasStoredManuscript) {
        cues.push('A local manuscript file is ready for upload when needed.');
      }

      headingText.forEach((heading) => cues.push(heading));

      return {
        stage,
        recommendedAction,
        summary,
        confidence,
        currentUrl: window.location.href,
        cues: Array.from(new Set(cues)).slice(0, 8),
        loginRequired,
        nextButtonLabel,
        userInputPrompt,
        visibleButtons,
        visibleHeadings: headingText,
        visibleFields,
        hasDialog,
      };
    })();
  `;
}

function buildNavigationAutomationScript(
  targetLabel: string,
  preferredPatterns: string[],
  fallbackPatterns: string[] = [],
): string {
  return `
    (() => {
      const targetLabel = ${JSON.stringify(targetLabel)};
      const preferredPatterns = ${JSON.stringify(preferredPatterns)};
      const fallbackPatterns = ${JSON.stringify(fallbackPatterns)};
      ${buildPortalHelperScript()}
      const navigationButton = (
        pickButtonByText(targetLabel ? [targetLabel] : [], ['logout', 'sign out', 'cancel', 'delete', 'remove'])
        || pickButton(preferredPatterns, ['logout', 'sign out', 'cancel', 'delete', 'remove'])
        || pickButton(fallbackPatterns, ['logout', 'sign out', 'cancel', 'delete', 'remove'])
      );
      if (!navigationButton?.element) {
        return {
          success: false,
          reason: targetLabel
            ? 'Could not find the expected dashboard, draft, or submission action on this page.'
            : 'Could not find a clear path to drafts, dashboard, or a new submission from this page.',
          currentUrl: window.location.href,
        };
      }
      highlightElement(navigationButton.element);
      navigationButton.element.click();
      return {
        success: true,
        shouldRetry: true,
        clickedLabel: navigationButton.text || 'continue',
        currentUrl: window.location.href,
      };
    })();
  `;
}

function buildReviewAssistScript(): string {
  return `
    (() => {
      ${buildPortalHelperScript()}
      const reviewButton = pickButton(
        ['submit', 'review', 'save and continue', 'continue', 'next', 'approve', 'finish'],
        ['logout', 'sign out', 'cancel', 'delete', 'remove']
      );
      if (!reviewButton?.element) {
        return {
          success: false,
          reason: 'Could not find a clear review or submit button on this step.',
          currentUrl: window.location.href,
        };
      }
      highlightElement(reviewButton.element);
      return {
        success: true,
        submitLabel: reviewButton.text || '',
        currentUrl: window.location.href,
      };
    })();
  `;
}

export default function SubmissionAgent() {
  const { user, signInWithEmail, loading: authLoading } = useAuth();

  const [storedDraft, setStoredDraft] = useState<SubmissionDraft | null>(() => readStoredDraft());
  const [step, setStep] = useState<WizardStep>(() => (readStoredDraft() ? 'venue' : 'auth'));
  const [venues, setVenues] = useState<Venue[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedCredential, setSelectedCredential] = useState<Credential | null>(null);
  const [portalUrl, setPortalUrl] = useState('');
  const [portalSessionKey, setPortalSessionKey] = useState(0);
  const [paperSource, setPaperSource] = useState<PaperSource>(() => readStoredDraft()?.source ?? 'library');
  const [selectedPaperId, setSelectedPaperId] = useState(() => readStoredDraft()?.paperId ?? '');
  const [title, setTitle] = useState(() => readStoredDraft()?.source === 'manual' ? readStoredDraft()?.title ?? '' : '');
  const [abstract, setAbstract] = useState(() => readStoredDraft()?.source === 'manual' ? readStoredDraft()?.abstract ?? '' : '');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [embedStatus, setEmbedStatus] = useState<EmbedStatus>({ status: 'idle' });
  const [isStoringDraft, setIsStoringDraft] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatus>(createIdleAutomationStatus());
  const [pageInference, setPageInference] = useState<PageInference | null>(null);
  const [isInferring, setIsInferring] = useState(false);
  const [portalManuscriptPath, setPortalManuscriptPath] = useState<string | null>(() => readStoredDraft()?.pdfLocalPath ?? null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const webviewRef = useRef<WebviewTagElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  const selectedVenue = venues.find((venue) => venue.id === selectedVenueId) ?? null;
  const selectedPaper = papers.find((paper) => paper.id === selectedPaperId) ?? null;
  const credentialPassword = useMemo(() => decodeCredentialPassword(selectedCredential), [selectedCredential]);
  const applyInferenceContext = useCallback((inference: PageInference): PageInference => {
    if (inference.stage !== 'login') {
      return inference;
    }

    if (!selectedCredential) {
      return {
        ...inference,
        recommendedAction: 'ask-user-login',
        summary: 'The portal is asking for login, and there is no saved credential for this venue.',
        userInputPrompt: 'Sign in manually on the portal or add credentials in Credential Vault, then inspect the page again.',
      };
    }

    if (!credentialPassword) {
      return {
        ...inference,
        recommendedAction: 'ask-user-login',
        summary: 'The portal is asking for login, but the saved password could not be read.',
        userInputPrompt: 'Update the venue password in Credential Vault or sign in manually, then inspect the page again.',
      };
    }

    return inference;
  }, [credentialPassword, selectedCredential]);
  const contextualInference = useMemo(
    () => (pageInference ? applyInferenceContext(pageInference) : null),
    [applyInferenceContext, pageInference],
  );
  const instructionPlan = useMemo(
    () => (
      contextualInference
        ? buildInstructionPlan(contextualInference, {
            hasCredential: !!selectedCredential,
            hasCredentialPassword: !!credentialPassword,
            hasManuscriptPath: !!portalManuscriptPath,
          })
        : null
    ),
    [contextualInference, credentialPassword, portalManuscriptPath, selectedCredential],
  );
  const latestAutomationLog = automationStatus.logs.length > 0
    ? automationStatus.logs[automationStatus.logs.length - 1]
    : '';
  const agentInventory = useMemo<AgentInventoryItem[]>(() => {
    const executionState: AgentState =
      automationStatus.phase === 'running'
        ? 'running'
        : automationStatus.phase === 'success'
          ? 'done'
          : automationStatus.phase === 'manual'
            ? 'blocked'
            : automationStatus.phase === 'error'
              ? 'blocked'
              : 'idle';

    return [
      {
        key: 'inference',
        title: 'Inference Agent',
        state: isInferring ? 'thinking' : contextualInference ? 'ready' : 'idle',
        summary: contextualInference?.summary || 'Waiting for the portal to load so it can classify the current page.',
        detail: contextualInference
          ? `${PORTAL_STAGE_LABELS[contextualInference.stage]} at ${Math.round(contextualInference.confidence * 100)}% confidence`
          : 'It watches for login, dashboard, draft, metadata, verification, and review states.',
      },
      {
        key: 'instruction',
        title: 'Instruction Agent',
        state: instructionPlan ? 'ready' : contextualInference ? 'thinking' : 'idle',
        summary: instructionPlan?.summary || 'Waiting for the inference result before building the next action chain.',
        detail: instructionPlan?.steps[0]?.detail || 'It turns the page reading into a short action queue for the execution agent.',
      },
      {
        key: 'execution',
        title: 'Execution Agent',
        state: executionState,
        summary: automationStatus.summary,
        detail: automationStatus.reason || latestAutomationLog || 'It clicks, fills, and loops back to inference after each step.',
      },
    ];
  }, [automationStatus.phase, automationStatus.reason, automationStatus.summary, contextualInference, instructionPlan, isInferring, latestAutomationLog]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStep('auth');
      return;
    }
    setStep(storedDraft ? 'venue' : 'draft');
  }, [authLoading, storedDraft, user]);

  useEffect(() => {
    if (!user || (step !== 'draft' && step !== 'venue')) return;

    void Promise.all([
      supabase.from('venues').select('*').order('priority'),
      supabase.from('papers').select('*').order('updated_at', { ascending: false }),
    ]).then(([venuesResponse, papersResponse]) => {
      setVenues(Array.isArray(venuesResponse.data) ? venuesResponse.data : []);
      setPapers(Array.isArray(papersResponse.data) ? papersResponse.data : []);
    });
  }, [step, user]);

  useEffect(() => {
    if (!selectedVenueId) {
      setSelectedCredential(null);
      return;
    }

    void supabase
      .from('credentials')
      .select('*')
      .eq('venue_id', selectedVenueId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSelectedCredential(data ?? null);
      });
  }, [selectedVenueId]);

  useEffect(() => {
    if (!selectedPaper || paperSource !== 'library') return;

    setTitle(selectedPaper.title ?? '');
    setAbstract(selectedPaper.abstract ?? '');
  }, [paperSource, selectedPaper]);

  useEffect(() => {
    if (!storedDraft) return;

    if (paperSource !== storedDraft.source) {
      setPaperSource(storedDraft.source);
    }

    if (storedDraft.source === 'manual') {
      setTitle(storedDraft.title);
      setAbstract(storedDraft.abstract);
      setSelectedPaperId('');
    } else if (storedDraft.paperId) {
      setSelectedPaperId(storedDraft.paperId);
    }
  }, [paperSource, storedDraft]);

  useEffect(() => {
    if (!storedDraft) {
      setPortalManuscriptPath(null);
      return;
    }

    if (storedDraft.pdfLocalPath) {
      setPortalManuscriptPath(storedDraft.pdfLocalPath);
    }
  }, [storedDraft]);

  useEffect(() => {
    if (!isElectron || !portalUrl) return;

    const webview = webviewRef.current;
    if (!webview) return;

    const setLoadedStatus = (nextUrl?: string) => {
      setEmbedStatus({
        status: 'loaded',
        url: nextUrl || webview.getURL?.() || portalUrl,
      });
    };

    const handleStartLoading = () => {
      setEmbedStatus({
        status: 'loading',
        url: webview.getURL?.() || portalUrl,
      });
    };

    const handleDomReady = () => {
      setLoadedStatus();
    };

    const handleStopLoading = () => {
      setLoadedStatus();
    };

    const handleNavigate = (event: { url?: string }) => {
      setLoadedStatus(event.url);
    };

    const handleFailLoad = (event: { errorCode?: number; errorDescription?: string; validatedURL?: string }) => {
      if (event.errorCode === -3) return;

      setEmbedStatus({
        status: 'error',
        url: event.validatedURL || portalUrl,
        error: `${event.errorDescription || 'Unknown error'} (${event.errorCode ?? 'n/a'})`,
      });
    };

    webview.addEventListener('did-start-loading', handleStartLoading as EventListener);
    webview.addEventListener('dom-ready', handleDomReady as EventListener);
    webview.addEventListener('did-stop-loading', handleStopLoading as EventListener);
    webview.addEventListener('did-navigate', handleNavigate as EventListener);
    webview.addEventListener('did-navigate-in-page', handleNavigate as EventListener);
    webview.addEventListener('did-fail-load', handleFailLoad as EventListener);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading as EventListener);
      webview.removeEventListener('dom-ready', handleDomReady as EventListener);
      webview.removeEventListener('did-stop-loading', handleStopLoading as EventListener);
      webview.removeEventListener('did-navigate', handleNavigate as EventListener);
      webview.removeEventListener('did-navigate-in-page', handleNavigate as EventListener);
      webview.removeEventListener('did-fail-load', handleFailLoad as EventListener);
    };
  }, [isElectron, portalSessionKey, portalUrl]);

  useEffect(() => {
    if (embedStatus.status !== 'loading') return;

    const timeoutId = window.setTimeout(() => {
      setEmbedStatus((currentStatus) => {
        if (currentStatus.status !== 'loading') {
          return currentStatus;
        }

        return {
          status: 'error',
          url: currentStatus.url,
          error: 'Load timed out after 30 seconds.',
        };
      });
    }, 30000);

    return () => window.clearTimeout(timeoutId);
  }, [embedStatus.status]);

  const pushAutomationLog = useCallback((message: string) => {
    setAutomationStatus((currentStatus) => ({
      ...currentStatus,
      logs: [...currentStatus.logs, message],
    }));
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file?.type === 'application/pdf') {
      setPdfFile(file);
      const localPath = getLocalFilePath(file);
      if (localPath) {
        setPortalManuscriptPath(localPath);
      }
      return;
    }

    if (file) {
      toast.error('Please upload a PDF file');
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);

    const file = event.dataTransfer.files[0];
    if (file?.type === 'application/pdf') {
      setPdfFile(file);
      const localPath = getLocalFilePath(file);
      if (localPath) {
        setPortalManuscriptPath(localPath);
      }
      return;
    }

    toast.error('Please upload a PDF file');
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const { error } = await signInWithEmail(email, password);
    setLoginLoading(false);

    if (error) {
      setLoginError(error.message);
      return;
    }

    setStep(storedDraft ? 'venue' : 'draft');
  };

  const storeDraftAndContinue = async () => {
    setErrorMsg('');
    setProgress(0);

    if (paperSource === 'library') {
      if (!selectedPaper) {
        toast.error('Please choose a paper from Research Papers');
        return;
      }

      const nextDraft: SubmissionDraft = {
        source: 'library',
        paperId: selectedPaper.id,
        title: selectedPaper.title,
        abstract: selectedPaper.abstract ?? '',
        pdfFileName: null,
        pdfFileSizeBytes: null,
        pdfLocalPath: portalManuscriptPath,
        analysisResult: null,
        storedAt: new Date().toISOString(),
      };

      setStoredDraft(nextDraft);
      persistStoredDraft(nextDraft);
      setPageInference(null);
      setAutomationStatus(createIdleAutomationStatus('Draft stored from Research Papers. Load the publication and run the agent.'));
      toast.success('Draft stored in temporary session');
      setStep('venue');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a paper title');
      return;
    }

    if (!abstract.trim()) {
      toast.error('Please enter an abstract');
      return;
    }

    if (!pdfFile) {
      toast.error('Please upload the manuscript PDF from your computer');
      return;
    }

    setIsStoringDraft(true);
    setProgress(20);

    try {
      toast.info('Analyzing the new upload before storing the draft...');
      const analysisResult = await analyzeSubmission(pdfFile, title.trim(), abstract.trim());
      setProgress(90);

      const nextDraft: SubmissionDraft = {
        source: 'manual',
        paperId: null,
        title: title.trim(),
        abstract: abstract.trim(),
        pdfFileName: pdfFile.name,
        pdfFileSizeBytes: pdfFile.size,
        pdfLocalPath: getLocalFilePath(pdfFile),
        analysisResult,
        storedAt: new Date().toISOString(),
      };

      setStoredDraft(nextDraft);
      persistStoredDraft(nextDraft);
      setPageInference(null);
      setAutomationStatus(createIdleAutomationStatus('Temporary draft stored for the new upload. Load the publication and run the agent.'));
      setPdfFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setProgress(100);
      toast.success('Temporary draft stored');
      setStep('venue');
    } catch (error: any) {
      console.error('Draft storage error:', error);
      setErrorMsg(error.message ?? 'Failed to store the draft');
      setStep('error');
    } finally {
      setIsStoringDraft(false);
    }
  };

  const clearStoredDraft = useCallback(() => {
    setStoredDraft(null);
    persistStoredDraft(null);
    setPaperSource('library');
    setSelectedPaperId('');
    setTitle('');
    setAbstract('');
    setPdfFile(null);
    setProgress(0);
    setPortalManuscriptPath(null);
    setPageInference(null);
    setAutomationStatus(createIdleAutomationStatus());
  }, []);

  const openPortal = useCallback(() => {
    if (!selectedVenue) {
      toast.error('Please choose a venue first');
      return;
    }

    if (!storedDraft) {
      toast.error('Store a draft first before loading the publication');
      return;
    }

    if (!isElectron) {
      toast.error('The embedded portal is only available in the Electron desktop app');
      return;
    }

    const nextPortalUrl = selectedCredential?.portal_url || selectedVenue.submission_url;
    if (!nextPortalUrl) {
      toast.error('No portal URL is configured for this venue');
      return;
    }

    setPortalUrl(nextPortalUrl);
    setPortalSessionKey((current) => current + 1);
    setEmbedStatus({ status: 'loading', url: nextPortalUrl });
    setPageInference(null);
    setAutomationStatus(createIdleAutomationStatus('Portal opened. Let the inference agent inspect the current step.'));
  }, [isElectron, selectedCredential, selectedVenue, storedDraft]);

  const closePortal = useCallback(() => {
    setPortalUrl('');
    setPortalSessionKey((current) => current + 1);
    setEmbedStatus({ status: 'idle' });
    setPageInference(null);
    setAutomationStatus(createIdleAutomationStatus('Portal closed. Reopen the publication to inspect the current step again.'));
  }, []);

  const handleVenueChange = (venueId: string) => {
    setSelectedVenueId(venueId);
    closePortal();
    setAutomationStatus(createIdleAutomationStatus('The venue changed. Reload the publication and rerun the agent chain.'));
  };

  const reloadPortal = useCallback(() => {
    if (!portalUrl) return;

    const webview = webviewRef.current;
    setEmbedStatus({ status: 'loading', url: portalUrl });
    setPageInference(null);

    if (webview?.reload) {
      webview.reload();
      return;
    }

    setPortalSessionKey((current) => current + 1);
  }, [portalUrl]);

  const runPortalScript = useCallback(async (script: string): Promise<unknown> => {
    const webview = webviewRef.current;
    if (!webview?.executeJavaScript) {
      throw new Error('Automation is unavailable because the embedded portal is not ready.');
    }

    const result = await webview.executeJavaScript(script, true);
    return result;
  }, []);

  const inspectCurrentPage = useCallback(async (silent = false): Promise<PageInference | null> => {
    if (!portalUrl || embedStatus.status !== 'loaded') {
      if (!silent) {
        toast.error('Load the publication portal first');
      }
      return null;
    }

    setIsInferring(true);

    try {
      const rawInference = await runPortalScript(
        buildPageInferenceScript(storedDraft, !!portalManuscriptPath),
      ) as PageInference;
      const nextInference = applyInferenceContext(rawInference);
      setPageInference(rawInference);

      if (!silent) {
        toast.success(`Detected ${PORTAL_STAGE_LABELS[nextInference.stage].toLowerCase()}`);
      }

      return nextInference;
    } catch (error: any) {
      if (!silent) {
        toast.error(error.message ?? 'Could not inspect the current portal page');
      }
      return null;
    } finally {
      setIsInferring(false);
    }
  }, [applyInferenceContext, embedStatus.status, portalManuscriptPath, portalUrl, runPortalScript, storedDraft]);

  const pickPortalManuscript = useCallback(async () => {
    if (!isElectron || !window.electronAPI?.pickLocalPdf) {
      toast.error('Local manuscript selection is only available in the Electron desktop app');
      return null;
    }

    try {
      const selectedPath = await window.electronAPI.pickLocalPdf();
      if (!selectedPath) {
        return null;
      }

      setPortalManuscriptPath(selectedPath);
      const fileName = selectedPath.split(/[/\\\\]/).pop() || selectedPath;
      toast.success(`Selected manuscript: ${fileName}`);
      return selectedPath;
    } catch (error: any) {
      toast.error(error.message ?? 'Could not choose the manuscript PDF');
      return null;
    }
  }, [isElectron]);

  const attachSelectedManuscriptToPortal = useCallback(async (silent = false): Promise<ElectronPortalUploadResult> => {
    if (!portalManuscriptPath) {
      if (!silent) {
        toast.error('Choose the manuscript PDF first');
      }
      return { success: false, reason: 'No manuscript PDF is selected for portal upload.' };
    }

    if (!portalUrl || embedStatus.status !== 'loaded') {
      if (!silent) {
        toast.error('Load the publication portal first');
      }
      return { success: false, reason: 'The publication portal is not ready yet.' };
    }

    if (!isElectron || !window.electronAPI?.attachFileToPortalInput) {
      if (!silent) {
        toast.error('Automatic portal upload is only available in the Electron desktop app');
      }
      return { success: false, reason: 'Automatic portal upload is unavailable in this environment.' };
    }

    const webContentsId = webviewRef.current?.getWebContentsId?.();
    if (!webContentsId) {
      if (!silent) {
        toast.error('The embedded portal is not ready for file upload');
      }
      return { success: false, reason: 'Could not access the embedded portal for file upload.' };
    }

    try {
      const result = await window.electronAPI.attachFileToPortalInput(webContentsId, portalManuscriptPath);
      if (!result.success && !silent) {
        toast.error(result.reason || 'Could not attach the manuscript PDF to the portal.');
      }
      if (result.success && !silent) {
        toast.success(`Attached ${result.fileName || 'manuscript PDF'} to the portal`);
      }
      return result;
    } catch (error: any) {
      const reason = error.message ?? 'Could not attach the manuscript PDF to the portal.';
      if (!silent) {
        toast.error(reason);
      }
      return { success: false, reason };
    }
  }, [embedStatus.status, isElectron, portalManuscriptPath, portalUrl]);

  useEffect(() => {
    if (!portalUrl || embedStatus.status !== 'loaded') return;

    const timeoutId = window.setTimeout(() => {
      void inspectCurrentPage(true);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [embedStatus.status, embedStatus.url, inspectCurrentPage, portalSessionKey, portalUrl]);

  const wait = useCallback((durationMs: number) => new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  }), []);

  const runAutomationAssistant = useCallback(async () => {
    if (!storedDraft) {
      toast.error('Store a draft first');
      return;
    }

    if (!selectedVenue) {
      toast.error('Choose a venue first');
      return;
    }

    if (!portalUrl || embedStatus.status !== 'loaded') {
      toast.error('Load the publication portal first');
      return;
    }

    setAutomationStatus({
      phase: 'running',
      summary: 'The inference agent is reading the current portal step and choosing the next action...',
      logs: ['Using the temporarily stored draft as the source of truth for title and abstract.'],
    });

    try {
      const moveToManual = (summary: string, reason: string, logMessage?: string) => {
        setAutomationStatus((currentStatus) => ({
          ...currentStatus,
          phase: 'manual',
          summary,
          reason,
        }));
        if (logMessage) {
          pushAutomationLog(logMessage);
        }
      };

      for (let attempt = 0; attempt < 6; attempt += 1) {
        const inference = await inspectCurrentPage(true);
        if (!inference) {
          moveToManual(
            'The portal could not be inspected',
            'The embedded page did not return enough information for the agent chain to continue.',
            'Try reloading the portal, then inspect the current page again.',
          );
          return;
        }

        pushAutomationLog(
          `Detected ${PORTAL_STAGE_LABELS[inference.stage].toLowerCase()} with ${Math.round(inference.confidence * 100)}% confidence.`,
        );
        const plan = buildInstructionPlan(inference, {
          hasCredential: !!selectedCredential,
          hasCredentialPassword: !!credentialPassword,
          hasManuscriptPath: !!portalManuscriptPath,
        });
        pushAutomationLog(`Instruction agent selected "${PORTAL_ACTION_LABELS[plan.primaryAction]}".`);
        if (plan.steps[0]?.targetLabel) {
          pushAutomationLog(`Target action: "${plan.steps[0].targetLabel}".`);
        }

        switch (plan.primaryAction) {
          case 'ask-user-login':
            moveToManual(
              'Manual sign-in is needed before automation can continue',
              plan.userInputPrompt || inference.userInputPrompt || inference.summary,
              'The agent chain paused on the login step.',
            );
            return;

          case 'ask-user-verification':
            moveToManual(
              'Manual verification is required',
              plan.userInputPrompt || inference.userInputPrompt || inference.summary,
              'The portal is waiting for captcha, code verification, or MFA.',
            );
            return;

          case 'ask-user-file-upload':
            moveToManual(
              'Manual file upload is required on this step',
              plan.userInputPrompt || inference.userInputPrompt || inference.summary,
              'Upload the manuscript PDF inside the portal, then rerun the agent chain for the next step.',
            );
            return;

          case 'manual-investigation':
            moveToManual(
              'The current portal step needs a manual check',
              inference.userInputPrompt || inference.summary,
              'The page did not clearly match login, dashboard, upload, or metadata form patterns.',
            );
            return;

          case 'auto-login': {
            if (!selectedCredential || !credentialPassword) {
              moveToManual(
                'Manual sign-in is needed before automation can continue',
                'No usable saved credential is available for this venue.',
                'Add or update the venue credential, or sign in manually and rerun the agent chain.',
              );
              return;
            }

            pushAutomationLog(`Attempting login for ${selectedCredential.username}.`);
            const loginResult = await runPortalScript(
              buildLoginAutomationScript(selectedCredential.username, credentialPassword),
            ) as PortalScriptResult;

            if (!loginResult.success) {
              moveToManual(
                'Automation could not complete login',
                loginResult.reason || 'The portal login form could not be automated.',
                'Please sign in manually, then rerun the agent chain to continue from the next page.',
              );
              return;
            }

            pushAutomationLog(`Login form submitted using "${loginResult.clickedLabel || 'submit'}".`);
            await wait(3500);
            break;
          }

          case 'attach-manuscript': {
            const attachResult = await attachSelectedManuscriptToPortal(true);
            if (!attachResult.success) {
              moveToManual(
                'Automatic manuscript upload could not be completed',
                attachResult.reason || plan.summary,
                'Choose the manuscript PDF in PublishKaro or upload it manually in the portal, then rerun the agent chain.',
              );
              return;
            }

            pushAutomationLog(`Attached "${attachResult.fileName || 'manuscript PDF'}" to the portal upload field.`);
            await wait(2000);
            break;
          }

          case 'open-dashboard': {
            const dashboardStep = plan.steps.find((step) => step.action === 'open-dashboard');
            const navigationResult = await runPortalScript(
              buildNavigationAutomationScript(
                dashboardStep?.targetLabel || inference.nextButtonLabel || '',
                ['author center', 'author dashboard', 'dashboard', 'my manuscripts', 'submissions'],
                ['draft', 'continue draft', 'resume draft', 'new submission', 'start submission'],
              ),
            ) as PortalScriptResult;

            if (!navigationResult.success) {
              moveToManual(
                'Automation could not open the dashboard route',
                navigationResult.reason || plan.summary,
                'Open the author center or dashboard manually, then rerun the chain.',
              );
              return;
            }

            pushAutomationLog(
              `Opened "${navigationResult.clickedLabel || dashboardStep?.targetLabel || inference.nextButtonLabel || 'dashboard'}" from the current page.`,
            );
            await wait(2500);
            break;
          }

          case 'open-draft': {
            const draftStep = plan.steps.find((step) => step.action === 'open-draft');
            const navigationResult = await runPortalScript(
              buildNavigationAutomationScript(
                draftStep?.targetLabel || inference.nextButtonLabel || '',
                ['continue draft', 'resume draft', 'draft submission', 'my drafts', 'draft', 'resume'],
                ['new submission', 'start submission', 'submit manuscript', 'submit paper', 'create submission'],
              ),
            ) as PortalScriptResult;

            if (!navigationResult.success) {
              moveToManual(
                'Automation could not open the draft route',
                navigationResult.reason || plan.summary,
                'Open the draft or resume submission manually, then rerun the chain.',
              );
              return;
            }

            pushAutomationLog(
              `Opened "${navigationResult.clickedLabel || draftStep?.targetLabel || inference.nextButtonLabel || 'draft'}" from the current page.`,
            );
            await wait(2500);
            break;
          }

          case 'open-submission': {
            const submissionStep = plan.steps.find((step) => step.action === 'open-submission');
            const navigationResult = await runPortalScript(
              buildNavigationAutomationScript(
                submissionStep?.targetLabel || inference.nextButtonLabel || '',
                ['new submission', 'start submission', 'submit manuscript', 'submit paper', 'create submission', 'continue submission', 'begin submission'],
                ['draft', 'continue draft', 'resume draft', 'author center', 'dashboard'],
              ),
            ) as PortalScriptResult;

            if (!navigationResult.success) {
              moveToManual(
                'Automation could not open the submission flow',
                navigationResult.reason || plan.summary,
                'Open the dashboard or drafts area manually, then inspect the current page again.',
              );
              return;
            }

            pushAutomationLog(
              `Opened "${navigationResult.clickedLabel || submissionStep?.targetLabel || inference.nextButtonLabel || 'submission flow'}" from the current page.`,
            );
            await wait(2500);
            break;
          }

          case 'prefill-metadata': {
            const prefillResult = await runPortalScript(
              buildPrefillAutomationScript(storedDraft.title, storedDraft.abstract),
            ) as PortalScriptResult;

            if (!prefillResult.success) {
              if (prefillResult.shouldRetry) {
                pushAutomationLog(prefillResult.reason || 'The agent chain is moving to the next likely portal step.');
                if (prefillResult.clickedLabel) {
                  pushAutomationLog(`Clicked "${prefillResult.clickedLabel}" while searching for the metadata form.`);
                }
                await wait(2500);
                break;
              }

              moveToManual(
                'Automation stopped before the metadata form could be filled',
                prefillResult.reason || 'The agent chain could not find the title and abstract fields.',
                'Continue from the visible portal page. The draft details remain stored in the app.',
              );
              return;
            }

            const refreshedInference = await inspectCurrentPage(true);
            if (prefillResult.userInputPrompt && portalManuscriptPath) {
              const attachResult = await attachSelectedManuscriptToPortal(true);
              if (attachResult.success) {
                pushAutomationLog(`Attached "${attachResult.fileName || 'manuscript PDF'}" on the current metadata step.`);
              }
            }
            const submitButtonLabel =
              prefillResult.submitLabel
              || refreshedInference?.nextButtonLabel
              || inference.nextButtonLabel
              || '';
            const followUpReason =
              prefillResult.userInputPrompt
              || refreshedInference?.userInputPrompt
              || (submitButtonLabel
                ? `The agent chain highlighted "${submitButtonLabel}" for the next step.`
                : 'The title and abstract were filled. Review the portal and continue the submission.');

            setAutomationStatus((currentStatus) => ({
              ...currentStatus,
              phase: 'success',
              summary: 'The stored paper metadata was inserted into the portal form',
              reason: followUpReason,
              submitButtonLabel,
            }));
            pushAutomationLog('The stored draft title and abstract were inserted into the publication form.');
            return;
          }

          case 'review-and-submit': {
            const reviewResult = await runPortalScript(
              buildReviewAssistScript(),
            ) as PortalScriptResult;
            const submitButtonLabel = reviewResult.submitLabel || inference.nextButtonLabel || '';

            setAutomationStatus((currentStatus) => ({
              ...currentStatus,
              phase: 'success',
              summary: 'The portal is ready for user review on the final step',
              reason: inference.userInputPrompt
                || (submitButtonLabel
                  ? `The agent chain highlighted "${submitButtonLabel}" for the next step.`
                  : 'Review the current page and continue manually.'),
              submitButtonLabel,
            }));
            pushAutomationLog('The portal appears ready for review or submission.');
            return;
          }

          default:
            moveToManual(
              'The agent chain reached an unsupported portal state',
              inference.summary,
              'Continue manually from the current page.',
            );
            return;
        }
      }

      moveToManual(
        'Automation paused after several portal transitions',
        'The portal kept changing without reaching a stable submission step.',
        'Inspect the current page and continue manually if the route is still unclear.',
      );
    } catch (error: any) {
      console.error('Automation agent chain error:', error);
      setAutomationStatus((currentStatus) => ({
        ...currentStatus,
        phase: 'error',
        summary: 'Automation hit an unexpected error',
        reason: error.message ?? 'The agent chain could not finish the portal workflow.',
      }));
      pushAutomationLog('Continue manually in the embedded portal and rerun the agent chain after the page changes.');
    }
  }, [
    attachSelectedManuscriptToPortal,
    credentialPassword,
    embedStatus.status,
    inspectCurrentPage,
    portalUrl,
    portalManuscriptPath,
    pushAutomationLog,
    runPortalScript,
    selectedCredential,
    selectedVenue,
    storedDraft,
    wait,
  ]);

  const resetAll = () => {
    clearStoredDraft();
    closePortal();
    setSelectedVenueId('');
    setSelectedCredential(null);
    setErrorMsg('');
    setPageInference(null);
    setAutomationStatus(createIdleAutomationStatus());
    setStep(user ? 'draft' : 'auth');
  };

  const progressStepIndex = Math.max(
    0,
    ['auth', 'draft', 'venue'].indexOf(step === 'error' ? 'venue' : step),
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-2">
        <h2 className="text-3xl font-medium tracking-tight">Submission Agent</h2>
        <p className="text-muted-foreground">
          Store the paper details first, then open the publication portal and let the inference agent decide when to log in, navigate, prefill metadata, or ask the user to step in.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === progressStepIndex;
          const isDone = index < progressStepIndex;

          return (
            <div key={item.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isDone
                  ? 'bg-primary text-primary-foreground'
                  : isActive
                    ? 'bg-primary/20 text-primary border border-primary'
                    : 'bg-muted text-muted-foreground'
              }`}>
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                {item.label}
              </div>
              {index < STEPS.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </div>
          );
        })}
      </div>

      {step === 'auth' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <CardTitle>Sign In to Continue</CardTitle>
            </div>
            <CardDescription>You need to be signed in to use the submission agent.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4 max-w-sm">
              <div className="space-y-2">
                <Label htmlFor="sa-email">Email</Label>
                <Input
                  id="sa-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sa-password">Password</Label>
                <Input
                  id="sa-password"
                  type="password"
                  placeholder="........"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={loginLoading} className="w-full">
                {loginLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {step === 'draft' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle>Temporary Draft Storage</CardTitle>
            </div>
            <CardDescription>
              Choose an existing paper or upload a new one. The agent chain will use this stored draft later inside the publication portal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Paper Source</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    paperSource === 'library' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setPaperSource('library')}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <FolderOpen className="h-4 w-4" />
                    Use an existing app paper
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Pull the title and abstract from Research Papers. This path skips the new-upload AI analysis.
                  </p>
                </button>
                <button
                  type="button"
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    paperSource === 'manual' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                  }`}
                  onClick={() => setPaperSource('manual')}
                >
                  <div className="flex items-center gap-2 font-medium">
                    <Upload className="h-4 w-4" />
                    Upload a new manuscript
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Store a new paper temporarily. This path runs AI analysis once before the portal workflow starts.
                  </p>
                </button>
              </div>
            </div>

            {paperSource === 'library' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Research Papers</Label>
                  {papers.length === 0 ? (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>No papers found</AlertTitle>
                      <AlertDescription>
                        The Research Papers section is empty right now. Create a paper there first, or switch to the new upload path.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="grid gap-3 max-h-80 overflow-y-auto pr-1">
                      {papers.map((paper) => {
                        const isSelected = paper.id === selectedPaperId;

                        return (
                          <button
                            key={paper.id}
                            type="button"
                            className={`rounded-lg border p-4 text-left transition-colors ${
                              isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                            }`}
                            onClick={() => setSelectedPaperId(paper.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="font-medium">{paper.title}</p>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {paper.abstract || 'No abstract provided'}
                                </p>
                              </div>
                              <Badge variant="outline">{paper.status}</Badge>
                            </div>
                            <p className="mt-3 text-xs text-muted-foreground">
                              Updated {new Date(paper.updated_at).toLocaleDateString()}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedPaper && (
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Selected paper</p>
                        <p className="font-medium">{selectedPaper.title}</p>
                      </div>
                      <Badge variant="secondary">{selectedPaper.status}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Abstract</p>
                      <p className="text-sm text-muted-foreground">{selectedPaper.abstract || 'No abstract provided'}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paperSource === 'manual' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="paper-title">Paper Title <span className="text-destructive">*</span></Label>
                  <Input
                    id="paper-title"
                    placeholder="Enter the full paper title..."
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paper-abstract">Abstract <span className="text-destructive">*</span></Label>
                  <Textarea
                    id="paper-abstract"
                    placeholder="Paste your abstract here..."
                    rows={6}
                    value={abstract}
                    onChange={(event) => setAbstract(event.target.value)}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">{abstract.length} characters</p>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>PDF Manuscript <span className="text-destructive">*</span></Label>
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                      dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'
                    }`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    {pdfFile ? (
                      <div className="space-y-2">
                        <FileUp className="h-10 w-10 mx-auto text-primary" />
                        <p className="font-medium text-sm">{pdfFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            setPdfFile(null);
                            setPortalManuscriptPath(null);
                          }}
                        >
                          <X className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium">Drop your PDF here or click to browse</p>
                        <p className="text-xs text-muted-foreground">Only new uploads run AI analysis before the portal opens.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {storedDraft && (
              <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                Existing temporary draft: <span className="font-medium text-foreground">{storedDraft.title}</span>
              </div>
            )}

            {isStoringDraft && (
              <div className="space-y-3">
                <Progress value={progress} className="h-2" />
                <p className="text-sm text-muted-foreground">Preparing the temporary draft...</p>
              </div>
            )}

            <div className="flex gap-3">
              {storedDraft && (
                <Button variant="outline" onClick={clearStoredDraft}>
                  Clear Draft
                </Button>
              )}
              <Button onClick={storeDraftAndContinue} disabled={isStoringDraft}>
                <Sparkles className="mr-2 h-4 w-4" />
                {paperSource === 'manual' ? 'Store Draft With AI & Continue' : 'Store Draft & Continue'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'venue' && (
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="xl:order-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Stored Draft</CardTitle>
              </div>
              <CardDescription>This temporary storage is the source for portal automation.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!storedDraft ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No draft stored</AlertTitle>
                  <AlertDescription>
                    Go back, choose a paper, and store the temporary draft first.
                  </AlertDescription>
                </Alert>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Source</p>
                      <p className="font-medium">
                        {storedDraft.source === 'library' ? 'Existing app paper' : 'New upload from computer'}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {storedDraft.source === 'library' ? 'Stored from Research Papers' : 'Temporary upload draft'}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</p>
                    <p className="font-medium">{storedDraft.title}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Abstract</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{storedDraft.abstract}</p>
                  </div>
                  {storedDraft.pdfFileName && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Uploaded PDF</p>
                      <p className="text-sm text-muted-foreground">
                        {storedDraft.pdfFileName}
                        {storedDraft.pdfFileSizeBytes ? ` (${(storedDraft.pdfFileSizeBytes / 1024 / 1024).toFixed(2)} MB)` : ''}
                      </p>
                    </div>
                  )}
                  {storedDraft.analysisResult && (
                    <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-sm">AI analysis for the new upload</p>
                        <Badge variant="outline">{storedDraft.analysisResult.confidence}% confidence</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{storedDraft.analysisResult.summary}</p>
                    </div>
                  )}
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Portal Manuscript</p>
                        <p className="font-medium">
                          {portalManuscriptPath
                            ? portalManuscriptPath.split(/[/\\\\]/).pop()
                            : 'No local manuscript selected yet'}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void pickPortalManuscript()}
                        disabled={!isElectron}
                      >
                        <Upload className="mr-1 h-3 w-3" />
                        {portalManuscriptPath ? 'Change PDF' : 'Choose PDF'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      This is the local PDF the execution agent will try to attach when the portal reaches the manuscript upload step.
                    </p>
                  </div>
                </>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('draft')}>
                  Edit Draft
                </Button>
                <Button variant="outline" onClick={clearStoredDraft}>
                  Clear Draft
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:order-1">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle>Publication Portal</CardTitle>
                </div>
                <CardDescription>Load the target venue inside the app and let the agent inspect the live portal page in place.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="venue-select">Target Venue</Label>
                  <Select value={selectedVenueId} onValueChange={handleVenueChange}>
                    <SelectTrigger id="venue-select">
                      <SelectValue placeholder="Choose a venue..." />
                    </SelectTrigger>
                    <SelectContent>
                      {venues.map((venue) => (
                        <SelectItem key={venue.id} value={venue.id}>
                          {venue.name} - {venue.type} ({venue.priority} priority)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedVenue && (
                  <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1 break-all text-muted-foreground">
                      {(selectedCredential?.portal_url || selectedVenue.submission_url) ?? 'No URL configured'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={openPortal}
                      disabled={!storedDraft || embedStatus.status === 'loading'}
                    >
                      {embedStatus.status === 'loading' ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Monitor className="mr-1 h-3 w-3" />}
                      {embedStatus.status === 'loading' ? 'Loading...' : 'Open Portal'}
                    </Button>
                    {portalUrl && (
                      <>
                        <Button size="sm" variant="outline" onClick={reloadPortal}>
                          <RefreshCw className="mr-1 h-3 w-3" />
                          Reload
                        </Button>
                        <Button size="sm" variant="secondary" onClick={closePortal}>
                          <X className="mr-1 h-3 w-3" />
                          Close
                        </Button>
                      </>
                    )}
                  </div>
                )}

                <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/20" style={{ minHeight: 460 }}>
                  {portalUrl && isElectron && (
                    <webview
                      key={`${portalSessionKey}-${portalUrl}`}
                      ref={webviewRef}
                      src={portalUrl}
                      allowpopups={true}
                      partition="persist:publishkaro-submission-portal"
                      className="h-full w-full bg-white"
                    />
                  )}

                  {!portalUrl && (
                    <div className="absolute inset-0 flex items-center justify-center p-8 text-center text-muted-foreground">
                      <div className="space-y-2">
                        <Monitor className="mx-auto h-12 w-12 opacity-30" />
                        <p className="text-sm">Open the venue portal here after the draft is stored.</p>
                        <p className="text-xs opacity-60">The agent will inspect this page, detect the current step, and work from here.</p>
                      </div>
                    </div>
                  )}

                  {portalUrl && embedStatus.status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                      <div className="space-y-2 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading venue portal...</p>
                      </div>
                    </div>
                  )}

                  {portalUrl && embedStatus.status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 p-6">
                      <Alert variant="destructive" className="max-w-md">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Failed to load portal</AlertTitle>
                        <AlertDescription>{embedStatus.error || 'The portal did not finish loading.'}</AlertDescription>
                      </Alert>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>Agent Inventory</CardTitle>
                </div>
                <CardDescription>
                  The inference agent reads the page, the instruction agent builds the next moves, and the execution agent carries them out in a loop until the submission form is ready.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="secondary">
                    {selectedCredential ? 'Credential found' : 'Credential missing'}
                  </Badge>
                  {contextualInference && (
                    <>
                      <Badge variant="outline">
                        {PORTAL_STAGE_LABELS[contextualInference.stage]}
                      </Badge>
                      <Badge variant="outline">
                        {PORTAL_ACTION_LABELS[contextualInference.recommendedAction]}
                      </Badge>
                    </>
                  )}
                  {selectedCredential && (
                    <span className="text-sm text-muted-foreground">
                      Using {selectedCredential.username}
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {agentInventory.map((agent) => (
                    <div key={agent.key} className="rounded-lg border p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{agent.title}</p>
                          <p className="text-sm text-muted-foreground">{agent.summary}</p>
                        </div>
                        <Badge variant={
                          agent.state === 'running' || agent.state === 'thinking'
                            ? 'default'
                            : agent.state === 'blocked'
                              ? 'destructive'
                              : agent.state === 'done'
                                ? 'secondary'
                                : 'outline'
                        }>
                          {AGENT_STATE_LABELS[agent.state]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{agent.detail}</p>
                    </div>
                  ))}
                </div>

                {!selectedCredential && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No stored credential for this venue</AlertTitle>
                    <AlertDescription>
                      If the portal is already signed in, the agent can still continue. Otherwise add the venue login in <Link to="/credentials" className="underline underline-offset-2">Credential Vault</Link> or sign in manually inside the portal.
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => void inspectCurrentPage()}
                    disabled={!portalUrl || embedStatus.status !== 'loaded' || isInferring || automationStatus.phase === 'running'}
                  >
                    {isInferring ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Monitor className="mr-2 h-4 w-4" />
                    )}
                    {isInferring ? 'Inspecting...' : 'Inspect Current Page'}
                  </Button>
                  <Button
                    onClick={runAutomationAssistant}
                    disabled={!storedDraft || !selectedVenue || !portalUrl || embedStatus.status !== 'loaded' || automationStatus.phase === 'running' || isInferring}
                  >
                    {automationStatus.phase === 'running' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {automationStatus.phase === 'running' ? 'Agent Running...' : 'Run Recommended Flow'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPageInference(null);
                      setAutomationStatus(createIdleAutomationStatus());
                    }}
                  >
                    Reset Agent
                  </Button>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {contextualInference?.summary || 'Inspect the current portal page to let the inference agent classify the step.'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {contextualInference
                          ? `${PORTAL_STAGE_LABELS[contextualInference.stage]} with ${Math.round(contextualInference.confidence * 100)}% confidence`
                          : 'The inference agent will watch for cached login, dashboard links, draft routes, metadata fields, verification steps, and upload prompts.'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {contextualInference ? PORTAL_ACTION_LABELS[contextualInference.recommendedAction] : 'Awaiting inspection'}
                    </Badge>
                  </div>

                  {contextualInference?.currentUrl && (
                    <div className="text-sm text-muted-foreground break-all">
                      Current page: {contextualInference.currentUrl}
                    </div>
                  )}

                  {contextualInference?.nextButtonLabel && (
                    <div className="rounded-md bg-primary/5 p-3 text-sm text-muted-foreground">
                      Likely next action in portal: <span className="font-medium text-foreground">{contextualInference.nextButtonLabel}</span>
                    </div>
                  )}

                  {contextualInference?.visibleButtons && contextualInference.visibleButtons.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Visible Actions</p>
                      <div className="flex flex-wrap gap-2">
                        {contextualInference.visibleButtons.slice(0, 10).map((buttonLabel) => (
                          <Badge key={buttonLabel} variant="outline" className="max-w-full whitespace-normal text-left">
                            {buttonLabel}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {contextualInference?.userInputPrompt && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>User input is needed on this step</AlertTitle>
                      <AlertDescription>{contextualInference.userInputPrompt}</AlertDescription>
                    </Alert>
                  )}

                  {contextualInference?.cues && contextualInference.cues.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Detected Cues</p>
                      <div className="flex flex-wrap gap-2">
                        {contextualInference.cues.map((cue) => (
                          <Badge key={cue} variant="secondary" className="max-w-full whitespace-normal text-left">
                            {cue}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {instructionPlan?.summary || 'The instruction agent will build a short action chain after the page is inspected.'}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {instructionPlan
                          ? `Primary action: ${PORTAL_ACTION_LABELS[instructionPlan.primaryAction]}`
                          : 'It turns the page reading into ordered moves like open draft, open submission, fill metadata, or ask the user to step in.'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {instructionPlan ? instructionPlan.strategy : 'Waiting for inference'}
                    </Badge>
                  </div>

                  {instructionPlan?.rationale && instructionPlan.rationale.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Instruction Rationale</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {instructionPlan.rationale.map((reason, index) => (
                          <li key={`${reason}-${index}`} className="flex gap-2">
                            <span className="text-primary">*</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {instructionPlan?.steps && instructionPlan.steps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Action Chain</p>
                      <div className="space-y-2">
                        {instructionPlan.steps.map((step) => (
                          <div key={step.id} className="rounded-md border bg-muted/20 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-medium text-sm">{step.title}</p>
                              <Badge variant={step.status === 'ready' ? 'default' : 'outline'}>
                                {step.status}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                            {step.targetLabel && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Target: <span className="font-medium text-foreground">{step.targetLabel}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{automationStatus.summary}</p>
                      {automationStatus.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{automationStatus.reason}</p>
                      )}
                    </div>
                    <Badge variant={
                      automationStatus.phase === 'success'
                        ? 'default'
                        : automationStatus.phase === 'manual'
                          ? 'secondary'
                          : automationStatus.phase === 'error'
                            ? 'destructive'
                            : 'outline'
                    }>
                      {automationStatus.phase}
                    </Badge>
                  </div>

                  {automationStatus.submitButtonLabel && (
                    <div className="rounded-md bg-primary/5 p-3 text-sm text-muted-foreground">
                      Highlighted action on portal: <span className="font-medium text-foreground">{automationStatus.submitButtonLabel}</span>
                    </div>
                  )}

                  {automationStatus.logs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Execution Log</p>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {automationStatus.logs.map((logLine, index) => (
                          <li key={`${logLine}-${index}`} className="flex gap-2">
                            <span className="text-primary">*</span>
                            <span>{logLine}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
                  If the agent stops, the portal stays open so the user can continue manually from the exact point where automation paused.
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep('draft')}>
                Back to Draft
              </Button>
              <Button variant="outline" onClick={resetAll}>
                Start Over
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'error' && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Submission Flow Failed</AlertTitle>
            <AlertDescription>{errorMsg || 'An unexpected error occurred.'}</AlertDescription>
          </Alert>
          <Button onClick={resetAll} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
}
