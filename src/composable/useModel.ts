import { ref } from 'vue'

// 模型url
const url = ref('/public/rabbit.glb?url')

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

  return {
    url,
    loopAction,
    clickAction,
    clickActionPlay,
    clickActionPlayMessage,
  }
}
