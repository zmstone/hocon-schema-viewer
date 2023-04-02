export interface Struct {
  desc?: string
  fields: Field[]
  full_name: string
  paths: string[]
  tags: string[]
}

export interface Field {
  aliases: string[]
  default?: DefaultValue
  desc?: string
  name: string
  raw_default?: string
  type: FieldType
}

export interface DefaultValue {
  hocon?: string
  oneliner?: boolean
}

export type FieldType =
  | StructReference
  | PrimitiveFieldType
  | MapFieldType
  | ArrayFieldType
  | EnumFieldType
  | UnionFieldType

export interface EnumFieldType {
  kind: 'enum'
  symbols: string[]
}

export interface StructReference {
  kind: 'struct'
  name: string
}

export interface PrimitiveFieldType {
  kind: 'primitive'
  name: string
}

export interface SingletonType {
  kind: 'singleton'
  name: string
}

export interface MapFieldType {
  kind: 'map'
  name: string
  values: FieldType
}

export interface ArrayFieldType {
  kind: 'array'
  elements: FieldType
}

export interface UnionFieldType {
  kind: 'union'
  members: FieldType[]
}

export interface DisplayType {
  label: string
  desc: string
  type: FieldType
}

// Dig up all the fist-level structs of a given type
// below types will be tricky:
// * union of unions
// * array of arrays
// * map of maps
// the situation so far: assume thereis no such cases
export function liftStructs(t: FieldType): FieldType[] {
  if (t.kind === 'struct') {
    return [t]
  }
  if (t.kind === 'map') {
    return liftStructs(t.values)
  } else if (t.kind === 'array') {
    return liftStructs(t.elements)
  } else if (t.kind === 'union') {
    return t.members.flatMap(liftStructs)
  }
  return []
}

export function isComplexType(t: FieldType): boolean {
  // struct is always complex
  if (t.kind === 'struct') {
    return true
  }
  return liftStructs(t).some(isComplexType)
}

// it's a complex field if field type is complex
// also all its subtypes are complex
export function isComplexField(field: Field): boolean {
  return isComplexType(field.type)
}

export function typeDisplay(type: FieldType): string {
  if (type.kind === 'primitive') {
    return type.name
  }
  if (type.kind === 'enum') {
    return type.symbols.join(' | ')
  }
  if (type.kind === 'union') {
    const count = type.members.length
    const union = type.members.map((elem: FieldType) => {
      return typeDisplay(elem)
    })
    return union.join(' | ')
  }
  if (type.kind === 'array') {
    return '[' + typeDisplay(type.elements) + ']'
  }
  if (type.kind === 'struct') {
    return type.name
  }
  if (type.kind === 'singleton') {
    return type.name
  }
  if (type.kind === 'map') {
    return '{$' + type.name + ' => ' + typeDisplay(type.values) + '}'
  }
  return type.kind
}
