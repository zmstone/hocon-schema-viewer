export type SidebarItem = {
  // The display text of the item.
  text: string
  // The link to expanded details of the item
  link?: string
  // Are the children-items config keys or types?
  // possible values are 'config-key' or 'type'
  kind?: string
  // The children of this item.
  items?: SidebarItem[]
}

export interface Struct {
  // Display text, e.g. type name without namespacing.
  text: string
  // The link-target of this struct.
  // Normalized from the type full-name
  hash: string
  // Markdown format description of the Struct type
  description?: string
  // All fields of this struct
  fields: StructField[]
}

export interface StructField {
  // Name of the field
  name: string
  // Added new names for the field
  aliases?: string[]
  // Possible types of the field.
  // Mostly it's a single element array, but in case of union types
  // it's a list of possible typesa.
  // When the item is a Struct type, the hash is the link to the Struct
  types: { type: string; link?: string }[]
  // Default value
  default_value?: string
  // Description of the field
  description?: string
  // Importance level of the field, possible values are 'low', 'medium', 'high'.
  // If not set, it's means 'high' level
  importance: string
}
