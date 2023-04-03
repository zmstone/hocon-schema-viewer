export interface Struct {
  desc?: string
  fields: Field[]
  full_name: string
  paths: string[]
  tags: string[]
}

export interface Extra {
  doc_lift?: boolean
}

export interface Field {
  aliases: string[]
  default?: DefaultValue
  importance?: string
  desc?: string
  name: string
  raw_default?: string
  type: FieldType
  extra?: Extra
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
  type_display: string
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

function maybeShortTypeDisplay(type: FieldType, shortener: (typeName: string) => string): string {
  if (type.kind === 'primitive') {
    return shortener(type.name)
  }
  if (type.kind === 'enum') {
    return type.symbols.join(' | ')
  }
  if (type.kind === 'union') {
    const union = type.members.map((elem: FieldType) => {
      return maybeShortTypeDisplay(elem, shortener)
    })
    return union.join(' | ')
  }
  if (type.kind === 'array') {
    return '[' + maybeShortTypeDisplay(type.elements, shortener) + ']'
  }
  if (type.kind === 'struct') {
    return shortener(type.name)
  }
  if (type.kind === 'singleton') {
    return shortener(type.name)
  }
  if (type.kind === 'map') {
    return (
      '{$' + shortener(type.name) + ' => ' + maybeShortTypeDisplay(type.values, shortener) + '}'
    )
  }
  return shortener(type.kind)
}

export function typeDisplay(type: FieldType): string {
  return maybeShortTypeDisplay(type, (typeName) => typeName)
}

export function shortTypeDisplay(type: FieldType): string {
  return maybeShortTypeDisplay(type, short)
}

export function visibleFields(struct) {
  return struct.fields.filter((field) => {
    if (field.importance) {
      return field.importance !== 'hidden'
    }
    return true
  })
}

export function isDocLift(field: Field): boolean {
  return field?.extra?.doc_lift === true
}

// remove the module:type() prefix from a type name
function short(typeName: string, isShort: boolean): string {
  return typeName.replace(/.*:/, '').replace(/.*\./, '')
}
