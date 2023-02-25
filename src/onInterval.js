// @ts-check
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 * @typedef {import('./forum.js').Forum} Forum
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 */

/**
 * @param {Logger} logger
 * @param {Forum[]} forums
 */
export async function onInterval(logger, forums) {
  logger.info('Start onInterval...')

  await Promise.all(
    forums.map(forum =>
      archiveInactiveThreads(logger.createChild('WatchInactiveThread'), forum)
    )
  )

  logger.info(`Done.`)
}

/**
 * @param {Logger} logger
 * @param {Forum} param1
 */
async function archiveInactiveThreads(logger, { channel, setting }) {
  const { threads: activeThreads } = await channel.threads.fetchActive()

  logger.info(`Found ${activeThreads.size} active threads`)

  const inactiveDurationDay = 2
  const results = await Promise.all(
    activeThreads.map(thread =>
      archiveIfInactive(thread, inactiveDurationDay, setting)
    )
  )
  const archived = results.filter(archived => archived).length

  logger.info(
    `Found ${archived} threads over ${inactiveDurationDay} day since last activity.`
  )
}

/**
 * @param {AnyThreadChannel} thread
 * @param {number} inactiveDurationDay
 * @param {ForumChannelSetting} setting
 * @returns {Promise<boolean>} true if archived
 */
async function archiveIfInactive(thread, inactiveDurationDay, setting) {
  const messages = await thread.messages.fetch({ limit: 1 })
  const lastMessage = messages.first()
  if (!lastMessage) return false

  const inactiveDuration = inactiveDurationDay * (1000 * 60 * 60 * 24)
  if (Date.now() - lastMessage.createdTimestamp < inactiveDuration) return false

  await thread.send(setting.onStale(thread.ownerId, inactiveDurationDay))
  await thread.setArchived(true, `${inactiveDurationDay}日間操作がなかったため`)
  return true
}
