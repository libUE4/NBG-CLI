import { Readable, Writable } from "node:stream";
import { writeErr } from "../utils/output";

export async function runAcpMode(): Promise<void> {
	const { AgentSideConnection, ndJsonStream } = await import(
		"@agentclientprotocol/sdk"
	);
	const { AcpAgent } = await import("./acpAgent");

	writeErr("[acp] 正在通过 stdio 启动 ACP 模式...");

	const stream = ndJsonStream(
		Writable.toWeb(process.stdout) as WritableStream<Uint8Array>,
		Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>,
	);

	const connection = new AgentSideConnection((conn) => {
		return new AcpAgent(conn);
	}, stream);

	// Keep the process alive until the connection closes
	await connection.closed;
}
