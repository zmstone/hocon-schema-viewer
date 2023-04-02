<template>
  <div class="split-view">
    <div class="sidebar">
      <ul class="nav-list">
        <li v-for="(field, index) in root.fields" :key="index">
          <span @click="selectTab(index)" :class="{ 'active-tab': selectedTabIndex === index }">
            {{ field.name }} {{ annotate(field.type) }} {{ maybeExpandable(field.type) }}
          </span>
          <ul v-show="expanded[index]" class="sub-buttons">
            <li
              v-for="(expand, expIndex) in getExpands(field.type)"
              :key="expIndex"
              @click="selectType(expand.type, expIndex)"
            >
              <span :class="{ 'selected-expand': selectedExpandIndex === expIndex }">
                {{ expand.label }}
              </span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="content">
      <div class="desc">{{ displayType.desc }}</div>
      <br/><div class="type_display"><code>{{ displayType.label }}</code></div><br/>
      <struct-view v-for="(st, i) in liftedStructs" :key="i" :struct="st" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineComponent, ref, computed } from 'vue'
import StructView from './views/StructView.vue'
import { Root, findStruct } from './data/data'
import * as schema from './interfaces/schema'
import { stringify } from 'querystring'
const root: schema.Struct = Root

const selectedTabIndex = ref(0)
const expanded = ref([])
const selectTab = (index) => {
  selectedType.value = null
  if (selectedTabIndex.value !== index) {
    expanded.value = expanded.value.map(() => false); // Reset expanded values
  }
  selectedType.value = null
  selectedExpandIndex.value = null
  selectedTabIndex.value = index;
  toggleExpand(index)
}

const selectedType = ref(null)
const selectedExpandIndex = ref(null)
const selectType = (type, expIndex) => {
  selectedType.value = type
  selectedExpandIndex.value = expIndex
}

const toggleExpand = (index) => {
  if (expanded.value[index] === undefined) {
    expanded.value[index] = false
  }
  expanded.value[index] = !expanded.value[index]
}

const annotate = (type: schema.FieldType) => {
  if (type.kind === 'array') {
    return '[...]'
  }
  if(type.kind === 'map') {
    return schema.shortTypeDisplay(type)
  }
  return ''
}

const isExpandable = (type: schema.FieldType) => {
  return getExpands(type).length > 0
}

const maybeExpandable = (type: schema.FieldType) => {
  return isExpandable(type) ? '+' : ''
}

const getExpands = (type: schema.FieldType) => {
  if (type.kind === 'array') {
    return getExpands(type.elements)
  }
  if (type.kind === 'struct') {
    const struct = findStruct(type.name);
    if(allFieldsAreComplex(struct)){
      return struct.fields.map((f) => {
        return {
          label: f.name,
          desc: f.desc,
          type: f.type
        }
      })
    }
  }
  if (type.kind === 'union') {
    const displayNames = type.members.map((m) => {
      return schema.typeDisplay(m)
    })
    const tidyDisplayNames = tidyNames(displayNames)
    return tidyDisplayNames.map((tidyName, i) => {
      return {
        label: tidyName,
        desc: type.members[i].desc,
        type: type.members[i]
      }
    })
  }
  return []
}

function allFieldsAreComplex(type: schema.Struct) {
  return type.fields.every(schema.isComplexField);
}

function tidyNames(strings: string[]): string[] {
  // remove 'authn-' prefix
  return strings
    .map((s) => {
      return s.replace('authn-', '')
    })
    .map((s) => {
      // remove ':authentication' suffix
      return s.replace(':authentication', '')
    })
}

const displayType = computed(() => {
  if (selectedType.value) {
    return {
      label: schema.typeDisplay(selectedType.value),
      desc: selectedType.value.desc,
      type: selectedType.value
    }
  } else {
    const field = root.fields[selectedTabIndex.value]
    return {
      desc: field.desc,
      label: schema.typeDisplay(field.type),
      type: field.type
    }
  }
})

const liftedStructs = computed(() => {
  const refs = schema.liftStructs(displayType.value.type)
  return refs.map((r: schema.StructReference) => findStruct(r.name))
})
</script>

<style scoped>
.split-view {
  display: flex;
}

.sidebar {
  width: 250px;
  border-right: 1px solid #ccc;
  padding: 10px;
}

.nav-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
}

.nav-list li {
  padding: 0px 0;
}

.nav-list li span {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}

.nav-list li span:hover {
  background-color: #eee;
}

.content {
  flex: 1;
  padding: 10px;
}

.active-tab {
  color: #fff;
  background-color: #5a8dd6;
}

.desc {
  padding: 10px;
  background-color: #f5f5f5;
}

.type_display {
  padding: 10px;
  background-color: #e4f5ea;
}
.sub-buttons {
  padding-left: 20px;
  list-style-type: none;
}
.selected-expand {
  color: #fff;
  background-color: #5a8dd6;
  padding: 2px 4px;
  border-radius: 4px;
}
</style>
