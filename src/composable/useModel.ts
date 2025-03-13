import { ref } from 'vue'

// 模型url
const url = ref('rabbit.glb')

// 循环动画
const loopAction = ref({
  action: 'Play',
  isLoop: true,
})

// 是否点击动画
const clickAction = ref({
  action: 'Hello',
  isEnable: true,
})

// 运动通知
const clickActionPlay = ref(false)

export const useModel = () => {
  const clickActionPlayMessage = () => {
    clickActionPlay.value = true
  }

  // 更新模型时通知主进程
  const updateModel = (newUrl: string) => {
    url.value = newUrl
    // 通知主进程，让它广播给所有窗口
    window.ipcRenderer.send('update-model-url', newUrl)
  }

  // 更新动作
  const updateActions = (actions: string[]) => {
    window.ipcRenderer.send('update-model-actions', actions)
  }

  return {
    url,
    loopAction,
    clickAction,
    clickActionPlay,
    clickActionPlayMessage,
    updateModel,
    updateActions,
  }
}
