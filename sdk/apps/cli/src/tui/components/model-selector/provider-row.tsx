// @jsxImportSource @opentui/react
import { palette } from "../../palette";

export function ProviderRow({
	providerName,
	focused,
}: {
	providerName: string;
	focused: boolean;
}) {
	return (
		<box flexDirection="row" paddingX={1} gap={1}>
			<text fg={focused ? palette.selection : "gray"} flexShrink={0}>
				{focused ? "❯" : " "}
			</text>
			<text fg={focused ? palette.selection : "cyan"} flexShrink={0}>
				三方 API：
			</text>
			<text fg="white">{providerName}</text>
			{!focused && (
				<text fg="gray" flexShrink={0}>
					（↑ 到这里配置）
				</text>
			)}
			{focused && (
				<text fg="gray" flexShrink={0}>
					<em>Enter 配置</em>
				</text>
			)}
		</box>
	);
}
