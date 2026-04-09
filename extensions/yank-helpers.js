/**
 * @typedef {{ type?: unknown; message?: { role?: unknown; stopReason?: unknown; content?: unknown } }} SessionEntryLike
 */

/**
 * @param {string} args
 * @returns {{ ok: true, nth: number } | { ok: false, message: string }}
 */
export function parseYankArgs(args) {
	const trimmed = args.trim();
	if (trimmed.length === 0) {
		return { ok: true, nth: 1 };
	}

	if (!/^\d+$/.test(trimmed)) {
		return {
			ok: false,
			message: 'Usage: /yank [N] where N is a positive integer',
		};
	}

	const nth = Number.parseInt(trimmed, 10);
	if (!Number.isSafeInteger(nth) || nth < 1) {
		return {
			ok: false,
			message: 'Usage: /yank [N] where N is a positive integer',
		};
	}

	return { ok: true, nth };
}

/**
 * @param {SessionEntryLike['message']} message
 * @returns {string | undefined}
 */
export function extractAssistantText(message) {
	const content = Array.isArray(message?.content) ? message.content : [];
	if (message?.stopReason === 'aborted' && content.length === 0) {
		return undefined;
	}

	let text = '';
	for (const item of content) {
		if (!item || typeof item !== 'object') continue;
		const part = /** @type {{ type?: unknown; text?: unknown }} */ (item);
		if (part.type === 'text' && typeof part.text === 'string') {
			text += part.text;
		}
	}

	const trimmed = text.trim();
	return trimmed || undefined;
}

/**
 * @param {SessionEntryLike[]} entries
 * @param {number} nth
 * @returns {string | undefined}
 */
export function getNthLatestAssistantText(entries, nth = 1) {
	let seen = 0;
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		if (entry?.type !== 'message') continue;

		const message = entry.message;
		if (message?.role !== 'assistant') continue;

		const text = extractAssistantText(message);
		if (!text) continue;

		seen += 1;
		if (seen === nth) return text;
	}

	return undefined;
}
