// export type Sidebar = SidebarItem[] | SidebarMulti

// export interface SidebarMulti {
//   [path: string]: SidebarItem[] | { items: SidebarItem[]; base: string }
// }

export enum SidebarItemKind {
  // A config key name.
  ConfigKey,
  // A possible type of the config
  UnionTypeMember,
}

export type SidebarItem = {
  // The display text of the item.
  text: string
  // The link to expanded details of the item
  link?: string
  // Are the children-items config keys or types?
  kind?: SidebarItemKind
  // The children of this item.
  items?: SidebarItem[]
}

export interface Struct {
  // Display text, e.g. type name
  text: string
  // The link target of this struct
  // normalized from the full type name
  hash: string
  // Additional information about the struct
  label?: { text: string, type: string }[]
  // More information about the struct
  info: {attribute: string, specification: string, markdown?: boolean}[]
  // All fields of this struct
  fields: StructField[]
}

export interface StructField {
  // Name of the field
  name: string
  // Added new names for the field
  aliases?: string[]
  // The display text of the field type
  type: string
  // The link target of the field's sub-types
  references?: [{type: string, hash: string}]
  // More information about the field
  // default value, description, deprecation, importance
  info: {attribute: string, specification: string, markdown?: boolean}[]
}

const exampleData: Data = {
  sidebar: [
    {
      text: 'listeners',
      link: '#listeners',
      kind: SidebarItemKind.ConfigKey,
      items: [
        {
          text: 'tcp',
          link: '#listeners-tcp',
        }
      ]
    },
    {
      text: 'authentication[...]',
      link: '#authentication',
      kind: SidebarItemKind.UnionTypeMember,
      items: [
        {
          text: 'mongodb',
          link: '#authentication-mongodb'
        },
        {
          text: 'postgres',
          link: '#authentication-postgres'
        }
      ]
    }
  ],
  structs: [
    {
      text: 'Struct1',
      hash: '#struct1',
      label: [{ text: 'v5.3+', type: 'info' }, { text: 'experimental', type: 'warning' }],
      info: [
        {
          attribute: 'Description',
          specification: 'This is a markdown description which supports:<br/>  - HTML tags<br/>  - Markdown syntax',
          markdown: true,
        }
      ],
      fields: [
        {
          name: 'field1',
          type: 'String',
          references: [],
          info: [{ attribute: 'Description', specification: 'this is field 1'},
                 { attribute: 'Default', specification: 'default value for field 1'}
                ]
        },
        {
          name: 'fieldB',
          aliases: ['field2'],
          type: "oneOf: Struct2 StructB",
          references: [{type: 'Struct2', hash: '#struct2'}, {type: 'StructB', hash: '#structb'}],
          info: [{ attribute: 'Description', specification: 'this is field 2'}]
        }
      ],
    }
  ]
}
