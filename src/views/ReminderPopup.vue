<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useReminder } from '../composable/useReminder'

const { reminderQueue, acknowledgeReminder, checkReminders } = useReminder()
onMounted(async () => {
  // 监听主进程的更新消息
  window.ipcRenderer.on('update-reminders', async () => {
    await checkReminders()
  })
})
onUnmounted(() => {
  window.ipcRenderer.removeAllListeners('update-reminders')
})
</script>

<template>
  <div class="flex flex-col-reverse gap-[18px]">
    <TransitionGroup name="reminder">
      <div
        v-for="reminder in reminderQueue"
        :key="reminder.id"
        class="relative bg-white rounded-2xl shadow-lg p-4 w-[180px] animate-slide-in before:content-[''] before:absolute before:bottom-[-8px] before:left-[30px] before:w-4 before:h-4 before:bg-white before:transform before:rotate-45 before:shadow-lg"
      >
        <div class="flex justify-between items-start mb-2">
          <h3 class="font-medium select-none">{{ reminder.title }}</h3>
          <span
            class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full ml-2"
          >
            {{
              new Date(reminder.reminderTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            }}
          </span>
        </div>

        <p class="text-gray-600 text-sm mb-4 select-none">
          {{ reminder.description || '&#8203;' }}
        </p>

        <button
          @click="acknowledgeReminder(reminder)"
          class="w-[60px] bg-blue-500 text-white py-1.5 rounded-full text-sm hover:bg-blue-600 transition-colors select-none"
        >
          知道了
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.reminder-enter-active,
.reminder-leave-active {
  transition: all 0.3s ease;
}

.reminder-enter-from,
.reminder-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slideIn 0.3s ease-out;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}
</style>
