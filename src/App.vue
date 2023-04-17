<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainView from './views/MainView.vue'
import * as markdown from './markdown'
import type { Struct } from './interfaces/schema'

const fetchedStructs = ref<Struct[]>([])

const fetchStructs = async () => {
  const params = new URLSearchParams(window.location.search)
  const url = params.get('s')
  if (url) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        fetchedStructs.value = await response.json()
      } else {
        console.error('Failed to fetch JSON file:', response.status)
      }
    } catch (error) {
      console.error('Error fetching JSON file:', error)
    }
  }
  else {
    // Redirect to a default URL with the ?s parameter
    const defaultURL = 'https://zmstone.github.io/emqx-docgen'
    window.location.replace(defaultURL);
  }
}

fetchStructs()

function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}
</script>

<template>
  <div class="container">
    <MainView
      class="main-view"
      v-if="fetchedStructs.length > 0"
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
