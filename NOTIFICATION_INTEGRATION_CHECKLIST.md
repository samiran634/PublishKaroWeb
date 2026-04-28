# Email Notification System - Integration Checklist

## ✅ What's Already Done

- [x] Notification service (`src/lib/notification-service.ts`) - Core browser notification logic
- [x] Notification context (`src/contexts/NotificationContext.tsx`) - React Context with Supabase Realtime
- [x] Custom hook (`src/hooks/use-notifications.ts`) - Easy context access
- [x] Settings UI (`src/components/NotificationSettings.tsx`) - Full preference management
- [x] Badge component (`src/components/NotificationBadge.tsx`) - Quick toggle
- [x] Email handler (`src/components/EmailNotificationHandler.tsx`) - Automatic notifications
- [x] App wrapper (`src/app.tsx`) - NotificationProvider integrated
- [x] Documentation (`NOTIFICATION_SYSTEM.md`) - Complete implementation guide

## 📋 Integration Steps

### Step 1: Add Notification Badge to Header
**Where**: Your main header/navigation component (likely `MainLayout.tsx`)

```tsx
import { NotificationBadge } from '@/components/NotificationBadge';

export function MainLayout({ children }) {
  return (
    <header>
      {/* ... other header content */}
      <NotificationBadge compact={true} /> {/* or false for full version */}
    </header>
  );
}
```

### Step 2: Add Notification Settings to Settings Page
**Where**: Create or update a settings page (e.g., `src/pages/Settings.tsx`)

```tsx
import { NotificationSettings } from '@/components/NotificationSettings';

export function SettingsPage() {
  return (
    <div className="p-6">
      <NotificationSettings />
      {/* ... other settings */}
    </div>
  );
}
```

### Step 3: Add Email Notification Handler to EmailMonitor
**Where**: `src/pages/EmailMonitor.tsx`

```tsx
// Add import at top
import { EmailNotificationHandler } from '@/components/EmailNotificationHandler';

// Inside the EmailMonitor component, add after the return statement starts:
export default function EmailMonitor() {
  // ... existing code ...
  
  const handleEmailNotified = (emailId: string) => {
    // Optional: track which emails have been notified
    console.log('Notified for email:', emailId);
  };

  return (
    <>
      <EmailNotificationHandler 
        emailStatuses={emailStatuses}
        onEmailNotified={handleEmailNotified}
      />
      
      {/* ... rest of your existing JSX ... */}
    </>
  );
}
```

### Step 4: Verify Supabase RLS Policies
**Where**: Supabase dashboard > SQL Editor

Run these commands to ensure proper permissions:

```sql
-- 1. Check if email_statuses table has RLS enabled
ALTER TABLE email_statuses ENABLE ROW LEVEL SECURITY;

-- 2. Create policy for users to read their own emails
CREATE POLICY "Users can read own email_statuses"
  ON email_statuses
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- 3. Create policy for users to update their own emails (for marking as read)
CREATE POLICY "Users can update own email_statuses"
  ON email_statuses
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 4. Verify policies are applied
SELECT * FROM pg_policies 
WHERE tablename = 'email_statuses';
```

### Step 5: (Optional) Add Settings Route
**Where**: `src/routes.tsx` or your routing configuration

```tsx
import { SettingsPage } from '@/pages/Settings';

// Add to your routes array
{
  path: '/settings',
  element: <SettingsPage />,
  // Add requiresAuth: true if needed
}
```

## 🧪 Testing the System

### Test 1: Browser Notification Permission
1. Open your app
2. Look for the notification badge in the header
3. Click "Enable" or "Turn On Notifications"
4. Browser should prompt for permission
5. Click "Allow"

### Test 2: Manual Notification
1. Open browser DevTools console
2. Run this code:
```javascript
// Get the notification service
const { sendNotification } = window.__notificationService || {};
sendNotification({
  title: '✅ Test Notification',
  options: {
    body: 'Your app is working correctly!',
    icon: '/logo.png'
  }
});
```

### Test 3: Real Email Notification
1. Enable notifications in your app
2. Go to EmailMonitor page
3. Click "Scan now" on any domain
4. Wait for new emails to be detected
5. Browser notification should appear automatically

### Test 4: Real-time Subscription
1. Have the app open in one window
2. In Supabase SQL Editor, insert a test email:
```sql
INSERT INTO email_statuses (
  user_id, publication_domain_id, email_id, sender, 
  subject, received_date, is_new, created_at
) VALUES (
  'YOUR_USER_ID', 
  'YOUR_DOMAIN_ID',
  'test-' || gen_random_uuid()::text,
  'editor@ieee.org',
  'Revision Request for Your Paper',
  NOW(),
  true,
  NOW()
);
```
3. You should see a notification appear immediately in your app

## 🔧 Configuration Options

### Environment Variables (Optional)
Add these to your `.env.local` if needed:

```env
# Logo/icon URLs for notifications
VITE_NOTIFICATION_ICON=/logo.png
VITE_NOTIFICATION_BADGE=/badge.png
```

Then update `notification-service.ts`:
```tsx
const icon = process.env.VITE_NOTIFICATION_ICON || '/logo.png';
const badge = process.env.VITE_NOTIFICATION_BADGE || '/badge.png';
```

### Customize Notification Titles
Edit `generateNotificationTitle()` in `src/lib/notification-service.ts` to customize emoji or titles:

```tsx
case 'acceptance':
  return '🎉 Congrats! Paper Accepted!'; // Customize here
```

## 🐛 Debugging

### Enable Debug Logging
Add this to your app initialization:

```tsx
// src/main.tsx or src/index.tsx
if (process.env.NODE_ENV === 'development') {
  window.__notificationDebug = true;
  console.log('Notification debug mode enabled');
}
```

Then check browser console for detailed logs.

### Check Notification State
In browser console:
```javascript
// Check if notifications are supported
'Notification' in window

// Check current permission
Notification.permission

// Check localStorage settings
JSON.parse(localStorage.getItem('notification-settings'))
```

### Monitor Real-time Connection
In browser DevTools Network tab, look for:
- WebSocket connection to Supabase
- Messages with topic `email_updates_*`

## 📱 User Guide

### For End Users

1. **Enabling Notifications**
   - Click the bell icon in the top header
   - Click "Enable" or "Turn On Notifications"
   - Approve the browser permission prompt
   - Done! You'll receive notifications for new emails

2. **Configuring Notifications**
   - Go to Settings page
   - Adjust preferences:
     - Sound notifications on/off
     - Urgent emails only
     - Action-required only
   - Changes save automatically

3. **Receiving Notifications**
   - When a new email arrives, you'll see a browser notification
   - Click it to view the email in EmailMonitor
   - Dismiss it to close

## ⚡ Performance Tips

1. **Reduce Notification Spam**
   - Enable "Urgent Only" filter
   - Enable "Action Required Only" filter

2. **Save Battery (Mobile)**
   - Disable sound notifications
   - App can be minimized/closed

3. **Optimize for Multiple Tabs**
   - Only open one EmailMonitor tab
   - Notifications work per-user, so duplication won't happen

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No notifications appearing | Check permission status, ensure tab is active |
| Notifications appear but no sound | Check "Sound" toggle in settings |
| Permission denied error | Clear site data in browser, try again |
| Real-time notifications not working | Verify Supabase RLS policies, check network |
| Too many notifications | Enable filtering in settings |

## 📚 Additional Resources

- [Notification API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Browser Permissions](https://developer.mozilla.org/en-US/docs/Web/API/Permissions)
- See `NOTIFICATION_SYSTEM.md` for detailed API reference

## ✨ Next Steps

After integration:
1. Test thoroughly across browsers and devices
2. Gather user feedback on notification preferences
3. Consider additional filtering options
4. Plan for analytics and engagement tracking
5. Explore service worker for offline notifications

---

**Last Updated**: April 2026
**Version**: 1.0.0
