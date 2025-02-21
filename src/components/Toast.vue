<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="transform translate-y-2 opacity-0"
    enter-to-class="transform translate-y-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="transform translate-y-0 opacity-100"
    leave-to-class="transform translate-y-2 opacity-0"
  >
    <div
      v-if="show"
      class="fixed top-5 right-4 z-50 flex items-center px-4 py-3 rounded-lg shadow-lg"
      :class="typeClasses[type]"
    >
      <div class="flex items-center">
        <!-- 图标 -->
        <span class="mr-2">
          <svg
            v-if="type === 'success'"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <svg
            v-if="type === 'error'"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <svg
            v-if="type === 'warning'"
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </span>
        <!-- 消息内容 -->
        <span class="text-sm font-medium">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'success',
    validator: (value) => ['success', 'error', 'warning'].includes(value),
  },
  duration: {
    type: Number,
    default: 2000,
  },
})

const emit = defineEmits(['update:modelValue'])

const show = ref(props.modelValue)
const typeClasses = {
  success: 'bg-green-50 text-green-800 border border-green-200',
  error: 'bg-red-50 text-red-800 border border-red-200',
  warning: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
}

// 监听 modelValue 的变化
watch(
  () => props.modelValue,
  (newVal) => {
    show.value = newVal
    if (newVal && props.duration > 0) {
      setTimeout(() => {
        show.value = false
        emit('update:modelValue', false)
      }, props.duration)
    }
  }
)

// 监听 show 的变化
watch(
  () => show.value,
  (newVal) => {
    emit('update:modelValue', newVal)
  }
)
</script>
