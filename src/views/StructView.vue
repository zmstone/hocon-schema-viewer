<template>
  <div>
    <ul style="padding-left: 16px;">
      <li v-for="(field, index) in struct.fields" :key="index">
        <span>{{ field.name }}</span>
        <span v-if="field.aliases.length>0"> [</span>
        <span v-for="(alias, index) in field.aliases">
          <span v-if="index >0">,</span>{{ alias }}</span>
        <span v-if="field.aliases.length>0">]</span>
        <br/>
        <span>type: {{ field.type.kind }}</span>
        <struct-view v-if="field.type.kind === 'struct'" :struct="findStruct(field.type.name)" />
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import * as schema from '../interfaces/schema';
import AllStructs from '../data/data';

export default defineComponent({
  name: 'StructView',
  props: {
    struct: {
      type: schema.Struct,
      required: true,
    },
  },
  components: {
    StructView: () => import('./StructView.vue'),
  },
  methods: {
    findStruct(name: string): schema.Struct {
      return AllStructs.find((s) => s.full_name === name) as schema.Struct;
    }
  }
});
</script>
