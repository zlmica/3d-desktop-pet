<script setup>
import { computed } from 'vue'

const props = defineProps({
  isResting: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'exercise'])

const menuItems = computed(() => [
  { id: 'task', label: '添加任务', icon: '🔖' },
  { id: 'reminder', label: '添加提醒', icon: '⏰' },
  {
    id: 'exercise',
    label: props.isResting ? '宠物运动' : '宠物休息',
    icon: props.isResting ? '🏃' : '💤',
  },
  {
    id: 'pet',
    label: '宠物管理',
    icon: '🐶',
  },
  { id: 'exit', label: '退出应用', icon: '👋' },
])

const handleMenuClick = (menuId) => {
  const ipcRenderer = window.ipcRenderer

  switch (menuId) {
    case 'task':
      ipcRenderer.send('open-sub-window', {
        windowId: 'task',
        title: '任务管理',
      })
      break
    case 'reminder':
      ipcRenderer.send('open-sub-window', {
        windowId: 'reminder',
        title: '提醒管理',
      })
      break
    case 'exercise': {
      emit('exercise', !props.isResting ? 'sleep' : 'play')
      break
    }
    case 'pet':
      ipcRenderer.send('open-sub-window', {
        windowId: 'pet',
        title: '宠物管理',
      })
      break
    case 'exit':
      ipcRenderer.send('exit-app')
      break
  }
  emit('close')
}
</script>

<template>
  <div class="fixed z-[1000] right-0.5 top-8">
    <div
      v-for="item in menuItems"
      :key="item.id"
      @click="handleMenuClick(item.id)"
      class="flex items-center justify-center cursor-pointer mt-2 w-6 h-6 rounded-full bg-[#ffffff60] text-[12px] transition-colors duration-200 hover:bg-[#ffffff]"
    >
      <span>{{ item.icon }}</span>
    </div>
  </div>
</template>
