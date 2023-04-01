<template>
  <div>
    <ul style="padding-left: 16px">
      <li v-for="(field, index) in struct.fields">
        <span>{{ field.name }}</span>
        <span v-if="field.aliases.length > 0"> [</span>
        <span v-for="(alias, index) in field.aliases">
          <span v-if="index > 0">,</span>{{ alias }}</span
        >
        <span v-if="field.aliases.length > 0">]</span>
        <span>: <code>{{ typeDisplay(field.type) }}</code></span>
        <div> {{ field.desc }} </div>
        <struct-view v-if="field.type.kind === 'struct'" :struct="findStruct(field.type.name)" />
        <div v-if="isComplexType(field.type)">
          <div v-for="(st, index) in subStructs(field.type)">
            <struct-view :struct="findStruct(st.name)" />
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import * as schema from '../interfaces/schema'
import { findStruct } from '../data/data'

export default defineComponent({
  name: 'StructView',
  props: {
    struct: {
      type: schema.Struct,
      required: true
    }
  },
  components: {
    StructView: () => import('./StructView.vue')
  },
  methods: {
    isComplexType(type: schema.FieldType): boolean {
      return schema.isComplexType(type)
    },
    subStructs(type: schema.FieldType): schema.FieldType[] {
      return schema.liftStructs(type)
    },
    typeDisplay(type: schema.FieldType): string {
      return schema.typeDisplay(type)
    },
    findStruct,
  }
})
</script>
