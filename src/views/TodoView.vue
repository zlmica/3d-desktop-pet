<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import SubWindowLayout from '../components/SubWindowLayout.vue'
import type { Task } from '../db'
import db from '../db'
import Toast from '../components/Toast.vue'
// 任务列表数据
const tasks = ref<Task[]>([])
// 当前激活的 tab
const activeTab = ref<'list' | 'add'>('list')
// 新任务表单数据
const newTask = ref({
  title: '',
  description: '',
  priority: 'medium' as const,
  dueDate: '',
})

// 初始化加载数据
onMounted(async () => {
  await loadTasks()
})

/**
 * 获取任务的截止状态
 * @param task 任务对象
 * @returns 'overdue' | 'upcoming' | 'normal'
 */
function getDueStatus(task: Task) {
  if (!task.dueDate) return 'normal'
  const now = Date.now()
  const dueDate = new Date(task.dueDate).getTime()

  // 已逾期
  if (dueDate < now && task.status !== 'completed') {
    return 'overdue'
  }
  // 即将到期（24小时内）
  if (dueDate - now < 24 * 60 * 60 * 1000 && task.status !== 'completed') {
    return 'upcoming'
  }
  return 'normal'
}

/**
 * 格式化日期显示
 * @param timestamp 时间戳
 * @returns 格式化后的日期字符串
 */
function formatDate(timestamp: number) {
  const date = new Date(timestamp)
  const now = new Date()

  // 将两个日期都转换为当天 00:00:00 的时间戳来比较天数差异
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const diffDays = Math.floor(
    (dateDay.getTime() - nowDay.getTime()) / (1000 * 60 * 60 * 24)
  )

  if (diffDays === 0) {
    return (
      '今天 ' +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    )
  } else if (diffDays === 1) {
    return (
      '明天 ' +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    )
  } else if (diffDays === -1) {
    return (
      '昨天 ' +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    )
  } else if (diffDays > 1 && diffDays < 7) {
    return (
      `${diffDays}天后 ` +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    )
  } else if (diffDays < -1 && diffDays > -7) {
    return (
      `${-diffDays}天前 ` +
      date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    )
  } else {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

/**
 * 加载所有任务
 */
async function loadTasks() {
  tasks.value = await db.tasks.toArray()
  // 按截止时间和创建时间排序
  tasks.value.sort((a, b) => {
    // 未完成的任务优先
    if (a.status !== b.status) {
      return a.status === 'completed' ? 1 : -1
    }
    // 有截止时间的任务优先
    if (!!a.dueDate !== !!b.dueDate) {
      return a.dueDate ? -1 : 1
    }
    // 按截止时间排序
    if (a.dueDate && b.dueDate) {
      return a.dueDate - b.dueDate
    }
    // 最后按创建时间排序
    return b.createdAt - a.createdAt
  })
}

/**
 * 检查表单是否有效
 */
const isFormValid = computed(() => {
  return newTask.value.title.trim() !== ''
})
const showToast = ref(false)
/**
 * 添加新任务
 */
async function addTask() {
  if (!newTask.value.title.trim()) {
    throw new Error()
  }
  // 检查标题是否重复
  const existingTask = tasks.value.find((t) => t.title === newTask.value.title)
  if (existingTask) {
    showToast.value = true
    throw new Error()
  }

  await db.addTask({
    title: newTask.value.title,
    description: newTask.value.description,
    status: 'pending',
    priority: newTask.value.priority,
    dueDate: newTask.value.dueDate
      ? new Date(newTask.value.dueDate).getTime()
      : undefined,
  })

  // 重置表单
  newTask.value = {
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  }

  await loadTasks()
}

/**
 * 更新任务状态
 */
async function updateTaskStatus(task: Task, newStatus: Task['status']) {
  await db.updateTask(task.id!, { status: newStatus })
  await loadTasks()
}

/**
 * 更新任务优先级
 */
async function updateTaskPriority(task: Task, newPriority: Task['priority']) {
  await db.updateTask(task.id!, { priority: newPriority })
  await loadTasks()
}

/**
 * 删除任务
 */
async function deleteTask(taskId: string) {
  if (confirm('确定要删除这个任务吗？')) {
    await db.tasks.delete(taskId)
    await loadTasks()
  }
}

/**
 * 切换 tab
 */
function switchTab(tab: 'list' | 'add') {
  activeTab.value = tab
}

/**
 * 添加任务后切换到列表视图
 */
async function handleAddTask() {
  if (!isFormValid.value) return
  try {
    await addTask()
    switchTab('list')
  } catch (error) {}
}
</script>

<template>
  <SubWindowLayout title="任务管理">
    <div class="h-full flex flex-col bg-gray-50">
      <!-- Tab 切换 -->
      <div class="flex px-6 pt-6 gap-3 bg-gray-50 border-b border-gray-200">
        <button
          class="px-6 py-3 rounded-t-xl text-sm font-medium transition-all duration-300 ease-in-out"
          :class="[
            activeTab === 'list'
              ? 'bg-white text-green-600 shadow-sm border-t border-x border-gray-200'
              : 'text-gray-600 hover:text-green-600',
          ]"
          @click="switchTab('list')"
        >
          任务列表
        </button>
        <button
          class="px-6 py-3 rounded-t-xl text-sm font-medium transition-all duration-300 ease-in-out"
          :class="[
            activeTab === 'add'
              ? 'bg-white text-green-600 shadow-sm border-t border-x border-gray-200'
              : 'text-gray-600 hover:text-green-600',
          ]"
          @click="switchTab('add')"
        >
          添加任务
        </button>
      </div>

      <!-- 任务列表 -->
      <div v-show="activeTab === 'list'" class="flex-1 overflow-y-auto p-6">
        <div class="flex flex-col gap-4">
          <div
            v-for="task in tasks"
            :key="task.id"
            class="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-300"
            :class="[
              task.priority === 'high' ? 'border-l-4 border-l-red-500' : '',
              task.priority === 'medium'
                ? 'border-l-4 border-l-orange-500'
                : '',
              task.priority === 'low' ? 'border-l-4 border-l-green-500' : '',
              task.status === 'completed' ? 'opacity-75 bg-gray-50' : '',
              getDueStatus(task) === 'overdue' ? 'ring-2 ring-red-100' : '',
              getDueStatus(task) === 'upcoming' ? 'ring-2 ring-orange-100' : '',
            ]"
          >
            <!-- 任务头部 -->
            <div class="flex justify-between items-start gap-5">
              <div class="flex items-center gap-3 flex-1">
                <h4
                  class="font-medium text-gray-900"
                  :class="{
                    'line-through text-gray-500': task.status === 'completed',
                  }"
                >
                  {{ task.title }}
                </h4>
                <div
                  v-if="task.dueDate"
                  class="text-xs px-3 py-1 rounded-full font-medium"
                  :class="[
                    getDueStatus(task) === 'overdue'
                      ? 'bg-red-100 text-red-700'
                      : '',
                    getDueStatus(task) === 'upcoming'
                      ? 'bg-orange-100 text-orange-700'
                      : '',
                    getDueStatus(task) === 'normal'
                      ? 'bg-gray-100 text-gray-700'
                      : '',
                  ]"
                >
                  {{ formatDate(task.dueDate) }}
                </div>
              </div>

              <!-- 任务操作 -->
              <div class="flex items-center gap-3">
                <select
                  :value="task.status"
                  @change="
                    updateTaskStatus(
                      task,
                      ($event.target as HTMLSelectElement)
                        ?.value as Task['status']
                    )
                  "
                  class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <option value="pending">待处理</option>
                  <option value="in-progress">进行中</option>
                  <option value="completed">已完成</option>
                </select>
                <select
                  :value="task.priority"
                  @change="
                    updateTaskPriority(
                      task,
                      ($event.target as HTMLSelectElement)
                        .value as Task['priority']
                    )
                  "
                  class="px-3 py-1.5 rounded-lg border border-gray-200 text-sm bg-gray-50 hover:bg-gray-100 transition-colors duration-200"
                >
                  <option value="low">低优先级</option>
                  <option value="medium">中优先级</option>
                  <option value="high">高优先级</option>
                </select>
                <button
                  @click="deleteTask(task.id!)"
                  class="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition-colors duration-200"
                >
                  删除
                </button>
              </div>
            </div>

            <p class="text-gray-600 my-3 text-sm">{{ task.description }}</p>
            <div class="text-xs text-gray-400">
              创建于: {{ new Date(task.createdAt).toLocaleString() }}
            </div>
          </div>
        </div>
        <div v-if="tasks.length === 0" class="text-center text-gray-500 mt-8">
          <div class="text-4xl mb-3">📝</div>
          <p>你还没有任务哦，快去添加一个吧！</p>
        </div>
      </div>

      <!-- 添加任务表单 -->
      <div v-show="activeTab === 'add'" class="flex-1 overflow-y-auto p-6">
        <div class="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm">
          <div class="space-y-6">
            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">任务标题</label>
              <input
                v-model="newTask.title"
                type="text"
                placeholder="请输入任务标题"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">任务描述</label>
              <textarea
                v-model="newTask.description"
                placeholder="请输入任务描述"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 min-h-[100px]"
              ></textarea>
            </div>
            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">优先级</label>
              <select
                v-model="newTask.priority"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              >
                <option value="low">低优先级</option>
                <option value="medium">中优先级</option>
                <option value="high">高优先级</option>
              </select>
            </div>
            <div class="flex flex-col gap-2">
              <label class="font-medium text-gray-700">截止时间</label>
              <input
                v-model="newTask.dueDate"
                type="datetime-local"
                class="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              @click="handleAddTask"
              :disabled="!isFormValid"
              class="w-full py-3 rounded-lg text-base font-medium transition-all duration-300"
              :class="[
                isFormValid
                  ? 'bg-green-500 text-white hover:bg-green-600 shadow-sm hover:shadow-md'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              ]"
            >
              添加任务
            </button>
          </div>
        </div>
      </div>
    </div>
    <Toast
      message="任务标题已存在，请使用不同的标题"
      type="warning"
      v-model="showToast"
    />
  </SubWindowLayout>
</template>

<style scoped>
/* 只保留滚动条相关样式，其他都用 Tailwind 类替代 */
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
