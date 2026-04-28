# Email Notification System Implementation Guide

## Overview

This document describes the complete email notification system for the PublishKaro application. The system provides real-time browser push notifications for important publication emails (submissions, reviews, decisions, etc.).

## Architecture

### Components

1. **Notification Service** (`src/lib/notification-service.ts`)
   - Browser notification API wrapper
   - Permission management
   - Notification formatting
   - Sound notification capability
   - Settings persistence

2. **Notification Context** (`src/contexts/NotificationContext.tsx`)
   - React Context for managing notification state
   - Real-time Supabase subscriptions
   - Email classification integration
   - Settings management

3. **Hooks**
   - `useNotifications()` - Access notification context

4. **UI Components**
   - `NotificationSettings` - Full settings management UI
   - `NotificationBadge` - Quick toggle button with popover

### Integration with Email Monitoring

The system integrates with existing email monitoring through:
- `classifyEmailAlert()` - Categorizes email types
- `getEmailPriorityRank()` - Determines priority
- Supabase Realtime subscriptions on `email_statuses` table

## Features

### Core Features
- ✅ Real-time browser push notifications
- ✅ Email priority classification (urgent, high, normal)
- ✅ Action requirement detection
- ✅ Customizable notification preferences
- ✅ Sound notifications
- ✅ Permission management
- ✅ Local settings persistence

### Email Types Supported
- Camera-ready deadline notifications
- Revision request alerts
- Reviewer comments
- Paper acceptance notifications
- Paper rejection notifications
- Submission confirmations
- General publication updates

### Notification Filtering
Users can configure:
- **Urgent Only** - Only notify for urgent emails
- **Action Required Only** - Only notify when action is needed
- **Sound** - Enable/disable audio notifications

## Usage

### 1. Setup (Already Done in app.tsx)

The NotificationProvider is already wrapped in the App component:

```tsx
<AuthProvider>
    <NotificationProvider>
        {/* Your app content */}
    </NotificationProvider>
</AuthProvider>
```

### 2. Enable Notifications

Users see the notification badge in the UI and can click "Enable" to request permission.

```tsx
import { useNotifications } from '@/hooks/use-notifications';

function MyComponent() {
    const { isEnabled, enableNotifications } = useNotifications();
    
    return (
        <button onClick={enableNotifications}>
            {isEnabled ? 'Notifications On' : 'Enable Notifications'}
        </button>
    );
}
```

### 3. Add UI Components

In your app header or settings page, add the notification badge:

```tsx
import { NotificationBadge } from '@/components/NotificationBadge';

// In compact mode (icon)
<NotificationBadge compact />

// In full mode (with text)
<NotificationBadge />
```

Add notification settings to your settings page:

```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

export function SettingsPage() {
    return (
        <div>
            <NotificationSettings />
        </div>
    );
}
```

### 4. Manual Notification Trigger

To manually trigger a notification (e.g., in email scanning results):

```tsx
import { useNotifications } from '@/hooks/use-notifications';

function EmailScanResults() {
    const { showNotification } = useNotifications();
    
    const handleEmailScanned = (email: EmailStatus) => {
        // Show notification manually
        showNotification(email);
    };
    
    return <div>{/* ... */}</div>;
}
```

## API Reference

### Notification Service Functions

#### `isNotificationSupported(): boolean`
Check if browser supports notifications.

#### `getNotificationPermission(): NotificationPermission | null`
Get current permission status: 'granted' | 'denied' | 'default' | null

#### `requestNotificationPermission(): Promise<NotificationPermission>`
Request user permission for notifications. Throws if notifications not supported or permission denied.

#### `sendNotification(payload: NotificationPayload): Notification | null`
Send a browser notification directly.

```tsx
sendNotification({
    title: 'Your Title',
    options: {
        body: 'Your message',
        icon: '/icon.png',
        badge: '/badge.png',
        requireInteraction: true,
        actions: [
            { action: 'open', title: 'View' },
            { action: 'close', title: 'Dismiss' }
        ]
    }
});
```

#### `sendEmailNotification(email: EmailInfo, insight: EmailAlertInsight): void`
Send a formatted email notification with appropriate styling and actions.

```tsx
sendEmailNotification(
    {
        subject: email.subject,
        sender: email.sender,
        id: email.id
    },
    insight
);
```

#### `playNotificationSound(priority: 'urgent' | 'high' | 'normal'): void`
Play an audio notification (different pitch based on priority).

### Notification Context API

```tsx
interface NotificationContextType {
    isSupported: boolean;           // Browser support
    hasPermission: boolean;         // Permission granted
    isEnabled: boolean;             // Notifications active
    isLoading: boolean;             // Request in progress
    lastNotification: {
        emailId: string;
        timestamp: number;
    } | null;
    enableNotifications(): Promise<void>;
    disableNotifications(): void;
    showNotification(email: EmailStatus): void;
}
```

### Notification Settings

```tsx
interface NotificationSettings {
    enabled: boolean;           // Master switch
    sound: boolean;            // Play sound
    urgentOnly: boolean;       // Only urgent emails
    actionRequiredOnly: boolean; // Only action-required emails
}

// Functions
saveNotificationSettings(settings: NotificationSettings): void
getNotificationSettings(): NotificationSettings
```

## Real-Time Subscriptions

The notification system uses Supabase Realtime to listen for new emails:

```tsx
// Automatically subscribes when:
// 1. NotificationProvider mounts
// 2. User ID is provided
// 3. Notifications are enabled

// Subscribes to: email_statuses INSERT events where user_id matches
// Only triggers for is_new: true emails
```

### Database Trigger Required

For real-time notifications to work optimally, ensure your `email_statuses` table has proper RLS policies:

```sql
-- Example RLS policy (Supabase)
CREATE POLICY "Users can see their own email statuses"
  ON email_statuses
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Row Level Security should be enabled
ALTER TABLE email_statuses ENABLE ROW LEVEL SECURITY;
```

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome  | ✅ Full | All features supported |
| Firefox | ✅ Full | All features supported |
| Safari  | ✅ Full | macOS/iOS notifications |
| Edge    | ✅ Full | All features supported |
| IE 11   | ❌ None | No support |

## Troubleshooting

### Notifications Not Appearing

1. **Check permission status**
   ```tsx
   const permission = getNotificationPermission();
   console.log('Current permission:', permission);
   ```

2. **Verify browser tab is focused**
   - Some browsers only show notifications for background tabs

3. **Check browser settings**
   - Go to browser settings > Privacy > Notifications
   - Ensure your app domain is allowed

### Permission Denied

If permission was previously denied:
1. Open browser settings
2. Find Privacy > Notifications
3. Clear permission for your app domain
4. Reload and try again

### Real-time Updates Not Working

1. **Check Supabase connection**
   ```tsx
   const { data, error } = await supabase.from('email_statuses').select('COUNT(*)');
   console.log('Connection test:', { data, error });
   ```

2. **Verify RLS policies** - Ensure user can read their own email_statuses

3. **Check network tab** - Look for websocket connections to Supabase

## Performance Considerations

1. **Memory Usage**
   - Each notification subscription consumes minimal memory
   - Unsubscribes automatically when provider unmounts

2. **Network**
   - Uses WebSocket for real-time updates (minimal bandwidth)
   - No polling - entirely event-driven

3. **Battery**
   - Minimal impact on mobile devices
   - Only processes subscribed events
   - Disables automatically when browser tab closed

## Security

1. **Permission-Based**
   - Requires explicit user permission
   - Users can revoke at any time

2. **Scoped Subscriptions**
   - Only receives notifications for user's own emails
   - Supabase RLS policies enforce authorization

3. **No Data Leaks**
   - Notifications only show basic info (subject, sender)
   - No personal data stored in localStorage besides settings

## Testing

### Test Notifications Locally

```tsx
import { sendNotification } from '@/lib/notification-service';

// In your component
const handleTestNotification = () => {
    sendNotification({
        title: '✅ Test Notification',
        options: {
            body: 'This is a test notification',
            icon: '/logo.png',
            requireInteraction: true
        }
    });
};
```

### Test Email Simulation

```tsx
// In Supabase console, insert test email_statuses
INSERT INTO email_statuses (
    user_id, publication_domain_id, email_id, sender, subject, 
    received_date, is_new, created_at
) VALUES (
    'user-uuid-here',
    'domain-uuid-here',
    'test-email-1',
    'editor@ieee.org',
    'Revision Request for Your Paper',
    NOW(),
    true,
    NOW()
);
```

## Future Enhancements

1. **Service Worker Integration**
   - Background notifications when app is closed
   - Requires service worker file

2. **Email Grouping**
   - Combine similar notifications
   - Reduce notification spam

3. **Smart Filtering**
   - ML-based spam detection
   - User interaction history

4. **Analytics**
   - Track notification engagement
   - Optimize notification timing

5. **Desktop App**
   - Electron notifications
   - System tray integration

## Files Reference

```
src/
├── lib/
│   ├── notification-service.ts      # Core notification logic
│   └── email-monitoring.ts          # Email classification (existing)
├── contexts/
│   ├── NotificationContext.tsx      # React context & provider
│   └── AuthContext.tsx              # User context (existing)
├── hooks/
│   └── use-notifications.ts         # useNotifications hook
├── components/
│   ├── NotificationSettings.tsx     # Settings UI
│   ├── NotificationBadge.tsx        # Toggle button
│   └── ui/                          # Radix UI components
├── pages/
│   └── EmailMonitor.tsx             # Main monitoring page
└── app.tsx                          # Updated with provider
```

## Support

For issues or feature requests:
1. Check the Troubleshooting section
2. Review browser console for errors
3. Verify Supabase configuration
4. Check RLS policies and permissions
