<script lang="ts">
import { defineComponent, ref } from 'vue'
import type { PropType } from 'vue'
import * as schema from '../schema'

export default defineComponent({
  name: 'StructView',
  emits: ['show-example', 'hide-example'],
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
    const showExample = (event?: MouseEvent) => {
      emit('show-example', {
        struct: props.currentStruct,
        valuePath: props.valuePath,
        clientX: event?.clientX,
        clientY: event?.clientY
      })
    }
    function isVisible(field: schema.Field): boolean {
      return schema.isVisible(field, props.importanceLevel)
    }

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
    resolveStruct(name: string): schema.Struct | null {
      const resolved = this.structResolver(name)
      if (!resolved) {
        return null
      }
      return resolved as schema.Struct
    },
    visibleFields(struct: schema.Struct) {
      return schema.visibleFields(struct)
    },
    markdownToHtml(str: string): string {
      return this.markdownProvider(str)
    },
    maybeFold() {
      const expandChar = 'Expand'
      const collapseChar = 'Collapse'
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
  <section class="struct-view">
    <div class="struct-head">
      <button class="struct-fullname" @click="toggleExpand()" type="button">
        <code>{{ currentStruct.full_name }}</code>
        <span class="fold-state">{{ maybeFold() }}</span>
      </button>
      <button
        @click="showExample($event)"
        class="example-button"
        type="button"
      >
        Example
      </button>
    </div>
    <ul class="field-list" v-if="isExpanded">
      <li
        v-for="(field, index) in visibleFields(currentStruct)"
        :key="index"
        class="field-item"
        v-show="isVisible(field)"
      >
        <div v-if="isVisible(field)">
          <div class="field-card">
            <div class="field-header">
              <h3 class="fieldname">{{ field.name }}</h3>
            </div>
            <table class="field-table">
              <tbody>
                <tr v-if="field.aliases && field.aliases.length > 0">
                  <td>Aliases:</td>
                  <td>
                    <span v-for="(alias, aliasIndex) in field.aliases" :key="aliasIndex">
                      <span v-if="aliasIndex > 0">, </span>{{ alias }}
                    </span>
                  </td>
                </tr>
                <tr v-if="field.type.kind !== 'struct'">
                  <td>Type:</td>
                  <td>
                    <code>{{ typeDisplay(field.type) }}</code>
                  </td>
                </tr>
                <tr v-if="field.raw_default">
                  <td>Default:</td>
                  <td>
                    <code>{{ field.raw_default }}</code>
                  </td>
                </tr>
                <tr v-if="field.desc">
                  <td>Description:</td>
                  <td><div v-html="markdownToHtml(field.desc)"></div></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="isComplexType(field.type)"
            v-for="(st, subIndex) in subStructs(field)"
            :key="`${field.name}-${subIndex}`"
            class="sub-struct"
          >
            <StructView
              v-if="resolveStruct(st.name)"
              :currentStruct="resolveStruct(st.name)"
              :markdownProvider="markdownProvider"
              :structResolver="structResolver"
              :expandByDefault="true"
              :importanceLevel="importanceLevel"
              :isRoot="false"
              :valuePath="appendPath(valuePath, st.name, field.name)"
              @show-example="$emit('show-example', $event)"
              @hide-example="$emit('hide-example')"
            />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.struct-view {
  padding-top: 0.75rem;
}

.struct-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.struct-fullname {
  cursor: pointer;
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
  padding: 0.72rem 0.86rem;
  background: rgba(94, 78, 255, 0.06);
  border: 1px solid rgba(94, 78, 255, 0.24);
  border-radius: 12px;
  font-size: 0.86rem;
  color: var(--text-strong);
  text-align: left;
}

.example-button {
  border: 1px solid var(--line-strong);
  background: var(--panel-primary);
  color: var(--text-dim);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
}

.example-button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.field-list {
  list-style-type: none;
  padding-left: 0;
  padding-top: 0.8rem;
  display: grid;
  gap: 0.8rem;
}

.field-item {
  margin: 0;
}

.field-card {
  border: 1px solid var(--line-subtle);
  border-radius: 12px;
  padding: 0.75rem 0.85rem;
  background: var(--panel-primary);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.field-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
  margin-bottom: 0.45rem;
}

.fieldname {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.field-table {
  width: 100%;
  border-collapse: collapse;
}

.field-table td,
.field-table th {
  border: 0;
  padding: 0.42rem 0;
  vertical-align: top;
}

.field-table td:first-child {
  text-align: left;
  font-size: 0.75rem;
  color: var(--text-dim);
  min-width: 110px;
  padding-right: 0.8rem;
}

.field-table tr {
  border-bottom: 1px dashed var(--line-subtle);
}

.field-table tr:last-child {
  border-bottom: 0;
}

.sub-struct {
  margin: 0.7rem 0 0;
  padding-left: 110px;
  padding-right: 0.2rem;
}

.sub-struct > .struct-view {
  padding-left: 0.8rem;
  border-left: 1px dashed var(--line-subtle);
}

.fold-state {
  font-size: 0.74rem;
  color: var(--text-dim);
}

@media (max-width: 900px) {
  .field-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .struct-fullname {
    font-size: 0.8rem;
  }
}
</style>
