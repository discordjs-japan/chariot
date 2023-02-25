// @ts-check
import { handleInactiveClose } from './handleInactiveClose.js'
import { handleReactionClose } from './handleReactionClose.js'
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
      onIntervalForForum(logger.createChild(`Forum:${forum.setting.id}`), forum)
    )
  )

  logger.info(`Done.`)
}

/**
 * @param {Logger} logger
 * @param {Forum} param1
 */
async function onIntervalForForum(logger, { channel, setting }) {
  const { threads: activeThreads } = await channel.threads.fetchActive()

  logger.info(`Found ${activeThreads.size} active threads`)

  const inactiveDurationDay = 2
  const results = await Promise.all(
    activeThreads
      .map(thread => [
        handleInactiveClose(thread, inactiveDurationDay, setting),
        handleReactionClose(
          logger.createChild(`handleReactionClose:${thread.id}`),
          thread,
          setting
        ),
      ])
      .flat()
  )
  const archived = results.filter(archived => archived).length

  logger.info(
    `Found ${archived} threads over ${inactiveDurationDay} day since last activity.`
  )
}
