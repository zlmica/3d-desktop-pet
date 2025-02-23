<script setup lang="ts">
import { ref } from 'vue'
import { useAnimations, useGLTF } from '@tresjs/cientos'
import * as THREE from 'three'
import modelUrl from '/rabbit.glb?url'

const isPlaying = ref(false)

const playPause = () => {
  if (isPlaying.value) {
    currentAction2.value.stop()
    isPlaying.value = false
  } else {
    currentAction2.value.play()
    isPlaying.value = true
  }
}

const hello = () => {
  if (isPlaying.value) {
    currentAction2.value.stop()
  }
  currentAction.value.reset()
  currentAction.value.play()
  currentAction.value.setLoop(THREE.LoopOnce, 1)
  currentAction.value.clampWhenFinished = true

  currentAction.value.getMixer().addEventListener('finished', () => {
    currentAction.value.stop()
    if (isPlaying.value) {
      currentAction2.value.play()
    }
  })
}

defineExpose({
  playPause,
  hello,
})

const { scene: model, animations } = await useGLTF(modelUrl)

const { actions } = useAnimations(animations, model)

const currentAction = ref(actions.Hello)
const currentAction2 = ref(actions.Play)
playPause()
</script>

<template>
  <primitive :object="model" />
</template>
