// @ts-check
import { ChannelType } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 *
 */

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 * @param {ForumChannelSetting} setting
 */
export async function onForumThreadCreate(logger, thread, setting) {
  if (thread.parent?.type !== ChannelType.GuildForum) return
  if (!thread.ownerId) return

  await thread
    .send({
      content: setting.onCreate(thread.ownerId),
    })
    .then(it => it.suppressEmbeds())

  logger.info(
    `"${thread.name}" (${thread.id}) has been created in "${thread.parent.name}" (${thread.parentId}).`
  )
}
