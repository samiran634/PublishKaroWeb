/**
 * Notification Badge Component
 * Shows notification status in the UI with enable/disable button
 */

import { Bell, BellOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useNotifications } from '@/hooks/use-notifications';

interface NotificationBadgeProps {
  compact?: boolean;
}

export function NotificationBadge({ compact = false }: NotificationBadgeProps) {
  const { isSupported, isEnabled, isLoading, lastNotification, enableNotifications, disableNotifications } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    try {
      if (isEnabled) {
        disableNotifications();
        toast.success('Notifications turned off');
      } else {
        await enableNotifications();
        toast.success('Notifications enabled');
      }
    } catch (error) {
      toast.error('Failed to update notification settings');
    }
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        loading={isLoading}
        title={isEnabled ? 'Notifications on' : 'Notifications off'}
        className="relative"
      >
        {isEnabled ? (
          <>
            <Bell className="h-5 w-5" />
            <span className="absolute right-0 top-0 flex h-2 w-2 rounded-full bg-green-500" />
          </>
        ) : (
          <BellOff className="h-5 w-5 opacity-50" />
        )}
      </Button>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isEnabled ? 'default' : 'outline'}
          size="sm"
          className="relative"
          loading={isLoading}
        >
          {isEnabled ? (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Notifications On
              <span className="absolute right-2 top-1 flex h-2 w-2 rounded-full bg-white" />
            </>
          ) : (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Notifications Off
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Notification Status</h4>
            <p className="text-sm text-muted-foreground">
              {isEnabled
                ? 'Email notifications are enabled'
                : 'Email notifications are disabled'}
            </p>
          </div>

          {lastNotification && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
              Last notification:{' '}
              {new Date(lastNotification.timestamp).toLocaleTimeString()}
            </div>
          )}

          <Button
            onClick={handleToggle}
            variant={isEnabled ? 'destructive' : 'default'}
            size="sm"
            className="w-full"
            loading={isLoading}
          >
            {isEnabled ? 'Turn Off Notifications' : 'Turn On Notifications'}
          </Button>

          <p className="text-xs text-muted-foreground">
            📌 Go to settings for more options
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
