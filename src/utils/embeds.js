import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

/**
 * Creates the Post Embed for a forum thread
 */
export function createForumCanvasEmbed(postData, thread, updatedByUser = null) {
  const embed = new EmbedBuilder()
    .setColor(postData.color || '#2A2D34')
    .setTimestamp();

  if (postData.imageUrl) {
    embed.setImage(postData.imageUrl);
  }

  if (postData.originalAuthorId) {
    embed.addFields({ name: 'Created by', value: `<@${postData.originalAuthorId}>`, inline: true });
  }

  const footerText = updatedByUser 
    ? `Last updated by @${updatedByUser.username}` 
    : `Collaborative Post`;

  embed.setFooter({ text: footerText });

  return embed;
}

/**
 * Creates the interactive action bar buttons (Change Image, Edit Text)
 */
export function createActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_change_image')
      .setLabel('Change Image')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_edit_content')
      .setLabel('Edit Text')
      .setStyle(ButtonStyle.Secondary)
  );
}

/**
 * Creates the Creation Panel Embed and Button
 */
export function createPanelComponents(targetForumChannelId) {
  const embed = new EmbedBuilder()
    .setTitle('Forum Posts')
    .setDescription(
      'Use the button below to create a post in <#' + targetForumChannelId + '>.\n\n' +
      'Update the cover image or text anytime.'
    )
    .setColor('#2A2D34');

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`btn_create_post_${targetForumChannelId}`)
      .setLabel('Create Post')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embed, row };
}
