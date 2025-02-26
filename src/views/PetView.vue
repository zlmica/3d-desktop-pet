<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
import { useModel } from '../composable/useModel'
import { useTres } from '../composable/useTres'
import { useDebounceFn as debounce } from '@vueuse/core'

interface ModelInfo {
  name: string
  path: string
  isSystem: boolean // 添加标识是否为系统模型的字段
}

const {
  url: currentModelUrl,
  clickAction,
  loopAction,
  updateModel,
} = useModel()
const modelList = ref<ModelInfo[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)

const { light, camera, ambientLight, setConfig } = useTres()

// 添加一个辅助函数来转换颜色值为十六进制
const toHexColor = (color: any): string => {
  if (typeof color === 'string') return color
  if (typeof color === 'number') {
    return '#' + color.toString(16).padStart(6, '0')
  }
  return '#ffffff' // 默认颜色
}

// 修改 tempSettings 的初始化
const tempSettings = ref({
  directLight: {
    intensity: Number(light.value.intensity),
    color: toHexColor(light.value.color),
    position: {
      x: Number(light.value.position.x),
      y: Number(light.value.position.y),
      z: Number(light.value.position.z),
    },
  },
  ambientLight: {
    intensity: Number(ambientLight.value.intensity),
    color: toHexColor(ambientLight.value.color),
  },
  camera: {
    position: {
      x: Number(camera.value.position.x),
      y: Number(camera.value.position.y),
      z: Number(camera.value.position.z),
    },
  },
})
// 将更新函数包装在 nextTick 中
const updateSettings = () => {
  nextTick(() => {
    // 直射光更新
    light.value.intensity = tempSettings.value.directLight.intensity
    light.value.color = tempSettings.value.directLight.color
    light.value.position.set(
      tempSettings.value.directLight.position.x,
      tempSettings.value.directLight.position.y,
      tempSettings.value.directLight.position.z
    )

    // 环境光更新
    ambientLight.value.intensity = tempSettings.value.ambientLight.intensity
    ambientLight.value.color = tempSettings.value.ambientLight.color

    // 相机更新
    camera.value.position.set(
      tempSettings.value.camera.position.x,
      tempSettings.value.camera.position.y,
      tempSettings.value.camera.position.z
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
  })
  setConfig(tempSettings.value)
}

const debouncedUpdate = debounce(updateSettings, 100)

const updateColor = () => {
  nextTick(() => {
    light.value.color = tempSettings.value.directLight.color
    ambientLight.value.color = tempSettings.value.ambientLight.color

    light.value = { ...light.value }
    ambientLight.value = { ...ambientLight.value }
    setConfig(tempSettings.value)
  })
}

const debouncedUpdateColor = debounce(updateColor, 100)

onMounted(async () => {
  // 从主进程获取模型列表
  const models = await window.ipcRenderer.invoke('get-model-list')
  modelList.value = models
  window.ipcRenderer.on('model-actions-changed', updateActions)

  // 根据当前模型URL找到对应的模型
  if (currentModelUrl.value) {
    const currentModel = modelList.value.find(
      (model) => model.path === currentModelUrl.value
    )
    if (currentModel) {
      // 找到select元素并设置其值
      nextTick(() => {
        const select = document.querySelector(
          'select[name="model-select"]'
        ) as HTMLSelectElement
        if (select) {
          select.value = currentModel.name
        }
      })
    }
  }
})

onUnmounted(() => {
  window.ipcRenderer.removeListener('model-actions-changed', updateActions)
})

const triggerFileInput = () => {
  fileInput.value?.click()
}

const handleFileUpload = async (event: Event) => {
  const files = (event.target as HTMLInputElement).files
  if (!files || files.length === 0) return

  selectedFile.value = files[0]

  try {
    // 发送文件到主进程进行保存
    await window.ipcRenderer.invoke('upload-model', {
      name: selectedFile.value.name,
      path: selectedFile.value.path,
    })

    // 重新获取模型列表
    const models = await window.ipcRenderer.invoke('get-model-list')
    modelList.value = models
  } catch (error) {
    console.error('上传失败:', error)
  } finally {
    // 清空文件输入框，允许重复上传相同文件
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

const selectModel = async (event: Event) => {
  const select = event.target as HTMLSelectElement
  const selectedModel = modelList.value.find(
    (model) => model.name === select.value
  )
  if (!selectedModel) return

  // 清空当前动作列表
  availableAnimations.value = []
  selectedLoopAnimation.value = ''
  selectedClickAnimation.value = ''

  // 更新模型
  updateModel(selectedModel.path)
}

// 在模板中显示数值时进行类型转换
const formatNumber = (num: number) => Number(num).toFixed(1)

// 动作相关的状态
const selectedLoopAnimation = ref('')
const selectedClickAnimation = ref('')
const availableAnimations = ref<string[]>([])

const updateActions = (_: unknown, actions: string[]) => {
  availableAnimations.value = actions

  // 延迟设置动作，确保模型加载完成
  nextTick(() => {
    if (
      loopAction.value &&
      availableAnimations.value.includes(loopAction.value.action)
    ) {
      selectedLoopAnimation.value = loopAction.value.action
    } else {
      selectedLoopAnimation.value = ''
      loopAction.value.isLoop = false
    }

    if (
      clickAction.value &&
      availableAnimations.value.includes(clickAction.value.action)
    ) {
      selectedClickAnimation.value = clickAction.value.action
    } else {
      selectedClickAnimation.value = ''
      clickAction.value.isEnable = false
    }
  })
}

const handleSetLoopAnimation = () => {
  loopAction.value.action = selectedLoopAnimation.value
  loopAction.value.isLoop = selectedLoopAnimation.value === '' ? false : true
  window.ipcRenderer.send('update-model-action-loop', { ...loopAction.value })
}

const handleSetClickAnimation = () => {
  clickAction.value.action = selectedClickAnimation.value
  clickAction.value.isEnable =
    selectedClickAnimation.value === '' ? false : true
  window.ipcRenderer.send('update-model-action-click', {
    ...clickAction.value,
  })
}

const showConfirmDialog = ref(false)

const saveSettings = () => {
  showConfirmDialog.value = true
}

const confirmSave = async () => {
  // 只保存必要的数据
  const settings = {
    lighting: {
      directLight: {
        intensity: tempSettings.value.directLight.intensity,
        color: tempSettings.value.directLight.color,
        position: {
          x: tempSettings.value.directLight.position.x,
          y: tempSettings.value.directLight.position.y,
          z: tempSettings.value.directLight.position.z,
        },
      },
      ambientLight: {
        intensity: tempSettings.value.ambientLight.intensity,
        color: tempSettings.value.ambientLight.color,
      },
    },
    camera: {
      position: {
        x: tempSettings.value.camera.position.x,
        y: tempSettings.value.camera.position.y,
        z: tempSettings.value.camera.position.z,
      },
    },
    model: {
      url: currentModelUrl.value,
    },
    animations: {
      loop: {
        action: loopAction.value.action,
        isLoop: loopAction.value.isLoop,
      },
      click: {
        action: clickAction.value.action,
        isEnable: clickAction.value.isEnable,
      },
    },
  }

  await window.ipcRenderer.invoke('save-settings', settings)
  showConfirmDialog.value = false
  // 重启应用
  window.ipcRenderer.invoke('restart-app')
}
</script>

<template>
  <SubWindowLayout title="宠物管理">
    <!-- 修改控制区域的布局和位置 -->
    <div class="fixed top-4 right-4 z-10 flex flex-col gap-4">
      <!-- 修改原有的上传和选择控件样式 -->
      <div
        class="flex items-center gap-3 bg-white/80 backdrop-blur-sm p-4 rounded-lg"
      >
        <input
          type="file"
          ref="fileInput"
          accept=".glb"
          class="hidden"
          @change="handleFileUpload"
        />
        <button
          @click="triggerFileInput"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 min-w-[100px]"
        >
          上传模型
        </button>
        <select
          name="model-select"
          @change="selectModel"
          class="px-4 py-2 border rounded bg-white min-w-[120px]"
        >
          <option value="" disabled selected>选择模型</option>
          <option
            v-for="model in modelList"
            :key="model.name"
            :value="model.name"
          >
            {{ model.name }}
          </option>
        </select>
      </div>

      <!-- 参数控制面板 -->
      <div class="bg-white/80 backdrop-blur-sm p-4 rounded-lg w-auto">
        <div class="grid grid-cols-3 gap-6">
          <!-- 直射光设置 -->
          <div class="space-y-2">
            <h3 class="font-bold text-sm">直射光</h3>
            <div class="space-y-1">
              <label class="text-sm">颜色</label>
              <input
                type="color"
                v-model="tempSettings.directLight.color"
                @input="debouncedUpdateColor"
                class="w-full h-8"
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm">强度</label>
              <input
                type="range"
                v-model="tempSettings.directLight.intensity"
                min="0"
                max="5"
                step="0.1"
                @input="debouncedUpdate"
                class="w-full"
              />
              <div class="text-xs text-gray-500">
                {{ formatNumber(tempSettings.directLight.intensity) }}
              </div>
            </div>
            <div class="space-y-1">
              <label class="text-sm">位置 X/Y/Z</label>
              <div class="flex gap-2">
                <input
                  v-for="axis in ['x', 'y', 'z'] as const"
                  :key="axis"
                  type="number"
                  v-model="tempSettings.directLight.position[axis]"
                  step="0.1"
                  @input="debouncedUpdate"
                  class="w-full px-2 py-1 border rounded text-sm"
                />
              </div>
            </div>
          </div>

          <!-- 环境光设置 -->
          <div class="space-y-2">
            <h3 class="font-bold text-sm">环境光</h3>
            <div class="space-y-1">
              <label class="text-sm">颜色</label>
              <input
                type="color"
                v-model="tempSettings.ambientLight.color"
                @input="debouncedUpdateColor"
                class="w-full h-8"
              />
            </div>
            <div class="space-y-1">
              <label class="text-sm">强度</label>
              <input
                type="range"
                v-model="tempSettings.ambientLight.intensity"
                min="0"
                max="5"
                step="0.1"
                @input="debouncedUpdate"
                class="w-full"
              />
              <div class="text-xs text-gray-500">
                {{ formatNumber(tempSettings.ambientLight.intensity) }}
              </div>
            </div>
          </div>

          <!-- 相机和动作控制 -->
          <div class="space-y-4">
            <!-- 相机位置设置 -->
            <div class="space-y-2">
              <h3 class="font-bold text-sm">相机位置</h3>
              <div class="space-y-1">
                <label class="text-sm">位置 X/Y/Z</label>
                <div class="flex gap-2">
                  <input
                    v-for="axis in ['x', 'y', 'z'] as const"
                    :key="axis"
                    type="number"
                    v-model="tempSettings.camera.position[axis]"
                    step="0.1"
                    @input="debouncedUpdate"
                    class="w-full px-2 py-1 border rounded text-sm"
                  />
                </div>
              </div>
            </div>

            <!-- 动作控制部分 -->
            <div class="space-y-2">
              <h3 class="font-bold text-sm">动作控制</h3>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <select
                    v-model="selectedLoopAnimation"
                    class="flex-1 px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="">无动作</option>
                    <option
                      v-for="anim in availableAnimations"
                      :key="anim"
                      :value="anim"
                    >
                      {{ anim }}
                    </option>
                  </select>
                  <button
                    @click="handleSetLoopAnimation"
                    class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                  >
                    设为循环
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <select
                    v-model="selectedClickAnimation"
                    class="flex-1 px-2 py-1.5 border rounded text-sm"
                  >
                    <option value="">无动作</option>
                    <option
                      v-for="anim in availableAnimations"
                      :key="anim"
                      :value="anim"
                    >
                      {{ anim }}
                    </option>
                  </select>
                  <button
                    @click="handleSetClickAnimation"
                    class="px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                  >
                    设为点击
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <button
        @click="saveSettings"
        class="w-[120px] mx-auto py-2 bg-blue-500 text-white rounded hover:bg-blue-600 min-w-[100px]"
      >
        保存设置
      </button>
    </div>

    <!-- 确认对话框 -->
    <div
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-lg p-6 w-80 space-y-4">
        <h3 class="text-lg font-bold">确认保存</h3>
        <p class="text-gray-600">保存设置后需要重启应用才能生效，是否继续？</p>
        <div class="flex justify-end gap-2">
          <button
            @click="showConfirmDialog = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            取消
          </button>
          <button
            @click="confirmSave"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </SubWindowLayout>
</template>
