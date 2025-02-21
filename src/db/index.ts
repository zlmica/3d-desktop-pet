import Dexie, { Table } from 'dexie'

/**
 * 任务接口定义
 * @interface Task
 * @property {string} [id] - 唯一标识符
 * @property {string} title - 任务标题
 * @property {string} [description] - 任务描述
 * @property {'pending' | 'in-progress' | 'completed'} status - 任务状态
 * @property {'low' | 'medium' | 'high'} priority - 任务优先级
 * @property {number} createdAt - 创建时间戳
 * @property {number} updatedAt - 更新时间戳
 * @property {number} [dueDate] - 截止日期时间戳
 */
export interface Task {
  id?: string
  title: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed'
  priority: 'low' | 'medium' | 'high'
  createdAt: number
  updatedAt: number
  dueDate?: number
}

/**
 * 重复类型枚举
 */
export enum RepeatType {
  NONE = 'none', // 不重复
  CUSTOM = 'custom', // 自定义间隔（分钟）
  DAILY = 'daily', // 每天
}

/**
 * 提醒事项接口定义
 * @interface Reminder
 * @property {string} [id] - 唯一标识符
 * @property {string} title - 提醒标题
 * @property {string} [description] - 提醒描述
 * @property {boolean} isEnabled - 提醒是否启用
 * @property {RepeatType} repeatType - 重复类型
 * @property {string} reminderTime - 提醒时间
 * @property {number} [lastAcknowledgedAt] - 上次确认时间
 * @property {number} [customInterval] - 自定义重复间隔（分钟）
 * @property {string} [dailyTime] - 每天重复的时间 (HH:mm 格式)
 * @property {number} createdAt - 创建时间戳
 * @property {number} updatedAt - 更新时间戳
 */
export interface Reminder {
  id?: string
  title: string
  description?: string
  isEnabled: boolean
  repeatType: RepeatType
  reminderTime: string
  lastAcknowledgedAt?: number
  customInterval?: number
  dailyTime?: string
  createdAt: number
  updatedAt: number
}

/**
 * 宠物应用数据库类
 * @class PetAppDB
 * @extends Dexie
 */
class PetAppDB extends Dexie {
  tasks!: Table<Task>
  reminders!: Table<Reminder>

  constructor() {
    super('petApp')

    // 定义数据库表结构和索引
    this.version(1).stores({
      tasks: '++id, title, status, priority, createdAt, updatedAt, dueDate',
      reminders:
        '++id, title, reminderTime, repeatType, isEnabled, lastAcknowledgedAt, createdAt',
    })
  }

  /**
   * 添加任务
   * @param {Omit<Task, 'id' | 'createdAt' | 'updatedAt'>} task - 任务数据
   * @returns {Promise<string>} 返回新增任务的ID
   */
  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) {
    const timestamp = Date.now()
    return await this.tasks.add({
      ...task,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  /**
   * 更新任务
   * @param {string} id - 任务ID
   * @param {Partial<Omit<Task, 'id' | 'createdAt'>>} changes - 更新的字段
   * @returns {Promise<number>} 返回更新的记录数
   */
  async updateTask(
    id: string,
    changes: Partial<Omit<Task, 'id' | 'createdAt'>>
  ) {
    return await this.tasks.update(id, {
      ...changes,
      updatedAt: Date.now(),
    })
  }

  /**
   * 添加提醒
   * @param {Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>} reminder - 提醒数据
   * @returns {Promise<string>} 返回新增提醒的ID
   */
  async addReminder(
    reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>
  ) {
    const timestamp = Date.now()
    return await this.reminders.add({
      ...reminder,
      lastAcknowledgedAt: undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
  }

  /**
   * 检查并返回所有需要提醒的项目
   * @returns {Promise<Reminder[]>} 返回需要提醒的项目列表
   */
  async checkReminders(): Promise<Reminder[]> {
    const now = new Date()

    return await this.reminders
      .filter((reminder) => reminder.isEnabled)
      .filter((reminder) => {
        const reminderTime = new Date(reminder.reminderTime)

        if (reminder.lastAcknowledgedAt) {
          const lastAcknowledged = new Date(reminder.lastAcknowledgedAt)
          return reminderTime <= now && lastAcknowledged < reminderTime
        }

        return reminderTime <= now
      })
      .toArray()
  }

  /**
   * 确认提醒
   */
  async acknowledgeReminder(id: string) {
    const reminder = await this.reminders.get(id)
    if (!reminder) return 0

    const now = new Date()
    let reminderTime: string | undefined
    let isEnabled: boolean = true

    // 根据重复类型计算下一次提醒时间
    switch (reminder.repeatType) {
      case RepeatType.DAILY:
        if (reminder.dailyTime) {
          const next = new Date(now)
          next.setDate(next.getDate() + 1)
          const [hours, minutes] = reminder.dailyTime.split(':')
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0)
          reminderTime = next.toISOString()
        }
        break
      case RepeatType.CUSTOM:
        if (reminder.customInterval) {
          const next = new Date(now.getTime() + reminder.customInterval * 60000)
          reminderTime = next.toISOString()
        }
        break
      default:
        isEnabled = false
        reminderTime = reminder.reminderTime
    }

    return await this.reminders.update(id, {
      lastAcknowledgedAt: Date.now(),
      reminderTime,
      isEnabled,
      updatedAt: Date.now(),
    })
  }

  /**
   * 切换提醒开关
   * @param {string} id - 提醒ID
   * @param {boolean} enabled - 是否启用
   * @returns {Promise<number>} 返回更新的记录数
   */
  async toggleReminder(id: string, enabled: boolean) {
    return await this.reminders.update(id, {
      isEnabled: enabled,
      updatedAt: Date.now(),
    })
  }

  /**
   * 导出所有数据
   * @returns {Promise<Object>} 返回所有表的数据
   */
  async exportData() {
    return {
      tasks: await this.tasks.toArray(),
      reminders: await this.reminders.toArray(),
    }
  }

  /**
   * 导入数据
   * @param {Object} data - 要导入的数据对象
   * @param {Task[]} [data.tasks] - 任务数据
   * @param {Reminder[]} [data.reminders] - 提醒数据
   */
  async importData(data: { tasks?: Task[]; reminders?: Reminder[] }) {
    await this.transaction('rw', [this.tasks, this.reminders], async () => {
      // 清除现有数据
      await Promise.all([this.tasks.clear(), this.reminders.clear()])

      // 导入新数据
      if (data.tasks?.length) await this.tasks.bulkAdd(data.tasks)
      if (data.reminders?.length) await this.reminders.bulkAdd(data.reminders)
    })
  }
}

// 创建数据库实例
const db = new PetAppDB()

export default db
