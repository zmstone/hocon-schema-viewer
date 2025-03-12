<script lang="ts">
import { defineComponent, ref, watch } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'

export default defineComponent({
  name: 'StructView',
  emits: ['show-example'],
  props: {
    // the current struct to expand
    currentStruct: {
      type: Object as PropType<schema.Struct>,
      required: true
    },
    // render markdown to HTML
    markdownProvider: {
      type: Function,
      required: true
    },
    // resolve Struct from struct name
    structResolver: {
      type: Function,
      required: true
    },
    expandByDefault: {
      type: Boolean,
      required: true
    },
    importanceLevel: {
      type: String,
      required: true
    },
    isRoot: {
      type: Boolean,
      default: false
    },
    valuePath: {
      type: String,
      default: ''
    }
  },
  setup(props, { emit }) {
    const isExpanded = ref<boolean>(props.expandByDefault)
    const toggleExpand = () => {
      isExpanded.value = !isExpanded.value
    }
    const showExample = () => {
      emit('show-example', {
        struct: props.currentStruct,
        valuePath: props.valuePath
      })
    }
    function isVisible(field: schema.Field): boolean {
      return schema.isVisible(field, props.importanceLevel)
    }

    // Watch for changes to currentStruct
    watch(
      () => props.currentStruct,
      () => {
        if (props.isRoot) {
          showExample()
        }
      },
      { immediate: true } // Run immediately on mount
    )

    return {
      isExpanded,
      toggleExpand,
      isVisible,
      showExample
    }
  },
  components: {
    StructView: () => import('./StructView.vue')
  },
  methods: {
    isComplexType(type: schema.FieldType): boolean {
      return schema.isComplexType(type)
    },
    subStructs(field: schema.Field): schema.StructReference[] {
      if (field.extra?.doc_lift === true) {
        return []
      }
      return schema.liftStructs(field.type)
    },
    typeDisplay(type: schema.FieldType): string {
      return schema.shortTypeDisplay(type)
    },
    findStruct(name: string) {
      return this.structResolver(name)
    },
    visibleFields(struct: schema.Struct) {
      return schema.visibleFields(struct)
    },
    markdownToHtml(str: string): string {
      return this.markdownProvider(str)
    },
    maybeFold() {
      const expandChar = ' \u25B6' // Right-pointing triangle (▶)
      const collapseChar = ' \u25BC' // Down-pointing triangle (▼)
      if (this.isExpanded) {
        return collapseChar
      }
      return expandChar
    },
    appendPath(path: string, typeName: string, fieldName: string) {
      return `${path}/${typeName}.${fieldName}`
    }
  }
})
</script>

<template>
  <div class="struct-view">
    <span class="struct-fullname" @click="toggleExpand()">
      <code>{{ currentStruct.full_name }} {{ maybeFold() }}</code>
    </span>
    <button @click="showExample">Show Example</button>
    <ul class="field-list" v-if="isExpanded">
      <li v-for="(field, index) in visibleFields(currentStruct)" class="field-item">
        <div v-if="isVisible(field)">
          <div class="fieldname">{{ field.name }}</div>
          <table>
            <tr v-if="field.aliases && field.aliases.length > 0">
              <td>Aliases:</td>
              <td>
                <span v-for="(alias, index) in field.aliases">
                  <span v-if="index > 0">, </span>{{ alias }}
                </span>
              </td>
            </tr>
            <tr v-if="field.type.kind !== 'struct'">
              <td>Type</td>
              <td>
                <code>{{ typeDisplay(field.type) }}</code>
              </td>
            </tr>
            <tr v-if="field.raw_default">
              <td>Default</td>
              <td>
                <code>{{ field.raw_default }}</code>
              </td>
            </tr>
            <tr v-if="field.desc">
              <td>Description</td>
              <td><div v-html="markdownToHtml(field.desc)"></div></td>
            </tr>
          </table>
          <div
            v-if="isComplexType(field.type)"
            v-for="(st, index) in subStructs(field)"
            class="sub-struct"
          >
            <StructView
              :key="st.name"
              :currentStruct="findStruct(st.name)"
              :markdownProvider="markdownProvider"
              :structResolver="structResolver"
              :expandByDefault="true"
              :importanceLevel="importanceLevel"
              :isRoot="false"
              :valuePath="appendPath(valuePath, st.name,field.name)"
              @show-example="$emit('show-example', $event)"
            />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.field-list {
  list-style-type: none;
  padding-left: 20px;
  padding-top: 8px;
}
.field-list::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: rgba(0, 0, 0, 0.3);
}

.fieldname {
  font-weight: bold;
  padding-top: 8px;
  padding-bottom: 8px;
}

table td {
  vertical-align: top;
}

table td:first-child {
  text-align: right;
  font-size: 0.67em;
  line-height: 2.2em;
}

table tr:nth-child(even) {
  background-color: #f5f5f5;
}

table {
  border-collapse: collapse;
}

table td,
table th {
  border: 0px solid #ccc;
  padding: 4px;
}

.sub-struct {
  border-bottom: 1px solid;
}

.struct-fullname {
  cursor: pointer;
  padding: 8px;
  background-color: #e4f5ea;
  border-radius: 4px;
  font-size: 0.67em;
}

.example-button {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.67em;
  cursor: pointer;
  background-color: #e4f5ea;
  border: 1px solid #2e5742;
}

.struct-view {
  padding-top: 10px;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  table tr:nth-child(even) {
    background-color: #2a2a2a;
  }
  .field-list::before {
    background-color: rgba(255, 255, 255, 0.3);
  }
  .struct-fullname {
    background-color: #2e5742;
    color: #d9e9d9;
  }
}
</style>
