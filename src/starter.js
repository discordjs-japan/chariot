// @ts-check
import { DiscordAPIError } from 'discord.js'

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
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 */
export async function lockThreadForNoStarter(logger, thread) {
  await thread.setLocked()
  await thread.setArchived()
  logger.info(
    `locked "${thread.parent?.name}" (${thread.parentId}) because the starter post was deleted.`
  )
}
