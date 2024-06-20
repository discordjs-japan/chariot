import { DiscordAPIError, ThreadOnlyChannel } from 'discord.js'

/**
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./logger.js').Logger} Logger
 */

/**
 * @param {AnyThreadChannel} thread
 */
export async function fetchStarterMessageOrNull(thread) {
  return thread.fetchStarterMessage({ force: true }).catch(reason => {
    if (reason instanceof DiscordAPIError && reason.code === 10008) return null
    else throw reason
  })
}

/**
 * @param {AnyThreadChannel} thread
 */
export async function getOrWaitForStarterMessage(thread) {
  const channel =
    thread.parent instanceof ThreadOnlyChannel ? thread : thread.parent
  const existing = channel?.messages.cache.get(thread.id)
  if (existing) return existing

  // if the starter message is not found, wait for it
  const collected = await channel?.awaitMessages({
    max: 1,
    time: 60000,
    filter: m => m.id === thread.id,
  })
  return collected?.get(thread.id)
}

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 * @param {import('./forum.js').ForumChannelSetting} setting
 */
export async function lockThreadForNoStarter(logger, thread, setting) {
  thread.send(setting.onNoStarter)
  await thread.setLocked()
  await thread.setArchived()
  logger.info(
    `locked "${thread.parent?.name}" (${thread.parentId}) because the starter post was deleted.`
  )
}
