<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'
import StructView from './StructView.vue'
import ImportanceView from './ImportanceView.vue'
import RootFieldsList from './RootFieldsList.vue'
import ExampleView from './ExampleView.vue'

type StructsIndex = { [name: string]: number }

export default defineComponent({
  name: 'MainView',
  props: {
    allStructs: {
      type: Array as PropType<schema.Struct[]>,
      required: true
    },
    rootDoc: {
      type: String,
      required: true
    },
    markdownProvider: {
      type: Function,
      required: true
    },
    version: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const importanceArgName = 'min-importance'
    const index: StructsIndex = {}
    const urlParams = new URLSearchParams(window.location.search)
    const defaultImportanceLevel = urlParams.get(importanceArgName) || 'all'
    const currentPath = urlParams.get('r') || ''
    const rootDisplay: schema.DisplayType = {
      list_display: 'none',
      parent_field_doc: props.rootDoc,
      type: { kind: 'struct', name: 'THE_ROOT' },
      tpath: 'ALL',
      type_display: '',
      importance: 'high'
    }

    for (let i = 0; i < props.allStructs.length; i++) {
      index[props.allStructs[i].full_name] = i
    }

    function structResolver(name: string): schema.Struct | undefined {
      if (name === 'THE_ROOT') {
        return props.allStructs[0]
      }
      if (typeof index[name] === 'number') {
        return props.allStructs[index[name]]
      }
      console.log('Struct not found: ' + name)
    }

    const rootStruct: schema.Struct = props.allStructs[0]
    if (!rootStruct.initialized) {
      rootStruct.fields = schema.initialize(rootStruct, structResolver)
      rootStruct.initialized = true
    }

    let defaultDisplay = rootDisplay
    const resolvedDisplay = schema.resolveRootDisplay(rootStruct.fields, currentPath)
    if (resolvedDisplay) {
      defaultDisplay = resolvedDisplay
    }

    const displayType = ref<schema.DisplayType>(defaultDisplay)
    const importanceLevel = ref<string>(defaultImportanceLevel)
    const exampleStruct = ref<schema.Struct | null>(null)
    const valuePath = ref<string>('')
    const sidebarWidth = ref(260)
    const isResizingSidebar = ref(false)
    const exampleWindowVisible = ref(false)
    const exampleWindowX = ref(Math.max(24, window.innerWidth - 520))
    const exampleWindowY = ref(112)
    const hideTimer = ref<number | null>(null)

    function handleSelectedStruct(clicked: schema.DisplayType) {
      displayType.value = clicked
    }

    function resolveDisplayStructs(): schema.Struct[] {
      const types = schema.liftStructs(displayType.value.type)
      return types
        .map((t: schema.StructReference) => {
          const s = structResolver(t.name)
          return s ? s : null
        })
        .filter((s: schema.Struct | null) => s !== null) as schema.Struct[]
    }

    const handleImportanceLevelChanged = (newImportanceLevel: string) => {
      importanceLevel.value = newImportanceLevel
      const currentURL = new URL(window.location.href)
      const params = currentURL.searchParams
      params.set(importanceArgName, newImportanceLevel)
      window.history.pushState({}, '', `${currentURL.pathname}?${params}`)
    }

    const handleUrlChange = () => {
      const nextUrlParams = new URLSearchParams(window.location.search)
      const nextPath = nextUrlParams.get('r') || ''
      const importanceLevelInUrl = nextUrlParams.get(importanceArgName) || defaultImportanceLevel
      const nextResolvedDisplay = schema.resolveRootDisplay(rootStruct.fields, nextPath)
      if (nextResolvedDisplay) {
        displayType.value = nextResolvedDisplay
      }
      if (importanceLevelInUrl.toLowerCase() !== importanceLevel.value.toLowerCase()) {
        importanceLevel.value = importanceLevelInUrl
      }
    }

    const keepExampleWindow = () => {
      if (hideTimer.value !== null) {
        window.clearTimeout(hideTimer.value)
        hideTimer.value = null
      }
    }

    const scheduleHideExampleWindow = () => {
      keepExampleWindow()
      hideTimer.value = window.setTimeout(() => {
        exampleWindowVisible.value = false
      }, 220)
    }

    const handleShowExample = ({
      struct,
      valuePath: path,
      clientX,
      clientY
    }: {
      struct: schema.Struct
      valuePath: string
      clientX?: number
      clientY?: number
    }) => {
      keepExampleWindow()
      exampleStruct.value = struct
      valuePath.value = path
      exampleWindowVisible.value = true
      if (typeof clientX === 'number' && typeof clientY === 'number') {
        const preferredWindowHeight = Math.min(620, Math.floor(window.innerHeight * 0.68))
        const desiredX = clientX + 14
        // If there is not enough room below the cursor, open above it.
        const desiredY =
          clientY + preferredWindowHeight + 18 > window.innerHeight
            ? clientY - preferredWindowHeight - 14
            : clientY + 12
        const maxX = Math.max(12, window.innerWidth - 540)
        const maxY = Math.max(72, window.innerHeight - preferredWindowHeight - 12)
        exampleWindowX.value = Math.max(12, Math.min(maxX, desiredX))
        exampleWindowY.value = Math.max(72, Math.min(maxY, desiredY))
      }
    }

    const toTop = () => {
      const url = new URL(window.location.href)
      const sParam = url.searchParams.get('s')
      const newUrl = new URL(url.protocol + '//' + url.host + url.pathname)
      if (sParam) {
        newUrl.searchParams.set('s', sParam)
      }
      window.location.href = newUrl.toString()
    }

    const toBaseHome = () => {
      const url = new URL(window.location.href)
      window.location.href = url.protocol + '//' + url.host + url.pathname
    }

    const startSidebarResize = (e: MouseEvent) => {
      e.preventDefault()
      isResizingSidebar.value = true
      document.addEventListener('mousemove', handleSidebarResize)
      document.addEventListener('mouseup', stopSidebarResize)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    const handleSidebarResize = (e: MouseEvent) => {
      e.preventDefault()
      if (!isResizingSidebar.value) return
      const newWidth = e.clientX
      sidebarWidth.value = Math.max(200, Math.min(420, newWidth))
    }

    const stopSidebarResize = () => {
      isResizingSidebar.value = false
      document.removeEventListener('mousemove', handleSidebarResize)
      document.removeEventListener('mouseup', stopSidebarResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    onMounted(() => {
      window.addEventListener('popstate', handleUrlChange)
    })
    onUnmounted(() => {
      window.removeEventListener('popstate', handleUrlChange)
      stopSidebarResize()
      keepExampleWindow()
    })

    return {
      rootStruct,
      displayType,
      importanceLevel,
      structResolver,
      handleSelectedStruct,
      resolveDisplayStructs,
      handleImportanceLevelChanged,
      toTop,
      toBaseHome,
      exampleStruct,
      handleShowExample,
      sidebarWidth,
      startSidebarResize,
      exampleWindowVisible,
      exampleWindowX,
      exampleWindowY,
      keepExampleWindow,
      scheduleHideExampleWindow,
      version: props.version,
      valuePath
    }
  },
  components: {
    ImportanceView,
    RootFieldsList,
    StructView,
    ExampleView
  },
  methods: {
    markdownToHtml(str: string): string {
      return this.markdownProvider(str)
    }
  }
})
</script>

<template>
  <div class="main-container">
    <header class="top-bar">
      <div class="title-block">
        <h1>HOCON Schema Explorer</h1>
        <p>Navigate and inspect every field with clearer structure and context.</p>
      </div>
      <div class="top-actions">
        <div class="nav-buttons">
          <button class="home-button" @click="toBaseHome">Home</button>
          <button class="home-button" @click="toTop">Back</button>
        </div>
        <ImportanceView
          :selectedInUri="importanceLevel"
          @importanceLevelChanged="handleImportanceLevelChanged"
        />
      </div>
    </header>

    <div class="inner-container">
      <aside class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <div class="sidebar-title">Root fields</div>
        <RootFieldsList
          :rootFields="rootStruct.fields"
          :currentDisplay="displayType"
          :importanceLevel="importanceLevel"
          @selected="handleSelectedStruct"
        />
      </aside>

      <div class="resizer" @mousedown="startSidebarResize"></div>

      <section class="struct-view-box" v-if="displayType">
        <div class="selected-path">
          <span>Current path:</span>
          <code>{{ displayType.tpath || displayType.list_display }}</code>
        </div>
        <div v-if="displayType.parent_field_doc" class="root-doc">
          <div v-html="markdownToHtml(displayType.parent_field_doc)" />
        </div>
        <div v-if="displayType.type_display" class="root-doc">
          <span class="root-field-type">Type: <code>{{ displayType.type_display }}</code></span>
        </div>
        <StructView
          v-for="(st, i) in resolveDisplayStructs()"
          :key="st.full_name"
          :currentStruct="st"
          :markdownProvider="markdownToHtml"
          :structResolver="structResolver"
          :expandByDefault="true"
          :importanceLevel="importanceLevel"
          :isRoot="i === 0"
          :valuePath="st.full_name"
          @show-example="handleShowExample"
          @hide-example="scheduleHideExampleWindow"
        />
      </section>
    </div>

    <aside
      class="floating-example-window"
      v-if="exampleStruct && exampleWindowVisible"
      :style="{ left: exampleWindowX + 'px', top: exampleWindowY + 'px' }"
      @mouseenter="keepExampleWindow"
      @mouseleave="scheduleHideExampleWindow"
    >
      <div class="floating-window-header">
        <span>Example</span>
      </div>
      <div class="floating-window-body">
        <ExampleView
          :currentStruct="exampleStruct"
          :structResolver="structResolver"
          :version="version"
          :valuePath="valuePath"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.top-bar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  justify-content: space-between;
  gap: 1.2rem;
  align-items: center;
  padding: 1.1rem 1.25rem;
  background: var(--panel-primary);
  border-bottom: 1px solid var(--line-subtle);
}

.title-block h1 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: 0.015em;
  color: var(--text-strong);
}

.title-block p {
  margin: 0.25rem 0 0;
  color: var(--text-dim);
  font-size: 0.88rem;
}

.top-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.nav-buttons {
  display: flex;
  gap: 0.5rem;
}

.home-button {
  border: 1px solid var(--line-strong);
  background: var(--panel-primary);
  color: var(--text-dim);
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  font-size: 0.82rem;
  cursor: pointer;
  transition: transform 150ms ease, border-color 150ms ease, background-color 150ms ease;
}

.home-button:hover {
  transform: translateY(-1px);
  border-color: var(--accent);
  color: var(--accent);
  background: #fff;
}

.inner-container {
  display: flex;
  flex-grow: 1;
  height: calc(100vh - 78px);
  overflow: hidden;
  min-height: 0;
}

.sidebar {
  min-width: 200px;
  max-width: 420px;
  height: 100%;
  overflow-y: auto;
  border-right: 1px solid var(--line-subtle);
  background: var(--panel-tertiary);
  padding: 1rem 0.7rem;
  flex-shrink: 0;
}

.sidebar-title {
  color: var(--text-dim);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin: 0 0.7rem 0.7rem;
}

.struct-view-box {
  flex-grow: 1;
  min-width: 0;
  height: 100%;
  padding: 1.15rem 1.25rem;
  overflow-y: auto;
  background: var(--panel-primary);
}

.resizer {
  width: 4px;
  background: transparent;
  cursor: col-resize;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}

.resizer:hover {
  background: var(--line-strong);
}

.floating-example-window {
  position: fixed;
  z-index: 90;
  width: min(520px, calc(100vw - 24px));
  height: min(68vh, 620px);
  min-height: min(360px, calc(100vh - 24px));
  max-height: calc(100vh - 12px);
  border: 1px solid var(--line-subtle);
  border-radius: 12px;
  background: var(--panel-primary);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.16);
  overflow: hidden;
}

.floating-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.55rem 0.7rem;
  border-bottom: 1px solid var(--line-subtle);
  background: var(--panel-secondary);
  font-size: 0.86rem;
  color: var(--text-dim);
}

.floating-window-body {
  padding: 0.4rem;
  height: calc(100% - 38px);
  overflow: auto;
}

.root-doc {
  margin-bottom: 0.9rem;
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  background: var(--panel-primary);
  border: 1px solid var(--line-subtle);
}

.root-field-type {
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-dim);
}

.selected-path {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.9rem;
  font-size: 0.82rem;
  color: var(--text-dim);
}

.selected-path code {
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  color: var(--accent);
  background: rgba(94, 78, 255, 0.1);
  border: 1px solid rgba(94, 78, 255, 0.22);
}

@media (max-width: 980px) {
  .top-bar {
    flex-direction: column;
    align-items: flex-start;
  }

  .top-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .inner-container {
    flex-direction: column;
    height: auto;
    overflow: visible;
  }

  .sidebar {
    width: 100% !important;
    max-width: none;
    height: auto;
    max-height: 42vh;
    border-right: 0;
    border-bottom: 1px solid var(--line-subtle);
  }
}
</style>
