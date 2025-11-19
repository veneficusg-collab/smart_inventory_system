export class NotificationManager {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(notification) {
    this.listeners.forEach(listener => listener(notification));
  }
}

export const notificationManager = new NotificationManager();