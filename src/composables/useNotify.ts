import { ref } from 'vue';

export interface Notification {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

const notifications = ref<Notification[]>([]);
let notificationId = 0;

export function useNotify() {
  const notify = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info',
    duration = 3000
  ) => {
    const id = ++notificationId;
    const notification: Notification = {
      id,
      message,
      type,
      duration,
    };

    // 最多显示2个通知
    if (notifications.value.length >= 2) {
      notifications.value.shift();
    }

    notifications.value.push(notification);

    // 自动移除
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
  };

  const remove = (id: number) => {
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  };

  const success = (message: string, duration?: number) => {
    notify(message, 'success', duration);
  };

  const error = (message: string, duration?: number) => {
    notify(message, 'error', duration);
  };

  const warning = (message: string, duration?: number) => {
    notify(message, 'warning', duration);
  };

  const info = (message: string, duration?: number) => {
    notify(message, 'info', duration);
  };

  return {
    notifications,
    notify,
    remove,
    success,
    error,
    warning,
    info,
  };
}

