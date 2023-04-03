import { Struct, Field, visibleFields, isDocLift } from '../interfaces/schema'
import jsonData from '../../public/schemas/latest-en.json'

type StructMap = { [name: string]: number }
let allStructs = jsonData as Struct[]
let nameIndex: StructMap = {}
export let Root: Struct = {}

// find a struct by name
// making use of the index
export function findStruct(name: string): Struct | undefined {
  if (typeof nameIndex[name] === 'number') {
    return allStructs[nameIndex[name]]
  }
  console.log('Struct not found: ' + name)
}

function updateRootFields(root: Struct) {
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

  root.fields = updatedFields
}

export function updateSchema(data) {
  allStructs = data as Struct[]
  // index all structs by name
  for (let i = 0; i < allStructs.length; i++) {
    nameIndex[allStructs[i].full_name] = i
  }
  // now populate the Root
  Root = allStructs[0]
  // Update the Root fields
  updateRootFields(Root)
}

// initialize
updateSchema(jsonData)
