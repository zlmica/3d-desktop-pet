<script setup>
import { computed } from 'vue'

// 添加 props 接收当前状态
const props = defineProps({
  isResting: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'exercise'])

// 使用计算属性来动态生成菜单项
const menuItems = computed(() => [
  { id: 'task', label: '添加任务', icon: '🔖' },
  { id: 'reminder', label: '添加提醒', icon: '⏰' },
  {
    id: 'exercise',
    label: props.isResting ? '宠物运动' : '宠物休息',
    icon: props.isResting ? '🏃' : '💤'
  },
  { id: 'exit', label: '退出应用', icon: '👋' }
])

const handleMenuClick = (menuId) => {
  const ipcRenderer = window.ipcRenderer

  switch (menuId) {
    case 'task':
      ipcRenderer.send('open-sub-window', {
        windowId: 'task',
        title: '任务管理'
      })
      break
    case 'reminder':
      ipcRenderer.send('open-sub-window', {
        windowId: 'reminder',
        title: '提醒管理'
      })
      break
    case 'exercise': {
      emit('exercise', !props.isResting ? 'sleep' : 'play')
      break
    }
    case 'exit':
      ipcRenderer.send('exit-app')
      break
  }
  emit('close')
}
</script>

<template>
  <div class="context-menu" :style="{
    right: `2px`,
    top: `34px`
  }">
    <div v-for="item in menuItems" :key="item.id" @click="handleMenuClick(item.id)" class="menu-item">
      <span>{{ item.icon }}</span>
    </div>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  z-index: 1000;
  max-height: 150px;
  overflow-y: auto;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  margin-top: 10px;
  width: 24px;
  height: 24px;
  background-color: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  font-size: 12px;
  transition: background-color 0.2s;
}

.menu-item:hover {
  background-color: rgba(255, 255, 255, 1);
}


.label {
  font-size: 24px;
}
</style>
