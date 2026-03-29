import { useEffect, useRef } from 'react';
import type { Task } from '@/lib/store';

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function vibrate() {
  if ('vibrate' in navigator) {
    navigator.vibrate([500, 200, 500, 200, 1000, 300, 500, 200, 500]);
  }
}

let alarmCtx: AudioContext | null = null;
let alarmStop: (() => void) | null = null;

function playAlarmBurst(ctx: AudioContext, dest: GainNode) {
  const notes = [880, 0, 880, 0, 880, 0, 1100, 0, 1100, 0, 1100];
  const noteLen = 0.15;

  notes.forEach((freq, i) => {
    if (freq === 0) return;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, ctx.currentTime + i * noteLen);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, ctx.currentTime);
    env.gain.setValueAtTime(0.3, ctx.currentTime + i * noteLen);
    env.gain.setValueAtTime(0, ctx.currentTime + (i + 0.8) * noteLen);

    osc.connect(env);
    env.connect(dest);
    osc.start(ctx.currentTime + i * noteLen);
    osc.stop(ctx.currentTime + (i + 1) * noteLen);
  });
}

function playAlarm() {
  try {
    if (!alarmCtx) alarmCtx = new AudioContext();
    const ctx = alarmCtx;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.connect(ctx.destination);

    const notes = [880, 0, 880, 0, 880, 0, 1100, 0, 1100, 0, 1100, 0, 880, 0, 880, 0, 880];
    const noteLen = 0.15;
    const oscillators: OscillatorNode[] = [];

    notes.forEach((freq, i) => {
      if (freq === 0) return;
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + i * noteLen);

      const env = ctx.createGain();
      env.gain.setValueAtTime(0, ctx.currentTime);
      env.gain.setValueAtTime(0.3, ctx.currentTime + i * noteLen);
      env.gain.setValueAtTime(0, ctx.currentTime + (i + 0.8) * noteLen);

      osc.connect(env);
      env.connect(gainNode);
      osc.start(ctx.currentTime + i * noteLen);
      osc.stop(ctx.currentTime + (i + 1) * noteLen);
      oscillators.push(osc);
    });

    const totalDuration = notes.length * noteLen;

    const repeatTimeout1 = setTimeout(() => playAlarmBurst(ctx, gainNode), totalDuration * 1000 + 500);
    const repeatTimeout2 = setTimeout(() => playAlarmBurst(ctx, gainNode), (totalDuration * 2 + 1) * 1000);

    alarmStop = () => {
      clearTimeout(repeatTimeout1);
      clearTimeout(repeatTimeout2);
      oscillators.forEach(o => { try { o.stop(); } catch {} });
      alarmStop = null;
    };

    // Repeat alarm bursts for ~30 seconds total
    const repeats: ReturnType<typeof setTimeout>[] = [];
    for (let r = 0; r < 8; r++) {
      repeats.push(setTimeout(() => playAlarmBurst(ctx, gainNode), (totalDuration + 0.5 + r * 2.5) * 1000));
    }

    alarmStop = () => {
      clearTimeout(repeatTimeout1);
      clearTimeout(repeatTimeout2);
      repeats.forEach(t => clearTimeout(t));
      oscillators.forEach(o => { try { o.stop(); } catch {} });
      alarmStop = null;
    };

    setTimeout(() => { alarmStop?.(); }, 30000);

  } catch (e) {
    console.warn('Could not play alarm:', e);
  }
}

function showNotification(task: Task) {
  vibrate();
  playAlarm();

  if ('Notification' in window && Notification.permission === 'granted') {
    const n = new Notification('⏰ EasyFlow Reminder', {
      body: `Time for: ${task.title}`,
      icon: '/icon-192.png',
      tag: task.id,
      requireInteraction: true,
    });
    setTimeout(() => n.close(), 30000);
  }
}

export function useTaskReminders(tasks: Task[]) {
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      // reminder times are stored in UTC, so compare with UTC
      const currentTimeUTC = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;

      tasks.forEach(task => {
        if (
          task.reminderTime &&
          !task.completed &&
          task.reminderTime === currentTimeUTC &&
          !firedRef.current.has(`${task.id}-${currentTimeUTC}`)
        ) {
          firedRef.current.add(`${task.id}-${currentTimeUTC}`);
          showNotification(task);
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [tasks]);

  useEffect(() => {
    const midnight = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        firedRef.current.clear();
      }
    }, 60000);
    return () => clearInterval(midnight);
  }, []);
}
