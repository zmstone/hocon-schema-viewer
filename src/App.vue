<script setup lang="ts">
import HoconSchema from './views/HoconScehma.vue'
import SchemaList from './views/SchemaList.vue'
import MainView from './views/MainView.vue'
import { DefaultAllStructs } from './data/data'

import * as markdown from './markdown'
function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}
</script>

<template>
  <div class="container">
    <SchemaList :class="schema - list" @select-schema="handleSelectSchema" />
    <MainView
      :class="main - view"
      :allStructs="DefaultAllStructs"
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
