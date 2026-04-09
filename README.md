# pi-yank

Lightweight `/yank` extension for [pi](https://github.com/badlogic/pi-mono).

`/yank` copies the last assistant response to the clipboard, or lets you choose an individual fenced code block from that response.
You can also target earlier messages with `/yank N` (e.g. `/yank 2` operates on the 2nd-to-last assistant message).

## Features

- Copy the last assistant message to the clipboard
- Use `/yank N` to target the N-th latest assistant message (`/yank 2` = 2nd-to-last)
- Detect fenced Markdown code blocks in the selected assistant message
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

```text
/yank       # copy from the latest assistant message
/yank 1     # same as /yank
/yank 2     # copy from the 2nd-to-last assistant message
/yank N     # copy from the N-th latest assistant message
```

Behavior:

- No assistant message yet → shows `No agent messages to copy yet.`
- N-th latest message not found → shows `No N-th latest agent message to copy yet.`
- Selected assistant message has no fenced code blocks → copies the full message
- Selected assistant message has code blocks → opens a selection menu
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

Menu previews include more context when available, for example:

- `1. Full latest message (24 lines • 812 chars)`
- `2. Code block — markdown: # Title (18 lines • 640 chars)`
- `3. Code block — js: console.log("hi") (1 line • 18 chars)`
- `4. Always copy full selected message in this session`

When using `/yank N` with N > 1, the menu title shows the target (e.g. "Yank from 2nd latest response").

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
