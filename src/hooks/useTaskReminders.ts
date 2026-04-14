import { useEffect, useRef } from 'react';
import type { Task } from '@/lib/store';
import { LocalNotifications } from '@capacitor/local-notifications';

async function requestNotificationPermission() {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display === 'prompt' || perm.display === 'default') {
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
      // 1. Cancel all existing notifications to prevent duplicates
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }

      // 2. Schedule new notifications for incomplete tasks with reminder times
      const now = new Date();
      const notificationsToSchedule = [];

      for (const task of tasks) {
        if (!task.reminderTime || task.completed) continue;

        const [hours, minutes] = task.reminderTime.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        // If time has already passed today, schedule for tomorrow
        if (scheduledTime.getTime() <= now.getTime()) {
          scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        notificationsToSchedule.push({
          title: '⏰ Easy Flow Reminder',
          body: task.notificationMessage || `Time for: ${task.title}`,
          id: Math.abs(task.id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)), // Generate numeric ID from task GUID
          schedule: { at: scheduledTime },
          sound: 'alarm_sound.wav', // We can configure custom sound later if needed
          extra: { taskId: task.id },
        });
      }

      if (notificationsToSchedule.length > 0) {
        try {
          await LocalNotifications.schedule({
            notifications: notificationsToSchedule
          });
          console.log(`Scheduled ${notificationsToSchedule.length} notifications.`);
        } catch (e) {
          console.error('Failed to schedule notifications:', e);
        }
      }
    };

    syncNotifications();
  }, [tasks]);
}

