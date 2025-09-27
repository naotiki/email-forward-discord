import { EmbedBuilder, WebhookClient } from 'discord.js';
import { createDocument } from '@mixmark-io/domino';
import * as PostalMime from 'postal-mime';
import TurndownService from 'turndown';



function addressToString(addr: PostalMime.Address | undefined): string {
	if (!addr) return '(なし)';
	return `${addr.name} <${addr.address}>`;
}

export default {
	async email(message, env, ctx) {

		// copy to email
		message.forward(env.FORWARD_EMAIL_TO);

		const webhookClient = new WebhookClient({ url: env.DISCORD_WEBHOOK_URL }, {
			allowedMentions: { parse: [] }
		});


		const parser = new PostalMime.default();
		const rawEmail = new Response(message.raw);
		const email = await parser.parse(await rawEmail.arrayBuffer());

		let content = undefined;

		const emailEmbed = new EmbedBuilder()
			.setTitle(email.subject || '(件名なし)')
			.setDescription(`To: ${email.to?.map(addressToString).join(",") || '(宛先なし)'}`)
			.setTimestamp(email.date ? new Date(email.date) : null)
			.setAuthor({
				name: addressToString(email.from),
			})

		if (
			email.text
		) {
			emailEmbed.addFields({
				name: '本文',
				value: (email.text.length > 1000 ? email.text.slice(0, 1000) + '...' : email.text),
			})
		}
		if (email.html) {
			const turndownService = new TurndownService({
				headingStyle: 'atx',
			})
			const markdown = turndownService.turndown(createDocument(email.html));
			content = markdown.length > 1000 ? markdown.slice(0, 1000) + '...' : markdown;
		}

		await webhookClient.send({
			embeds: [emailEmbed],
			username: "Cloudflare Workers",

			content: content,
		});



	},
} satisfies ExportedHandler<Env>;