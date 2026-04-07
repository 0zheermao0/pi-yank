# pi-yank

Lightweight `/yank` extension for [pi](https://github.com/badlogic/pi-mono).

`/yank` copies the last assistant response to the clipboard, or lets you choose an individual fenced code block from that response.

## Features

- Copy the last assistant message to the clipboard
- Detect fenced Markdown code blocks in the last assistant message
- Use arrow keys + Enter to choose a specific code block
- Optionally disable the menu for the current session so `/yank` behaves like `/copy`
- Reuse pi's official clipboard pipeline via `copyToClipboard()` for `/copy`-compatible behavior
- Zero third-party runtime dependencies

## Installation

### Quick test

Load temporarily without installing:

```bash
pi --extension /path/to/pi-yank/extensions/yank.ts
```

### Install as pi package

Globally:

```bash
pi install /path/to/pi-yank
```

Project-local:

```bash
pi install -l /path/to/pi-yank
```

### Install as a project-local extension file

```bash
mkdir -p .pi/extensions
cp /path/to/pi-yank/extensions/yank.ts .pi/extensions/yank.ts
```

### Install as a global extension file

```bash
mkdir -p ~/.pi/agent/extensions
cp /path/to/pi-yank/extensions/yank.ts ~/.pi/agent/extensions/yank.ts
```

## Usage

Run:

```text
/yank
```

Behavior:

- No assistant message yet → shows `No agent messages to copy yet.`
- Last assistant message has no fenced code blocks → copies the full message
- Last assistant message has code blocks → opens a selection menu
- Selecting a code block copies only that code block's content
- Selecting the session option disables the menu for later `/yank` calls in the current session
- Pressing `Escape` in the selector cancels without copying

### Code block detection notes

`/yank` uses a line-by-line fenced block parser instead of a simple regex.
This makes it more robust for LLM output such as:

- a top-level ````markdown` fenced block containing literal nested ` ```js ` examples
- multiple top-level sibling code blocks
- `~~~` fenced blocks
- unterminated fences, which are ignored

Menu previews now include more context when available, for example:

- `1. Full last message (24 lines • 812 chars)`
- `2. Code block — markdown: # Title (18 lines • 640 chars)`
- `3. Code block — js: console.log("hi") (1 line • 18 chars)`
- `4. Always copy full last message in this session`

## Development

Run parser tests:

```bash
npm run check
```

## Package structure

This repository follows pi package conventions:

- extension entry: `extensions/yank.ts`
- `package.json` includes a `pi` manifest
- pi core package is declared as a `peerDependency`

## License

MIT
