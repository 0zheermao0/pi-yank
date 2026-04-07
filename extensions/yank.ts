import {
	copyToClipboard,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type SessionEntry,
} from "@mariozechner/pi-coding-agent";
import { extractCodeBlocks } from "./yank-core.js";

interface AssistantMessageLike {
	role?: unknown;
	stopReason?: unknown;
	content?: unknown;
}

const COPY_SUCCESS_MESSAGE = "Copied last agent message to clipboard";
const COPY_EMPTY_MESSAGE = "No agent messages to copy yet.";
const COPY_CODE_BLOCK_SUCCESS_MESSAGE = "Copied code block to clipboard";
const MENU_DISABLED_MESSAGE =
	"Future /yank commands will copy the full last message in this session";

function getLastAssistantText(entries: SessionEntry[]): string | undefined {
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry.type !== "message") continue;

		const message = entry.message as AssistantMessageLike;
		if (message.role !== "assistant") continue;

		const text = extractAssistantText(message);
		if (text) return text;
	}

	return undefined;
}

function extractAssistantText(
	message: AssistantMessageLike,
): string | undefined {
	const content = Array.isArray(message.content) ? message.content : [];
	if (message.stopReason === "aborted" && content.length === 0) {
		return undefined;
	}

	let text = "";
	for (const item of content) {
		if (!item || typeof item !== "object") continue;
		const part = item as { type?: unknown; text?: unknown };
		if (part.type === "text" && typeof part.text === "string") {
			text += part.text;
		}
	}

	const trimmed = text.trim();
	return trimmed || undefined;
}

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
		description: "Copy the last assistant message or a code block from it",
		handler: async (_args, ctx) => {
			const text = getLastAssistantText(ctx.sessionManager.getBranch());
			if (!text) {
				ctx.ui.notify(COPY_EMPTY_MESSAGE, "error");
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
			const selected = await ctx.ui.select("Yank from last response", menu.all);
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
