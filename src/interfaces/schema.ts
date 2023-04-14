export interface Struct {
  desc?: string
  fields: Field[]
  full_name: string
  paths: string[]
  tags: string[]
  initialized?: boolean
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
  // only possible for root fields
  expands?: DisplayType[]
  deprecated?: string
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

// the type to be displayed with detail
export interface DisplayType {
  // the name used in sidebar list, only used for expanded
  // root level fields
  list_display?: string
  // only used for union, map, array
  type_display?: string
  // the document of a type
  // if a type has no doc, then the parent field's doc is used
  parent_field_doc?: string
  // the type for detailed fields resolution
  type: FieldType
}

export function fieldToDisplayType(f: Field) {
  let res = {
    list_display: f.name,
    parent_field_doc: f.desc,
    type: f.type
  }
  if (f.type.kind != 'struct') {
    res.type_display = typeDisplay(f.type)
  }
  return res
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
    // TODO: make user to choose if they want to see deprecated fields
    if (field.desc && field.desc.startsWith('Deprecated since')) {
      return false
    }
    return true
  })
}

export function isDocLift(field: Field): boolean {
  return field?.extra?.doc_lift === true
}

// remove the module:type() prefix from a type name
function short(typeName: string): string {
  return typeName.replace(/.*:/, '');
}

// lift structs to root level a field has doc_lift => true annotation.
// The second arg is a function to help resolving struct from its name.
// NOTE: this function only goes one level down the struct stack.
// but does not walk the full type tree.
export function initialize(root: Struct, findStruct: Function): Field[] {
  const updatedFields: Field[] = []
  visibleFields(root).forEach((field) => {
    updatedFields.push(field) // Keep the parent field
    const parentName = field.name
    if (field.type.kind === 'struct') {
      const subStruct = findStruct(field.type.name)
      if (subStruct) {
        subStruct.fields.forEach((subField) => {
          if (isDocLift(subField)) {
            subField.name = `${parentName}.${subField.name}` // Update the sub-field name
            updatedFields.push(subField) // Add the sub-field next to the parent field if doc_lift is true
          }
        })
      }
    }
  })
  // now expand the first level children
  updatedFields.forEach((f) => {
    f.expands = getExpands(f.type, findStruct)
  })
  return updatedFields
}

// TODO: fix EMQX authn schema.
// After the fix, function 'short' should be enough for the same purpose.
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

// Get one-level expansion for a root field.
function getExpands(ft: FieldType, findStruct: Function) {
  if (ft.kind === 'array') {
    return getExpands(ft.elements, findStruct)
  }
  if (ft.kind === 'struct') {
    const struct = findStruct(ft.name)
    if (allFieldsAreComplex(struct)) {
      return visibleFields(struct).map((f) => {
        return fieldToDisplayType(f)
      })
    }
    return []
  }
  if (ft.kind === 'union') {
    const displayNames = ft.members.map((m) => {
      return typeDisplay(m)
    })
    return tidyNames(displayNames).map((tidyName, i) => {
      return {
        list_display: tidyName,
        type: ft.members[i]
      }
    })
  }
  return []
}

function allFieldsAreComplex(t: Struct) {
  return visibleFields(t).every(isComplexField)
}
