<script setup lang="ts">
import { useAnimations, useGLTF } from '@tresjs/cientos'
import * as THREE from 'three'
import { ref, watch } from 'vue'
import { useModel } from '../composable/useModel'

const { url, loopAction, clickAction, clickActionPlay } = useModel()

watch(clickActionPlay, () => {
  if (clickActionPlay.value) {
    hello()
  }
})

watch(
  loopAction,
  () => {
    if (loopAction.value.isLoop) {
      currentLoopAction.value.play()
      isPlaying.value = true
    } else {
      currentLoopAction.value.stop()
      isPlaying.value = false
    }
  },
  { deep: true }
)

const isPlaying = ref(false)

const modelUrl = ref('')

// 使用动态导入，但需要指定 glob 导入模式
const modules = import.meta.glob('/public/*.glb', {
  eager: true,
  import: 'default',
})

// 根据 url 获取对应的模型路径
modelUrl.value = modules[`/public/${url.value}`] as string

const { scene: model, animations } = await useGLTF(modelUrl.value)

const { actions } = useAnimations(animations, model)

// 点击动作
const currentClickAction = ref<any>(null)

// 点击动作
currentClickAction.value = Object.keys(actions).includes(
  clickAction.value.action
)
  ? actions[clickAction.value.action]
  : null

// 持续播放动作
const currentLoopAction = ref<any>(null)

currentLoopAction.value = Object.keys(actions).includes(loopAction.value.action)
  ? actions[loopAction.value.action]
  : null

if (loopAction.value.isLoop && currentLoopAction.value) {
  currentLoopAction.value.play()
  isPlaying.value = true
}

// 点击动作
const hello = () => {
  if (!clickAction.value.isEnable || !currentClickAction.value) {
    return
  }
  if (isPlaying.value) {
    currentLoopAction.value.stop()
  }
  currentClickAction.value.play()
  currentClickAction.value.setLoop(THREE.LoopOnce, 1)
  currentClickAction.value.clampWhenFinished = true

  currentClickAction.value.getMixer().addEventListener('finished', () => {
    currentClickAction.value.stop()
    clickActionPlay.value = false
    if (isPlaying.value) {
      currentLoopAction.value.play()
    }
  })
}
</script>

<template>
  <primitive :object="model" />
</template>
