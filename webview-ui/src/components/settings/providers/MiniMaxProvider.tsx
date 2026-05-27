import { minimaxModels } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ApiKeyField } from "../common/ApiKeyField"
import { ModelInfoView } from "../common/ModelInfoView"
import { DropdownContainer, ModelSelector } from "../common/ModelSelector"
import ThinkingBudgetSlider from "../ThinkingBudgetSlider"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the MinimaxProvider component
 */
interface MinimaxProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Minimax AI Studio provider configuration component
 */
export const MinimaxProvider = ({ showModelOptions, isPopup, currentMode }: MinimaxProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()

	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)

	return (
		<div>
			<DropdownContainer className="dropdown-container" style={{ position: "inherit" }}>
				<label htmlFor="minimax-entrypoint">
					<span style={{ fontWeight: 500, marginTop: 5 }}>MiniMax 入口</span>
				</label>
				<VSCodeDropdown
					id="minimax-entrypoint"
					onChange={(e) => handleFieldChange("minimaxApiLine", (e.target as any).value)}
					style={{
						minWidth: 130,
						position: "relative",
					}}
					value={apiConfiguration?.minimaxApiLine || "international"}>
					<VSCodeOption value="international">api.minimax.io</VSCodeOption>
					<VSCodeOption value="china">api.minimaxi.com</VSCodeOption>
				</VSCodeDropdown>
			</DropdownContainer>
			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					color: "var(--vscode-descriptionForeground)",
				}}>
				请根据你的地区选择 API 端点：中国大陆使用 <code>api.minimaxi.com</code>，其他地区使用{" "}
				<code>api.minimax.io</code>。
			</p>
			<ApiKeyField
				initialValue={apiConfiguration?.minimaxApiKey || ""}
				onChange={(value) => handleFieldChange("minimaxApiKey", value)}
				providerName="MiniMax"
				signupUrl={
					apiConfiguration?.minimaxApiLine === "china"
						? "https://platform.minimaxi.com/user-center/basic-information/interface-key"
						: "https://www.minimax.io/platform/user-center/basic-information/interface-key"
				}
			/>

			{showModelOptions && (
				<>
					<ModelSelector
						label="模型"
						models={minimaxModels}
						onChange={(e: any) =>
							handleModeFieldChange(
								{ plan: "planModeApiModelId", act: "actModeApiModelId" },
								e.target.value,
								currentMode,
							)
						}
						selectedModelId={selectedModelId}
					/>

					{selectedModelInfo?.supportsReasoning && (
						<ThinkingBudgetSlider currentMode={currentMode} showEnableToggle={false} />
					)}

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
