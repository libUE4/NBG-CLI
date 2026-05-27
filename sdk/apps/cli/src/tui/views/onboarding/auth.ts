import {
	completeClineDeviceAuth,
	type ITelemetryService,
	loginLocalProvider,
	type ProviderSettingsManager,
	saveLocalProviderOAuthCredentials,
	startClineDeviceAuth,
} from "@cline/core";
import { getClineEnvironmentConfig } from "@cline/shared";
import open from "open";

export type OnboardingOAuthProviderId = "cline" | "oca" | "openai-codex";

export function isOnboardingOAuthProviderId(
	providerId: string,
): providerId is OnboardingOAuthProviderId {
	return (
		providerId === "cline" ||
		providerId === "oca" ||
		providerId === "openai-codex"
	);
}

export function runOAuthAuthFlow(input: {
	providerId: OnboardingOAuthProviderId;
	providerSettingsManager: ProviderSettingsManager;
	isAborted: () => boolean;
	setStatus: (status: string) => void;
	setAuthUrl: (url: string) => void;
	setError: (error: string) => void;
	onComplete: (providerId: OnboardingOAuthProviderId) => void;
	telemetry?: ITelemetryService;
}): void {
	const existing = input.providerSettingsManager.getProviderSettings(
		input.providerId,
	);

	loginLocalProvider(
		input.providerId,
		existing,
		(url: string) => {
			input.setAuthUrl(url);
			input.setStatus("正在等待登录...");
			try {
				void open(url, { wait: false }).catch(() => {
					input.setStatus("无法打开浏览器。请访问下方 URL。");
				});
			} catch {
				input.setStatus("无法打开浏览器。请访问下方 URL。");
			}
		},
		input.telemetry,
	)
		.then((credentials) => {
			if (input.isAborted()) return;
			saveLocalProviderOAuthCredentials(
				input.providerSettingsManager,
				input.providerId,
				existing,
				credentials,
			);
			input.onComplete(input.providerId);
		})
		.catch((err: unknown) => {
			if (input.isAborted()) return;
			input.setError(err instanceof Error ? err.message : String(err));
			input.setStatus("认证失败");
		});
}

export function runDeviceCodeAuthFlow(input: {
	providerId: OnboardingOAuthProviderId;
	providerSettingsManager: ProviderSettingsManager;
	isAborted: () => boolean;
	setUserCode: (code: string) => void;
	setVerifyUrl: (url: string) => void;
	setStatus: (status: string) => void;
	setError: (error: string) => void;
	onComplete: (providerId: OnboardingOAuthProviderId) => void;
	telemetry?: ITelemetryService;
}): void {
	const existing = input.providerSettingsManager.getProviderSettings(
		input.providerId,
	);
	const apiBaseUrl =
		existing?.baseUrl?.trim() || getClineEnvironmentConfig().apiBaseUrl;

	// `startClineDeviceAuth` only requests the user/device code pair; the
	// `auth_started` telemetry event is emitted by `completeClineDeviceAuth`
	// (which owns the actual login lifecycle), so we intentionally do NOT
	// pass telemetry into `startClineDeviceAuth` here.
	startClineDeviceAuth()
		.then((result) => {
			if (input.isAborted()) return;
			input.setUserCode(result.userCode);
			input.setVerifyUrl(
				result.verificationUriComplete || result.verificationUri,
			);
			input.setStatus("请在下方 URL 输入验证码");

			completeClineDeviceAuth({
				deviceCode: result.deviceCode,
				expiresInSeconds: result.expiresInSeconds,
				pollIntervalSeconds: result.pollIntervalSeconds,
				apiBaseUrl,
				provider: input.providerId,
				telemetry: input.telemetry,
			})
				.then((credentials) => {
					if (input.isAborted()) return;
					saveLocalProviderOAuthCredentials(
						input.providerSettingsManager,
						input.providerId,
						existing,
						credentials,
					);
					input.onComplete(input.providerId);
				})
				.catch((err: unknown) => {
					if (input.isAborted()) return;
					input.setError(err instanceof Error ? err.message : String(err));
					input.setStatus("认证失败");
				});
		})
		.catch((err: unknown) => {
			if (input.isAborted()) return;
			input.setError(err instanceof Error ? err.message : String(err));
			input.setStatus("无法启动设备验证码流程");
		});
}
