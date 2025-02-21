import { ref } from "vue";
import type { Reminder } from "../db";
import db from "../db";

// 当前显示的提醒队列
const reminderQueue = ref<Reminder[]>([]);

export function useReminder() {
  /**
   * 检查是否有需要提醒的事项
   */
  async function checkReminders() {
    const reminders = await db.checkReminders();

    reminderQueue.value = reminders;

    if (reminderQueue.value.length > 0) {
      window.ipcRenderer.send("show-reminder-window");
    }
  }
  /**
   * 确认提醒
   */
  async function acknowledgeReminder(reminder: Reminder) {
    if (!reminder.id) return;
    // 1. 确认提醒
    await db.acknowledgeReminder(reminder.id);
    // 2. 从队列中移除已确认的提醒
    reminderQueue.value = reminderQueue.value.filter(
      (r) => r.id !== reminder.id
    );
    // 3. 如果队列为空，隐藏提醒窗口
    if (reminderQueue.value.length === 0) {
      window.ipcRenderer.send("hide-reminder-window");
    }
  }

  return {
    reminderQueue,
    checkReminders,
    acknowledgeReminder,
  };
}
