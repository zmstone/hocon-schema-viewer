# Hocon Schema Viewer

Hocon Schema Viewer is a web application that provides a user-friendly interface for exploring and understanding the schema of HOCON (Human-Optimized Config Object Notation) configuration files.

The schema is represented as a tree structure, where each node represents a configuration element. The tree is built based on the HOCON schema dump in JSON format.

The struct fields are annotated with additional information, such as the type of the element, the default value, and the description.

You can find more information about HOCON schema [here](https://github.com/emqx/hocon/blob/master/SCHEMA.md)

## Features

- Visual representation of the HOCON schema
- Intuitive navigation through the schema hierarchy
- [TODO] search
- [TODO] interactive example generation

## Develop

1. Clone the repository:

```bash
git clone https://github.com/zmstone/hocon-schema-viewer.git
```

2. Install the dependencies:

```bash
cd hocon-schema-viewer
npm install
```

3. Run the development server:
```bash
npm run dev
The application will be available at http://localhost:5173?s=schemas/default.json
```

## Deploy

1. Build the html

```bash
make
```

2. Host the html

Copy the dist/conf-docs-out.html to your webserver,
put the html together with schema json files.

See hosted example here:
https://zmstone.github.io/emqx-docgen

And the hosting project here:
https://github.com/zmstone/emqx-docgen

