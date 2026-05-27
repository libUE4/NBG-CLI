import { describe, expect, it } from "vitest";
import type { InteractiveConfigItem } from "../../tui/interactive-config";
import {
	canToggleConfigFooterRow,
	getAdjacentConfigTab,
	getConfigTabs,
	getConfigFooterText,
	getConfigItemDisplayName,
	isInlineConfigAction,
	isToggleableConfigItem,
	resolveConfigItemSelectAction,
	resolveConfigItemToggleAction,
	resolveInitialConfigTab,
} from "./config-view-helpers";

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

describe("config view helpers", () => {
	it("does not treat workflow rows as toggleable", () => {
		expect(isToggleableConfigItem(createItem({ kind: "workflow" }))).toBe(
			false,
		);
	});

	it("does not treat rule, agent, or hook rows as toggleable", () => {
		expect(isToggleableConfigItem(createItem({ kind: "rule" }))).toBe(false);
		expect(isToggleableConfigItem(createItem({ kind: "agent" }))).toBe(false);
		expect(isToggleableConfigItem(createItem({ kind: "hook" }))).toBe(false);
	});

	it("keeps plugin tool rows toggleable", () => {
		expect(
			isToggleableConfigItem(
				createItem({ kind: "tool", source: "workspace-plugin" }),
			),
		).toBe(true);
	});

	it("treats plugin rows as toggleable", () => {
		expect(isToggleableConfigItem(createItem({ kind: "plugin" }))).toBe(true);
	});

	it("treats MCP rows as toggleable", () => {
		expect(isToggleableConfigItem(createItem({ kind: "mcp" }))).toBe(true);
	});

	it("resolves Enter/Tab on a rule row to details", () => {
		const rule = createItem({
			kind: "rule",
			name: "review",
			path: "/tmp/review.md",
			source: "workspace",
		});

		expect(resolveConfigItemSelectAction(rule)).toEqual({
			kind: "ext-detail",
			item: rule,
		});
	});

	it("resolves Space on a plugin row to toggle", () => {
		const plugin = createItem({ kind: "plugin", name: "workspace-plugin" });

		expect(resolveConfigItemToggleAction(plugin)).toEqual({
			kind: "toggle-item",
			item: plugin,
		});
	});

	it("mentions Space toggle in the footer for toggleable rows", () => {
		expect(getConfigFooterText({ canToggle: true })).toContain("Space 切换");
	});

	it("omits Space toggle in the footer for non-toggleable rows", () => {
		expect(getConfigFooterText({ canToggle: false })).not.toContain(
			"Space 切换",
		);
		expect(getConfigFooterText()).not.toContain("Space 切换");
	});

	it("derives footer toggle affordance from selected row behavior", () => {
		const plugin = createItem({ kind: "plugin" });
		const hook = createItem({ kind: "hook" });

		expect(canToggleConfigFooterRow({ kind: "provider" })).toBe(false);
		expect(canToggleConfigFooterRow({ kind: "toggle" })).toBe(true);
		expect(
			canToggleConfigFooterRow({
				kind: "ext",
				enabled: plugin.enabled,
				item: plugin,
			}),
		).toBe(true);
		expect(
			canToggleConfigFooterRow({
				kind: "ext",
				enabled: hook.enabled,
				item: hook,
			}),
		).toBe(false);
		expect(canToggleConfigFooterRow({ kind: "mcp-manager" })).toBe(false);
	});

	it("supports restoring and advancing the active settings tab", () => {
		expect(getConfigTabs()).not.toContain("skills");
		expect(resolveInitialConfigTab("skills")).toBe("general");
		expect(resolveInitialConfigTab(undefined)).toBe("general");
		expect(getAdjacentConfigTab("mcp", "right")).toBe("rules");
		expect(getAdjacentConfigTab("rules", "left")).toBe("mcp");
	});

	it("handles toggle actions inline so the settings dialog stays open", () => {
		const plugin = createItem({ kind: "plugin", name: "workspace-plugin" });
		const mcp = createItem({ kind: "mcp", name: "docs" });
		const builtinTool = createItem({
			kind: "tool",
			name: "read_file",
			source: "builtin",
		});

		expect(isInlineConfigAction(resolveConfigItemToggleAction(plugin))).toBe(
			true,
		);
		expect(isInlineConfigAction(resolveConfigItemSelectAction(plugin))).toBe(
			true,
		);
		expect(isInlineConfigAction(resolveConfigItemSelectAction(mcp))).toBe(true);
		expect(
			isInlineConfigAction(resolveConfigItemSelectAction(builtinTool)),
		).toBe(true);
		expect(getConfigFooterText({ canToggle: true })).not.toContain("详情");
	});

	it("returns item names without decoration", () => {
		expect(getConfigItemDisplayName("review")).toBe("review");
	});
});
