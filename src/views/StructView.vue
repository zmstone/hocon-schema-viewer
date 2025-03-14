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
      showExample,
      schema
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
      return `${path} / ${typeName}.${fieldName}`
    }
  }
})
</script>

<template>
  <div class="struct-view" v-if="!schema.isVirtualRoot(currentStruct)">
    <span class="struct-fullname" @click="toggleExpand()">
      <code>{{ currentStruct.full_name }} {{ maybeFold() }}</code>
    </span>
    <button @click="showExample" class="example-button">Example</button>
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
              <td><div class="markdown-content" v-html="markdownToHtml(field.desc)"></div></td>
            </tr>
          </table>
          <div
            v-if="isComplexType(field.type)"
            v-for="(st, index) in subStructs(field)"
            class="sub-struct"
          >
            <StructView
              :key="appendPath(valuePath, st.name, field.name)"
              :currentStruct="findStruct(st.name)"
              :markdownProvider="markdownProvider"
              :structResolver="structResolver"
              :expandByDefault="true"
              :importanceLevel="importanceLevel"
              :isRoot="false"
              :valuePath="appendPath(valuePath, st.name, field.name)"
              @show-example="$emit('show-example', $event)"
            />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style>
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
  margin-right: 8px;
}

.example-button {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 0.67em;
  cursor: pointer;
  background-color: #e4f5ea;
  border: 1px solid #2e5742;
  transition: all 0.2s ease;
}

.example-button:hover {
  background-color: #d0ebda;
}

.example-button:active {
  transform: translateY(1px);
}

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
  .example-button {
    background-color: #2e5742;
    color: #e4f5ea;
  }
  .example-button:hover {
    background-color: #234434;
  }
}

.markdown-content {
  line-height: 1.6;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

.markdown-content p {
  margin: 1em 0;
}

.markdown-content code {
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

.markdown-content pre code {
  display: block;
  padding: 1em;
  overflow-x: auto;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 2em;
  margin: 1em 0;
}

.markdown-content blockquote {
  margin: 1em 0;
  padding-left: 1em;
  border-left: 4px solid #ddd;
  color: #666;
}

.markdown-content table {
  border-collapse: collapse;
  margin: 1em 0;
  width: 100%;
}

.markdown-content th,
.markdown-content td {
  border: 1px solid #ddd;
  padding: 0.5em;
}

@media (prefers-color-scheme: dark) {
  .markdown-content code {
    background: #2a2a2a;
  }
  
  .markdown-content blockquote {
    border-left-color: #444;
    color: #999;
  }
  
  .markdown-content th,
  .markdown-content td {
    border-color: #444;
  }
}

.warning-container {
  background: #ffebee;
  border-left: 4px solid #ef5350;
  padding: 1em;
  margin: 1em 0;
}

.tip-container {
  background: #e8f5e9;
  border-left: 4px solid #4caf50;
  padding: 1em;
  margin: 1em 0;
}

@media (prefers-color-scheme: dark) {
  .warning-container {
    background: #311b1b;
    border-left-color: #832222;
  }
  .tip-container {
    background: #1b2b1b;
    border-left-color: #2a5a2a;
  }
}

/* GitHub-style markdown alerts */
.markdown-alert {
  padding: 0.5rem 1rem;
  margin-bottom: 16px;
  border-radius: 6px;
}

.markdown-alert-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.markdown-alert-content {
  margin-left: 24px;
}

.markdown-alert-content > p:first-child {
  margin-top: 0;
}

.markdown-alert-content > p:last-child {
  margin-bottom: 0;
}

.markdown-alert-note {
  border: 1px solid #0969da1a;
  background-color: #0969da0a;
}

.markdown-alert-warning {
  border: 1px solid #d73a49;
  background-color: #ffeef0;
}

.markdown-alert-tip {
  border: 1px solid #28a745;
  background-color: #dcffe4;
}

.octicon {
  fill: currentColor;
}

@media (prefers-color-scheme: dark) {
  .markdown-alert-note {
    border-color: #2f81f7;
    background-color: #051d4d;
  }
  
  .markdown-alert-warning {
    border-color: #f85149;
    background-color: #2d1f1f;
  }
  
  .markdown-alert-tip {
    border-color: #3fb950;
    background-color: #1f2e1f;
  }
}
</style>
