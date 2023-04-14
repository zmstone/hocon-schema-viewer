import type { Struct } from '../interfaces/schema'
import jsonData from '../../public/schemas/latest-en.json'

type StructMap = { [name: string]: number }
let allStructs = jsonData as Struct[]
let nameIndex: StructMap = {}
export let Root: Struct | null = null
export let DefaultAllStructs = allStructs

export interface SchemaFile {
  name: string
  file: string
}

// find a struct by name
// making use of the index
export function findStruct(name: string): Struct | undefined {
  if (typeof nameIndex[name] === 'number') {
    return allStructs[nameIndex[name]]
  }
  console.log('Struct not found: ' + name)
}

export function updateSchema(data: Struct[]) {
  // index all structs by name
  for (let i = 0; i < data.length; i++) {
    nameIndex[data[i].full_name] = i
  }
  // now populate the Root
  Root = data[0]
}

// initialize
updateSchema(jsonData as Struct[])
