export interface Struct {
  // Display text, e.g. type name without namespacing.
  text: string
  // The in-page HTML link anchor of this type
  // Always starts with 'T-' prefix (for type)
  hash: string
  // Markdown format description of the Struct type
  // can be empty string
  doc: string
  // All fields of this struct
  fields: StructField[]
}

export interface StructField {
  // The display name of the field
  text: string
  // The in-page HTML link anchor of this type
  // Always starts with 'V-' prefix (for value)
  hash: string
  // The display name of the field's typen
  // It is mostly a short and concise name.
  // For example:
  //  - Struct(struct_name1)
  //  - String("singleton_value")
  //  - Integer(1..10)
  //  - Enumm(true,false,quick_deny_anonymous)
  //  - Array(String)
  //  - OneOf(String, Integer, Struct(struct_name2)
  // However, for OneOf types, if there are many types, the display name can be very long.
  type: string
  // Doc of the field
  doc: string
  // The HOCON-style default value literal of the field
  // to be wrapped around <code> tag in markdown or HTML
  default?: string
  // Aliases of the field
  aliases?: string[]
  // Recursively expands the field's struct-type references.
  // It is usually a single struct, but can be a list of structs for OneOf types.
  refs: Struct[]
}
