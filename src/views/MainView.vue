<script lang="ts">
import { defineComponent, ref, computed } from 'vue'
import * as schema from '../interfaces/schema'
import StructView from './StructView.vue'
import RootFieldsList from './RootFieldsList.vue'

type StructsIndex = { [name: string]: number }

export default defineComponent({
  name: 'MainView',
  props: {
    // All the structs, first one must be the root.
    allStructs: {
      type: Array,
      required: true
    },
    // render markdown to HTML
    markdownProvider: {
      type: Function,
      required: true
    }
  },
  setup(props) {
    const displayType = ref<schema.DisplayType | null>(null)
    let index: StructsIndex = {}
    // build name -> Struct index
    for (let i = 0; i < props.allStructs.length; i++) {
      index[props.allStructs[i].full_name] = i
    }
    // find struct by name (using the index)
    function structResolver(name: string): schema.Struct | undefined {
      if (typeof index[name] === 'number') {
        return props.allStructs[index[name]]
      }
      console.log('Struct not found: ' + name)
    }
    let rootStruct: schema.Struct = {}
    rootStruct = props.allStructs[0]
    rootStruct.fields = schema.initialize(rootStruct, structResolver)

    function handleSelectedStruct(clicked) {
      displayType.value = clicked
    }
    function resolveDisplayStructs() {
      let types = schema.liftStructs(displayType.value.type)
      let res = types.map((t) => structResolver(t.name))
      return res
    }

    return {
      rootStruct,
      structResolver,
      displayType,
      handleSelectedStruct,
      resolveDisplayStructs
    }
  },
  components: {
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
  <div class="inner-container">
    <div class="sidebar">
      <RootFieldsList :rootFields="rootStruct.fields" @selected="handleSelectedStruct" />
    </div>
    <div class="struct-view-box" v-if="displayType">

    <div v-if="displayType.parent_field_doc" class="root-doc">
        <div v-html="markdownToHtml(displayType.parent_field_doc)"/>
    </div>
    <div v-if="displayType.type_display" class="root-doc">
        <span class="root-field-type"><code>{{ displayType.type_display }}</code></span>
    </div>
      <StructView
        v-for="(st, i) in resolveDisplayStructs()"
        :currentStruct="st"
        :markdownProvider="markdownToHtml"
        :structResolver="structResolver"
        :key="i"
      />
    </div>
  </div>
</template>

<style scoped>
.inner-container {
  display: flex;
  height: 100%;
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

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .root-field-type {
    background-color: #2e5742;
    color: #d9e9d9;
  }
}


</style>
