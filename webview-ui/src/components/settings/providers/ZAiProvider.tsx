import { internationalZAiModels, mainlandZAiModels } from "@shared/api"
import { Mode } from "@shared/storage/types"
import { VSCodeDropdown, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useMemo } from "react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { ApiKeyField } from "../common/ApiKeyField"
import { ModelInfoView } from "../common/ModelInfoView"
import { DropdownContainer, ModelSelector } from "../common/ModelSelector"
import { normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the ZAiProvider component
 */
interface ZAiProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

/**
 * The Z AI provider configuration component
 */
export const ZAiProvider = ({ showModelOptions, isPopup, currentMode }: ZAiProviderProps) => {
	const { apiConfiguration } = useExtensionState()
	const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()

	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)

	// Determine which models to use based on API line selection
	const zaiModels = useMemo(
		() => (apiConfiguration?.zaiApiLine === "china" ? mainlandZAiModels : internationalZAiModels),
		[apiConfiguration?.zaiApiLine],
	)

	return (
		<div>
			<DropdownContainer className="dropdown-container" style={{ position: "inherit" }}>
				<label htmlFor="zai-entrypoint">
					<span style={{ fontWeight: 500, marginTop: 5 }}>Z AI 入口</span>
				</label>
				<VSCodeDropdown
					id="zai-entrypoint"
					onChange={(e) => handleFieldChange("zaiApiLine", (e.target as any).value)}
					style={{
						minWidth: 130,
						position: "relative",
					}}
					value={apiConfiguration?.zaiApiLine || "international"}>
					<VSCodeOption value="international">api.z.ai</VSCodeOption>
					<VSCodeOption value="china">open.bigmodel.cn</VSCodeOption>
				</VSCodeDropdown>
			</DropdownContainer>
			<p
				style={{
					fontSize: "12px",
					marginTop: 3,
					color: "var(--vscode-descriptionForeground)",
				}}>
				请根据你所在地区选择合适的 API 入口。中国大陆选择 open.bigmodel.cn，其他地区选择 api.z.ai。
			</p>
			<ApiKeyField
				initialValue={apiConfiguration?.zaiApiKey || ""}
				onChange={(value) => handleFieldChange("zaiApiKey", value)}
				providerName="Z AI"
				signupUrl={
					apiConfiguration?.zaiApiLine === "china"
						? "https://open.bigmodel.cn/console/overview"
						: "https://z.ai/manage-apikey/apikey-list"
				}
			/>

			{showModelOptions && (
				<>
					<ModelSelector
						label="模型"
						models={zaiModels}
						onChange={(e: any) =>
							handleModeFieldChange(
								{ plan: "planModeApiModelId", act: "actModeApiModelId" },
								e.target.value,
								currentMode,
							)
						}
						selectedModelId={selectedModelId}
					/>

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
