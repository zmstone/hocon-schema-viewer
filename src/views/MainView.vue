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
    // All the structs, first one must be the root.
    allStructs: {
      type: Array as PropType<schema.Struct[]>,
      required: true
    },
    rootDoc: {
      type: String,
      required: true
    },
    // render markdown to HTML
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
    let index: StructsIndex = {}
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

    // build name -> Struct index
    for (let i = 0; i < props.allStructs.length; i++) {
      index[props.allStructs[i].full_name] = i
    }
    // find struct by name (using the index)
    function structResolver(name: string): schema.Struct | undefined {
      if (name === 'THE_ROOT') {
        return props.allStructs[0]
      }
      if (typeof index[name] === 'number') {
        return props.allStructs[index[name]]
      }
      console.log('Struct not found: ' + name)
    }
    let rootStruct: schema.Struct
    rootStruct = props.allStructs[0]
    if (!rootStruct.initialized) {
      rootStruct.fields = schema.initialize(rootStruct, structResolver)
      rootStruct.initialized = true
    }

    let defaultDisplay = rootDisplay
    let resolvedDisplay = schema.resolveRootDisplay(rootStruct.fields, currentPath)
    if (resolvedDisplay) {
      defaultDisplay = resolvedDisplay
    }
    // initialize the default display type to be the first root level field
    const displayType = ref<schema.DisplayType>(defaultDisplay)
    function handleSelectedStruct(clicked: schema.DisplayType) {
      displayType.value = clicked
    }
    const importanceLevel = ref<string>(defaultImportanceLevel)
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
      const urlParams = new URLSearchParams(window.location.search)
      const currentPath = urlParams.get('r') || ''
      const importanceLevelInUrl = urlParams.get(importanceArgName) || defaultImportanceLevel
      let resolvedDisplay = schema.resolveRootDisplay(rootStruct.fields, currentPath)
      if (resolvedDisplay) {
        displayType.value = resolvedDisplay
      }
      if (importanceLevelInUrl.toLowerCase() !== importanceLevel.value.toLowerCase()) {
        importanceLevel.value = importanceLevelInUrl
      }
    }
    onMounted(() => {
      window.addEventListener('popstate', handleUrlChange)
    })
    onUnmounted(() => {
      window.removeEventListener('popstate', handleUrlChange)
    })
    const toTop = () => {
      // current URL
      const url = new URL(window.location.href)
      // the ?s param is the search query
      const sParam = url.searchParams.get('s')
      // Construct a new URL without search parameters
      const newUrl = new URL(url.protocol + '//' + url.host + url.pathname)
      if (sParam) {
        newUrl.searchParams.set('s', sParam)
      }
      window.location.href = newUrl.toString()
    }

    const toBaseHome = () => {
      // Go to base URL without any parameters
      const url = new URL(window.location.href)
      window.location.href = url.protocol + '//' + url.host + url.pathname
    }

    const exampleStruct = ref<schema.Struct | null>(null)
    const valuePath = ref<string>('')

    const handleShowExample = ({ struct, valuePath: path }: { struct: schema.Struct; valuePath: string }) => {
      exampleStruct.value = struct
      valuePath.value = path
    }

    const exampleWidth = ref(window.innerWidth * 0.4) // 40% of window width
    const sidebarWidth = ref(200)
    const isResizing = ref(false)
    const isResizingSidebar = ref(false)

    const startExampleResize = (e: MouseEvent) => {
      e.preventDefault()
      isResizing.value = true
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    const startSidebarResize = (e: MouseEvent) => {
      e.preventDefault()
      isResizingSidebar.value = true
      document.addEventListener('mousemove', handleSidebarResize)
      document.addEventListener('mouseup', stopSidebarResize)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    const handleResize = (e: MouseEvent) => {
      e.preventDefault()
      if (!isResizing.value) return
      const container = document.querySelector('.inner-container')
      if (!container) return

      const containerRect = container.getBoundingClientRect()
      // Calculate available width (total width minus sidebar)
      const availableWidth = containerRect.width - sidebarWidth.value
      const newWidth = containerRect.right - e.clientX
      // Ensure example view stays between 30% and 70% of available width
      exampleWidth.value = Math.max(availableWidth * 0.3, Math.min(availableWidth * 0.7, newWidth))
    }

    const handleSidebarResize = (e: MouseEvent) => {
      e.preventDefault()
      if (!isResizingSidebar.value) return
      const newWidth = e.clientX
      sidebarWidth.value = Math.max(150, Math.min(300, newWidth))
    }

    const stopResize = () => {
      isResizing.value = false
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const stopSidebarResize = () => {
      isResizingSidebar.value = false
      document.removeEventListener('mousemove', handleSidebarResize)
      document.removeEventListener('mouseup', stopSidebarResize)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

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
      exampleWidth,
      sidebarWidth,
      startExampleResize,
      startSidebarResize,
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
    <div class="top-bar">
      <div class="nav-buttons">
        <button @click="toBaseHome">HOME</button>
        <button @click="toTop">BACK</button>
      </div>
      <ImportanceView
        :selectedInUri="importanceLevel"
        @importanceLevelChanged="handleImportanceLevelChanged"
      />
    </div>
    <div class="inner-container">
      <div class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <RootFieldsList
          :rootFields="rootStruct.fields"
          :currentDisplay="displayType"
          :importanceLevel="importanceLevel"
          @selected="handleSelectedStruct"
        />
      </div>
      <div class="resizer" @mousedown="startSidebarResize"></div>
      <div class="struct-view-box" v-if="displayType">
        <div v-if="displayType.parent_field_doc" class="root-doc">
          <div v-html="markdownToHtml(displayType.parent_field_doc)" />
        </div>
        <div v-if="displayType.type_display" class="root-doc">
          <span class="root-field-type"
            ><code>{{ displayType.type_display }}</code></span
          >
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
        />
      </div>
      <div class="resizer" @mousedown="startExampleResize"></div>
      <div class="example-view-box" :style="{ width: exampleWidth + 'px' }">
        <ExampleView
          v-if="exampleStruct"
          :currentStruct="exampleStruct"
          :structResolver="structResolver"
          :version="version"
          :valuePath="valuePath"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.inner-container {
  margin-top: 10px;
  display: flex;
  flex-grow: 1;
  overflow-y: auto;
  position: relative;
}

.sidebar {
  min-width: 200px;
  max-width: 600px;
  overflow-y: auto;
  padding: 0px;
  border-right: 1px solid #ccc;
  flex-shrink: 0;
}

.struct-view-box {
  flex-grow: 1;
  flex-shrink: 1;
  padding-left: 20px;
  overflow-y: auto;
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
  background: #ccc;
}

.example-view-box {
  flex-shrink: 0;
  min-width: 300px;
  max-width: 1000px;
  padding-left: 20px;
  border-left: 1px solid #ccc;
}

.root-doc {
  padding-bottom: 10px;
}

.root-field-type {
  background-color: #e4f5ea;
  border-radius: 4px;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px;
  border-bottom: 1px solid #ccc;
}

.nav-buttons {
  display: flex;
  gap: 8px;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .root-field-type {
    background-color: #2e5742;
    color: #d9e9d9;
  }
  .example-view-box {
    border-left-color: #444;
  }
  .resizer:hover {
    background: #444;
  }
}
</style>
