/**
 * Notification System Types
 * Type definitions for the email notification system
 */

export type EmailAlertKind =
  | 'submission_confirmation'
  | 'reviewer_comments'
  | 'revision_request'
  | 'acceptance'
  | 'rejection'
  | 'camera_ready_deadline'
  | 'general_update';

export type EmailAlertPriority = 'urgent' | 'high' | 'normal';

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export interface EmailAlertInsight {
  kind: EmailAlertKind;
  label: string;
  priority: EmailAlertPriority;
  actionRequired: boolean;
}

export interface NotificationPayload {
  title: string;
  options?: NotificationOptions;
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  urgentOnly: boolean;
  actionRequiredOnly: boolean;
}

export interface NotificationEvent {
  type: 'enable' | 'disable' | 'show' | 'click' | 'close';
  emailId?: string;
  timestamp: number;
  priority?: EmailAlertPriority;
}

export interface EmailNotificationInfo {
  emailId: string;
  subject: string;
  sender: string;
  receivedDate: string;
  kind: EmailAlertKind;
  priority: EmailAlertPriority;
  actionRequired: boolean;
}

export interface NotificationContextType {
  // State
  isSupported: boolean;
  hasPermission: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  lastNotification: {
    emailId: string;
    timestamp: number;
  } | null;

  // Methods
  enableNotifications: () => Promise<void>;
  disableNotifications: () => void;
  showNotification: (email: EmailStatus) => void;
}

// Re-export from email-monitoring
import type { EmailStatus } from '@/types/types';

export interface NotificationHandlerProps {
  emailStatuses: EmailStatusWithDomain[];
  onEmailNotified?: (emailId: string) => void;
}

export interface EmailStatusWithDomain extends EmailStatus {
  publication_domain?: {
    id: string;
    name: string;
    domain: string;
    official_emails: string[];
  };
  insight?: EmailAlertInsight;
}

// Notification service return types
export interface NotificationServiceState {
  supported: boolean;
  permission: NotificationPermissionStatus | null;
  enabled: boolean;
}

export interface NotificationSendResult {
  success: boolean;
  notification?: Notification;
  error?: string;
}

// Supabase real-time event types
export interface SupabaseRealtimePayload {
  new?: EmailStatus;
  old?: EmailStatus;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
}

// Settings storage types
export interface NotificationSettingsStorage {
  version: number;
  settings: NotificationSettings;
  lastUpdated: number;
}
