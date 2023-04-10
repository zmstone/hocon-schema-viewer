<script setup lang="ts">
import { defineComponent, ref, computed, watch } from 'vue'
import HoconSchema from './views/HoconScehma.vue'
import SchemaList from './views/SchemaList.vue'
import MainView from './views/MainView.vue'
import { DefaultAllStructs } from './data/data'

import * as markdown from './markdown'

function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}

const selectedSchema = ref(null)
const allStructs = ref(DefaultAllStructs)
watch(selectedSchema, async (newSchema) => {
  if (newSchema) {
    await fetchSchema('schemas/' + newSchema.file)
  }
})

const fetchSchema = async (path) => {
  try {
    const response = await fetch(path)
    if (response.ok) {
      const newSchema = await response.json()
      allStructs.value = newSchema
    } else {
      console.error('Failed to fetch schema')
    }
  } catch (error) {
    console.error('Error fetching schema:', error)
  }
}

function handleSelectSchema(selected) {
  selectedSchema.value = selected
}
</script>

<template>
  <div class="container">
    <SchemaList class="schema-list" @select-schema="handleSelectSchema" />
    <MainView class="main-view" :allStructs="allStructs" :markdownProvider="renderMarkdown" />
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
