import { useEffect, useRef } from 'react';
import type { Task } from '@/lib/store';
import { LocalNotifications } from '@capacitor/local-notifications';

async function requestNotificationPermission() {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') {
    await LocalNotifications.requestPermissions();
  }
}

export function useTaskReminders(tasks: Task[]) {
  const scheduledRef = useRef<boolean>(false);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const syncNotifications = async () => {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      const now = new Date();
      const notificationsToSchedule = [];

      for (const task of tasks) {
        if (!task.reminderTime || task.completed) continue;

        const [hours, minutes] = task.reminderTime.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime.getTime() <= now.getTime()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        notificationsToSchedule.push({
          title: '⏰ Easy Flow Reminder',
          body: task.notificationMessage || `Time for: ${task.title}`,
          id: Math.abs(task.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)),
          schedule: { at: scheduledTime },
          sound: 'alarm_sound.wav',
          extra: { taskId: task.id },
        });
      }

      if (notificationsToSchedule.length > 0) {
        try {
          await LocalNotifications.schedule({ notifications: notificationsToSchedule });
          console.log(`Scheduled ${notificationsToSchedule.length} notifications.`);
        } catch (e) {
          console.error('Failed to schedule notifications:', e);
        }
      }
    };

    syncNotifications();
  }, [tasks]);
}
