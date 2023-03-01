// @ts-check
import { setInterval } from 'node:timers/promises'
import { ChannelType, Client, GatewayIntentBits, Events } from 'discord.js'
import { Logger } from './logger.js'
import { handleCreateNotify } from './handleCreateNotify.js'
import { handleReopenNotify } from './handleReopenNotify.js'
import { onInterval } from './onInterval.js'
import { forumChannelSettings } from './forum.js'
import { fetchStarterMessageOrNull, lockThreadForNoStarter } from './starter.js'
import { handleReactionClose } from './handleReactionClose.js'
/**
 * @typedef {import('discord.js').Channel} Channel
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 * @typedef {import('discord.js').Message} Message
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 * @typedef {import('./forum.js').Forum} Forum
 */

const logger = new Logger('Chariot')
const eventLogger = logger.createChild('EventListener')
const timerLogger = logger.createChild('Timer')
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
})

client.once(Events.ClientReady, async client => {
  const logger = eventLogger.createChild('Ready')

  logger.info(`Logged in ${client.user.tag}`)

  try {
    const forums = await fetchForumsAndStarters()
    await watch(forums)
  } catch (reason) {
    logger.error(reason)
    process.exit(1)
  }
})

client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
  const logger = eventLogger.createChild('threadCreate')
  const setting = forumChannelSettings.find(it => it.id === thread.parentId)
  if (!setting) return

  if (newlyCreated)
    handleCreateNotify(
      logger.createChild('onForumThreadCreate'),
      thread,
      setting
    )
})

client.on(Events.ThreadUpdate, async (oldThread, newThread) => {
  const logger = eventLogger.createChild('threadUpdate')
  const setting = forumChannelSettings.find(it => it.id === newThread.parentId)
  if (!setting) return

  if (oldThread.archived && !newThread.archived)
    await handleReopenNotify(
      logger.createChild('onForumThreadReopen'),
      newThread,
      setting
    )
})

client.on(Events.MessageReactionAdd, async reaction => {
  const logger = eventLogger.createChild('messageReactionAdd')

  if (!reaction.message.inGuild()) return
  const { channel } = reaction.message
  const setting = forumChannelSettings.find(it => it.id === channel.parentId)
  if (!setting) return

  const message = await reaction.message.fetch()
  if (!message.channel.isThread()) return

  await handleReactionClose(
    logger.createChild('onForumStarterReactionAdd'),
    setting,
    message.channel,
    message
  )
})

client.on(Events.MessageDelete, async message => {
  const logger = eventLogger.createChild('messageDelete')

  if (!message.inGuild()) return
  if (!forumChannelSettings.some(it => it.id === message.channel.parentId))
    return

  if (!message.channel.isThread()) return

  await lockThreadForNoStarter(
    logger.createChild('onForumStarterDelete'),
    message.channel
  )
})

await client.login()

/**
 * @returns {Promise<Forum[]>}
 */
async function fetchForumsAndStarters() {
  const result = await Promise.allSettled(
    forumChannelSettings.map(async setting => {
      const channel = await client.channels.fetch(setting.id)
      if (channel?.type !== ChannelType.GuildForum)
        throw new Error(
          `Invalid channel type; ${setting.id} has type ${channel?.type}`
        )
      const { threads: activeThreads } = await channel.threads.fetchActive()
      await Promise.all(activeThreads.map(fetchStarterMessageOrNull))

      return { channel, setting }
    })
  )

  if (
    !result.every(
      /** @type {(param0: PromiseSettledResult<Forum>) => param0 is PromiseFulfilledResult<Forum>} */ (
        ({ status }) => status === 'fulfilled'
      )
    )
  ) {
    const errors = result
      .filter(
        /** @type {(param0: PromiseSettledResult<unknown>) => param0 is PromiseRejectedResult} */
        (({ status }) => status === 'rejected')
      )
      .map(({ reason }) => reason)
    throw new Error(errors.join(', '))
  }

  return result.map(({ value }) => value)
}

/**
 * @param {Forum[]} forums
 */
async function watch(forums) {
  const logger = timerLogger.createChild('Interval')

  for await (const _ of setInterval(600000, null, { ref: false })) {
    await onInterval(logger.createChild(new Date().toISOString()), forums)
  }
}
