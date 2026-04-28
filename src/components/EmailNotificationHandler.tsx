/**
 * Email Notification Handler Component
 * Automatically sends notifications for new emails in monitoring page
 */

import { useEffect } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import type { EmailStatusWithDomain } from '@/types/types';

interface EmailNotificationHandlerProps {
  emailStatuses: EmailStatusWithDomain[];
  onEmailNotified?: (emailId: string) => void;
}

/**
 * This component watches for new emails and automatically sends notifications
 * Place it in EmailMonitor or any page that receives new email data
 */
export function EmailNotificationHandler({
  emailStatuses,
  onEmailNotified,
}: EmailNotificationHandlerProps) {
  const { isEnabled, showNotification } = useNotifications();

  useEffect(() => {
    if (!isEnabled) return;

    // Find all new emails that haven't been notified
    const newEmails = emailStatuses.filter((email) => email.is_new);

    newEmails.forEach((email) => {
      // Small delay to stagger notifications
      const delay = Math.random() * 500; // 0-500ms random delay
      const timeoutId = setTimeout(() => {
        try {
          showNotification(email);
          onEmailNotified?.(email.id);
        } catch (error) {
          console.error('Failed to show notification for email:', email.id, error);
        }
      }, delay);

      return () => clearTimeout(timeoutId);
    });
  }, [emailStatuses, isEnabled, showNotification, onEmailNotified]);

  // This component doesn't render anything
  return null;
}
