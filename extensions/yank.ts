import {
	copyToClipboard,
	type ExtensionAPI,
	type ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { extractCodeBlocks } from "./yank-core.js";
import { getNthLatestAssistantText, parseYankArgs } from "./yank-helpers.js";

const COPY_SUCCESS_MESSAGE = "Copied agent message to clipboard";
const COPY_EMPTY_MESSAGE = "No agent messages to copy yet.";
const COPY_CODE_BLOCK_SUCCESS_MESSAGE = "Copied code block to clipboard";
const MENU_DISABLED_MESSAGE =
	"Future /yank commands will copy the full selected message in this session";

function countNonEmptyLines(text: string): number {
	return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

function summarizeBlock(content: string): string {
	const lines = countNonEmptyLines(content);
	const chars = content.length;
	return `${lines} line${lines === 1 ? "" : "s"} • ${chars} chars`;
}

function buildMenuOptions(
	text: string,
	codeBlocks: ReturnType<typeof extractCodeBlocks>,
) {
	const fullMessageOption = `1. Full last message (${summarizeBlock(text)})`;
	const codeBlockOptions = codeBlocks.map(
		(block, index) =>
			`${index + 2}. Code block — ${block.preview} (${summarizeBlock(block.content)})`,
	);
	const skipMenuOption = `${codeBlocks.length + 2}. Always copy full last message in this session`;

	return {
		fullMessageOption,
		codeBlockOptions,
		skipMenuOption,
		all: [fullMessageOption, ...codeBlockOptions, skipMenuOption],
	};
}

async function copyAndNotify(
	text: string,
	successMessage: string,
	ctx: ExtensionCommandContext,
): Promise<void> {
	await copyToClipboard(text);
	ctx.ui.notify(successMessage, "info");
}

export default function yankExtension(pi: ExtensionAPI) {
	let skipMenuForSession = false;

	pi.registerCommand("yank", {
		description:
			"Copy the latest assistant message, or use /yank N for the N-th latest one",
		handler: async (args, ctx) => {
			const parsed = parseYankArgs(args);
			if (!parsed.ok) {
				ctx.ui.notify(parsed.message, "error");
				return;
			}

			const text = getNthLatestAssistantText(
				ctx.sessionManager.getBranch(),
				parsed.nth,
			);
			if (!text) {
				ctx.ui.notify(
					parsed.nth === 1
						? COPY_EMPTY_MESSAGE
						: `No ${parsed.nth}-th latest agent message to copy yet.`,
					"error",
				);
				return;
			}

			const codeBlocks = extractCodeBlocks(text);
			if (!ctx.hasUI || skipMenuForSession || codeBlocks.length === 0) {
				try {
					await copyAndNotify(text, COPY_SUCCESS_MESSAGE, ctx);
				} catch (error) {
					ctx.ui.notify(
						error instanceof Error ? error.message : String(error),
						"error",
					);
				}
				return;
			}

			const menu = buildMenuOptions(text, codeBlocks);
			const selected = await ctx.ui.select(
				parsed.nth === 1
					? "Yank from latest response"
					: `Yank from ${parsed.nth}-th latest response`,
				menu.all,
			);
			if (!selected) return;

			try {
				if (selected === menu.fullMessageOption) {
					await copyAndNotify(text, COPY_SUCCESS_MESSAGE, ctx);
					return;
				}

				if (selected === menu.skipMenuOption) {
					skipMenuForSession = true;
					await copyAndNotify(text, COPY_SUCCESS_MESSAGE, ctx);
					ctx.ui.notify(MENU_DISABLED_MESSAGE, "info");
					return;
				}

				const codeBlockIndex = menu.codeBlockOptions.indexOf(selected);
				const codeBlock = codeBlocks[codeBlockIndex];
				if (!codeBlock) {
					ctx.ui.notify("Invalid selection", "error");
					return;
				}

				await copyAndNotify(
					codeBlock.content,
					COPY_CODE_BLOCK_SUCCESS_MESSAGE,
					ctx,
				);
			} catch (error) {
				ctx.ui.notify(
					error instanceof Error ? error.message : String(error),
					"error",
				);
			}
		},
	});
}
