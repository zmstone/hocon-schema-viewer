import { Struct, Field, visibleFields } from '../interfaces/schema'
import jsonData from '../assets/schema-en.json'

type StructMap = { [name: string]: number }
const allStructs = jsonData as Struct[]
const nameIndex: StructMap = {}

// index all structs by name
for (let i = 0; i < allStructs.length; i++) {
  nameIndex[allStructs[i].full_name] = i
}

// find a struct by name
// making use of the index
export function findStruct(name: string): Struct | undefined {
  if (typeof nameIndex[name] === 'number') {
    return allStructs[nameIndex[name]]
  }
  console.log('Struct not found: ' + name)
}

// now populate the Root
export let Root: Struct = allStructs[0]

function updateRootFields(root: Struct) {
  const updatedFields: Field[] = [];

  visibleFields(root).forEach((field) => {
    updatedFields.push(field); // Keep the parent field
    const parentName = field.name;
    if (field.type.kind === 'struct') {
      const subStruct = findStruct(field.type.name);

      if (subStruct) {
        subStruct.fields.forEach((subField) => {
          if (subField.doc_lift === true) {
            subField.name = `${parentName}.${subField.name}`; // Update the sub-field name
            updatedFields.push(subField); // Add the sub-field next to the parent field if doc_lift is true
          }
        });
      }
    }
  });

  root.fields = updatedFields;
}

// Update the Root fields
updateRootFields(Root);
