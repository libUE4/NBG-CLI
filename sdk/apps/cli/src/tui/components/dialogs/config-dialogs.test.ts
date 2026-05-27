import { describe, expect, it } from "vitest";
import type { InteractiveConfigItem } from "../../interactive-config";
import {
	getExtDetailFooterText,
	getExtDetailRows,
	shouldCloseExtDetailForKey,
	shouldToggleExtDetailForKey,
} from "./config-dialogs-helpers";

function createItem(
	overrides: Partial<InteractiveConfigItem> &
		Pick<InteractiveConfigItem, "kind">,
): InteractiveConfigItem {
	return {
		id: "item-id",
		name: "item-name",
		path: "/tmp/item",
		enabled: true,
		source: "workspace",
		...overrides,
	};
}

describe("config detail dialog helpers", () => {
	it("closes details for Enter, Escape, and Tab", () => {
		expect(shouldCloseExtDetailForKey("return")).toBe(true);
		expect(shouldCloseExtDetailForKey("escape")).toBe(true);
		expect(shouldCloseExtDetailForKey("tab")).toBe(true);
		expect(shouldCloseExtDetailForKey("space")).toBe(false);
	});

	it("toggles detail status on Space only for toggleable rows", () => {
		const plugin = createItem({ kind: "plugin" });
		const mcp = createItem({ kind: "mcp" });
		const workflow = createItem({ kind: "workflow" });

		expect(shouldToggleExtDetailForKey("space", plugin)).toBe(true);
		expect(shouldToggleExtDetailForKey("space", mcp)).toBe(true);
		expect(shouldToggleExtDetailForKey("return", plugin)).toBe(false);
		expect(shouldToggleExtDetailForKey("space", workflow)).toBe(false);
	});

	it("builds useful detail rows with status for toggleable items", () => {
		expect(
			getExtDetailRows(
				createItem({
					kind: "plugin",
					name: "provider-tools",
					source: "global",
					path: "/tmp/provider-tools/index.ts",
					description: "Add provider tools safely",
					enabled: false,
				}),
			),
		).toEqual([
			{ kind: "header", name: "provider-tools", source: "global" },
			{ kind: "field", label: "路径", value: ["/tmp/provider-tools/index.ts"] },
			{ kind: "field", label: "说明", value: ["Add provider tools safely"] },
			{ kind: "status", enabled: false },
		]);
	});

	it("omits status and toggle hint for non-toggleable items", () => {
		const workflow = createItem({
			kind: "workflow",
			name: "release",
			description: "Run release workflow",
		});

		expect(getExtDetailRows(workflow)).toEqual([
			{ kind: "header", name: "release", source: "workspace" },
			{ kind: "field", label: "路径", value: ["/tmp/item"] },
			{ kind: "field", label: "说明", value: ["Run release workflow"] },
		]);
		expect(getExtDetailFooterText(workflow)).toBe("Tab/Enter/Esc 返回");
	});

	it("shows toggle hint for toggleable items", () => {
		expect(getExtDetailFooterText(createItem({ kind: "plugin" }))).toBe(
			"Space 切换状态，Tab/Enter/Esc 返回",
		);
	});

	it("bounds long descriptions so path and status remain visible", () => {
		const rows = getExtDetailRows(
			createItem({
				kind: "plugin",
				name: "provider-tools",
				source: "global",
				path: "/tmp/provider-tools/index.ts",
				description: Array.from(
					{ length: 30 },
					(_, index) => `Long rule line ${index + 1}`,
				).join("\n"),
				enabled: true,
			}),
		);

		expect(rows[1]).toEqual({
			kind: "field",
			label: "路径",
			value: ["/tmp/provider-tools/index.ts"],
		});
		expect(rows[2]?.kind).toBe("field");
		if (rows[2]?.kind === "field") {
			expect(rows[2].label).toBe("说明");
			expect(rows[2].value).toHaveLength(13);
			expect(rows[2].value.at(-1)).toContain("已截断");
		}
		expect(rows[3]).toEqual({ kind: "status", enabled: true });
	});

	it("wraps long description lines before truncating", () => {
		const rows = getExtDetailRows(
			createItem({
				kind: "rule",
				description: "a ".repeat(120).trim(),
			}),
		);

		expect(rows[2]?.kind).toBe("field");
		if (rows[2]?.kind === "field") {
			expect(rows[2].value.length).toBeGreaterThan(1);
			expect(rows[2].value.every((line) => line.length <= 78)).toBe(true);
		}
	});
});
