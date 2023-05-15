<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'
import StructView from './StructView.vue'
import ImportanceView from './ImportanceView.vue'
import RootFieldsList from './RootFieldsList.vue'

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
    }
  },
  setup(props) {
    const importanceArgName = 'min-importance'
    let index: StructsIndex = {}
    const urlParams = new URLSearchParams(window.location.search)
    const defaultImportanceLevel = urlParams.get(importanceArgName) || 'medium'
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
      const importanceLevelInUrl = urlParams.get(importanceArgName) || 'medium'
      console.log(importanceLevelInUrl)
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
    const toHome = () => {
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

    return {
      rootStruct,
      displayType,
      importanceLevel,
      structResolver,
      handleSelectedStruct,
      resolveDisplayStructs,
      handleImportanceLevelChanged,
      toHome
    }
  },
  components: {
    ImportanceView,
    RootFieldsList,
    StructView
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
      <button @click="toHome">HOME</button>
      <ImportanceView
        :selectedInUri="importanceLevel"
        @importanceLevelChanged="handleImportanceLevelChanged"
      />
    </div>
    <div class="inner-container">
      <div class="sidebar">
        <RootFieldsList
          :rootFields="rootStruct.fields"
          :currentDisplay="displayType"
          :importanceLevel="importanceLevel"
          @selected="handleSelectedStruct"
        />
      </div>
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
          :markdownProvider="markdownToHtml"
          :structResolver="structResolver"
          :currentStruct="st"
          :importanceLevel="importanceLevel"
          :expandByDefault="true"
          :key="i"
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
}

.sidebar {
  min-width: 300px;
  overflow-y: auto;
  padding: 0px;
  border-right: 1px solid #ccc;
}

.struct-view-box {
  flex-grow: 1;
  padding-left: 20px;
  overflow-y: auto;
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

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .root-field-type {
    background-color: #2e5742;
    color: #d9e9d9;
  }
}
</style>
