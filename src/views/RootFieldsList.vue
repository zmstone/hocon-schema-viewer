<script lang="ts">
import { defineComponent, ref } from 'vue'
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
  setup(props, { emit }) {
    // initialize the current root name, Must be the same as displayType in MainView
    // i.e. must be the first root level field
    const currentRootSelected = ref<number>(0)
    const currentExpandSelected = ref<number>(-1)
    const rootClicked = (index: number, displayType: schema.DisplayType) => {
      currentRootSelected.value = index
      currentExpandSelected.value = -1
      emit('selected', displayType)
    }
    const expandClicked = (index: number, displayType: schema.DisplayType) => {
      currentExpandSelected.value = index
      emit('selected', displayType)
    }

    return {
      currentRootSelected,
      currentExpandSelected,
      rootClicked,
      expandClicked
    }
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
      return schema.fieldToDisplayType(f)
    },
    maybeFold(isExpand, expands) {
      if (expands.length === 0) {
        return ''
      }
      const expandChar = '\u25B6' // Right-pointing triangle (▶)
      const collapseChar = '\u25BC' // Down-pointing triangle (▼)
      if (isExpand) {
        return collapseChar
      }
      return expandChar
    }
  }
})
</script>

<template>
  <div>
    <ul class="root-fields-list">
      <li v-for="(field, index) in rootFields" :key="index">
        <div class="root-field-display" @click="rootClicked(index, fieldToDisplayType(field))">
          <span :class="{ 'selected-root-field': currentRootSelected === index }">
            {{ field.name }} {{ annotate(field.type) }}
          </span>
          <span class="root-field-fold-state">
            <code>{{ maybeFold(currentRootSelected === index, field.expands) }}</code>
          </span>
        </div>
        <ul class="root-fields-sub-list" v-if="currentRootSelected === index">
          <li v-for="(expand, expIndex) in field.expands" :key="expIndex">
            <div class="root-field-display" @click="expandClicked(expIndex, expand)">
              <span :class="{ 'selected-root-field': currentExpandSelected === expIndex }">{{
                expand.list_display
              }}</span>
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.selected-root-field {
  background-color: #e4f5ea;
  border-radius: 4px;
}

.root-field-fold-state {
  font-size: 0.9em;
  margin: 0;
}

.root-field-display {
  display: flex;
  margin: 4px;
  padding-left: 0;
}

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

.root-fields-list li span {
  cursor: pointer;
  display: block;
  padding: 2px 6px;
  border-radius: 6px;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .selected-root-field {
    background-color: #2e5742;
    color: #d9e9d9;
  }
}

</style>
