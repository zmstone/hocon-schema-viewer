<script setup lang="ts">
import { ref, watch } from 'vue'
import MainView from './views/MainView.vue'
import * as markdown from './markdown'
import SchemaList from './views/SchemaList.vue'
import type { SchemaFile } from './views/SchemaList.vue'
import type { Struct } from './interfaces/schema'
// default data
import defaultAllStructs from '../public/schemas/default.json'

function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}

const selectedSchema = ref<SchemaFile | null>(null)
const fetchedStructs = ref<Struct[]>([])
fetchedStructs.value = defaultAllStructs as Struct[]

watch(
  () => selectedSchema.value,
  async (newSchema: SchemaFile | null) => {
    if (newSchema) {
      await fetchSchema('schemas/' + newSchema.file)
    }
  }
)

const fetchSchema = async (path: string) => {
  try {
    const response = await fetch(path)
    if (response.ok) {
      const newSchema = await response.json()
      fetchedStructs.value = newSchema
    } else {
      console.error('Failed to fetch schema')
    }
  } catch (error) {
    console.error('Error fetching schema:', error)
  }
}

function handleSelectSchema(selected: SchemaFile) {
  selectedSchema.value = selected
}
</script>

<template>
  <div class="container">
    <SchemaList class="schema-list" @select-schema="handleSelectSchema" />
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
