import type { Struct } from '../interfaces/schema'
import jsonData from '../assets/schema-en.json'

type StructMap = { [name: string]: number }
const allStructs = jsonData as Struct[]
const nameIndex: StructMap = {}

export const Root: Struct = allStructs[0]
for (let i = 0; i < allStructs.length; i++) {
  nameIndex[allStructs[i].full_name] = i
}
//console.log(Root);

export function findStruct(name: string): Struct | undefined {
  if (typeof nameIndex[name] === 'number') {
    return allStructs[nameIndex[name]]
  }
  console.log('Struct not found: ' + name)
}
