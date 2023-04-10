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
  <div>
    <ul class="root-fields-list">
      <li v-for="(field, index) in rootFields" :key="index">
        <span @click="fieldClicked(fieldToDisplayType(field))">
          {{ field.name }}{{ annotate(field.type) }}
        </span>
        <ul class="root-fields-sub-list">
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
.root-fields-list {
  padding-left: 0;
  margin: 0;
  list-style-type: none;
}

.root-fields-sub-list {
  padding-left: 20px;
  margin: 0;
  list-style-type: none;
}

</style>
