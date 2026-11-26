# Preview Service

The preview is the part of NexPulse that shows a project what it looks like. In
NexPulse today the preview runs inside the editor: the browser reads the
project files, assembles one HTML document, and renders it in a sandboxed
iframe.

## What the preview does today

- Renders the project's `index.html`.
- Inlines the CSS and JavaScript the page links, so references resolve against
  the project files instead of a server.
- Leaves references to external origins (CDNs, absolute URLs, `data:` URIs) as
  they are.

## How the preview is assembled

The editor collects candidate files from the project tree. Only `.html`, `.htm`,
`.css`, and `.js` files are considered.

```text
frontend/src/components/editor/Preview.jsx
```

The first `index.html` found is the entry file. For each local reference:

- `<link rel="stylesheet">` is replaced with an inline `<style>` block built from
  the resolved file.
- `<script src="...">` is replaced with an inline `<script>` block built from the
  resolved file.

Closing `</style>` and `</script>` sequences in project content are escaped so
the assembled document cannot be broken out of. When no local file matches, the
editor injects fallback CSS or JavaScript.

Relative references are resolved against the entry file's folder, and the
top-level project folder name is stripped first, so an entry at
`<project>/index.html` can reference `./src/main.js`.

## Reload behavior

- The assembled document is debounced by 300 ms before the iframe reloads, so
  rapid typing does not cause reload flicker or reload storms.
- The refresh button rebuilds the document on demand.
- The preview can be opened fullscreen; pressing `Escape` exits.

## Security

- The iframe is rendered with `sandbox="allow-scripts"`.
- Project scripts run inside the iframe and cannot reach the editor document.

## Known limitations

- One entry file (`index.html`) is supported.
- Reloads are debounced and manual; there is no dev-server hot reload yet.

## Related pages

- [Frontend Components](../frontend/components.md)
- [Getting Started](../getting-started.md)
- [Roadmap](../roadmap.md)