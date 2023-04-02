<template>
  <div class="struct-view">
    <ul class="field-list">
      <li v-for="(field, index) in struct.fields" class="field-item">
        <span class="fieldname">{{ field.name }} </span>

        <span v-if="field.aliases.length > 0"> [</span>
        <span v-for="(alias, index) in field.aliases">
          <span v-if="index > 0">,</span>
          {{ alias }}
        </span>
        <span v-if="field.aliases.length > 0">]</span>

        : <span class="type-display"><code>{{ typeDisplay(field.type) }}</code></span>
        <br />
        <div class="desc">{{ field.desc }}</div>
        <struct-view v-if="field.type.kind === 'struct'" :struct="findStruct(field.type.name)" />
        <div v-if="isComplexType(field.type)">
          <div v-for="(st, index) in subStructs(field)">
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
    subStructs(field: schema.Field): schema.FieldType[] {
      if(field.doc_lift === true){
        return [];
      }
      return schema.liftStructs(field.type);
    },
    typeDisplay(type: schema.FieldType): string {
      return schema.shortTypeDisplay(type)
    },
    findStruct
  }
})
</script>
<style scoped>
.struct-view {
  padding: 0;
  margin: 0;
}
.desc {
  padding: 10px;
  background-color: #f5f5f5;
}
.field-list {
  list-style-type: none;
  padding-left: 16px;
  margin: 0;
}
.type-display {
  font-size: 0.8rem;
  background-color: #e0f0ff;
  padding: 2px 4px;
  border-radius: 4px;
  color: #333;
}
</style>
