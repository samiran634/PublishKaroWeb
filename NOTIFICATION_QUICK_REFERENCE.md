# Email Notification System - Quick Reference

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Your React App                       │
│            (src/app.tsx - NotificationProvider)         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌────────────┐ ┌─────────────┐ ┌──────────────┐
   │ NotificationBadge  │ NotificationSettings │ │ EmailMonitor │
   │   (Header)         │   (Settings page)    │ │  (Page)      │
   └────────────┘ └─────────────┘ └──────────────┘
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ useNotifications Hook    │
        │ (src/hooks)              │
        └────────────┬─────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ NotificationContext      │
        │ (src/contexts)           │
        └────────────┬─────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌────────────┐
    │Browser   │ │Supabase  │ │Classifying │
    │API       │ │Realtime  │ │Email       │
    │(notify)  │ │(listen)  │ │Alerts      │
    └──────────┘ └──────────┘ └────────────┘
```

## 📊 Data Flow for Email Notifications

```
┌─────────────────────┐
│  New Email Arrives  │
│  in User's Inbox    │
└──────────┬──────────┘
           │
           ▼
┌──────────────────────┐
│ Edge Function scans  │
│ email_statuses table │
│ (inserts new email)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Supabase Realtime    │
│ detects INSERT event │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ NotificationContext  │
│ receives event       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Classify Email Alert │
│ (priority, type)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Check User Settings  │
│ (enabled, filters)   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Format Notification  │
│ (title, body, icon)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Send Browser Push    │
│ Notification         │
└──────────────────────┘
           │
           ├─ Play Sound? ──┐
           │                ▼
           │          ┌─────────────┐
           │          │Audio Context│
           │          └─────────────┘
           │
           └─ User Clicks ──┐
                           ▼
                   ┌───────────────┐
                   │Open Email in  │
                   │EmailMonitor   │
                   └───────────────┘
```

## 🔌 Integration Points

### 1. App Initialization (Already Done)
```tsx
// src/app.tsx
<NotificationProvider>
  <App />
</NotificationProvider>
```

### 2. Add Header Badge (TODO)
```tsx
// Add to src/components/layouts/MainLayout.tsx or header component
import { NotificationBadge } from '@/components/NotificationBadge';

<NotificationBadge compact={true} />
```

### 3. Add Settings UI (TODO)
```tsx
// Create or update settings page
import { NotificationSettings } from '@/components/NotificationSettings';

<NotificationSettings />
```

### 4. Add Email Auto-Notifier (TODO)
```tsx
// src/pages/EmailMonitor.tsx
import { EmailNotificationHandler } from '@/components/EmailNotificationHandler';

<EmailNotificationHandler emailStatuses={emailStatuses} />
```

## 🎯 Component Responsibility

| Component | Purpose | Location |
|-----------|---------|----------|
| **NotificationContext** | State management + Realtime subscriptions | Context layer |
| **useNotifications** | Hook for component access | Hook layer |
| **NotificationBadge** | Quick toggle button | Header |
| **NotificationSettings** | Full settings management | Settings page |
| **EmailNotificationHandler** | Auto-send notifications | Monitoring page |
| **notification-service** | Browser API wrapper | Library |

## 🔑 Key Functions Reference

```tsx
// Enable notifications
await enableNotifications()

// Disable notifications  
disableNotifications()

// Show notification manually
showNotification(email)

// Check if supported
isNotificationSupported()

// Request permission
await requestNotificationPermission()

// Send custom notification
sendNotification({ title, options })

// Play sound
playNotificationSound(priority)

// Manage settings
saveNotificationSettings(settings)
getNotificationSettings()
```

## 📱 User Experience Flow

```
1. User opens app
   │
   ├─ See notification badge in header
   │
2. Click badge → see "Enable" button
   │
3. Click "Enable" 
   │
4. Browser prompts for permission
   │
5. User clicks "Allow"
   │
6. Badge changes color ✅
   │
7. New emails trigger notifications
   │
8. Click notification → opens EmailMonitor
   │
9. Go to Settings to customize filters
   │
   ├─ Urgent only
   ├─ Action required only
   └─ Sound on/off
```

## 🎨 Notification Appearance

### Urgent Email
```
Title: 📅 Camera-Ready Deadline
Body: From: editor@conference.org
      Paper due in 7 days - URGENT
Icon: Your app logo
Actions: [View] [Dismiss]
```

### High Priority
```
Title: ✏️ Revision Request
Body: From: reviewer@journal.org
      Please revise and resubmit
Icon: Your app logo
Actions: [View] [Dismiss]
```

### Normal Priority
```
Title: 📧 Publication Update
Body: From: system@publisher.org
      Status update on your submission
Icon: Your app logo
Actions: [View] [Dismiss]
```

## 🔒 Security Model

```
┌─────────────────────────────┐
│  User Permission Layer      │
│  (Browser prompt)           │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Authentication Layer       │
│  (Supabase Auth)            │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  RLS Policies Layer         │
│  (Row Level Security)       │
│  User can only see own      │
│  email_statuses             │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Notification Delivery      │
│  (Browser API)              │
└─────────────────────────────┘
```

## 💾 LocalStorage Data

```javascript
// Persisted notification settings
{
  "notification-settings": {
    "enabled": true,
    "sound": true,
    "urgentOnly": false,
    "actionRequiredOnly": false
  }
}
```

## 🌐 Browser API Usage

```javascript
// Notification API
- Notification.permission  // Check status
- Notification.requestPermission()  // Request access
- new Notification(title, options)  // Send notification

// Audio Context (for sounds)
- AudioContext / webkitAudioContext
- OscillatorNode for different pitches

// LocalStorage
- localStorage.setItem()
- localStorage.getItem()

// Supabase Realtime
- supabase.channel(topic)
- .on('postgres_changes', ...)
- .subscribe()
```

## 🚀 Deployment Checklist

- [ ] All components created ✅
- [ ] App.tsx updated with provider ✅
- [ ] Add NotificationBadge to header
- [ ] Add NotificationSettings to settings page
- [ ] Add EmailNotificationHandler to monitor
- [ ] Test in Chrome/Firefox/Safari/Edge
- [ ] Test permissions on clean browser
- [ ] Test real-time with live email
- [ ] Verify RLS policies on Supabase
- [ ] Test on mobile device
- [ ] Update user documentation
- [ ] Gather user feedback

## 📞 Support Commands

```bash
# Check notification support
console: 'Notification' in window

# Check permission
console: Notification.permission

# Check settings
console: JSON.parse(localStorage.getItem('notification-settings'))

# Test notification
# See NOTIFICATION_SYSTEM.md for test procedure

# View real-time connection
# DevTools Network tab → WebSocket to api.supabase.co
```

---

**Status**: ✅ Ready for Integration  
**Version**: 1.0.0  
**Last Updated**: April 28, 2026
