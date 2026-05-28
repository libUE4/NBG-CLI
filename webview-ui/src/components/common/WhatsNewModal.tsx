import { BannerAction, BannerCardData } from "@shared/cline/banner"
import React from "react"
import { useMount } from "react-use"
import GitHubIcon from "@/assets/GitHubIcon"
import WhatsNewItems from "@/components/common/WhatsNewItems"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useExtensionState } from "@/context/ExtensionStateContext"

interface WhatsNewModalProps {
	open: boolean
	onClose: () => void
	version: string
	welcomeBanners?: BannerCardData[]
	onBannerAction?: (action: BannerAction) => void
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ open, onClose, version, welcomeBanners, onBannerAction }) => {
	const { refreshOpenRouterModels } = useExtensionState()

	// Get latest model list in case user hits shortcut button to set model
	useMount(refreshOpenRouterModels)

	const inlineCodeStyle: React.CSSProperties = {
		backgroundColor: "var(--vscode-textCodeBlock-background)",
		padding: "2px 6px",
		borderRadius: "3px",
		fontFamily: "var(--vscode-editor-font-family)",
		fontSize: "0.9em",
	}

	return (
		<Dialog onOpenChange={(isOpen) => !isOpen && onClose()} open={open}>
			<DialogContent
				aria-describedby="whats-new-description"
				aria-labelledby="whats-new-title"
				className="pt-5 px-5 pb-4 gap-0">
				<div id="whats-new-description">
					<h2
						className="text-lg font-semibold mb-3 pr-6"
						id="whats-new-title"
						style={{ color: "var(--vscode-editor-foreground)" }}>
						v{version} 新功能
					</h2>

					<WhatsNewItems
						inlineCodeStyle={inlineCodeStyle}
						onBannerAction={onBannerAction}
						onClose={onClose}
						welcomeBanners={welcomeBanners}
					/>

					{/* Project Links Section */}
					<div className="flex flex-col items-center gap-3 mt-4 pt-4 border-t border-[var(--vscode-widget-border)]">
						<div className="flex items-center gap-4">
							<a
								aria-label="打开 NBG GitHub 仓库"
								className="text-[var(--vscode-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] transition-colors"
								href="https://github.com/libUE4/NBG-CLI"
								rel="noopener noreferrer"
								target="_blank">
								<GitHubIcon />
							</a>

							<a
								aria-label="打开 NBG 讨论区"
								className="text-[var(--vscode-foreground)] hover:text-[var(--vscode-textLink-activeForeground)] transition-colors"
								href="https://github.com/libUE4/NBG-CLI/discussions"
								rel="noopener noreferrer"
								target="_blank">
								<span className="codicon codicon-comment-discussion text-[18px]" />
							</a>
						</div>

						{/* GitHub Star CTA */}
						<p className="text-sm text-center" style={{ color: "var(--vscode-descriptionForeground)" }}>
							请通过{" "}
							<a
								href="https://github.com/libUE4/NBG-CLI"
								rel="noopener noreferrer"
								style={{ color: "var(--vscode-textLink-foreground)" }}
								target="_blank">
								在 GitHub 上给我们星标
							</a>
							来支持 NBG。
						</p>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default WhatsNewModal
