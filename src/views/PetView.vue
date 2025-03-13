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
  buttonType.value = 'save'
  showConfirmDialog.value = true
}

const buttonType = ref<'save' | 'reset'>('save')
const confirmSave = async () => {
  if (buttonType.value === 'save') {
    // 重置设置
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
  } else {
    window.ipcRenderer.invoke('clear-settings')
  }
  showConfirmDialog.value = false
  // 重启应用
  window.ipcRenderer.invoke('restart-app')
}

const resetSettings = () => {
  // 展示弹框
  buttonType.value = 'reset'
  showConfirmDialog.value = true
}
</script>

<template>
  <SubWindowLayout title="宠物管理">
    <!-- 控制面板 -->
    <div
      class="fixed top-6 right-6 z-10 flex flex-col gap-5 max-w-[800px] pl-5"
    >
      <!-- 模型控制区 -->
      <div
        class="bg-white/90 backdrop-blur-md p-5 rounded-2xl shadow-lg border border-gray-100"
      >
        <div class="flex items-center gap-4">
          <input
            type="file"
            ref="fileInput"
            accept=".glb"
            class="hidden"
            @change="handleFileUpload"
          />
          <button
            @click="triggerFileInput"
            class="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-sm hover:shadow font-medium"
          >
            上传模型
          </button>
          <select
            name="model-select"
            @change="selectModel"
            class="px-4 py-2.5 border border-gray-200 rounded-xl bg-white min-w-[160px] focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
      </div>

      <!-- 参数控制面板 -->
      <div
        class="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-gray-100"
      >
        <div class="grid grid-cols-3 gap-8">
          <!-- 直射光设置 -->
          <div class="space-y-4">
            <h3 class="font-semibold text-gray-800 flex items-center gap-2">
              <svg
                class="w-4 h-4 text-yellow-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
                />
              </svg>
              直射光
            </h3>
            <div class="space-y-3">
              <div class="space-y-2">
                <label class="text-sm text-gray-600">颜色</label>
                <input
                  type="color"
                  v-model="tempSettings.directLight.color"
                  @input="debouncedUpdateColor"
                  class="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm text-gray-600">强度</label>
                <input
                  type="range"
                  v-model="tempSettings.directLight.intensity"
                  min="0"
                  max="10"
                  step="0.1"
                  @input="debouncedUpdate"
                  class="w-full accent-blue-500"
                />
                <div class="text-xs text-gray-500 text-right">
                  {{ formatNumber(tempSettings.directLight.intensity) }}
                </div>
              </div>
              <div class="space-y-2">
                <label class="text-sm text-gray-600">位置 X/Y/Z</label>
                <div class="grid grid-cols-3 gap-2">
                  <input
                    v-for="axis in ['x', 'y', 'z'] as const"
                    :key="axis"
                    type="number"
                    v-model="tempSettings.directLight.position[axis]"
                    step="0.1"
                    @input="debouncedUpdate"
                    class="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- 环境光设置 -->
          <div class="space-y-4">
            <h3 class="font-semibold text-gray-800 flex items-center gap-2">
              <svg
                class="w-4 h-4 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
              环境光
            </h3>
            <div class="space-y-3">
              <div class="space-y-2">
                <label class="text-sm text-gray-600">颜色</label>
                <input
                  type="color"
                  v-model="tempSettings.ambientLight.color"
                  @input="debouncedUpdateColor"
                  class="w-full h-10 rounded-lg cursor-pointer"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm text-gray-600">强度</label>
                <input
                  type="range"
                  v-model="tempSettings.ambientLight.intensity"
                  min="0"
                  max="10"
                  step="0.1"
                  @input="debouncedUpdate"
                  class="w-full accent-blue-500"
                />
                <div class="text-xs text-gray-500 text-right">
                  {{ formatNumber(tempSettings.ambientLight.intensity) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 相机和动作控制 -->
          <div class="space-y-4">
            <div class="space-y-4">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                相机位置
              </h3>
              <div class="grid grid-cols-3 gap-2">
                <input
                  v-for="axis in ['x', 'y', 'z'] as const"
                  :key="axis"
                  type="number"
                  v-model="tempSettings.camera.position[axis]"
                  step="0.1"
                  @input="debouncedUpdate"
                  class="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            <!-- 动作控制 -->
            <div class="space-y-3">
              <h3 class="font-semibold text-gray-800 flex items-center gap-2">
                <svg
                  class="w-4 h-4 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                动作控制
              </h3>
              <div class="space-y-3">
                <div class="flex items-center gap-2">
                  <select
                    v-model="selectedLoopAnimation"
                    class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-medium shadow-sm hover:shadow"
                  >
                    设为循环
                  </button>
                </div>

                <div class="flex items-center gap-2">
                  <select
                    v-model="selectedClickAnimation"
                    class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 text-sm font-medium shadow-sm hover:shadow"
                  >
                    设为点击
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="flex justify-end gap-4">
        <button
          @click="saveSettings"
          class="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 shadow-sm hover:shadow font-medium"
        >
          保存设置
        </button>
        <button
          @click="resetSettings"
          class="px-6 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-sm hover:shadow font-medium"
        >
          重置默认
        </button>
      </div>
    </div>

    <!-- 确认对话框 -->
    <div
      v-if="showConfirmDialog"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-2xl p-6 w-96 space-y-4 shadow-xl">
        <h3 class="text-lg font-semibold text-gray-800">确认操作</h3>
        <p class="text-gray-600">设置后需要重启应用才能生效，是否继续？</p>
        <div class="flex justify-end gap-3 pt-2">
          <button
            @click="showConfirmDialog = false"
            class="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            取消
          </button>
          <button
            @click="confirmSave"
            class="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-sm hover:shadow"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </SubWindowLayout>
</template>
