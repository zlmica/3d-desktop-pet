<script setup>
import { TresCanvas } from '@tresjs/core'
import { BasicShadowMap, SRGBColorSpace, NoToneMapping } from 'three'
import { OrbitControls } from '@tresjs/cientos'
import UgglyBunny from '../components/Pet3D.vue'
import ButtonIcon from '../components/ButtonIcon.vue'
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import ContextMenu from '../components/ContextMenu.vue'

import { useReminder } from '../composable/useReminder'
import { watch } from 'vue'
const { checkReminders } = useReminder()

const showContextMenu = ref(false)
const handleContextMenu = (event) => {
  event.preventDefault()
  showContextMenu.value = !showContextMenu.value
}

// 点击其他地方关闭菜单
const closeContextMenu = () => {
  showContextMenu.value = false
}

const gl = {
  shadows: false,
  alpha: true,
  premultipliedAlpha: false,
  antialias: true,
  shadowMapType: BasicShadowMap,
  outputColorSpace: SRGBColorSpace,
  toneMapping: NoToneMapping,
  windowSize: true,
}

const bunnyRef = ref(null)

const handleClick = () => {
  if (showContextMenu.value) {
    showContextMenu.value = false
  } else {
    bunnyRef.value.hello()
  }
}

const isResting = ref(false)

const handleExercise = (status) => {
  isResting.value = status === 'sleep'
  bunnyRef.value.playPause()
}
// 灯光设置 默认
const light = ref({
  color: '#fff',
  position: [0, 4, 3],
  intensity: 1.8,
})

// 定时器
let timer = null

onMounted(() => {
  // 立即检查一次
  checkReminders()
  // 设置定时检查
  timer = window.setInterval(checkReminders, 5000)
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<template>
  <!-- 主窗口显示宠物模型和右键菜单 -->
  <div @contextmenu="handleContextMenu">
    <div v-show="showContextMenu" class="drag-button">
      <ButtonIcon />
    </div>
    <TresCanvas v-bind="gl">
      <TresPerspectiveCamera :position="[0, 0, 4]" />
      <OrbitControls :enable-zoom="false" :enable-pan="false" />
      <Suspense>
        <TresMesh @click="handleClick">
          <UgglyBunny ref="bunnyRef" />
        </TresMesh>
      </Suspense>
      <TresDirectionalLight v-bind="light" />
      <TresAmbientLight :intensity="2" />
    </TresCanvas>

    <!-- 添加右键菜单组件 -->
    <ContextMenu
      v-if="showContextMenu"
      :isResting="isResting"
      @exercise="handleExercise"
      @close="closeContextMenu"
    />
    <!-- <ReminderManager /> -->
  </div>
</template>

<style scoped>
.drag-button {
  position: absolute;
  top: 10px;
  right: 2px;
  width: 24px;
  height: 24px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  -webkit-app-region: drag;
  transition: all 0.3s ease;
}
</style>
