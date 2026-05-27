import { VSCodeCheckbox, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useExtensionState } from "@/context/ExtensionStateContext"
import PreferredLanguageSetting from "../PreferredLanguageSetting"
import Section from "../Section"
import { updateSetting } from "../utils/settingsHandlers"

interface GeneralSettingsSectionProps {
	renderSectionHeader: (tabId: string) => JSX.Element | null
}

const GeneralSettingsSection = ({ renderSectionHeader }: GeneralSettingsSectionProps) => {
	const { telemetrySetting, remoteConfigSettings } = useExtensionState()

	return (
		<div>
			{renderSectionHeader("general")}
			<Section>
				<PreferredLanguageSetting />

				<div className="mb-[5px]">
					<Tooltip>
						<TooltipContent hidden={remoteConfigSettings?.telemetrySetting === undefined}>
							此设置由组织的远程配置管理
						</TooltipContent>
						<TooltipTrigger asChild>
							<div className="flex items-center gap-2 mb-[5px]">
								<VSCodeCheckbox
									checked={telemetrySetting !== "disabled"}
									disabled={remoteConfigSettings?.telemetrySetting === "disabled"}
									onChange={(e: any) => {
										const checked = e.target.checked === true
										updateSetting("telemetrySetting", checked ? "enabled" : "disabled")
									}}>
									允许错误和使用情况上报
								</VSCodeCheckbox>
								{!!remoteConfigSettings?.telemetrySetting && (
									<i className="codicon codicon-lock text-description text-sm" />
								)}
							</div>
						</TooltipTrigger>
					</Tooltip>

					<p className="text-sm mt-[5px] text-description">
						发送使用数据和错误报告可帮助改进 Cline。代码、提示词或个人信息不会被发送。查看我们的{" "}
						<VSCodeLink
							className="text-inherit"
							href="https://docs.cline.bot/more-info/telemetry"
							style={{ fontSize: "inherit", textDecoration: "underline" }}>
							遥测说明
						</VSCodeLink>{" "}
						和{" "}
						<VSCodeLink
							className="text-inherit"
							href="https://cline.bot/privacy"
							style={{ fontSize: "inherit", textDecoration: "underline" }}>
							隐私政策
						</VSCodeLink>{" "}
						了解更多细节。
					</p>
				</div>
			</Section>
		</div>
	)
}

export default GeneralSettingsSection
