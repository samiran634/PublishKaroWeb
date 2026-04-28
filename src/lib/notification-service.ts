/**
 * Browser Notification Service
 * Handles sending, permission management, and configuration for push notifications
 */

import type { EmailAlertInsight } from './email-monitoring';

export interface NotificationPayload {
  title: string;
  options?: NotificationOptions;
}

/**
 * Check if browser supports notifications
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission | null {
  if (!isNotificationSupported()) {
    return null;
  }
  return Notification.permission;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications are not supported in this browser');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    return Notification.requestPermission();
  }

  throw new Error('Notification permission was denied by user');
}

/**
 * Send a browser notification
 */
export function sendNotification(payload: NotificationPayload): Notification | null {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return null;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return null;
  }

  return new Notification(payload.title, {
    icon: '/logo.png', // Update with your app logo
    badge: '/badge.png', // Small icon for notification
    ...payload.options,
  });
}

/**
 * Generate notification title based on email alert insight
 */
export function generateNotificationTitle(insight: EmailAlertInsight): string {
  switch (insight.kind) {
    case 'camera_ready_deadline':
      return '📅 Camera-Ready Deadline';
    case 'revision_request':
      return '✏️ Revision Request';
    case 'reviewer_comments':
      return '💬 Reviewer Comments';
    case 'acceptance':
      return '✅ Paper Accepted!';
    case 'rejection':
      return '❌ Paper Decision';
    case 'submission_confirmation':
      return '📤 Submission Confirmed';
    case 'general_update':
      return '📮 Publication Update';
    default:
      return '📧 Email Notification';
  }
}

/**
 * Generate notification options with priority-based styling
 */
export function generateNotificationOptions(
  email: {
    subject: string;
    sender: string;
  },
  insight: EmailAlertInsight
): NotificationOptions {
  const requiresAction = insight.actionRequired ? ' - Action Required' : '';
  const tag = `email-${insight.kind}-${Date.now()}`;

  return {
    body: `From: ${email.sender}\n${email.subject}${requiresAction}`,
    tag, // Allows replacing similar notifications
    badge: '/badge.png',
    requireInteraction: insight.actionRequired || insight.priority === 'urgent',
    actions: [
      {
        action: 'open',
        title: 'View',
      },
      {
        action: 'close',
        title: 'Dismiss',
      },
    ],
  };
}

/**
 * Send email notification with proper formatting
 */
export function sendEmailNotification(
  email: {
    subject: string;
    sender: string;
    id: string;
  },
  insight: EmailAlertInsight
): void {
  const title = generateNotificationTitle(insight);
  const options = generateNotificationOptions(email, insight);

  const notification = sendNotification({
    title,
    options,
  });

  if (notification) {
    // Handle click events
    notification.addEventListener('click', () => {
      window.focus();
      // Route to email detail page
      window.location.href = `/email-monitor?email=${email.id}`;
      notification.close();
    });

    // Handle action clicks
    notification.addEventListener('close', () => {
      console.log('Notification closed');
    });
  }
}

/**
 * Setup Service Worker for background notifications (optional)
 * Requires service worker registration
 */
export async function registerNotificationServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/notification-sw.js');
      console.log('Notification service worker registered');
    } catch (error) {
      console.warn('Failed to register notification service worker:', error);
    }
  }
}

/**
 * Create a sound notification (fallback for systems where visual notifications might be missed)
 */
export function playNotificationSound(priority: EmailAlertInsight['priority'] = 'normal'): void {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies based on priority
    const frequencyMap = {
      urgent: 800, // Higher pitch for urgent
      high: 600, // Medium pitch for high
      normal: 400, // Lower pitch for normal
    };

    oscillator.frequency.value = frequencyMap[priority];
    oscillator.type = 'sine';

    // Short beep
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('Failed to play notification sound:', error);
  }
}

/**
 * Request and store notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  urgentOnly: boolean;
  actionRequiredOnly: boolean;
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  localStorage.setItem('notification-settings', JSON.stringify(settings));
}

export function getNotificationSettings(): NotificationSettings {
  const stored = localStorage.getItem('notification-settings');
  return stored
    ? JSON.parse(stored)
    : {
        enabled: true,
        sound: true,
        urgentOnly: false,
        actionRequiredOnly: false,
      };
}
