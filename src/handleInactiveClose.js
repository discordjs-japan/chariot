// @ts-check
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./forum.js').Forum} Forum
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 */

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 * @param {number} inactiveDurationDay
 * @param {ForumChannelSetting} setting
 */
export async function handleInactiveClose(
  logger,
  thread,
  inactiveDurationDay,
  setting
) {
  const messages = await thread.messages.fetch({ limit: 1 })
  const lastMessage = messages.first()
  if (!lastMessage) return

  const inactiveDuration = inactiveDurationDay * (1000 * 60 * 60 * 24)
  if (Date.now() - lastMessage.createdTimestamp < inactiveDuration) return false

  await thread.send(setting.onStale(thread.ownerId, inactiveDurationDay))
  await thread.setArchived(true, `${inactiveDurationDay}日間操作がなかったため`)
  logger.info(
    `"${thread.parent?.name}" (${thread.parentId}) は${inactiveDurationDay}日間操作がなかったためクローズします。`
  )
}
