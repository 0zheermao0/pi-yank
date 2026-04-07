/**
 * @typedef {{ content: string; preview: string; startLine: number; infoString: string }} CodeBlock
 * @typedef {{ fenceChar: '`' | '~'; fenceLength: number; lines: string[]; startLine: number; infoString: string }} OpenCodeBlock
 */

/**
 * Extract top-level fenced code blocks from markdown-like text.
 *
 * This is intentionally tolerant of LLM output that contains a large fenced
 * markdown block which itself includes literal nested fences as examples.
 * Only fully-closed top-level blocks are returned as yank candidates.
 *
 * @param {string} markdown
 * @returns {CodeBlock[]}
 */
export function extractCodeBlocks(markdown) {
	/** @type {CodeBlock[]} */
	const blocks = [];
	/** @type {OpenCodeBlock[]} */
	const openBlocks = [];
	const lines = markdown.split(/\r?\n/);

	for (let index = 0; index < lines.length; index++) {
		const line = lines[index];
		const fence = parseFenceLine(line);

		if (!fence) {
			for (const block of openBlocks) {
				block.lines.push(line);
			}
			continue;
		}

		if (openBlocks.length === 0) {
			openBlocks.push({
				fenceChar: fence.char,
				fenceLength: fence.length,
				lines: [],
				startLine: index,
				infoString: fence.info,
			});
			continue;
		}

		const currentBlock = openBlocks[openBlocks.length - 1];
		const closesCurrentBlock =
			fence.char === currentBlock.fenceChar &&
			fence.length >= currentBlock.fenceLength &&
			fence.info.length === 0;

		if (closesCurrentBlock) {
			for (
				let parentIndex = 0;
				parentIndex < openBlocks.length - 1;
				parentIndex++
			) {
				openBlocks[parentIndex].lines.push(line);
			}

			const finishedBlock = openBlocks.pop();
			if (finishedBlock && openBlocks.length === 0) {
				const content = finishedBlock.lines.join("\n");
				blocks.push({
					content,
					preview: "",
					startLine: finishedBlock.startLine,
					infoString: finishedBlock.infoString,
				});
			}
			continue;
		}

		for (const block of openBlocks) {
			block.lines.push(line);
		}
		openBlocks.push({
			fenceChar: fence.char,
			fenceLength: fence.length,
			lines: [],
			startLine: index,
			infoString: fence.info,
		});
	}

	return blocks
		.sort((left, right) => left.startLine - right.startLine)
		.map((block, index) => ({
			...block,
			preview: buildCodeBlockPreview(
				block.content,
				index + 1,
				block.infoString,
			),
		}));
}

/**
 * @param {string} line
 * @returns {{ char: '`' | '~'; length: number; info: string } | null}
 */
export function parseFenceLine(line) {
	const match = /^[ \t]*(`{3,}|~{3,})([^\n]*)$/.exec(line);
	if (!match) return null;

	const fence = match[1];
	const info = match[2]?.trim() ?? "";
	if (fence[0] === "`" && info.includes("`")) return null;

	const char = fence[0];
	if (char !== "`" && char !== "~") return null;

	return {
		char,
		length: fence.length,
		info,
	};
}

/**
 * @param {string} content
 * @param {number} index
 * @param {string} [infoString]
 * @returns {string}
 */
export function buildCodeBlockPreview(content, index, infoString = "") {
	const firstNonEmptyLine = content
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find((line) => line.length > 0);

	const language = getFenceLabel(infoString);
	if (!firstNonEmptyLine) {
		return language
			? `${language}: Code block ${index}`
			: `Code block ${index}`;
	}

	const body = truncate(firstNonEmptyLine, 72);
	return language ? `${language}: ${body}` : body;
}

/**
 * @param {string} infoString
 * @returns {string}
 */
export function getFenceLabel(infoString) {
	const label = infoString.trim().split(/\s+/)[0] ?? "";
	return label;
}

/**
 * @param {string} value
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(value, maxLength) {
	if (value.length <= maxLength) return value;
	return `${value.slice(0, maxLength - 1)}…`;
}
