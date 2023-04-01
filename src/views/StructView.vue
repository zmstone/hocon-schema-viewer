<template>
  <div>
    <ul style="padding-left: 16px;">
      <li v-for="(field, index) in struct.fields">
        <span>{{ field.name }}</span>
        <span v-if="field.aliases.length>0"> [</span>
        <span v-for="(alias, index) in field.aliases">
          <span v-if="index >0">,</span>{{ alias }}</span>
        <span v-if="field.aliases.length>0">]</span>
        <span>: <code>{{ typeDisplay(field.type) }}</code></span>
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
import { defineComponent } from 'vue';
import * as schema from '../interfaces/schema';
import { findStruct } from '../data/data';

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
    isComplexType(type: schema.FieldType): boolean {
      return schema.isComplexType(type);
    },
    subStructs(type: schema.FieldType): schema.FieldType[] {
      return schema.liftStructs(type);
    },
    typeDisplay(type: schema.FieldType): string {
        if(type.kind === 'primitive') {
            return type.name
        }
        if(type.kind === 'enum'){
            return type.symbols.join(" | ");
        }
        if(type.kind === 'union'){
            const count = type.members.length;
            const union = type.members.slice(0,2).map((elem: schema.FieldType) => {
                return this.typeDisplay(elem);
            });
            if (count > 2) {
                union.push("...");
            }
            return union.join(" | ");
        }
        if(type.kind === 'array'){
            return "[" + this.typeDisplay(type.elements) + "]"
        }
        if(type.kind === 'struct'){
            return type.name;
        }
        if(type.kind === 'singleton'){
            return type.name;
        }
        if(type.kind === 'map'){
            return '{$' + type.name + ' => ' + this.typeDisplay(type.values) + '}'
        }
        return type.kind;
    },
    getStructComponent(): any {
        return this.StructView;
    },
    findStruct,
  }
});
</script>
