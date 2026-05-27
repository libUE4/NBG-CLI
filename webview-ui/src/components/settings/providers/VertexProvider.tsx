import { vertexGlobalModels, vertexModels } from "@shared/api"
import VertexData from "@shared/providers/vertex.json"
import type { Mode } from "@shared/storage/types"
import { isClaudeOpusAdaptiveThinkingModel, resolveClaudeOpusAdaptiveThinking } from "@shared/utils/reasoning-support"
import { VSCodeDropdown, VSCodeLink, VSCodeOption } from "@vscode/webview-ui-toolkit/react"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { DROPDOWN_Z_INDEX, DropdownContainer } from "../ApiOptions"
import { DebouncedTextField } from "../common/DebouncedTextField"
import { ModelInfoView } from "../common/ModelInfoView"
import { ModelSelector } from "../common/ModelSelector"
import { LockIcon, RemotelyConfiguredInputWrapper } from "../common/RemotelyConfiguredInputWrapper"
import ReasoningEffortSelector from "../ReasoningEffortSelector"
import ThinkingBudgetSlider from "../ThinkingBudgetSlider"
import { getModeSpecificFields, normalizeApiConfiguration } from "../utils/providerUtils"
import { useApiConfigurationHandlers } from "../utils/useApiConfigurationHandlers"

/**
 * Props for the VertexProvider component
 */
interface VertexProviderProps {
	showModelOptions: boolean
	isPopup?: boolean
	currentMode: Mode
}

// Vertex models that support thinking
const SUPPORTED_THINKING_MODELS = [
	"claude-sonnet-4-6",
	"claude-sonnet-4-6:1m",
	"claude-haiku-4-5@20251001",
	"claude-sonnet-4-5@20250929",
	"claude-3-7-sonnet@20250219",
	"claude-sonnet-4@20250514",
	"claude-opus-4@20250514",
	"claude-opus-4-1@20250805",
	"gemini-2.5-flash",
	"gemini-2.5-pro",
	"gemini-2.5-flash-lite-preview-06-17",
]

const REGIONS = VertexData.regions

/**
 * The GCP Vertex AI provider configuration component
 */
export const VertexProvider = ({ showModelOptions, isPopup, currentMode }: VertexProviderProps) => {
	const { apiConfiguration, remoteConfigSettings } = useExtensionState()
	const { handleFieldChange, handleModeFieldChange } = useApiConfigurationHandlers()
	const modeFields = getModeSpecificFields(apiConfiguration, currentMode)

	// Get the normalized configuration
	const { selectedModelId, selectedModelInfo } = normalizeApiConfiguration(apiConfiguration, currentMode)
	const isAdaptiveThinkingModel = isClaudeOpusAdaptiveThinkingModel(selectedModelId)
	const adaptiveThinkingDefaultEffort =
		resolveClaudeOpusAdaptiveThinking(modeFields.reasoningEffort, modeFields.thinkingBudgetTokens).effort ?? "none"

	// Determine which models to use based on region
	const modelsToUse = apiConfiguration?.vertexRegion === "global" ? vertexGlobalModels : vertexModels

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				gap: 5,
			}}>
			<RemotelyConfiguredInputWrapper hidden={remoteConfigSettings?.vertexProjectId === undefined}>
				<DebouncedTextField
					disabled={remoteConfigSettings?.vertexProjectId !== undefined}
					initialValue={apiConfiguration?.vertexProjectId || ""}
					onChange={(value) => handleFieldChange("vertexProjectId", value)}
					placeholder="输入项目 ID..."
					style={{ width: "100%" }}>
					<div className="flex items-center gap-2 mb-1">
						<span style={{ fontWeight: 500 }}>Google Cloud 项目 ID</span>
						{remoteConfigSettings?.vertexProjectId !== undefined && <LockIcon />}
					</div>
				</DebouncedTextField>
			</RemotelyConfiguredInputWrapper>

			<RemotelyConfiguredInputWrapper hidden={remoteConfigSettings?.vertexRegion === undefined}>
				<DropdownContainer className="dropdown-container" zIndex={DROPDOWN_Z_INDEX - 1}>
					<div
						className="flex items-center gap-2 mb-1"
						style={{ opacity: remoteConfigSettings?.vertexRegion !== undefined ? 0.4 : 1 }}>
						<label htmlFor="vertex-region-dropdown">
							<span className="font-medium">Google Cloud 区域</span>
						</label>
						{remoteConfigSettings?.vertexRegion !== undefined && <LockIcon />}
					</div>
					<VSCodeDropdown
						disabled={remoteConfigSettings?.vertexRegion !== undefined}
						id="vertex-region-dropdown"
						onChange={(e: any) => handleFieldChange("vertexRegion", e.target.value)}
						style={{ width: "100%" }}
						value={apiConfiguration?.vertexRegion || ""}>
						<VSCodeOption value="">选择区域...</VSCodeOption>
						{REGIONS.map((region) => (
							<VSCodeOption key={region} value={region}>
								{region}
							</VSCodeOption>
						))}
					</VSCodeDropdown>
				</DropdownContainer>
			</RemotelyConfiguredInputWrapper>

			<p
				style={{
					fontSize: "12px",
					marginTop: "5px",
					color: "var(--vscode-descriptionForeground)",
				}}>
				要使用 Google Cloud Vertex AI，你需要
				<VSCodeLink
					href="https://cloud.google.com/vertex-ai/generative-ai/docs/partner-models/use-claude#before_you_begin"
					style={{ display: "inline", fontSize: "inherit" }}>
					{"1）创建 Google Cloud 账号 › 启用 Vertex AI API › 启用需要的 Claude 模型，"}
				</VSCodeLink>{" "}
				<VSCodeLink
					href="https://cloud.google.com/docs/authentication/provide-credentials-adc#google-idp"
					style={{ display: "inline", fontSize: "inherit" }}>
					{"2）安装 Google Cloud CLI › 配置 Application Default Credentials。"}
				</VSCodeLink>
			</p>

			{showModelOptions && (
				<>
					<ModelSelector
						label="模型"
						models={modelsToUse}
						onChange={(e: any) =>
							handleModeFieldChange(
								{ plan: "planModeApiModelId", act: "actModeApiModelId" },
								e.target.value,
								currentMode,
							)
						}
						selectedModelId={selectedModelId}
						zIndex={DROPDOWN_Z_INDEX - 2}
					/>

					{isAdaptiveThinkingModel ? (
						<ReasoningEffortSelector
							allowedEfforts={["none", "low", "medium", "high", "xhigh"] as const}
							currentMode={currentMode}
							defaultEffort={adaptiveThinkingDefaultEffort}
							description="选择无可禁用自适应思考。更高强度会增加响应细节和 Token 用量。"
							label="自适应思考"
						/>
					) : SUPPORTED_THINKING_MODELS.includes(selectedModelId) ? (
						<ThinkingBudgetSlider currentMode={currentMode} maxBudget={selectedModelInfo.thinkingConfig?.maxBudget} />
					) : null}

					{selectedModelInfo.thinkingConfig?.supportsThinkingLevel && (
						<ReasoningEffortSelector currentMode={currentMode} />
					)}

					<ModelInfoView isPopup={isPopup} modelInfo={selectedModelInfo} selectedModelId={selectedModelId} />
				</>
			)}
		</div>
	)
}
