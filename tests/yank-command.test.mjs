import assert from "node:assert/strict";
import test from "node:test";
import {
	extractAssistantText,
	getNthLatestAssistantText,
	parseYankArgs,
} from "../extensions/yank-helpers.js";

test("parseYankArgs defaults to latest message", () => {
	assert.deepEqual(parseYankArgs(""), { ok: true, nth: 1 });
	assert.deepEqual(parseYankArgs("   "), { ok: true, nth: 1 });
});

test("parseYankArgs accepts a positive integer", () => {
	assert.deepEqual(parseYankArgs("1"), { ok: true, nth: 1 });
	assert.deepEqual(parseYankArgs("2"), { ok: true, nth: 2 });
	assert.deepEqual(parseYankArgs("  12  "), { ok: true, nth: 12 });
});

test("parseYankArgs rejects invalid values", () => {
	assert.equal(parseYankArgs("0").ok, false);
	assert.equal(parseYankArgs("-1").ok, false);
	assert.equal(parseYankArgs("1 2").ok, false);
	assert.equal(parseYankArgs("abc").ok, false);
});

test("extractAssistantText ignores aborted empty assistant messages", () => {
	assert.equal(
		extractAssistantText({ role: "assistant", stopReason: "aborted", content: [] }),
		undefined,
	);
});

test("getNthLatestAssistantText returns the requested assistant message", () => {
	const entries = [
		{ type: "message", message: { role: "user", content: [{ type: "text", text: "u1" }] } },
		{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "a1" }] } },
		{ type: "message", message: { role: "assistant", stopReason: "aborted", content: [] } },
		{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "a2" }] } },
		{ type: "message", message: { role: "user", content: [{ type: "text", text: "u2" }] } },
		{ type: "message", message: { role: "assistant", content: [{ type: "text", text: "a3" }] } },
	];

	assert.equal(getNthLatestAssistantText(entries, 1), "a3");
	assert.equal(getNthLatestAssistantText(entries, 2), "a2");
	assert.equal(getNthLatestAssistantText(entries, 3), "a1");
	assert.equal(getNthLatestAssistantText(entries, 4), undefined);
});
