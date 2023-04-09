import { Struct, Field, visibleFields, isDocLift } from '../interfaces/schema'
import jsonData from '../../public/schemas/latest-en.json'

type StructMap = { [name: string]: number }
let allStructs = jsonData as Struct[]
let nameIndex: StructMap = {}
export let Root: Struct = {}
export let DefaultAllStructs = allStructs

// find a struct by name
// making use of the index
export function findStruct(name: string): Struct | undefined {
  if (typeof nameIndex[name] === 'number') {
    return allStructs[nameIndex[name]]
  }
  console.log('Struct not found: ' + name)
}

export function updateSchema(data) {
  allStructs = data as Struct[]
  // index all structs by name
  for (let i = 0; i < allStructs.length; i++) {
    nameIndex[allStructs[i].full_name] = i
  }
  // now populate the Root
  Root = allStructs[0]
}

// initialize
updateSchema(jsonData)
