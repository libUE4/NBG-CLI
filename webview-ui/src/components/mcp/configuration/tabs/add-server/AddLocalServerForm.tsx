import { EmptyRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeLink } from "@vscode/webview-ui-toolkit/react"
import styled from "styled-components"
import { LINKS } from "@/constants"
import { McpServiceClient } from "@/services/grpc-client"

type AddLocalServerFormProps = {
	onServerAdded: () => void
}

const AddLocalServerForm = ({}: AddLocalServerFormProps) => {
	return (
		<FormContainer>
			<div className="text-(--vscode-foreground)">
				通过配置 <code>cline_mcp_settings.json</code> 添加本地 MCP 服务器。你需要在 JSON 配置中指定服务器名称、命令、参数以及必要的环境变量。了解更多请看
				<VSCodeLink href={LINKS.DOCUMENTATION.LOCAL_MCP_SERVER_DOCS} style={{ display: "inline" }}>
					这里。
				</VSCodeLink>
			</div>

			<VSCodeButton
				appearance="primary"
				onClick={() => {
					McpServiceClient.openMcpSettings(EmptyRequest.create({})).catch((error) => {
						console.error("Error opening MCP settings:", error)
					})
				}}
				style={{ width: "100%", marginBottom: "5px", marginTop: 8 }}>
				打开 cline_mcp_settings.json
			</VSCodeButton>
		</FormContainer>
	)
}

const FormContainer = styled.div`
	padding: 16px 20px;
	display: flex;
	flex-direction: column;
	gap: 8px;
`

export default AddLocalServerForm
