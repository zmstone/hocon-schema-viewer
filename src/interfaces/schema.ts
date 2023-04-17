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
  aliases?: string[]
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
  | SingletonFieldType

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

export interface SingletonFieldType {
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
  list_display: string
  // only used for union, map, array
  type_display?: string
  // the document of a type
  // if a type has no doc, then the parent field's doc is used
  parent_field_doc?: string
  // the type for detailed fields resolution
  type: FieldType
  // parent node's type path
  tpath?: string
  // true if i'm a union member
  is_union_member?: boolean
}

export const unionMemberSelectorSymbol='@'
export const fieldSelectorSymbol='.'

function full_tpath(t: DisplayType): string {
  if (t.tpath) {
    if (t.is_union_member) {
      return t.tpath + unionMemberSelectorSymbol + t.list_display
    }
    return t.tpath + fieldSelectorSymbol + t.list_display
  }
  return t.list_display
}

// find the root display type of a given tpath
export function resolveRootDisplay(fields: Field[], tpath: string): DisplayType | null {
  if (tpath === '') {
    return null
  }
  for (let f of fields) {
    if (f.name === tpath) {
      return fieldToDisplayType('', f)
    }
    for (let alias of f.aliases || []) {
      if (alias === tpath) {
        return fieldToDisplayType('', f)
      }
    }
    for (let expand of f.expands || []) {
      if (full_tpath(expand) === tpath) {
        return expand
      }
    }
  }
  return null
}

export function fieldToDisplayType(rootName: string, f: Field): DisplayType {
  let tpath = f.name
  if (rootName !== '') {
    tpath = rootName + '.' + tpath
  }
  let res: DisplayType = {
    list_display: f.name,
    parent_field_doc: f.desc,
    type: f.type,
    tpath: rootName
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
export function liftStructs(t: FieldType): StructReference[] {
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
  const kind = (type as Record<string, any>).kind
  if (kind === 'primitive') {
    return shortener((type as PrimitiveFieldType).name)
  }
  if (kind === 'enum') {
    return (type as EnumFieldType).symbols.join(' | ')
  }
  if (kind === 'union') {
    const union = (type as UnionFieldType).members.map((elem: FieldType) => {
      return maybeShortTypeDisplay(elem, shortener)
    })
    return union.join(' | ')
  }
  if (kind === 'array') {
    return '[' + maybeShortTypeDisplay((type as ArrayFieldType).elements, shortener) + ']'
  }
  if (kind === 'struct') {
    return shortener((type as StructReference).name)
  }
  if (kind === 'singleton') {
    return shortener((type as SingletonFieldType).name)
  }
  if (kind === 'map') {
    return (
      '{$' +
      shortener((type as MapFieldType).name) +
      ' => ' +
      maybeShortTypeDisplay((type as MapFieldType).values, shortener) +
      '}'
    )
  }
  return shortener(kind)
}

export function typeDisplay(type: FieldType): string {
  return maybeShortTypeDisplay(type, (typeName) => typeName)
}

export function shortTypeDisplay(type: FieldType): string {
  return maybeShortTypeDisplay(type, short)
}

// importance levels are: 'hidden', 'low', 'medium' and 'high'
function importanceLevelToNumber(importance: string | undefined): number {
  switch (importance?.toLowerCase()) {
    case 'hidden':
      return 0
    case 'low':
      return 1
    case 'medium':
      return 2
    case 'high':
      return 3
    default:
      return 3
  }
}
// this function returns true if the field's importance is equal or higher than the expected importance level 
function isVisible(field: Field, expImportance: string): boolean {
  return importanceLevelToNumber(field.importance) >= importanceLevelToNumber(expImportance)
}

export function visibleFields(struct: Struct, importance: string) {
  return struct.fields.filter((field: Field) => {
    if (field.importance) {
      return isVisible(field, importance)
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
  return typeName.replace(/.*:/, '')
}

// lift structs to root level a field has doc_lift => true annotation.
// The second arg is a function to help resolving struct from its name.
// NOTE: this function only goes one level down the struct stack.
// but does not walk the full type tree.
export function initialize(root: Struct, findStruct: Function, importance: string): Field[] {
  const updatedFields: Field[] = []
  visibleFields(root, importance).forEach((field: Field) => {
    updatedFields.push(field) // Keep the parent field
    const parentName = field.name
    if (field.type.kind === 'struct') {
      const subStruct = findStruct(field.type.name)
      if (subStruct) {
        subStruct.fields.forEach((subField: Field) => {
          if (isVisible(subField, importance) && isDocLift(subField)) {
            subField.name = `${parentName}.${subField.name}` // Update the sub-field name
            updatedFields.push(subField) // Add the sub-field next to the parent field if doc_lift is true
          }
        })
      }
    }
  })
  // now expand the first level children
  updatedFields.forEach((f) => {
    f.expands = getExpands(f.name, f.type, findStruct, importance)
  })
  return updatedFields
}

function tidyNames(strings: string[]): string[] {
  // remove 'authn-' prefix
  return strings
    .map((s) => {
      // keep for older version emqx (before v5.0.23)
      return s.replace('authn-', '')
    })
    .map((s) => {
      // remove ':authentication' suffix
      // keep for older version emqx (before v5.0.23)
      return s.replace(':authentication', '')
    })
    .map(short)
}

// Get one-level expansion for a root field.
function getExpands(rootName: string, ft: FieldType, findStruct: Function, importance: string): DisplayType[] {
  if (ft.kind === 'array') {
    return getExpands(rootName, ft.elements, findStruct, importance)
  }
  if (ft.kind === 'struct') {
    const struct = findStruct(ft.name)
    if (allFieldsAreComplex(struct, importance)) {
      return visibleFields(struct, importance).map((f: Field) => {
        return fieldToDisplayType(rootName, f)
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
        type: ft.members[i],
        is_union_member: true,
        tpath: rootName
      }
    })
  }
  return []
}

function allFieldsAreComplex(t: Struct, importance: string) {
  return visibleFields(t, importance).every(isComplexField)
}
