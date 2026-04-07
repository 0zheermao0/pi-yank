import assert from "node:assert/strict";
import test from "node:test";
import {
	buildCodeBlockPreview,
	extractCodeBlocks,
} from "../extensions/yank-core.js";

test("extracts a single outer markdown block when nested fences appear as literal examples", () => {
	const text = `我来为你创建一个 Markdown 格式的测试文本：

\`\`\`markdown
# Markdown 格式测试文档

## 代码块

### JavaScript 代码
\`\`\`javascript
function hello() {
  console.log("Hello, World!");
}
\`\`\`

### Python 代码
\`\`\`python
def hello():
    print("Hello, World!")
\`\`\`

*文档结束*
\`\`\`

说明文字`;

	const blocks = extractCodeBlocks(text);
	assert.equal(blocks.length, 1);
	assert.match(blocks[0].content, /function hello\(\)/);
	assert.match(blocks[0].content, /def hello\(\):/);
	assert.equal(blocks[0].preview, "markdown: # Markdown 格式测试文档");
});

test("extracts sibling top-level code blocks independently", () => {
	const text = `before
\`\`\`js
console.log("a");
\`\`\`

between

\`\`\`python
print("b")
\`\`\`
after`;

	const blocks = extractCodeBlocks(text);
	assert.equal(blocks.length, 2);
	assert.equal(blocks[0].content, 'console.log("a");');
	assert.equal(blocks[1].content, 'print("b")');
	assert.equal(blocks[0].preview, 'js: console.log("a");');
	assert.equal(blocks[1].preview, 'python: print("b")');
});

test("supports tilde fences", () => {
	const text = `~~~sql
select 1;
~~~`;
	const blocks = extractCodeBlocks(text);
	assert.equal(blocks.length, 1);
	assert.equal(blocks[0].content, "select 1;");
	assert.equal(blocks[0].preview, "sql: select 1;");
});

test("ignores unterminated fences", () => {
	const text = `\`\`\`ts
const x = 1;`;
	const blocks = extractCodeBlocks(text);
	assert.equal(blocks.length, 0);
});

test("preview falls back cleanly for empty blocks", () => {
	assert.equal(
		buildCodeBlockPreview("", 3, "markdown"),
		"markdown: Code block 3",
	);
});
