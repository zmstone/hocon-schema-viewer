<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MainView from './views/MainView.vue'
import * as markdown from './markdown'
import type { Struct } from './schema'

let isLoading = ref<boolean>(true)
const fetchedStructs = ref<Struct[]>([])
const fetchedRootDoc = ref<string>('')
const version = ref<string>('')

function parseVersion(path: string): string {
  if (path.endsWith('default.json')) return ''
  const match = path.match(/[ev]?([\d.]+)\.json$/)
  return match ? match[1] : ''
}

const fetchStructs = async () => {
  const params = new URLSearchParams(window.location.search)
  const path = params.get('s')
  if (path) {
    try {
      version.value = parseVersion(path)
      const response = await fetch(path)
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

onMounted(async () => {
  await Promise.all([fetchStructs(), fetchRootDoc()])
  isLoading.value = false
})

function renderMarkdown(desc: string): string {
  return markdown.render(desc)
}
</script>

<template>
  <div class="app-shell">
    <MainView
      class="main-view"
      v-if="!isLoading"
      :allStructs="fetchedStructs"
      :rootDoc="fetchedRootDoc"
      :markdownProvider="renderMarkdown"
      :version="version"
    />
    <div v-if="isLoading" class="loading-state">
      <div class="loading-pulse" aria-hidden="true"></div>
      <div class="loading-copy">Loading schema and docs...</div>
    </div>
  </div>
</template>

<style>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  width: min(1512px, 100%);
  margin: 0 auto;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--line-subtle);
  background: var(--panel-primary);
}

.main-view {
  flex-grow: 1;
  min-height: 0;
}

.loading-state {
  display: grid;
  place-items: center;
  gap: 0.9rem;
  min-height: 50vh;
  color: var(--text-dim);
}

.loading-pulse {
  width: 3rem;
  height: 3rem;
  border-radius: 999px;
  border: 3px solid #e2e2e3;
  border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}

.loading-copy {
  font-size: 0.92rem;
  letter-spacing: 0.04em;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

#app {
  min-height: 100%;
}

@media (max-width: 900px) {
  .app-shell {
    width: 100%;
    border-left: 0;
    border-right: 0;
  }
}
</style>
