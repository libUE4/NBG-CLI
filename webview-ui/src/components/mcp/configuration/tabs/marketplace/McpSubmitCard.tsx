const McpSubmitCard = () => {
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				gap: "12px",
				padding: "15px",
				margin: "20px",
				backgroundColor: "var(--vscode-textBlockQuote-background)",
				borderRadius: "6px",
			}}>
			{/* Icon */}
			<i className="codicon codicon-add" style={{ fontSize: "18px" }} />

			{/* Content */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: "4px",
					textAlign: "center",
					maxWidth: "480px",
				}}>
				<h3
					style={{
						margin: 0,
						fontSize: "14px",
						fontWeight: 600,
						color: "var(--vscode-foreground)",
					}}>
					提交 MCP 服务
				</h3>
				<p style={{ fontSize: "13px", margin: 0, color: "var(--vscode-descriptionForeground)" }}>
					通过 NBG 讨论区提交线索，帮助其他人发现好用的 MCP 服务：{" "}
					<a href="https://github.com/libUE4/NBG-CLI/discussions">github.com/libUE4/NBG-CLI/discussions</a>
				</p>
			</div>
		</div>
	)
}

export default McpSubmitCard
