/**
 * Notification Settings Component
 * UI for managing email notification preferences
 */

import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  getNotificationPermission,
  getNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from '@/lib/notification-service';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationSettings() {
  const { isSupported, hasPermission, isEnabled, isLoading, enableNotifications, disableNotifications } =
    useNotifications();

  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const permission = getNotificationPermission();
    if (permission === 'denied') {
      toast.info(
        'Notification permissions were denied. You can enable them in your browser settings.',
        { duration: 5000 }
      );
    }
  }, []);

  const handleEnableNotifications = async () => {
    try {
      await enableNotifications();
      setSettings((prev) => ({ ...prev, enabled: true }));
      toast.success('Notifications enabled');
    } catch (error) {
      toast.error('Failed to enable notifications');
    }
  };

  const handleDisableNotifications = () => {
    disableNotifications();
    setSettings((prev) => ({ ...prev, enabled: false }));
    toast.success('Notifications disabled');
  };

  const handleSettingChange = async (key: keyof NotificationSettings, value: boolean) => {
    setIsSaving(true);
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      saveNotificationSettings(newSettings);
      toast.success('Settings updated');
    } catch (error) {
      toast.error('Failed to save settings');
      setSettings(settings); // Revert on error
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Notifications are not supported in your browser. Please use a modern browser like Chrome, Firefox, or
            Edge.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Email Notifications
        </CardTitle>
        <CardDescription>
          Receive real-time alerts for important publication emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {isEnabled ? (
              <Bell className="h-5 w-5 text-green-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">
                {isEnabled ? 'Notifications Enabled' : 'Notifications Disabled'}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasPermission
                  ? isEnabled
                    ? 'You will receive browser notifications for new emails'
                    : 'Enable to start receiving notifications'
                  : 'Permission denied - enable in browser settings'}
              </p>
            </div>
          </div>
          {!isEnabled && hasPermission ? (
            <Button onClick={handleEnableNotifications} loading={isLoading} size="sm">
              Enable
            </Button>
          ) : isEnabled ? (
            <Button onClick={handleDisableNotifications} variant="outline" size="sm">
              Disable
            </Button>
          ) : (
            <Button disabled size="sm">
              Denied
            </Button>
          )}
        </div>

        {/* Settings */}
        {isEnabled && (
          <div className="space-y-4 rounded-lg bg-slate-50 p-4">
            {/* Sound toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-toggle" className="flex cursor-pointer items-center gap-3">
                {settings.sound ? (
                  <Volume2 className="h-5 w-5 text-blue-500" />
                ) : (
                  <VolumeX className="h-5 w-5 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">Sound Notifications</p>
                  <p className="text-sm text-muted-foreground">Play sound on new email</p>
                </div>
              </Label>
              <Checkbox
                id="sound-toggle"
                checked={settings.sound}
                onCheckedChange={(checked) => handleSettingChange('sound', checked as boolean)}
                disabled={isSaving}
              />
            </div>

            {/* Urgent only toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="urgent-toggle" className="flex cursor-pointer items-center gap-3">
                <div>
                  <p className="font-medium">Urgent Only</p>
                  <p className="text-sm text-muted-foreground">Only notify for urgent emails</p>
                </div>
              </Label>
              <Checkbox
                id="urgent-toggle"
                checked={settings.urgentOnly}
                onCheckedChange={(checked) => handleSettingChange('urgentOnly', checked as boolean)}
                disabled={isSaving}
              />
            </div>

            {/* Action required only toggle */}
            <div className="flex items-center justify-between">
              <Label htmlFor="action-toggle" className="flex cursor-pointer items-center gap-3">
                <div>
                  <p className="font-medium">Action Required Only</p>
                  <p className="text-sm text-muted-foreground">Only notify when action is needed</p>
                </div>
              </Label>
              <Checkbox
                id="action-toggle"
                checked={settings.actionRequiredOnly}
                onCheckedChange={(checked) => handleSettingChange('actionRequiredOnly', checked as boolean)}
                disabled={isSaving}
              />
            </div>
          </div>
        )}

        {/* Info */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <p className="font-medium">💡 Tip</p>
          <p className="mt-1">Keep this tab open to receive notifications. Close it to stop receiving alerts.</p>
        </div>
      </CardContent>
    </Card>
  );
}
