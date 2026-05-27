// @jsxImportSource @opentui/react
import type { ChoiceContext } from "@opentui-ui/dialog";
import { useDialogKeyboard } from "@opentui-ui/dialog/react";
import { palette } from "../tui/palette";
import type { CliMigrationNotice } from "./notice";

export function MigrationNoticeContent(
	props: ChoiceContext<boolean> & {
		notice: CliMigrationNotice;
	},
) {
	const { dialogId, notice, resolve } = props;

	useDialogKeyboard((key) => {
		if (key.name === "escape") {
			resolve(true);
		}
	}, dialogId);

	return (
		<box flexDirection="column" paddingX={1} gap={1}>
			<text fg={palette.act}>{notice.title}</text>
			<box flexDirection="column">
				<text selectable>
					我们使用新的 NBG SDK 重建了 CLI。了解更多：{" "}
					<a href="https://github.com/cline/cline">
						<span fg={palette.act}>https://github.com/cline/cline</span>
					</a>
				</text>
				<text selectable>
					运行{" "}
					<span fg="#98c379" bg="#1f2937">
						{" cline "}
					</span>{" "}
					现在会打开终端 UI。要打开 Kanban，请先使用 /quit，然后在终端运行{" "}
					<span fg="#98c379" bg="#1f2937">
						{" cline kanban "}
					</span>{" "}
				</text>
			</box>
			<text fg={palette.muted}>按 Esc 关闭</text>
		</box>
	);
}
