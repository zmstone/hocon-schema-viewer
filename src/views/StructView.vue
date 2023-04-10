<script lang="ts">
import { defineComponent } from 'vue'
import * as schema from '../interfaces/schema'

export default defineComponent({
  name: 'StructView',
  props: {
    // the current struct to expand
    currentStruct: {
      type: schema.Struct,
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
    }
  },
  setup(props) {},
  components: {
    StructView: () => import('./StructView.vue')
  },
  methods: {
    isComplexType(type: schema.FieldType): boolean {
      return schema.isComplexType(type)
    },
    subStructs(field: schema.Field): schema.FieldType[] {
      if (field.extra?.doc_lift === true) {
        return []
      }
      return schema.liftStructs(field.type)
    },
    typeDisplay(type: schema.FieldType): string {
      return schema.shortTypeDisplay(type)
    },
    findStruct(name) {
      return this.structResolver(name)
    },
    visibleFields(struct) {
      return schema.visibleFields(struct)
    },
    aliasesDisplay(field) {
      return '[' + field.aliases.join(',') + ']'
    },
    markdownToHtml(str: string): string {
      return this.markdownProvider(str)
    }
  }
})
</script>

<template>
  <div class="struct-view">
    <span class="struct-fullname"
      ><code>{{ currentStruct.full_name }}</code></span
    >
    <ul class="field-list">
      <li v-for="(field, index) in visibleFields(currentStruct)" class="field-item">
        <div class="fieldname">{{ field.name }}</div>
        <table>
          <tr v-if="field.aliases.length > 0">
            <td>Aliases:</td>
            <td>
              <span v-for="(alias, index) in field.aliases">
                <span v-if="index > 0">, </span>{{ alias }}
              </span>
            </td>
          </tr>
          <tr>
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
            :currentStruct="findStruct(st.name)"
            :markdownProvider="markdownProvider"
            :structResolver="structResolver"
          />
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

.type_display {
  padding: 2px 4px;
  background-color: #e4f5ea;
  font-size: 0.9em;
  border-radius: 4px;
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
  padding: 8px;
  background-color: #e4f5ea;
  border-radius: 4px;
  font-size: 0.67em;
}

.struct-view {
  padding-top: 10px;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .type_display {
    background-color: #2d2d2d;
    color: #ccc;
  }
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
