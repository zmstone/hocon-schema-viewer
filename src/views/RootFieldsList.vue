<script lang="ts">
import { defineComponent } from 'vue'
import * as schema from '../interfaces/schema'

type StructsIndex = { [name: string]: number }

export default defineComponent({
  name: 'RootFieldsList',
  props: {
    rootFields: {
      type: Array,
      required: true
    }
  },
  setup(props) {
    return {}
  },
  methods: {
    annotate(type: schema.FieldType) {
      if (type.kind === 'array') {
        return '[...]'
      }
      if (type.kind === 'map') {
        return schema.shortTypeDisplay(type)
      }
      return ''
    },
    fieldToDisplayType(f: Field) {
        return schema.fieldToDisplayType(f);
    },
    fieldClicked(displayType: schema.DisplayType) {
      this.$emit('selected', displayType)
    }
  }
})
</script>

<template>
  <div class="root-fields-list">
    <ul>
      <li v-for="(field, index) in rootFields" :key="index">
        <span @click="fieldClicked(fieldToDisplayType(field))">
          {{ field.name }}{{ annotate(field.type) }}
        </span>
        <ul class="root-fiels-list">
          <li v-for="(expand, expIndex) in field.expands" :key="expIndex">
            <span @click="fieldClicked(expand)">
              {{ expand.list_display }}
            </span>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.root-fields-list ul {
  padding-left: 20px;
  list-style-type: none;
}
.root-fields-list li {
  padding: 2px 0;
}
</style>
