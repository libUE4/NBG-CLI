import { TelemetrySettingEnum, TelemetrySettingRequest } from "@shared/proto/cline/state"
import { useCallback } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { StateServiceClient } from "@/services/grpc-client"

const telemetryRequest = TelemetrySettingRequest.create({
	setting: TelemetrySettingEnum.ENABLED,
})

export const TelemetryBanner: React.FC = () => {
	const { navigateToSettings } = useExtensionState()

	const handleClose = useCallback(() => {
		StateServiceClient.updateTelemetrySetting(telemetryRequest).catch(console.error)
	}, [])

	const handleOpenSettings = useCallback(() => {
		handleClose()
		navigateToSettings()
	}, [handleClose, navigateToSettings])

	return (
		<div className="bg-banner-background text-banner-foreground px-3 py-2 flex flex-col gap-1 shrink-0 mb-1 relative text-sm m-4">
			<h3 className="m-0">帮助改进 Cline</h3>
			<i>（并访问实验功能）</i>
			<p className="m-0">
				Cline 会收集错误和使用数据，帮助我们修复问题并改进扩展。代码、提示词或个人信息不会被发送。
			</p>
			<p className="m-0">
				<span>你可以在 </span>
				<span className="text-link cursor-pointer" onClick={handleOpenSettings}>
					设置
				</span>
				中关闭此项。
			</p>

			{/* Close button */}
			<button
				aria-label="关闭横幅并启用遥测"
				className="absolute top-3 right-3 opacity-70 hover:opacity-100 cursor-pointer border-0 bg-transparent p-0 text-inherit"
				onClick={handleClose}
				type="button">
				✕
			</button>
		</div>
	)
}

export default TelemetryBanner
