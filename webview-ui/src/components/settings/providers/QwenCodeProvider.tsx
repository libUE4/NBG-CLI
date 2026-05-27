import { qwenCodeModels } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeLink, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the QwenCodeProvider component
 */
interface QwenCodeProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Qwen Code provider configuration component
 */
export const QwenCodeProvider = ({ showModelOptions, isPopup, currentMode }: QwenCodeProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange } = useApiConfigurationHandlers()

	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)

	return (
		<div>
			<h3 style={{ color: "var(--vscode-foreground)", margin: "8px 0" }}>Qwen Code API 配置</h3>
			<VSCodeTextField
				onInput={(e: any) => handleFieldChange("qwenCodeOauthPath", e.target.value)}
				placeholder="~/.qwen/oauth_creds.json"
				style={{ width: "100%" }}
				value={apiConfiguration?.qwenCodeOauthPath || ""}>
				OAuth 凭据路径
			</VSCodeTextField>
			<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: "4px" }}>
				Qwen OAuth 凭据文件路径。使用 ~/.qwen/oauth_creds.json 或提供自定义路径。
			</div>

			<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: "12px" }}>
				Qwen Code 是基于 OAuth 的 API，需要通过官方 Qwen 客户端认证。你需要先设置 OAuth 凭据。
			</div>

			<div style={{ fontSize: "12px", color: "var(--vscode-descriptionForeground)", marginTop: "8px" }}>
				开始使用：
				<br />
				1. 安装官方 Qwen 客户端
				<br />
				2. 使用你的账户完成认证
				<br />
				3. OAuth 凭据会自动保存
			</div>

			<VSCodeLink
				href="https://github.com/QwenLM/qwen-code/blob/main/README.md"
				style={{
					color: "var(--vscode-textLink-foreground)",
					marginTop: "8px",
					display: "inline-block",
					fontSize: "12px",
				}}>
				设置说明
			</VSCodeLink>

			{showModelOptions && (
				<>
					<ModelSelector
						label="模型"
						models={qwenCodeModels}
						onChange={(modelId) => {
							const fieldName = currentMode === "plan" ? "planModeApiModelId" : "actModeApiModelId"
							handleFieldChange(fieldName, modelId)
						}}
						selectedModelId={selectedModelId}
					/>

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
