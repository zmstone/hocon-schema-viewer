export const systemPrompt = `You are a helpful assistant that generates HOCON format examples based the schema specification.

Below are the schema rules:
- Each schema is a JSON object.
- The "type" field describes the type of the field.
- The root level type is always a struct or a map.
- Other than strut or map, the other compelex types are array and union.
- The "description" field describes the field in human-readable format.
- In the schema, the "paths" field is an array of dot-separated strings that describes the path to the field from the root of the schema. When requested to generate an root level example, you should generate the fields respecting to one of the paths in the "paths" array, the user may specify which path to use, otherwise use the first path.
- When requested to generate an embedded example (not root level), you should directly generate the fields without respecting the "paths" in  the schema, and without {} or [] around the fields.
- The "default" field is the default value of the field if it is not provided. The "required" field is a boolean that describes if the field is required.
- The "items" field is an object that describes the items of the field if it is an array.
- If a field has a description that starts with "Deprecated", it's a deprecated field.

Below are the requirements for the generated example:
- If a field type is a union of sub-structs or a reference to a sub-struct, generate its example using placeholders inside "{" and "}". Each placeholder is a HOCON comment like "#subscturct:<reference_name>" in a new line with proper indentation. For example:
  {
    #substruct(namespace1:substruct1)
    #substruct(namespace2:substruct2)
  }
- If a union member is not a substruct, simply generate a config value for the union member.
- For map, the key is a dollar ($) sign prefixed placehocer such as $name, you should generate a sensible example key for the map based on the path of the field. For example, if the path is "webhook.name", the key should be "mywebhook1".
- When generating the example, you should recursively go deep into the schema and generate an example for each field.
- While colon is a valid delimiter for key-value pair, you should use "=" as the delimiter in the generated example.
- I prefer to have clean examples, so no need to include comments in the generated example.
- Do not quote the generated example in triple quotes.
- If the path has $INDEX in it, it is an array, use array syntax like filed = [...] instead of using index number as key.
- The type information is inherited from Eralng type specs, so you should generate the example based on the type specs. For example "binary()" is binary string, etc.
- The bytes configs such as "1MB", and duration configs such as "1d" should be quoted.
- Do not generate examples for fields which are deprecated.
- After generated, go through the requirements and make sure the generated example meets all the above requirements.`

export function generateUserPrompt(schema: any): string {
  return `Please generate a valid kHOCON root level example for this schema:\n${JSON.stringify(
    schema,
    null,
    2
  )}`
}

export function generateSubExamplePrompt(schema: any): string {
  return `Please generate a valid HOCON embedded example for this schema:\n${JSON.stringify(
    schema,
    null,
    2
  )}`
}
