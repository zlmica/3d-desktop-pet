<script setup lang="ts">
import { OrbitControls } from '@tresjs/cientos'
import { TresCanvas } from '@tresjs/core'
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import ButtonIcon from '../components/ButtonIcon.vue'
import ContextMenu from '../components/ContextMenu.vue'
import Pet from '../components/Pet3D.vue'
import { useModel } from '../composable/useModel'
import { useReminder } from '../composable/useReminder'
import { useEditModel } from '../composable/useEditModel'
import { useTres } from '../composable/useTres'

const { checkReminders } = useReminder()
const {
  clickActionPlayMessage,
  url: currentModelUrl,
  updateActions: updateModelActions,
  loopAction,
  clickAction,
} = useModel()
const { isEdit, closeEditModel } = useEditModel()
const { gl, light, camera, ambientLight } = useTres()

const modelUpdateKey = ref(Date.now())

const showContextMenu = ref(false)
const handleContextMenu = (event: MouseEvent) => {
  event.preventDefault()
  showContextMenu.value = !showContextMenu.value
}

// 点击其他地方关闭菜单
const closeContextMenu = () => {
  showContextMenu.value = false
}

const handleClick = () => {
  if (showContextMenu.value) {
    showContextMenu.value = false
  } else {
    clickActionPlayMessage()
  }
}

// 定时器
let timer: number | null = null

const handleCloseEditWindow = () => {
  closeEditModel()
}

const handleModelUrlChanged = async (_: unknown, newUrl: string) => {
  if (newUrl !== currentModelUrl.value) {
    currentModelUrl.value = newUrl
    modelUpdateKey.value = Date.now()
  }
}
const sceneUpdateKey = ref(Date.now())
const handleSceneSettingsChanged = async (_: unknown, settings: any) => {
  // 确保所有设置值都存在
  // 直射光更新
  light.value.intensity = settings.directLight.intensity
  light.value.color = settings.directLight.color
  light.value.position.set(
    settings.directLight.position.x,
    settings.directLight.position.y,
    settings.directLight.position.z
  )

  // 环境光更新
  ambientLight.value.intensity = settings.ambientLight.intensity
  ambientLight.value.color = settings.ambientLight.color

  // 相机更新
  camera.value.position.set(
    settings.camera.position.x,
    settings.camera.position.y,
    settings.camera.position.z
  )

  // 强制更新
  camera.value = {
    ...camera.value,
    position: camera.value.position,
  }
  light.value = {
    ...light.value,
    position: light.value.position,
  }
  ambientLight.value = { ...ambientLight.value }
  await nextTick()
  // 强制更新场景
  sceneUpdateKey.value = Date.now()
}

const handleModelActionLoopChanged = async (_: unknown, action: any) => {
  loopAction.value.action = action.action
  loopAction.value.isLoop = action.isLoop
  await nextTick()
  modelUpdateKey.value = Date.now()
}

const handleModelActionClickChanged = async (_: unknown, action: any) => {
  clickAction.value.action = action.action
  clickAction.value.isEnable = action.isEnable
  await nextTick()
  modelUpdateKey.value = Date.now()
}
const loaded = ref(false)

// 读配置
const readConfig = async () => {
  const config = await window.ipcRenderer.invoke('get-settings')
  if (!config) {
    loaded.value = true
    return
  }
  console.log(config)
  // 直射光更新
  light.value.intensity = config.lighting.directLight.intensity
  light.value.color = config.lighting.directLight.color
  light.value.position.set(
    config.lighting.directLight.position.x,
    config.lighting.directLight.position.y,
    config.lighting.directLight.position.z
  )
  // 环境光更新
  ambientLight.value.intensity = config.lighting.ambientLight.intensity
  ambientLight.value.color = config.lighting.ambientLight.color
  // 相机更新
  camera.value.position.set(
    config.camera.position.x,
    config.camera.position.y,
    config.camera.position.z
  )
  // 强制更新
  camera.value = {
    ...camera.value,
    position: camera.value.position,
  }
  light.value = {
    ...light.value,
    position: light.value.position,
  }
  ambientLight.value = { ...ambientLight.value }
  // 模型更新
  currentModelUrl.value = config.model.url
  loopAction.value.action = config.animations.loop.action
  loopAction.value.isLoop = config.animations.loop.isLoop
  clickAction.value.action = config.animations.click.action
  clickAction.value.isEnable = config.animations.click.isEnable
  modelUpdateKey.value = Date.now()
  sceneUpdateKey.value = Date.now()
  await nextTick()
  loaded.value = true
}

onMounted(async () => {
  await readConfig()
  // 立即检查一次
  checkReminders()
  // 设置定时检查
  timer = window.setInterval(checkReminders, 5000)

  window.ipcRenderer.on('close-edit-window', handleCloseEditWindow)
  window.ipcRenderer.on('model-url-changed', handleModelUrlChanged)
  window.ipcRenderer.on('scene-settings-changed', handleSceneSettingsChanged)
  window.ipcRenderer.on(
    'model-action-loop-changed',
    handleModelActionLoopChanged
  )
  window.ipcRenderer.on(
    'model-action-click-changed',
    handleModelActionClickChanged
  )
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
  if (window.ipcRenderer) {
    window.ipcRenderer.removeListener(
      'close-edit-window',
      handleCloseEditWindow
    )
    window.ipcRenderer.removeListener(
      'model-url-changed',
      handleModelUrlChanged
    )
    window.ipcRenderer.removeListener(
      'scene-settings-changed',
      handleSceneSettingsChanged
    )
    window.ipcRenderer.removeListener(
      'model-action-loop-changed',
      handleModelActionLoopChanged
    )
    window.ipcRenderer.removeListener(
      'model-action-click-changed',
      handleModelActionClickChanged
    )
  }
})

const updateActions = async (actions: string[]) => {
  updateModelActions(actions)
}
</script>

<template>
  <!-- 主窗口显示宠物模型和右键菜单 -->
  <div @contextmenu="handleContextMenu">
    <div v-show="showContextMenu" class="drag-button">
      <ButtonIcon />
    </div>
    <div
      v-if="!loaded"
      class="fixed inset-0 z-50 flex items-center justify-center"
    >
      <div class="w-10 h-10 bg-gray-200 rounded-full animate-spin"></div>
    </div>
    <TresCanvas v-if="loaded" v-bind="gl" :key="`${sceneUpdateKey}`">
      <TresPerspectiveCamera v-bind="camera" />
      <OrbitControls :enable-zoom="false" :enable-pan="false" />
      <Suspense>
        <TresMesh @click="handleClick" :key="modelUpdateKey">
          <Pet @update:actions="updateActions" />
        </TresMesh>
      </Suspense>
      <TresDirectionalLight v-bind="light" />
      <TresAmbientLight v-bind="ambientLight" />
    </TresCanvas>

    <!-- 添加右键菜单组件 -->
    <ContextMenu v-if="showContextMenu" @close="closeContextMenu" />
    <div
      v-if="isEdit"
      class="fixed inset-0 z-50 border-2 border-red-400 pointer-events-none"
    ></div>
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
