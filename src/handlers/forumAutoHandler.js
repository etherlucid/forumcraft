import { ChannelType, PermissionFlagsBits } from 'discord.js';
import { db } from '../utils/db.js';
import { createBotOwnedForumThread } from './interactionHandler.js';

export async function handleThreadCreate(thread) {
  try {
    if (!thread.parent || thread.parent.type !== ChannelType.GuildForum) {
      return;
    }

    if (thread.ownerId === thread.client.user.id) {
      return;
    }

    const guild = thread.guild;
    const config = db.getConfig(guild.id);

    if (config.autoConvertEnabled === false) {
      return;
    }

    await new Promise(res => setTimeout(res, 1500));

    const member = await guild.members.fetch(thread.ownerId).catch(() => null);

    if (member && config.bypassRoleId && member.roles.cache.has(config.bypassRoleId)) {
      return;
    }

    const starterMsg = await thread.fetchStarterMessage().catch(() => null);
    if (starterMsg && (starterMsg.author.id === thread.client.user.id || starterMsg.author.bot)) {
      return;
    }
    const originalText = starterMsg?.content || '';

    let initialImageUrl = null;
    if (starterMsg?.attachments?.size > 0) {
      const firstAttachment = starterMsg.attachments.first();
      const isImage = (firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) ||
                      /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i.test(firstAttachment.name || firstAttachment.url);
      if (isImage) {
        initialImageUrl = firstAttachment.url;
      }
    }

    if (!initialImageUrl && originalText) {
      const urlMatch = originalText.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^\s]*)?)/i);
      if (urlMatch) {
        initialImageUrl = urlMatch[1];
      }
    }

    const postData = {
      title: thread.name,
      description: originalText || '',
      imageUrl: initialImageUrl,
      appliedTags: [...(thread.appliedTags || [])],
      originalAuthorId: thread.ownerId
    };

    const forumChannel = thread.parent;
    const authorUser = member?.user || { id: thread.ownerId, username: 'User' };

    await createBotOwnedForumThread(forumChannel, postData, authorUser);

    await thread.delete().catch(() => {});
  } catch (err) {
    console.error('Error in thread creation handler:', err);
  }
}
