<script setup lang="ts">
import { defineComponent, ref, computed } from 'vue'
import StructView from './views/StructView.vue'
import { Root, findStruct } from './data/data'
import * as schema from './interfaces/schema'
import { stringify } from 'querystring'
import * as markdown from './markdown';

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
const selectType = (type, desc, expIndex) => {
  if(type.desc === undefined){
    type.desc = desc
  }
  selectedType.value = type
  selectedExpandIndex.value = expIndex
}

const toggleExpand = (index) => {
  if (expanded.value[index] === undefined) {
    expanded.value[index] = false
  }
  expanded.value[index] = !expanded.value[index]
}

const renderMarkdown = (desc) => {
  return markdown.render(desc)
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

const getExpands = (type: schema.FieldType) => {
  if (type.kind === 'array') {
    return getExpands(type.elements)
  }
  if (type.kind === 'struct') {
    const struct = findStruct(type.name);
    if(allFieldsAreComplex(struct)){
      return struct.fields.map((f) => {
        return {
          type_display: f.name,
          desc: f.desc,
          type: f.type
        }
      })
    }
    return [];
  }
  if (type.kind === 'union') {
    const displayNames = type.members.map((m) => {
      return schema.typeDisplay(m)
    })
    const tidyDisplayNames = tidyNames(displayNames)
    return tidyDisplayNames.map((tidyName, i) => {
      return {
        type_display: tidyName,
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
    .map((s) => {
      // remove 'authz:' prefix
      return s.replace('authz:', '')
    })
}

const displayType = computed(() => {
  if (selectedType.value) {
    return {
      type_display: schema.typeDisplay(selectedType.value),
      desc: selectedType.value.desc,
      type: selectedType.value
    }
  } else {
    const field = root.fields[selectedTabIndex.value]
    return {
      desc: field.desc,
      type_display: schema.typeDisplay(field.type),
      type: field.type
    }
  }
})

const liftedStructs = computed(() => {
  const refs = schema.liftStructs(displayType.value.type)
  return refs.map((r: schema.StructReference) => findStruct(r.name))
})
</script>

<template>
  <h1>HOCON schema viewer (EMQX)</h1>
  <div class="split-view">
    <div class="sidebar">
      <ul class="nav-list">
        <li v-for="(field, index) in root.fields" :key="index">
          <span @click="selectTab(index)" :class="{ 'active-tab': selectedTabIndex === index }">
            {{ field.name }}{{ annotate(field.type) }}
          </span>
          <ul v-show="expanded[index]" class="sub-buttons">
            <li
              v-for="(expand, expIndex) in getExpands(field.type)"
              :key="expIndex"
              @click="selectType(expand.type, expand.desc, expIndex)"
            >
              <span :class="{ 'selected-expand': selectedExpandIndex === expIndex }">
                {{ expand.type_display }}
              </span>
            </li>
          </ul>
        </li>
      </ul>
    </div>
    <div class="content">
      <div class="desc" v-if="displayType.desc" v-html="renderMarkdown(displayType.desc)"></div>
      <br/><div class="type_display"><code>{{ displayType.type_display }}</code></div><br/>
      <struct-view v-for="(st, i) in liftedStructs" :key="i" :struct="st" />
    </div>
  </div>
</template>

<style scoped>
/* Light mode styles (default) */
.split-view {
  display: grid;
  grid-template-columns: min-content 1fr;
  grid-gap: 20px;
}

.sidebar {
  border-right: 1px solid #ccc;
  padding: 10px;
  background-color: #fff;
}

.nav-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: contents;
}

.nav-list li {
  padding: 1px 0;
}

.sub-buttons li {
  padding: 1px 0;
}

.nav-list li span {
  display: inline-block;
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
  background-color: #fff;
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
  border-radius: 4px;
}

/* Dark mode styles */
@media (prefers-color-scheme: dark) {
  .sidebar,
  .content {
    background-color: #1e1e1e;
  }

  .nav-list li span:hover {
    background-color: #3a3a3a;
  }

  .desc {
    background-color: #282828;
    color: #ccc;
  }

  .type_display {
    background-color: #2d2d2d;
    color: #ccc;
  }

  .small-type {
    background-color: #3a3a3a;
    color: #ccc;
  }
}
</style>
