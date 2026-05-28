import { SystemPromptSection } from "../templates/placeholders"
import { TemplateEngine } from "../templates/TemplateEngine"
import type { PromptVariant, SystemPromptContext } from "../types"

const FEEDBACK_TEMPLATE_TEXT = `
If the user asks for help or wants to give feedback inform them of the following: 
- To give feedback, users should report the issue using the /reportbug slash command in the chat. 

When the user directly asks about NBG (eg 'can NBG do...', 'does NBG have...') or asks in second person (eg 'are you able...', 'can you do...'), first use the web_fetch tool to gather information to answer the question from the NBG repository docs at https://github.com/libUE4/NBG-CLI/tree/main/docs.
  - The available sub-pages include \`getting-started\`, \`running-models-locally\`, \`features\`, \`core-workflows\`, \`prompting\`, \`mcp\`, \`enterprise-solutions\`, \`usage\`, \`sdk\`, and \`api\`.
  - Example: https://github.com/libUE4/NBG-CLI/blob/main/docs/features/auto-approve.mdx`

export async function getFeedbackSection(variant: PromptVariant, context: SystemPromptContext): Promise<string | undefined> {
	if (!context.focusChainSettings?.enabled) {
		return undefined
	}

	const template = variant.componentOverrides?.[SystemPromptSection.FEEDBACK]?.template || FEEDBACK_TEMPLATE_TEXT

	return new TemplateEngine().resolve(template, context, {})
}
