<script setup lang="ts">
import MainView from './views/MainView.vue'
import * as markdown from './markdown'
import type { Struct } from './interfaces/schema'
// default data
import defaultAllStructs from '../public/schemas/default.json'
const fetchedStructs = defaultAllStructs as Struct[]

function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}
</script>

<template>
  <div class="container">
    <MainView
      class="main-view"
      :allStructs="fetchedStructs"
      :markdownProvider="renderMarkdown"
    />
  </div>
</template>

<style>
.container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.schema-list {
  padding: 10px;
}

.main-view {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px;
}

#app {
  height: 100%;
}
</style>
