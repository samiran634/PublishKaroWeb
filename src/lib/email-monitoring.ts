import type { EmailStatus } from '@/types/types';

export type EmailAlertKind =
  | 'submission_confirmation'
  | 'reviewer_comments'
  | 'revision_request'
  | 'acceptance'
  | 'rejection'
  | 'camera_ready_deadline'
  | 'general_update';

export type EmailAlertPriority = 'urgent' | 'high' | 'normal';

export interface EmailAlertInsight {
  kind: EmailAlertKind;
  label: string;
  priority: EmailAlertPriority;
  actionRequired: boolean;
}

function matchesAny(text: string, patterns: string[]) {
  return patterns.some((pattern) => text.includes(pattern));
}

export function classifyEmailAlert(
  email: Pick<EmailStatus, 'subject' | 'inferred_status' | 'email_snippet' | 'full_body'>
): EmailAlertInsight {
  const text = `${email.inferred_status ?? ''} ${email.subject} ${email.email_snippet ?? ''} ${email.full_body ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ');

  if (
    matchesAny(text, [
      'camera ready',
      'camera-ready',
      'camera ready submission',
      'final manuscript',
      'copyright form',
      'deadline reminder',
      'deadline approaching',
      'final files due',
    ])
  ) {
    return {
      kind: 'camera_ready_deadline',
      label: 'Camera-ready deadline',
      priority: 'urgent',
      actionRequired: true,
    };
  }

  if (
    matchesAny(text, [
      'major revision',
      'minor revision',
      'revise and resubmit',
      'revision required',
      'revision request',
      'submit your revision',
    ])
  ) {
    return {
      kind: 'revision_request',
      label: 'Revision request',
      priority: 'urgent',
      actionRequired: true,
    };
  }

  if (
    matchesAny(text, [
      'reviewer comments',
      'review comments',
      'review report',
      'review reports',
      'review feedback',
      'comments from reviewers',
    ])
  ) {
    return {
      kind: 'reviewer_comments',
      label: 'Reviewer comments',
      priority: 'high',
      actionRequired: true,
    };
  }

  if (matchesAny(text, ['accepted', 'acceptance', 'congratulations'])) {
    return {
      kind: 'acceptance',
      label: 'Acceptance notification',
      priority: 'high',
      actionRequired: false,
    };
  }

  if (matchesAny(text, ['rejected', 'declined', 'unable to accept', 'not accepted'])) {
    return {
      kind: 'rejection',
      label: 'Rejection notification',
      priority: 'high',
      actionRequired: false,
    };
  }

  if (
    matchesAny(text, [
      'submission confirmation',
      'submission received',
      'thank you for your submission',
      'manuscript id',
      'has been submitted',
    ])
  ) {
    return {
      kind: 'submission_confirmation',
      label: 'Submission confirmation',
      priority: 'normal',
      actionRequired: false,
    };
  }

  return {
    kind: 'general_update',
    label: 'General publication update',
    priority: 'normal',
    actionRequired: false,
  };
}

export function getEmailPriorityRank(priority: EmailAlertPriority) {
  if (priority === 'urgent') return 3;
  if (priority === 'high') return 2;
  return 1;
}
