// @ts-check
import { handleReactionClose } from './handleReactionClose.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').Message} Message
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 */

/**
 *
 * @param {Logger} logger
 * @param {ForumChannelSetting} setting
 * @param {Message & { channel: AnyThreadChannel }} post
 */
export async function onForumPostReactionAdd(logger, setting, post) {
  await handleReactionClose(logger, setting, post.channel, post)
}
