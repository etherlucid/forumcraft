import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from 'discord.js';

/**
 * Creates the Post Embed for a forum thread
 */
export function createForumCanvasEmbed(postData, thread, updatedByUser = null) {
  const embed = new EmbedBuilder()
    .setTitle(postData.title || thread.name || 'Post')
    .setDescription(postData.description || '*No description added yet. Click `Edit Text` below to update.*')
    .setColor(postData.color || '#2A2D34')
    .setTimestamp();

  if (postData.imageUrl) {
    embed.setImage(postData.imageUrl);
  }

  // Display applied tags on the thread
  const forumChannel = thread.parent;
  if (forumChannel && forumChannel.availableTags && thread.appliedTags) {
    const appliedTagNames = forumChannel.availableTags
      .filter(tag => thread.appliedTags.includes(tag.id))
      .map(tag => tag.name);

    if (appliedTagNames.length > 0) {
      embed.addFields({ name: 'Tags', value: appliedTagNames.join(' • '), inline: true });
    } else {
      embed.addFields({ name: 'Tags', value: '*None*', inline: true });
    }
  }

  if (postData.originalAuthorId) {
    embed.addFields({ name: 'Created by', value: `<@${postData.originalAuthorId}>`, inline: true });
  }

  const footerText = updatedByUser 
    ? `Last updated by @${updatedByUser.username}` 
    : `Forum post`;

  embed.setFooter({ text: footerText });

  return embed;
}

/**
 * Creates the interactive action bar buttons (Change Image, Tags, Edit Text)
 */
export function createActionRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('btn_change_image')
      .setLabel('Change Image')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('btn_edit_tags')
      .setLabel('Tags')
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
      'Update the cover image, text, or tags anytime.'
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

/**
 * Creates a dynamic String Select Menu for forum channel tags
 */
export function createTagSelectMenu(thread) {
  const forumChannel = thread.parent;
  if (!forumChannel || !forumChannel.availableTags || forumChannel.availableTags.length === 0) {
    return null;
  }

  const options = forumChannel.availableTags.map(tag => {
    const isSelected = thread.appliedTags.includes(tag.id);
    return new StringSelectMenuOptionBuilder()
      .setLabel(tag.name)
      .setValue(tag.id)
      .setDefault(isSelected);
  });

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('select_forum_tags')
    .setPlaceholder('Select tags...')
    .setMinValues(0)
    .setMaxValues(Math.min(options.length, 5))
    .addOptions(options);

  return new ActionRowBuilder().addComponents(selectMenu);
}
