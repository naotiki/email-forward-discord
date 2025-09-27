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

		const webhookClient = new WebhookClient({ url: env.DISCORD_WEBHOOK_URL },{
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

				//url: email.from.address ? `mailto:${email.from.address}` : undefined,
			})/* 
		if (email.replyTo) {
			emailEmbed.addFields({ name: 'Reply-To', value: email.replyTo?.map(addressToString).join(",") || '(返信先なし)', inline: true });
		}
		if (email.cc) {
			emailEmbed.addFields({ name: 'Cc', value: email.cc?.map(addressToString).join(",") || '(CCなし)', inline: true });
		}
		if (email.bcc) {
			emailEmbed.addFields({ name: 'Bcc', value: email.bcc?.map(addressToString).join(",") || '(BCCなし)', inline: true });
		} */

		if (
			email.text
		) {
			emailEmbed.addFields({
				name: '本文',
				value: (email.text.length > 1000 ? email.text.slice(0, 1000) + '...' : email.text),
			})
		}else if (email.html) {
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