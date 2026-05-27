import { Command, Help, type OutputConfiguration } from "commander";

type ErrorWriter = (str: string) => void;

type MaybeOption = {
	flags?: string;
	envVar?: string;
};

type LocalizedCommand = Command & {
	createCommand: (name?: string) => Command;
	__clineLocalePatched?: boolean;
};

function translateHelpTitle(title: string): string {
	switch (title) {
		case "Usage:":
			return "用法：";
		case "Arguments:":
			return "参数：";
		case "Options:":
			return "选项：";
		case "Global Options:":
			return "全局选项：";
		case "Commands:":
			return "命令：";
		default:
			return title;
	}
}

function translateUsageText(text: string): string {
	return text
		.replaceAll("[options]", "[选项]")
		.replaceAll("[command]", "[命令]");
}

function translateHelpExtraInfo(text: string): string {
	return text
		.replace(/\bchoices: /g, "可选值：")
		.replace(/\bdefault: /g, "默认：")
		.replace(/\bpreset: /g, "预设：")
		.replace(/\benv: /g, "环境变量：");
}

function translateSuggestion(text: string): string {
	return text
		.replace(/\(Did you mean one of (.+)\?\)/, "（你是不是想输入：$1？）")
		.replace(/\(Did you mean (.+)\?\)/, "（你是不是想输入 $1？）");
}

function translateCommanderError(message: string): string {
	let translated = message.trimEnd();
	translated = translated
		.replace(
			/^error: option '([^']+)' argument '([^']+)' is invalid\./,
			"错误：选项 '$1' 的参数 '$2' 无效。",
		)
		.replace(
			/^error: option '([^']+)' value '([^']+)' from env '([^']+)' is invalid\./,
			"错误：选项 '$1' 来自环境变量 '$3' 的值 '$2' 无效。",
		)
		.replace(
			/^error: command-argument value '([^']+)' is invalid for argument '([^']+)'\./,
			"错误：命令参数 '$2' 的值 '$1' 无效。",
		)
		.replace(
			/^error: missing required argument '([^']+)'/,
			"错误：缺少必填参数 '$1'",
		)
		.replace(
			/^error: option '([^']+)' argument missing/,
			"错误：选项 '$1' 缺少参数",
		)
		.replace(
			/^error: required option '([^']+)' not specified/,
			"错误：缺少必填选项 '$1'",
		)
		.replace(
			/^error: environment variable '([^']+)' cannot be used with environment variable '([^']+)'/,
			"错误：环境变量 '$1' 不能与环境变量 '$2' 同时使用",
		)
		.replace(
			/^error: environment variable '([^']+)' cannot be used with option '([^']+)'/,
			"错误：环境变量 '$1' 不能与选项 '$2' 同时使用",
		)
		.replace(
			/^error: option '([^']+)' cannot be used with environment variable '([^']+)'/,
			"错误：选项 '$1' 不能与环境变量 '$2' 同时使用",
		)
		.replace(
			/^error: option '([^']+)' cannot be used with option '([^']+)'/,
			"错误：选项 '$1' 不能与选项 '$2' 同时使用",
		)
		.replace(/^error: unknown option '([^']+)'/, "错误：未知选项 '$1'")
		.replace(
			/^error: too many arguments for '([^']+)'\. Expected ([0-9]+) arguments? but got ([0-9]+)\./,
			"错误：'$1' 的参数过多。应提供 $2 个参数，但收到 $3 个。",
		)
		.replace(
			/^error: too many arguments\. Expected ([0-9]+) arguments? but got ([0-9]+)\./,
			"错误：参数过多。应提供 $1 个参数，但收到 $2 个。",
		)
		.replace(/^error: unknown command '([^']+)'/, "错误：未知命令 '$1'");
	return translateSuggestion(translated);
}

const localizeErrorOutput: NonNullable<OutputConfiguration["outputError"]> = (
	str,
	write: ErrorWriter,
) => {
	const trailingNewline = str.endsWith("\n") ? "\n" : "";
	write(`${translateCommanderError(str)}${trailingNewline}`);
};

function patchCommanderErrors(cmd: Command): void {
	const mutable = cmd as Command & {
		_callParseArg?: (
			target: unknown,
			value: string,
			previous: unknown,
			invalidArgumentMessage: string,
		) => unknown;
		_conflictingOption?: (option: MaybeOption, conflictingOption: MaybeOption) => void;
		_allowExcessArguments?: boolean;
		_excessArguments?: (receivedArgs: string[]) => void;
		missingArgument: (name: string) => void;
		optionMissingArgument: (option: MaybeOption) => void;
		missingMandatoryOptionValue: (option: MaybeOption) => void;
		unknownOption: (flag: string) => void;
		unknownCommand: () => void;
	};

	const originalCallParseArg = mutable._callParseArg?.bind(cmd);
	if (originalCallParseArg) {
		mutable._callParseArg = (target, value, previous, invalidMessage) => {
			const localizedInvalidMessage = translateCommanderError(invalidMessage);
			return originalCallParseArg(
				target,
				value,
				previous,
				localizedInvalidMessage,
			);
		};
	}

	mutable.missingArgument = (name: string) => {
		cmd.error(`错误：缺少必填参数 '${name}'`, {
			code: "commander.missingArgument",
		});
	};

	mutable.optionMissingArgument = (option: MaybeOption) => {
		cmd.error(`错误：选项 '${option.flags ?? ""}' 缺少参数`, {
			code: "commander.optionMissingArgument",
		});
	};

	mutable.missingMandatoryOptionValue = (option: MaybeOption) => {
		cmd.error(`错误：缺少必填选项 '${option.flags ?? ""}'`, {
			code: "commander.missingMandatoryOptionValue",
		});
	};

	mutable._conflictingOption = (option: MaybeOption, conflictingOption: MaybeOption) => {
		const optionLabel = option.envVar
			? `环境变量 '${option.envVar}'`
			: `选项 '${option.flags ?? ""}'`;
		const conflictingLabel = conflictingOption.envVar
			? `环境变量 '${conflictingOption.envVar}'`
			: `选项 '${conflictingOption.flags ?? ""}'`;
		cmd.error(`错误：${optionLabel} 不能与${conflictingLabel}同时使用`, {
			code: "commander.conflictingOption",
		});
	};

	mutable.unknownOption = (flag: string) => {
		cmd.error(`错误：未知选项 '${flag}'`, {
			code: "commander.unknownOption",
		});
	};

	mutable._excessArguments = (receivedArgs: string[]) => {
		if (mutable._allowExcessArguments) return;
		const expected = cmd.registeredArguments.length;
		const forSubcommand = cmd.parent ? ` '${cmd.name()}'` : "";
		cmd.error(
			`错误：${forSubcommand ? `${forSubcommand} 的` : ""}参数过多。应提供 ${expected} 个参数，但收到 ${receivedArgs.length} 个。`,
			{ code: "commander.excessArguments" },
		);
	};

	mutable.unknownCommand = () => {
		cmd.error(`错误：未知命令 '${cmd.args[0] ?? ""}'`, {
			code: "commander.unknownCommand",
		});
	};
}

export function localizeCommander(cmd: Command): Command {
	const mutable = cmd as LocalizedCommand;
	if (mutable.__clineLocalePatched) {
		return cmd;
	}
	mutable.__clineLocalePatched = true;

	cmd.helpOption("-h, --help", "显示命令帮助");
	cmd.helpCommand("help [command]", "显示指定命令的帮助");
	cmd.configureHelp({
		styleTitle: translateHelpTitle,
		styleUsage: (str: string) => translateUsageText(str),
		optionDescription(this: Help, option) {
			return translateHelpExtraInfo(Help.prototype.optionDescription.call(this, option));
		},
		argumentDescription(this: Help, argument) {
			return translateHelpExtraInfo(
				Help.prototype.argumentDescription.call(this, argument),
			);
		},
	});
	cmd.configureOutput({
		outputError: localizeErrorOutput,
	});
	patchCommanderErrors(cmd);

	const originalCreateCommand = mutable.createCommand.bind(cmd);
	mutable.createCommand = (name?: string) =>
		localizeCommander(originalCreateCommand(name));

	return cmd;
}
