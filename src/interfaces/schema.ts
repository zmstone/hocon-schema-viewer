export default interface Struct {
  desc?: string;
  fields: Field[];
  full_name: string;
  paths: string[];
  tags: string[];
}

export interface Field {
  aliases: string[];
  default?: DefaultValue;
  desc?: string;
  name: string;
  raw_default?: string;
  type: FieldType;
}

export interface DefaultValue {
  hocon?: string;
  oneliner?: boolean;
}

export type FieldType =
  | StructReference
  | PrimitiveFieldType
  | MapFieldType
  | ArrayFieldType
  | UnionFieldType;

export interface StructReference {
  kind: "struct";
  name: string;
}

export interface PrimitiveFieldType {
  kind: "primitive";
  name: string;
}

export interface MapFieldType {
  kind: "map";
  name: string;
  values: FieldType;
}

export interface ArrayFieldType {
  kind: "array";
  name: string;
  elements: FieldType;
}

export interface UnionFieldType {
  kind: "union";
  name: string;
  elements: FieldType[];
}
