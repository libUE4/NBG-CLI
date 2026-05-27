import "opentui-spinner/react";
import type { ReactNode } from "react";
import {
	type CodexCliStatus,
	getLocalCliProviderInfo,
} from "../../../utils/codex-cli";
import {
	ClineModelPicker,
	type ClineModelPickerEntry,
} from "../../components/model-selector/cline-model-picker";
import {
	type SearchableItem,
	SearchableList,
	type SearchableListState,
} from "../../components/searchable-list";
import {
	TrackedRobot,
	type useMouseTracker,
} from "../../components/tracked-robot";
import { navigationHint } from "../../hooks/navigation-keys";
import { useTouchInputFocus } from "../../hooks/use-touch-input-focus";
import { useTerminalBackground } from "../../hooks/use-terminal-background";
import { getDefaultForeground, palette } from "../../palette";
import { FIELD_ORDER } from "./fields";
import { MAIN_MENU, THINKING_LEVELS } from "./model";

type MouseTrackerState = ReturnType<typeof useMouseTracker>;

function useDefaultFg(): string | undefined {
	const terminalBg = useTerminalBackground();
	return getDefaultForeground(terminalBg);
}

interface OnboardingFrameProps {
	children: ReactNode;
	compact: boolean;
	contentWidth: number;
	mouse: MouseTrackerState;
}

function OnboardingFrame({
	children,
	compact,
	contentWidth,
	mouse,
}: OnboardingFrameProps) {
	return (
		<box
			flexDirection="column"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="center"
			onMouseMove={mouse.onMouseMove}
		>
			{!compact && (
				<TrackedRobot cursorX={mouse.cursor.x} cursorY={mouse.cursor.y} />
			)}
			<box
				flexDirection="column"
				width={contentWidth}
				marginTop={compact ? 0 : 1}
				gap={1}
			>
				{children}
			</box>
		</box>
	);
}

export function OnboardingDoneScreen(props: { mouse: MouseTrackerState }) {
	return (
		<box
			flexDirection="column"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="center"
			onMouseMove={props.mouse.onMouseMove}
		>
			<text fg={palette.success}>{"\u2714"} 已全部设置完成！</text>
		</box>
	);
}

export function OnboardingOAuthPendingScreen(props: {
	authError: string;
	authStatus: string;
	authUrl: string;
	compact: boolean;
	contentWidth: number;
	label: string;
	mouse: MouseTrackerState;
	oauthProvider: string;
}) {
	const defaultFg = useDefaultFg();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<box flexDirection="column" alignItems="center" gap={1}>
				<text fg={defaultFg}>正在使用 {props.label} 登录</text>

				{!props.authError && (
					<box flexDirection="row" gap={1} justifyContent="center">
						<spinner name="dots" color={palette.act} />
						<text fg="gray">{props.authStatus}</text>
					</box>
				)}

				{props.authError && (
					<box flexDirection="column" alignItems="center" gap={1}>
						<text fg="red">{props.authError}</text>
						<text fg="gray">Esc 返回</text>
					</box>
				)}

				{props.authUrl && !props.authError && (
					<box
						flexDirection="column"
						border
						borderStyle="rounded"
						borderColor="#333333"
						paddingX={2}
						paddingY={1}
						width={props.contentWidth}
					>
						<text fg="gray">如果浏览器没有打开：</text>
						<text fg={palette.act} marginTop={1} selectable>
							{props.authUrl}
						</text>
					</box>
				)}

				<text fg="gray">
					<em>Esc 取消，Ctrl+C 退出</em>
				</text>
			</box>
		</OnboardingFrame>
	);
}

export function OnboardingDeviceCodeScreen(props: {
	compact: boolean;
	contentWidth: number;
	deviceError: string;
	deviceStatus: string;
	deviceUserCode: string;
	deviceVerifyUrl: string;
	label: string;
	mouse: MouseTrackerState;
}) {
	const defaultFg = useDefaultFg();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<box flexDirection="column" alignItems="center" gap={1}>
				<text fg={defaultFg}>正在使用 {props.label} 登录</text>

				{!props.deviceUserCode && !props.deviceError && (
					<box flexDirection="row" gap={1} justifyContent="center">
						<spinner name="dots" color={palette.act} />
						<text fg="gray">{props.deviceStatus}</text>
					</box>
				)}

				{props.deviceError && (
					<box flexDirection="column" alignItems="center" gap={1}>
						<text fg="red">{props.deviceError}</text>
						<text fg="gray">Esc 返回</text>
					</box>
				)}

				{props.deviceUserCode && !props.deviceError && (
					<box
						flexDirection="column"
						border
						borderStyle="rounded"
						borderColor={palette.act}
						paddingX={2}
						paddingY={1}
						width={props.contentWidth}
						alignItems="center"
						gap={1}
					>
						<text fg="gray">你的验证码：</text>
						<text fg={defaultFg} selectable>
							<strong>{props.deviceUserCode}</strong>
						</text>
						<text fg="gray" marginTop={1}>
							访问此 URL 并输入上方验证码：
						</text>
						<text fg={palette.act} selectable>
							{props.deviceVerifyUrl}
						</text>
					</box>
				)}

				{props.deviceUserCode && !props.deviceError && (
					<box flexDirection="row" gap={1} justifyContent="center">
						<spinner name="dots" color={palette.act} />
						<text fg="gray">正在等待登录...</text>
					</box>
				)}

				<text fg="gray">
					<em>Esc 取消，Ctrl+C 退出</em>
				</text>
			</box>
		</OnboardingFrame>
	);
}

import type {
	ProviderConfigFieldKey,
	ProviderConfigFieldRequirement,
} from "@cline/core";

const DEFAULT_FIELD_LABELS: Partial<Record<ProviderConfigFieldKey, string>> = {
	apiKey: "API Key",
	baseUrl: "基础 URL",
	awsRegion: "AWS 区域",
	awsProfile: "AWS Profile 名称",
};

const DEFAULT_FIELD_PLACEHOLDERS: Partial<
	Record<ProviderConfigFieldKey, string>
> = {
	apiKey: "在此粘贴 API Key...",
	baseUrl: "",
	awsRegion: "us-east-1",
	awsProfile: "default",
};

export function OnboardingProviderConfigScreen(props: {
	activeProviderName: string;
	compact: boolean;
	contentWidth: number;
	description?: string;
	error?: string;
	fields: Partial<
		Record<ProviderConfigFieldKey, ProviderConfigFieldRequirement>
	>;
	focusedField: ProviderConfigFieldKey;
	loading?: boolean;
	mouse: MouseTrackerState;
	values: Partial<Record<ProviderConfigFieldKey, string>>;
	onFieldInput: (field: ProviderConfigFieldKey, value: string) => void;
	onFieldFocus: (field: ProviderConfigFieldKey) => void;
	onSubmit: () => void;
}) {
	const defaultFg = useDefaultFg();
	const visibleFields = FIELD_ORDER.filter(
		(key) => props.fields[key] !== undefined,
	);
	const { setInputRef, requestInputFocus } = useTouchInputFocus();

	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<box flexDirection="column" gap={1} alignItems="center">
				<text fg={defaultFg}>{props.activeProviderName}</text>

				{props.description && <text fg="gray">{props.description}</text>}
				{props.error && <text fg="red">{props.error}</text>}
				{props.loading && (
					<box flexDirection="row" gap={1}>
						<spinner name="dots" color="gray" />
						<text fg="gray">正在获取模型列表...</text>
					</box>
				)}

				{visibleFields.map((key) => {
					const requirement = props.fields[key];
					if (!requirement) return null;
					const label = requirement.label ?? DEFAULT_FIELD_LABELS[key] ?? key;
					const placeholder =
						requirement.placeholder ??
						(key === "baseUrl" && requirement.defaultValue
							? requirement.defaultValue
							: (DEFAULT_FIELD_PLACEHOLDERS[key] ?? ""));
					const value = props.values[key] ?? "";
					const isFocused = props.focusedField === key;
					return (
						<box
							key={key}
							flexDirection="column"
							gap={0}
							width={props.contentWidth}
						>
							<text fg="gray">{label}</text>
							{requirement.note && <text fg="gray">{requirement.note}</text>}
							<box
								border
								borderStyle="rounded"
								borderColor={isFocused ? palette.act : "gray"}
								paddingX={1}
								onMouseDown={() => {
									props.onFieldFocus(key);
									requestInputFocus();
								}}
							>
								<input
									ref={isFocused ? setInputRef : undefined}
									value={value}
									onInput={(v: string) => props.onFieldInput(key, v)}
									onSubmit={props.onSubmit}
									placeholder={placeholder}
									textColor={defaultFg}
									focusedTextColor={defaultFg}
									cursorColor={defaultFg}
									focused={isFocused && !props.loading}
									flexGrow={1}
								/>
							</box>
						</box>
					);
				})}

				<text fg="gray">
					<em>
						{props.loading
							? "正在验证配置并获取模型列表..."
							: visibleFields.length > 1
							? "Ctrl+P/N 切换字段，Enter 保存，Esc 返回，Ctrl+C 退出"
							: "Enter 保存，Esc 返回，Ctrl+C 退出"}
					</em>
				</text>
			</box>
		</OnboardingFrame>
	);
}

export function OnboardingCodexCliScreen(props: {
	activeProviderName: string;
	activeProviderId: string;
	checking: boolean;
	compact: boolean;
	contentWidth: number;
	authCode: string;
	authError: string;
	authRunning: boolean;
	authStatus: string;
	authUrl: string;
	mouse: MouseTrackerState;
	onAuthCodeInput: (value: string) => void;
	onAuthCodeSubmit: () => void;
	status?: CodexCliStatus;
}) {
	const defaultFg = useDefaultFg();
	const cliInfo = getLocalCliProviderInfo(props.activeProviderId);
	const providerName = props.activeProviderName || cliInfo.displayName;
	const isClaudeCode = props.activeProviderId === "claude-code";
	const checkingText = `正在检查 ${cliInfo.displayName}...`;
	const installedText =
		isClaudeCode && props.status?.installed === true && props.status.authenticated
			? `● ${cliInfo.displayName} 官方验证已完成`
			: `● ${cliInfo.displayName} 已安装`;
	const missingText =
		props.status?.installed === false && props.status.authRequired
			? `${cliInfo.displayName} 需要官方验证`
			: `未找到 ${cliInfo.displayName}`;
	const installedStatus =
		props.status?.installed === true ? props.status : undefined;
	const installedHint =
		isClaudeCode && installedStatus?.authenticated
			? "已使用 Anthropic 官方 Claude Code 账号验证。"
			: cliInfo.authHint;
	const canShowLogin =
		isClaudeCode &&
		(!installedStatus ||
			props.authRunning ||
			Boolean(props.authUrl) ||
			Boolean(props.authError));
	const helperText = installedStatus
		? isClaudeCode
			? "Enter 继续，L 重新官方验证/切换账号，R 重新检查，Esc 返回，Ctrl+C 退出"
			: "Enter 继续，R 重新检查，Esc 返回，Ctrl+C 退出"
		: isClaudeCode
			? "L 启动 Claude 官方验证，R 重新检查，Esc 返回，Ctrl+C 退出"
			: "R 重新检查，Esc 返回，Ctrl+C 退出";
	const { setInputRef, requestInputFocus } = useTouchInputFocus();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<box flexDirection="column" gap={1} alignItems="center">
				<text fg={defaultFg}>{providerName}</text>

				{props.checking && (
					<box flexDirection="row" gap={1}>
						<spinner name="dots" color="gray" />
						<text fg="gray">{checkingText}</text>
					</box>
				)}

				{installedStatus && (
					<box flexDirection="column" gap={1} alignItems="center">
						<text fg={palette.success}>{installedText}</text>
						<text fg="gray">{installedStatus.version}</text>
						<text fg="gray">{installedHint}</text>
					</box>
				)}

				{props.status && !props.status.installed && (
					<box flexDirection="column" gap={1} width={props.contentWidth}>
						<text fg="yellow">{missingText}</text>
						<text fg="gray">{props.status.reason}</text>
						{!props.status.commandAvailable && (
							<>
								<text fg="gray">安装说明：</text>
								<text fg="cyan" selectable>
									{cliInfo.installUrl}
								</text>
							</>
						)}
					</box>
				)}

				{canShowLogin && (
					<box flexDirection="column" gap={1} width={props.contentWidth}>
						<text fg={props.authError ? "red" : "gray"}>
							{props.authError ||
								props.authStatus ||
								"按 L 使用 Anthropic 官方 Claude Code 登录"}
						</text>
						{props.authUrl && (
							<>
								<text fg="gray">如果浏览器没有打开，请访问：</text>
								<text fg="cyan" selectable>
									{props.authUrl}
								</text>
							</>
						)}
						{props.authRunning && (
							<box
								border
								borderStyle="rounded"
								borderColor="gray"
								paddingX={1}
								flexDirection="column"
								onMouseDown={requestInputFocus}
							>
								<text fg="gray">授权码（如果页面要求粘贴）：</text>
								<input
									ref={setInputRef}
									value={props.authCode}
									onInput={props.onAuthCodeInput}
									onSubmit={props.onAuthCodeSubmit}
									placeholder="粘贴 authorizationCode#state 后回车"
									textColor={defaultFg}
									focusedTextColor={defaultFg}
									cursorColor={defaultFg}
									flexGrow={1}
									focused
								/>
							</box>
						)}
					</box>
				)}

				<text fg="gray">
					<em>{helperText}</em>
				</text>
			</box>
		</OnboardingFrame>
	);
}

export function OnboardingProviderPickerScreen(props: {
	compact: boolean;
	contentWidth: number;
	mouse: MouseTrackerState;
	providerList: SearchableListState;
	providersLoading: boolean;
}) {
	const defaultFg = useDefaultFg();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<text fg={defaultFg} paddingX={1}>
				选择三方 API
			</text>

			{props.providersLoading ? (
				<box flexDirection="row" gap={1} paddingX={1}>
					<spinner name="dots" color="gray" />
					<text fg="gray">正在加载提供方...</text>
				</box>
			) : (
				<SearchableList
					items={props.providerList.filtered}
					selected={props.providerList.safeSelected}
					onSearchChange={props.providerList.setSearch}
					placeholder="搜索三方 API..."
					emptyText="没有可用的三方 API"
				/>
			)}

			<text fg="gray" paddingX={1}>
				<em>
					输入搜索，{navigationHint()}，Enter 选择，Esc 返回，Ctrl+C 退出
				</em>
			</text>
		</OnboardingFrame>
	);
}

export function OnboardingClineModelScreen(props: {
	clineEntries: ClineModelPickerEntry[];
	clineKnownModels: Record<string, unknown> | undefined;
	clineModelSelected: number;
	compact: boolean;
	contentWidth: number;
	mouse: MouseTrackerState;
	recommendedLoading: boolean;
}) {
	const defaultFg = useDefaultFg();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<text fg={defaultFg} paddingX={1}>
				<strong>选择模型</strong>
			</text>
			<text fg="gray" paddingX={1}>
				之后可以随时更改
			</text>

			<ClineModelPicker
				entries={props.clineEntries}
				selected={props.clineModelSelected}
				loading={props.recommendedLoading}
				knownModels={props.clineKnownModels}
			/>

			<text fg="gray" paddingX={1}>
				<em>{navigationHint()}，Enter 选择，Esc 返回，Ctrl+C 退出</em>
			</text>
		</OnboardingFrame>
	);
}

export function OnboardingModelPickerScreen(props: {
	activeProviderName: string;
	compact: boolean;
	contentWidth: number;
	modelList: SearchableListState;
	modelsLoading: boolean;
	mouse: MouseTrackerState;
	onModelItemSelect: (item: SearchableItem) => void;
}) {
	const defaultFg = useDefaultFg();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<text fg={defaultFg} paddingX={1}>
				<strong>为 {props.activeProviderName} 选择模型</strong>
			</text>
			<text fg="gray" paddingX={1}>
				之后可以随时更改
			</text>

			{props.modelsLoading ? (
				<box flexDirection="row" gap={1} paddingX={1}>
					<spinner name="dots" color="gray" />
					<text fg="gray">正在加载模型...</text>
				</box>
			) : (
				<SearchableList
					items={props.modelList.filtered}
					selected={props.modelList.safeSelected}
					onSearchChange={props.modelList.setSearch}
					onItemSelect={props.onModelItemSelect}
					placeholder="搜索模型..."
					emptyText="创建自定义模型 ID 以手动输入"
				/>
			)}

			<text fg="gray" paddingX={1}>
				<em>
					输入搜索，{navigationHint()}，Enter 选择，Esc 返回，Ctrl+C 退出
				</em>
			</text>
		</OnboardingFrame>
	);
}

export function OnboardingCustomModelIdScreen(props: {
	activeProviderName: string;
	compact: boolean;
	contentWidth: number;
	error: string;
	mouse: MouseTrackerState;
	onInput: (value: string) => void;
	onSubmit: () => void;
	title: string;
	value: string;
}) {
	const defaultFg = useDefaultFg();
	const { setInputRef, requestInputFocus } = useTouchInputFocus();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<text fg={defaultFg} paddingX={1}>
				{props.title}
			</text>
			<text fg="gray" paddingX={1}>
				{props.activeProviderName}
			</text>

			<box flexDirection="column" gap={0} paddingX={1}>
				<text fg="gray">模型 ID</text>
				<box
					border
					borderStyle="rounded"
					borderColor={props.error ? "red" : "gray"}
					paddingX={1}
					onMouseDown={requestInputFocus}
				>
					<input
						ref={setInputRef}
						value={props.value}
						onInput={props.onInput}
						onSubmit={props.onSubmit}
						placeholder=""
						textColor={defaultFg}
						focusedTextColor={defaultFg}
						cursorColor={defaultFg}
						flexGrow={1}
						focused
					/>
				</box>
				{props.error && <text fg="red">{props.error}</text>}
			</box>

			<text fg="gray" paddingX={1}>
				<em>
					Enter 保存，Esc 返回模型选择，Ctrl+C 退出
				</em>
			</text>
		</OnboardingFrame>
	);
}

export function OnboardingThinkingLevelScreen(props: {
	compact: boolean;
	contentWidth: number;
	mouse: MouseTrackerState;
	selectedModelName: string;
	thinkingSelected: number;
}) {
	const defaultFg = useDefaultFg();
	return (
		<OnboardingFrame
			compact={props.compact}
			contentWidth={props.contentWidth}
			mouse={props.mouse}
		>
			<text fg={defaultFg} paddingX={1}>
				{props.selectedModelName} 的思考强度
			</text>
			<text fg="gray" paddingX={1}>
				扩展思考可让模型推理更复杂的问题
			</text>

			<box flexDirection="column">
				{THINKING_LEVELS.map((level, i) => {
					const isSel = i === props.thinkingSelected;
					return (
						<box
							key={level.value}
							paddingX={1}
							flexDirection="row"
							gap={1}
							backgroundColor={isSel ? palette.selection : undefined}
							height={1}
						>
							<text
								fg={isSel ? palette.textOnSelection : "gray"}
								flexShrink={0}
							>
								{isSel ? "\u276f" : " "}
							</text>
							<text fg={isSel ? palette.textOnSelection : defaultFg}>
								{level.label}
							</text>
							<text fg={isSel ? palette.textOnSelection : "gray"}>
								{level.desc}
							</text>
						</box>
					);
				})}
			</box>

			<text fg="gray" paddingX={1}>
				<em>{navigationHint()}，Enter 选择，Esc 返回，Ctrl+C 退出</em>
			</text>
		</OnboardingFrame>
	);
}

export function OnboardingMainMenuScreen(props: {
	contentWidth: number;
	menuSelected: number;
	mouse: MouseTrackerState;
}) {
	const defaultFg = useDefaultFg();
	return (
		<box
			flexDirection="column"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="center"
			onMouseMove={props.mouse.onMouseMove}
		>
			<TrackedRobot
				cursorX={props.mouse.cursor.x}
				cursorY={props.mouse.cursor.y}
			/>

			<box
				flexDirection="column"
				width={props.contentWidth}
				alignItems="center"
				marginTop={1}
			>
				<text fg={defaultFg}>
					<strong>欢迎使用 nbg</strong>
				</text>
				<text fg="gray" marginTop={1}>
					连接模型提供方即可开始。
				</text>
			</box>

			<box
				flexDirection="column"
				width={props.contentWidth}
				marginTop={1}
				gap={0}
			>
				{MAIN_MENU.map((option, i) => {
					const isSel = i === props.menuSelected;
					return (
						<box
							key={option.value}
							flexDirection="row"
							border
							borderStyle="rounded"
							borderColor={isSel ? palette.act : "#333333"}
							paddingX={1}
							gap={1}
							alignItems="center"
						>
							<text fg={isSel ? palette.act : "#555555"} flexShrink={0}>
								{option.icon}
							</text>
							<box flexDirection="column" flexGrow={1}>
								<text fg={isSel ? defaultFg : "gray"}>{option.label}</text>
								<text fg={isSel ? "gray" : "#555555"}>{option.detail}</text>
							</box>
							{isSel && (
								<text fg={palette.act} flexShrink={0}>
									{"\u2192"}
								</text>
							)}
						</box>
					);
				})}
			</box>

			<text fg="gray" marginTop={1}>
				<em>{navigationHint()}，Enter 选择，Ctrl+C 退出</em>
			</text>
		</box>
	);
}
