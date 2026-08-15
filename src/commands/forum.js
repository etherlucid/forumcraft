import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';

export const commandData = new SlashCommandBuilder()
  .setName('forum')
  .setDescription('Forum post manager')
  .addSubcommand(sub =>
    sub
      .setName('create')
      .setDescription('Create a new forum post')
      .addChannelOption(opt =>
        opt
          .setName('channel')
          .setDescription('Target Forum Channel')
          .addChannelTypes(ChannelType.GuildForum)
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('title')
          .setDescription('Post Title')
          .setRequired(true)
      )
      .addStringOption(opt =>
        opt
          .setName('description')
          .setDescription('Initial description or text')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt
          .setName('image_url')
          .setDescription('Header image URL')
          .setRequired(false)
      )
      .addAttachmentOption(opt =>
        opt
          .setName('image_file')
          .setDescription('Upload a header image file')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('panel')
      .setDescription('Post a creation button card in any channel')
      .addChannelOption(opt =>
        opt
          .setName('forum_channel')
          .setDescription('Target Forum Channel where posts will be created')
          .addChannelTypes(ChannelType.GuildForum)
          .setRequired(true)
      )
      .addChannelOption(opt =>
        opt
          .setName('target_channel')
          .setDescription('Channel to post the button card into (defaults to current channel)')
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('image')
      .setDescription('Update post cover image')
      .addStringOption(opt =>
        opt
          .setName('url')
          .setDescription('Direct image URL')
          .setRequired(false)
      )
      .addAttachmentOption(opt =>
        opt
          .setName('file')
          .setDescription('Upload image file')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('text')
      .setDescription('Update title and text')
      .addStringOption(opt =>
        opt
          .setName('title')
          .setDescription('New title')
          .setRequired(false)
      )
      .addStringOption(opt =>
        opt
          .setName('description')
          .setDescription('New description or text')
          .setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('tags')
      .setDescription('Select tags for this post')
  )
  .addSubcommand(sub =>
    sub
      .setName('config')
      .setDescription('Configure forum bot roles and auto-convert settings')
      .addRoleOption(opt =>
        opt
          .setName('editor_role')
          .setDescription('Role permitted to edit posts (Admins & Authors always allowed)')
          .setRequired(false)
      )
      .addRoleOption(opt =>
        opt
          .setName('bypass_role')
          .setDescription('Role that creates normal, un-converted forum posts')
          .setRequired(false)
      )
      .addBooleanOption(opt =>
        opt
          .setName('auto_convert')
          .setDescription('Enable or disable auto-converting new forum posts')
          .setRequired(false)
      )
  );
