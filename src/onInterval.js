// @ts-check
import { userMention } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 */

/**
 * @param {Logger} logger
 * @param {ForumChannel[]} forumChannels
 */
export async function onInterval(logger, forumChannels) {
  logger.info('Start onInterval...')

  await Promise.all(
    forumChannels.map(forumChannel =>
      archiveInactiveThreads(
        logger.createChild('WatchInactiveThread'),
        forumChannel
      )
    )
  )

  logger.info(`Done.`)
}

/**
 * @param {Logger} logger
 * @param {ForumChannel} forumChannel
 */
async function archiveInactiveThreads(logger, forumChannel) {
  const { threads: activeThreads } = await forumChannel.threads.fetchActive()

  logger.info(`Found ${activeThreads.size} active threads`)

  const inactiveDurationDay = 2
  const results = await Promise.all(
    activeThreads.map(thread => archiveIfInactive(thread, inactiveDurationDay))
  )
  const archived = results.filter(archived => archived).length

  logger.info(
    `Found ${archived} threads over ${inactiveDurationDay} day since last activity.`
  )
}

/**
 * @param {AnyThreadChannel} thread
 * @param {number} inactiveDurationDay
 * @returns {Promise<boolean>} true if archived
 */
async function archiveIfInactive(thread, inactiveDurationDay) {
  const messages = await thread.messages.fetch({ limit: 1 })
  const lastMessage = messages.first()
  if (!lastMessage) return false

  const inactiveDuration = inactiveDurationDay * (1000 * 60 * 60 * 24)
  if (Date.now() - lastMessage.createdTimestamp < inactiveDuration) return false

  await thread.send({
    content: [
      `${
        thread.ownerId && userMention(thread.ownerId)
      }、このスレッドは${inactiveDurationDay}日間操作がなかったため自動的に閉じさせていただきます。`,
      '',
      'なおこのスレッドは誰でも再開可能です。',
      '誰かによってスレッドが再開された場合は再度このスレッドにお知らせします。',
    ].join('\n'),
  })
  await thread.setArchived(true, `${inactiveDurationDay}日間操作がなかったため`)
  return true
}
