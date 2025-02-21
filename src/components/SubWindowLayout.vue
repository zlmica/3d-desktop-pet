<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<template>
  <div class="sub-window-layout">
    <!-- <header class="window-header">
      <h1>{{ title }}</h1>
    </header> -->

    <main class="content">
      <slot></slot>
    </main>
  </div>
</template>

<style scoped>
.sub-window-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.window-header {
  background: #f5f5f5;
  padding: 12px 20px;
  border-bottom: 1px solid #e8e8e8;
  -webkit-app-region: drag;
  /* 允许拖动窗口 */
}

.window-header h1 {
  font-size: 18px;
  margin: 0;
  color: #333;
  -webkit-app-region: no-drag;
  /* 标题文字不参与拖动 */
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
