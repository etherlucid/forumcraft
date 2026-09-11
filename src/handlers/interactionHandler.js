import { 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  ActionRowBuilder, 
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags
} from 'discord.js';
import { db } from '../utils/db.js';
import { createForumCanvasEmbed, createActionRow, createTagSelectMenu, createPanelComponents } from '../utils/embeds.js';

export function canUserEditPost(member, thread, postData) {
  if (!member) return false;

  if (member.permissions?.has(PermissionFlagsBits.Administrator) || member.permissions?.has(PermissionFlagsBits.ManageThreads)) {
    return true;
  }

  const authorId = postData?.originalAuthorId || postData?.authorId || thread?.ownerId;
  if (authorId && member.id === authorId) {
    return true;
  }

  const guildId = member.guild?.id || thread?.guild?.id;
  const config = guildId ? db.getConfig(guildId) : { editorRoleId: null };
  if (config.editorRoleId && member.roles?.cache?.has(config.editorRoleId)) {
    return true;
  }

  return false;
}

export async function updatePostCanvas(thread, postData, updatedByUser = null) {
  const embed = createForumCanvasEmbed(postData, thread, updatedByUser);
  const actionRow = createActionRow();

  const starterContent = postData.description?.trim() 
    ? (postData.description.length > 500 ? postData.description.slice(0, 497) + '...' : postData.description)
    : '*No description added yet.*';

  try {
    let starterMsg = null;
    if (postData.starterMessageId) {
      try {
        starterMsg = await thread.messages.fetch(postData.starterMessageId);
      } catch (e) {}
    }

    if (!starterMsg) {
      starterMsg = await thread.fetchStarterMessage().catch(() => null);
    }

    if (starterMsg && starterMsg.author.id === thread.client.user.id) {
      await starterMsg.edit({
        content: starterContent,
        embeds: [embed],
        components: [actionRow],
        allowedMentions: { users: [] }
      });
      if (!starterMsg.pinned) {
        try { await starterMsg.pin(); } catch (e) {}
      }
      db.savePost(thread.id, { starterMessageId: starterMsg.id });
      return starterMsg;
    }
  } catch (err) {
    console.error('Error editing starter message:', err);
  }

  let canvasMsg = null;
  if (postData.botMessageId) {
    try {
      canvasMsg = await thread.messages.fetch(postData.botMessageId);
      if (canvasMsg) {
        await canvasMsg.edit({ embeds: [embed], components: [actionRow], allowedMentions: { users: [] } });
        return canvasMsg;
      }
    } catch (e) {}
  }

  canvasMsg = await thread.send({ embeds: [embed], components: [actionRow], allowedMentions: { users: [] } });
  try { await canvasMsg.pin(); } catch (e) {}
  db.savePost(thread.id, { botMessageId: canvasMsg.id });
  return canvasMsg;
}

export async function handleInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand()) {
      await handleChatInputCommand(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    let errorMsg = 'Something went wrong. Try again in a second.';
    if (error.code === 50001 || error.code === 50013) {
      errorMsg = '⚠️ **Bot Missing Permissions**: Please make sure the bot role has **View Channel**, **Send Messages in Threads**, and **Manage Threads** permissions in this private category/channel.';
    }
    const replyOptions = { content: errorMsg, flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(replyOptions).catch(() => {});
    } else {
      await interaction.reply(replyOptions).catch(() => {});
    }
  }
}

async function resolveInteractionChannel(interaction) {
  if (interaction.channel) return interaction.channel;
  if (interaction.channelId && interaction.guild) {
    return await interaction.guild.channels.fetch(interaction.channelId).catch(() => null);
  }
  return null;
}

// ----------------------------------------------------
// 1. SLASH COMMANDS
// ----------------------------------------------------
async function handleChatInputCommand(interaction) {
  const { commandName, options, channel, member, user, guild } = interaction;

  if (commandName !== 'forum') return;

  const subcommand = options.getSubcommand();

  if (subcommand === 'config') {
    if (!member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: 'Only server managers can configure settings.', flags: MessageFlags.Ephemeral });
    }
    const editorRole = options.getRole('editor_role');
    const bypassRole = options.getRole('bypass_role');
    const autoConvert = options.getBoolean('auto_convert');

    const currentConfig = db.getConfig(guild.id);
    if (editorRole !== null) currentConfig.editorRoleId = editorRole.id;
    if (bypassRole !== null) currentConfig.bypassRoleId = bypassRole.id;
    if (autoConvert !== null) currentConfig.autoConvertEnabled = autoConvert;

    db.saveConfig(guild.id, currentConfig);

    const info = [
      'Config updated:',
      `• Editor Role: ${currentConfig.editorRoleId ? `<@&${currentConfig.editorRoleId}>` : 'None'}`,
      `• Bypass Role: ${currentConfig.bypassRoleId ? `<@&${currentConfig.bypassRoleId}>` : 'None'}`,
      `• Auto-Convert: ${currentConfig.autoConvertEnabled ? 'Enabled' : 'Disabled'}`
    ].join('\n');

    return interaction.reply({ content: info, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'panel') {
    const forumChannel = options.getChannel('forum_channel');
    const targetChannel = options.getChannel('target_channel') || channel;

    const { embed, row } = createPanelComponents(forumChannel.id);
    await targetChannel.send({ embeds: [embed], components: [row] });
    return interaction.reply({ content: `Creation panel posted in <#${targetChannel.id}>.`, flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'create') {
    const forumChannel = options.getChannel('channel');
    const title = options.getString('title');
    const description = options.getString('description') || '';
    const urlOption = options.getString('image_url');
    const fileOption = options.getAttachment('image_file');

    let imageUrl = fileOption?.contentType?.startsWith('image/') ? fileOption.url : urlOption;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const postData = {
      title,
      description,
      imageUrl,
      originalAuthorId: user.id
    };

    const thread = await createBotOwnedForumThread(forumChannel, postData, user);
    await interaction.deleteReply().catch(() => {});
    return;
  }

  if (!channel.isThread()) {
    return interaction.reply({ content: 'This command must be run inside a forum thread.', flags: MessageFlags.Ephemeral });
  }

  let postData = db.getPost(channel.id) || {
    threadId: channel.id,
    authorId: channel.ownerId,
    title: channel.name,
    description: '',
    imageUrl: null
  };

  if (!canUserEditPost(member, channel, postData)) {
    return interaction.reply({ content: 'Only the post creator or editors can edit this post.', flags: MessageFlags.Ephemeral });
  }

  if (subcommand === 'setup') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await updatePostCanvas(channel, postData, user);
    await interaction.deleteReply().catch(() => {});
    return;
  }

  if (subcommand === 'image') {
    const urlOption = options.getString('url');
    const fileOption = options.getAttachment('file');

    let newImageUrl = fileOption?.contentType?.startsWith('image/') ? fileOption.url : urlOption;
    if (!newImageUrl) {
      return interaction.reply({ content: 'Provide an image URL or upload an image file.', flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    postData.imageUrl = newImageUrl;
    db.savePost(channel.id, postData);
    await updatePostCanvas(channel, postData, user);

    await interaction.deleteReply().catch(() => {});
    return;
  }

  if (subcommand === 'text' || subcommand === 'content') {
    const newTitle = options.getString('title');
    const newDesc = options.getString('description');

    if (!newTitle && !newDesc) {
      return showEditContentModal(interaction, postData);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (newTitle) {
      postData.title = newTitle;
      await channel.setName(newTitle).catch(() => {});
    }
    if (newDesc) postData.description = newDesc;

    db.savePost(channel.id, postData);
    await updatePostCanvas(channel, postData, user);

    await interaction.deleteReply().catch(() => {});
    return;
  }

  if (subcommand === 'tags') {
    const tagMenuRow = createTagSelectMenu(channel);
    if (!tagMenuRow) {
      return interaction.reply({ content: 'No tags available in this forum channel.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: 'Select tags:', components: [tagMenuRow], flags: MessageFlags.Ephemeral });
  }
}

// ----------------------------------------------------
// 2. BUTTON INTERACTIONS
// ----------------------------------------------------
async function handleButtonInteraction(interaction) {
  const { customId, member, user, channelId } = interaction;

  if (customId.startsWith('btn_create_post_')) {
    const forumChannelId = customId.replace('btn_create_post_', '');
    const modal = new ModalBuilder()
      .setCustomId(`modal_create_post_${forumChannelId}`)
      .setTitle('New Post');

    const titleInput = new TextInputBuilder()
      .setCustomId('post_title')
      .setLabel('Title')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(100)
      .setRequired(true);

    const imageInput = new TextInputBuilder()
      .setCustomId('post_image_url')
      .setLabel('Image URL (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://example.com/image.png')
      .setRequired(false);

    const descInput = new TextInputBuilder()
      .setCustomId('post_description')
      .setLabel('Text / Details')
      .setStyle(TextInputStyle.Paragraph)
      .setMaxLength(4000)
      .setRequired(false);

    modal.addComponents(
      new ActionRowBuilder().addComponents(titleInput),
      new ActionRowBuilder().addComponents(imageInput),
      new ActionRowBuilder().addComponents(descInput)
    );

    return interaction.showModal(modal);
  }

  if (customId === 'btn_edit_content') {
    let postData = db.getPost(channelId) || {
      threadId: channelId,
      originalAuthorId: null,
      title: '',
      description: '',
      imageUrl: null
    };

    if (!canUserEditPost(member, interaction.channel, postData)) {
      return interaction.reply({ content: 'Only the post creator or editors can edit this post.', flags: MessageFlags.Ephemeral });
    }

    return await showEditContentModal(interaction, postData, interaction.channel);
  }

  const channel = await resolveInteractionChannel(interaction);
  if (!channel || !channel.isThread()) return;

  let postData = db.getPost(channel.id) || {
    threadId: channel.id,
    originalAuthorId: channel.ownerId,
    title: channel.name,
    description: '',
    imageUrl: null
  };

  if (!canUserEditPost(member, channel, postData)) {
    return interaction.reply({ content: 'Only the post creator or editors can edit this post.', flags: MessageFlags.Ephemeral });
  }

  if (customId === 'btn_change_image') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('btn_image_url_modal')
        .setLabel('Paste Image Link')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('btn_cancel_image')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.reply({
      content: [
        'To update the post image:',
        '• **Upload File:** Drop an image file into this chat. It will be set as the cover and the message will be deleted.',
        '• **Image URL:** Click **`Paste Image Link`** below to enter a web link.'
      ].join('\n'),
      components: [row],
      flags: MessageFlags.Ephemeral
    });

    const promptReply = await interaction.fetchReply();

    const fileFilter = m => m.author.id === user.id && m.attachments.some(att => att.contentType?.startsWith('image/'));
    const fileCollector = channel.createMessageCollector({ filter: fileFilter, time: 60000, max: 1 });

    fileCollector.on('collect', async (msg) => {
      const attachment = msg.attachments.find(att => att.contentType?.startsWith('image/'));
      if (attachment) {
        postData.imageUrl = attachment.url;
        db.savePost(channel.id, postData);
        await updatePostCanvas(channel, postData, user);

        await interaction.deleteReply().catch(() => {});
        try { await msg.delete(); } catch (err) {}
      }
    });

    const buttonFilter = i => (i.customId === 'btn_image_url_modal' || i.customId === 'btn_cancel_image') && i.user.id === user.id;
    const buttonCollector = promptReply.createMessageComponentCollector({ filter: buttonFilter, time: 60000, max: 1 });

    buttonCollector.on('collect', async (btnInteraction) => {
      fileCollector.stop('user_action');

      if (btnInteraction.customId === 'btn_cancel_image') {
        await btnInteraction.deferUpdate().catch(() => {});
        await interaction.deleteReply().catch(() => {});
        return;
      }

      if (btnInteraction.customId === 'btn_image_url_modal') {
        const modal = new ModalBuilder()
          .setCustomId('modal_change_image')
          .setTitle('Change Header Image');

        const input = new TextInputBuilder()
          .setCustomId('image_url_input')
          .setLabel('Direct Image URL')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('https://example.com/image.png')
          .setValue(postData.imageUrl || '')
          .setRequired(false);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        await btnInteraction.showModal(modal);
        await interaction.deleteReply().catch(() => {});
      }
    });

    return;
  }

  if (customId === 'btn_edit_tags') {
    const tagMenuRow = createTagSelectMenu(channel);
    if (!tagMenuRow) {
      return interaction.reply({ content: 'No tags available in this forum channel.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: 'Select tags:', components: [tagMenuRow], flags: MessageFlags.Ephemeral });
  }
}

// ----------------------------------------------------
// 3. MODAL SUBMIT HANDLERS
// ----------------------------------------------------
async function handleModalSubmit(interaction) {
  const { customId, user, guild } = interaction;

  if (customId.startsWith('modal_create_post_')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const forumChannelId = customId.replace('modal_create_post_', '');
    const forumChannel = await guild.channels.fetch(forumChannelId);

    const title = interaction.fields.getTextInputValue('post_title')?.trim();
    const imageUrl = interaction.fields.getTextInputValue('post_image_url')?.trim() || null;
    const description = interaction.fields.getTextInputValue('post_description')?.trim() || '';

    const postData = {
      title,
      description,
      imageUrl,
      originalAuthorId: user.id
    };

    const thread = await createBotOwnedForumThread(forumChannel, postData, user);
    await interaction.deleteReply().catch(() => {});
    return;
  }

  if (customId === 'modal_change_image' || customId.startsWith('modal_edit_content')) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const channel = await resolveInteractionChannel(interaction);
    if (!channel || !channel.isThread()) {
      return interaction.editReply({ content: 'Thread channel not found.' });
    }

    let postData = db.getPost(channel.id) || {
      threadId: channel.id,
      originalAuthorId: channel.ownerId,
      title: channel.name,
      description: '',
      imageUrl: null
    };

    if (customId === 'modal_change_image') {
      const newUrl = interaction.fields.getTextInputValue('image_url_input')?.trim();
      postData.imageUrl = newUrl || null;

      db.savePost(channel.id, postData);
      await updatePostCanvas(channel, postData, user);

      await interaction.deleteReply().catch(() => {});
      return;
    }

    if (customId.startsWith('modal_edit_content')) {
      const newTitle = interaction.fields.getTextInputValue('title_input')?.trim();
      const newDesc = interaction.fields.getTextInputValue('desc_input')?.trim();

      if (newTitle && newTitle !== channel.name) {
        postData.title = newTitle;
        await channel.setName(newTitle).catch(() => {});
      }
      postData.description = newDesc || '';

      db.savePost(channel.id, postData);
      await updatePostCanvas(channel, postData, user);

      await interaction.deleteReply().catch(() => {});
      return;
    }
  }
}

// ----------------------------------------------------
// 4. SELECT MENU HANDLERS (TAGS)
// ----------------------------------------------------
async function handleSelectMenuInteraction(interaction) {
  const { customId, channel, values, user } = interaction;
  if (!channel.isThread()) return;

  if (customId === 'select_forum_tags') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await channel.setAppliedTags(values);
    } catch (err) {
      console.error('Failed to set applied tags:', err);
      return interaction.editReply({ content: 'Needs Manage Threads permission to set tags.' });
    }

    let postData = db.getPost(channel.id) || {
      threadId: channel.id,
      authorId: channel.ownerId,
      title: channel.name,
      description: '',
      imageUrl: null
    };

    await updatePostCanvas(channel, postData, user);

    await interaction.deleteReply().catch(() => {});
    return;
  }
}

export async function createBotOwnedForumThread(forumChannel, postData, originalAuthor) {
  const tempDummyThread = {
    name: postData.title,
    parent: forumChannel,
    appliedTags: postData.appliedTags || [],
    ownerId: originalAuthor.id,
    guild: forumChannel.guild
  };

  const canvasEmbed = createForumCanvasEmbed(postData, tempDummyThread, originalAuthor);
  const actionRow = createActionRow();

  const starterContent = postData.description?.trim() 
    ? (postData.description.length > 500 ? postData.description.slice(0, 497) + '...' : postData.description)
    : '*No description added yet.*';

  const thread = await forumChannel.threads.create({
    name: postData.title,
    message: {
      content: starterContent,
      embeds: [canvasEmbed],
      components: [actionRow],
      allowedMentions: { users: [] }
    },
    appliedTags: postData.appliedTags || []
  });

  const starterMessage = await thread.fetchStarterMessage().catch(() => null);
  if (starterMessage) {
    try {
      await starterMessage.pin();
    } catch (err) {
      console.error('Failed to pin starter message:', err);
    }
  }

  const finalPostData = {
    ...postData,
    threadId: thread.id,
    originalAuthorId: originalAuthor.id,
    starterMessageId: starterMessage?.id || null
  };

  db.savePost(thread.id, finalPostData);
  return thread;
}

async function showEditContentModal(interaction, postData, channel = null) {
  const threadId = channel?.id || interaction.channelId;

  let initialDesc = postData.description || '';
  if (!initialDesc && channel) {
    const starterMsg = await channel.fetchStarterMessage().catch(() => null);
    if (starterMsg) {
      if (starterMsg.embeds?.[0]?.description) {
        initialDesc = starterMsg.embeds[0].description;
      } else if (starterMsg.content && !starterMsg.content.startsWith('*No description')) {
        initialDesc = starterMsg.content;
      }
    }
  }

  const modal = new ModalBuilder()
    .setCustomId(`modal_edit_content_${threadId}`)
    .setTitle('Edit Title & Text');

  const titleValue = postData.title || channel?.name || interaction.channel?.name || '';

  const titleInput = new TextInputBuilder()
    .setCustomId('title_input')
    .setLabel('Title')
    .setStyle(TextInputStyle.Short)
    .setValue(titleValue)
    .setMaxLength(100)
    .setRequired(true);

  const descInput = new TextInputBuilder()
    .setCustomId('desc_input')
    .setLabel('Text')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Enter description...')
    .setValue(initialDesc)
    .setMaxLength(4000)
    .setRequired(false);

  modal.addComponents(
    new ActionRowBuilder().addComponents(titleInput),
    new ActionRowBuilder().addComponents(descInput)
  );

  return interaction.showModal(modal);
}
