<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SubWindowLayout from '../components/SubWindowLayout.vue'
import type { Reminder } from '../db'
import { RepeatType } from '../db'
import db from '../db'
import Toast from '../components/Toast.vue'
// 提醒列表数据
const reminders = ref<Reminder[]>([])
// 当前激活的 tab
const activeTab = ref<'list' | 'add'>('list')
// 新提醒表单数据
const newReminder = ref({
  title: '',
  description: '',
  isEnabled: true,
  repeatType: 'none' as RepeatType,
  reminderTime: '',
  customInterval: 30,
  dailyTime: '',
})
const showToast = ref(false)
// 重复类型显示文本
const repeatTypeMap = {
  none: '不重复',
  custom: '自定义间隔',
  daily: '每天',
}

onMounted(async () => {
  await loadReminders()
})

/**
 * 格式化时间显示
 */
function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 加载所有提醒
 */
async function loadReminders() {
  reminders.value = await db.reminders.toArray()
  // 按提醒时间和创建时间排序
  reminders.value.sort((a, b) => {
    if (a.reminderTime && b.reminderTime) {
      return (
        new Date(a.reminderTime).getTime() - new Date(b.reminderTime).getTime()
      )
    }
    return b.createdAt - a.createdAt
  })
}

/**
 * 检查提醒表单是否有效
 */
const isFormValid = computed(() => {
  const form = newReminder.value
  const basicFieldsValid = form.title.trim() !== '' && form.reminderTime !== ''

  if (form.repeatType === 'custom') {
    return basicFieldsValid && form.customInterval > 0
  }

  if (form.repeatType === 'daily') {
    return basicFieldsValid && form.dailyTime !== ''
  }

  return basicFieldsValid
})

/**
 * 添加新提醒
 */
async function addReminder() {
  if (!newReminder.value.title.trim() || !newReminder.value.reminderTime) {
    throw new Error()
  }
  // 检查标题是否重复
  const existingReminder = reminders.value.find(
    (r) => r.title === newReminder.value.title
  )
  if (existingReminder) {
    showToast.value = true
    throw new Error()
  }

  const reminderTime = new Date(newReminder.value.reminderTime).getTime()

  await db.addReminder({
    title: newReminder.value.title,
    description: newReminder.value.description,
    isEnabled: newReminder.value.isEnabled,
    repeatType: newReminder.value.repeatType,
    reminderTime: new Date(reminderTime).toISOString(),
    customInterval:
      newReminder.value.repeatType === 'custom'
        ? newReminder.value.customInterval
        : undefined,
    dailyTime:
      newReminder.value.repeatType === 'daily'
        ? newReminder.value.dailyTime
        : undefined,
  })

  // 重置表单
  newReminder.value = {
    title: '',
    description: '',
    isEnabled: true,
    repeatType: 'none' as RepeatType,
    reminderTime: '',
    customInterval: 30,
    dailyTime: '',
  }

  await loadReminders()
}

/**
 * 切换提醒启用状态
 */
async function toggleReminderStatus(reminder: Reminder) {
  await db.toggleReminder(reminder.id!, !reminder.isEnabled)
  await loadReminders()
}

/**
 * 删除提醒
 */
async function deleteReminder(reminderId: string) {
  if (confirm('确定要删除这个提醒吗？')) {
    await db.reminders.delete(reminderId)
    await loadReminders()
  }
}

/**
 * 切换 tab
 */
function switchTab(tab: 'list' | 'add') {
  activeTab.value = tab
}

/**
 * 添加提醒后切换到列表视图
 */
async function handleAddReminder() {
  if (!isFormValid.value) return
  try {
    await addReminder()
    switchTab('list')
  } catch (error) {}
}
const newReminderTime = ref('')
/**
 * 获取最新的提醒时间
 */
async function getLatestReminderTime(reminderId: string) {
  const reminder = await db.reminders.get(reminderId)
  newReminderTime.value = reminder?.reminderTime
    ? formatDateTime(new Date(reminder.reminderTime).getTime())
    : '无'
}
</script>

<template>
  <SubWindowLayout title="提醒管理">
    <div class="h-full flex flex-col bg-gray-50">
      <!-- Tab 切换 -->
      <div class="flex px-6 pt-6 gap-3 bg-gray-50 border-b border-gray-200">
        <button
          class="px-6 py-3 rounded-t-xl text-sm font-medium transition-all duration-300 ease-in-out"
          :class="[
            activeTab === 'list'
              ? 'bg-white text-blue-600 shadow-sm border-t border-x border-gray-200'
              : 'text-gray-600 hover:text-blue-600',
          ]"
          @click="switchTab('list')"
        >
          提醒列表
        </button>
        <button
          class="px-6 py-3 rounded-t-xl text-sm font-medium transition-all duration-300 ease-in-out"
          :class="[
            activeTab === 'add'
              ? 'bg-white text-blue-600 shadow-sm border-t border-x border-gray-200'
              : 'text-gray-600 hover:text-blue-600',
          ]"
          @click="switchTab('add')"
        >
          添加提醒
        </button>
      </div>

      <!-- 提醒列表 -->
      <div v-show="activeTab === 'list'" class="flex-1 overflow-y-auto p-6">
        <div class="flex flex-col gap-4">
          <div
            v-for="reminder in reminders"
            :key="reminder.id"
            class="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300"
            :class="[
              reminder.isEnabled
                ? 'border-l-4 border-l-blue-500'
                : 'border-l-4 border-l-gray-300 opacity-80',
            ]"
          >
            <div class="flex justify-between items-start gap-5">
              <div class="flex items-center gap-3 flex-1">
                <h4 class="font-medium text-gray-900">{{ reminder.title }}</h4>
                <div
                  class="text-xs px-3 py-1 rounded-full font-medium bg-blue-50 text-blue-700"
                >
                  {{ repeatTypeMap[reminder.repeatType] }}
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="flex items-center gap-3">
                <button
                  v-if="reminder.repeatType !== 'none'"
                  @click="toggleReminderStatus(reminder)"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200"
                  :class="
                    reminder.isEnabled
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  "
                >
                  {{ reminder.isEnabled ? '禁用' : '启用' }}
                </button>
                <button
                  @click="deleteReminder(reminder.id!)"
                  class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors duration-200"
                >
                  删除
                </button>
              </div>
            </div>

            <p class="text-gray-600 my-3 text-sm">{{ reminder.description }}</p>

            <div class="text-sm text-gray-500 space-y-2">
              <div
                v-if="reminder.repeatType === 'custom'"
                class="flex items-center gap-2"
              >
                <span class="text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </span>
                间隔时间: {{ reminder.customInterval }} 分钟
              </div>
              <div
                v-if="reminder.repeatType === 'daily'"
                class="flex items-center gap-2"
              >
                <span class="text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                每天提醒时间: {{ reminder.dailyTime }}
              </div>
              <div class="flex items-center gap-2">
                <span class="text-gray-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </span>
                下次提醒:
                <span
                  class="relative group cursor-help"
                  @mouseenter="getLatestReminderTime(reminder.id!)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 inline text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div
                    class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-lg z-10"
                  >
                    {{ newReminderTime }}
                    <div
                      class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-gray-800"
                    ></div>
                  </div>
                </span>
              </div>
            </div>
          </div>
        </div>
        <div
          v-if="reminders.length === 0"
          class="text-center text-gray-500 mt-8"
        >
          <div class="text-4xl mb-3">🔔</div>
          <p>还没有添加任何提醒，快去添加一个吧！</p>
        </div>
      </div>

      <!-- 添加提醒表单 -->
      <div v-show="activeTab === 'add'" class="flex-1 overflow-y-auto p-6">
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
          <div class="space-y-6">
            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">提醒标题</label>
              <input
                v-model="newReminder.title"
                type="text"
                placeholder="请输入提醒标题"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">提醒描述</label>
              <textarea
                v-model="newReminder.description"
                placeholder="请输入提醒描述"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 min-h-[100px]"
              ></textarea>
            </div>

            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">重复类型</label>
              <select
                v-model="newReminder.repeatType"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="none">不重复</option>
                <option value="custom">自定义间隔</option>
                <option value="daily">每天</option>
              </select>
            </div>

            <div
              v-if="newReminder.repeatType === 'custom'"
              class="flex flex-col gap-2"
            >
              <label class="font-medium text-gray-700">间隔时间（分钟）</label>
              <input
                v-model="newReminder.customInterval"
                type="number"
                min="1"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div
              v-if="newReminder.repeatType === 'daily'"
              class="flex flex-col gap-2"
            >
              <label class="font-medium text-gray-700">每天提醒时间</label>
              <input
                v-model="newReminder.dailyTime"
                type="time"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">
                {{
                  newReminder.repeatType === 'none'
                    ? '提醒时间'
                    : '首次提醒时间'
                }}
              </label>
              <input
                v-model="newReminder.reminderTime"
                type="datetime-local"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            <button
              @click="handleAddReminder"
              :disabled="!isFormValid"
              class="w-full py-3 rounded-lg text-base font-medium transition-all duration-300"
              :class="[
                isFormValid
                  ? 'bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              ]"
            >
              添加提醒
            </button>
          </div>
        </div>
      </div>
    </div>
    <Toast
      message="提醒标题已存在，请使用不同的标题"
      type="warning"
      v-model="showToast"
    />
  </SubWindowLayout>
</template>

<style scoped>
.tab-content::-webkit-scrollbar {
  @apply w-2;
}

.tab-content::-webkit-scrollbar-track {
  @apply bg-gray-100 rounded;
}

.tab-content::-webkit-scrollbar-thumb {
  @apply bg-gray-400 rounded hover:bg-gray-500;
}
</style>
