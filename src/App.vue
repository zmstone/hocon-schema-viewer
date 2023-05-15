<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainView from './views/MainView.vue'
import * as markdown from './markdown'
import type { Struct } from './schema'

let isLoading = ref<boolean>(true)
const fetchedStructs = ref<Struct[]>([])
const fetchedRootDoc = ref<string>('')

const fetchStructs = async () => {
  const params = new URLSearchParams(window.location.search)
  const url = params.get('s')
  if (url) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        const jsonData = await response.json()
        fetchedStructs.value = jsonData as Struct[]
      } else {
        console.error('Failed to fetch JSON file:', response.status)
      }
    } catch (error) {
      console.error('Error fetching JSON file:', error)
    }
  } else {
    // Redirect to a default URL with the ?s parameter
    const defaultURL = 'https://zmstone.github.io/emqx-docgen'
    window.location.replace(defaultURL)
  }
}

const fetchRootDoc = async () => {
  try {
    const response = await fetch('rootdoc.md')
    if (response.ok) {
      const textData = await response.text()
      fetchedRootDoc.value = textData
    } else {
      console.error('Failed to fetch root doc:', response.status)
    }
  } catch (error) {
    console.error('Error fetching root doc:', error)
  }
}

onMounted(async() => {
  await Promise.all([fetchStructs(), fetchRootDoc()])
  isLoading.value = false
})

function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}
</script>

<template>
  <div class="container">
    <MainView
      class="main-view"
      v-if="!isLoading"
      :allStructs="fetchedStructs"
      :rootDoc="fetchedRootDoc"
      :markdownProvider="renderMarkdown"
    />
  </div>
  <div v-if="isLoading">Loading...</div>
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
  padding: 0px;
}

#app {
  height: 100%;
}
</style>
