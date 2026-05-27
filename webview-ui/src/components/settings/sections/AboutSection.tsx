import { VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import Section from "../Section"

interface AboutSectionProps {
	version: string
	renderSectionHeader: (tabId: string) => JSX.Element | null
}
const AboutSection = ({ version, renderSectionHeader }: AboutSectionProps) => {
	return (
		<div>
			{renderSectionHeader("about")}
			<Section>
				<div className="flex px-4 flex-col gap-2">
					<h2 className="text-lg font-semibold">NBG v{version}</h2>
					<p>
						一个可以使用 CLI 和编辑器的 AI 助手。NBG 能借助工具逐步处理复杂的软件开发任务，
						包括创建和编辑文件、探索大型项目、使用浏览器，以及在你授权后执行终端命令。
					</p>

					<h3 className="text-md font-semibold">社区与支持</h3>
					<p>
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI">GitHub</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/issues">问题反馈</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/blob/main/CONTRIBUTING.md">贡献指南</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">开发</h3>
					<p>
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/tree/main/sdk/apps/cli">CLI</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/tree/main/sdk">SDK</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/blob/main/docs-internal/commercialization-plan.md">路线图</VSCodeLink>
					</p>

					<h3 className="text-md font-semibold">资源</h3>
					<p>
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/tree/main/docs">文档</VSCodeLink>
						{" • "}
						<VSCodeLink href="https://github.com/libUE4/NBG-CLI/blob/main/README.md">项目首页</VSCodeLink>
					</p>
				</div>
			</Section>
		</div>
	)
}

export default AboutSection
