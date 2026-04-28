/**
 * Notification Context
 * Manages email notifications and real-time subscriptions
 */

import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/db/supabase';
import { classifyEmailAlert } from '@/lib/email-monitoring';
import {
  getNotificationPermission,
  getNotificationSettings,
  isNotificationSupported,
  playNotificationSound,
  requestNotificationPermission,
  sendEmailNotification,
} from '@/lib/notification-service';
import type { EmailStatus } from '@/types/types';

export interface NotificationContextType {
  isSupported: boolean;
  hasPermission: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  lastNotification: {
    emailId: string;
    timestamp: number;
  } | null;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => void;
  showNotification: (email: EmailStatus) => void;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  userId?: string;
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [isSupported] = useState(() => isNotificationSupported());
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<{
    emailId: string;
    timestamp: number;
  } | null>(null);

  const realtimeSubscriptionRef = useRef<string | null>(null);

  // Initialize permission and settings on mount
  useEffect(() => {
    if (!isSupported) return;

    const permission = getNotificationPermission();
    setHasPermission(permission === 'granted');

    const settings = getNotificationSettings();
    setIsEnabled(settings.enabled && permission === 'granted');
  }, [isSupported]);

  // Enable notifications
  const enableNotifications = useCallback(async () => {
    if (!isSupported) {
      throw new Error('Notifications not supported in this browser');
    }

    setIsLoading(true);
    try {
      const permission = await requestNotificationPermission();
      const permissionGranted = permission === 'granted';
      setHasPermission(permissionGranted);
      setIsEnabled(permissionGranted);

      if (permissionGranted) {
        // Save settings
        const settings = getNotificationSettings();
        localStorage.setItem('notification-settings', JSON.stringify({ ...settings, enabled: true }));

        // Subscribe to real-time updates if user is authenticated
        if (userId) {
          subscribeToEmailUpdates(userId);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userId]);

  // Disable notifications
  const disableNotifications = useCallback(() => {
    setIsEnabled(false);
    const settings = getNotificationSettings();
    localStorage.setItem('notification-settings', JSON.stringify({ ...settings, enabled: false }));
    unsubscribeFromEmailUpdates();
  }, []);

  // Show notification
  const showNotification = useCallback((email: EmailStatus) => {
    if (!isEnabled) return;

    const settings = getNotificationSettings();
    const insight = classifyEmailAlert(email);

    // Check if notification should be shown based on settings
    if (settings.urgentOnly && insight.priority !== 'urgent') {
      return;
    }

    if (settings.actionRequiredOnly && !insight.actionRequired) {
      return;
    }

    // Send notification
    sendEmailNotification(
      {
        subject: email.subject,
        sender: email.sender,
        id: email.id,
      },
      insight
    );

    // Play sound if enabled
    if (settings.sound) {
      playNotificationSound(insight.priority);
    }

    // Update last notification
    setLastNotification({
      emailId: email.id,
      timestamp: Date.now(),
    });
  }, [isEnabled]);

  // Subscribe to real-time email updates
  const subscribeToEmailUpdates = useCallback(
    (userId: string) => {
      if (realtimeSubscriptionRef.current) {
        return; // Already subscribed
      }

      const subscription = supabase
        .channel(`email_updates_${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'email_statuses',
            filter: `user_id=eq.${userId}`,
          },
          async (payload) => {
            if (payload.new && payload.new.is_new) {
              // Small delay to ensure email is fully processed
              setTimeout(() => {
                showNotification(payload.new as EmailStatus);
              }, 500);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to email notifications');
          } else if (status === 'CHANNEL_ERROR') {
            console.warn('Failed to subscribe to email notifications');
            unsubscribeFromEmailUpdates();
          }
        });

      realtimeSubscriptionRef.current = subscription.channel.topic;

      return () => {
        unsubscribeFromEmailUpdates();
      };
    },
    [showNotification]
  );

  // Unsubscribe from real-time updates
  const unsubscribeFromEmailUpdates = useCallback(async () => {
    if (realtimeSubscriptionRef.current) {
      await supabase.removeChannel(realtimeSubscriptionRef.current);
      realtimeSubscriptionRef.current = null;
    }
  }, []);

  // Setup subscription when user ID changes
  useEffect(() => {
    if (userId && isEnabled) {
      subscribeToEmailUpdates(userId);
    }

    return () => {
      unsubscribeFromEmailUpdates();
    };
  }, [userId, isEnabled, subscribeToEmailUpdates, unsubscribeFromEmailUpdates]);

  const value: NotificationContextType = {
    isSupported,
    hasPermission,
    isEnabled,
    isLoading,
    lastNotification,
    enableNotifications,
    disableNotifications,
    showNotification,
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}
