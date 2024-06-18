import { setInterval } from 'node:timers/promises'
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Events,
  AuditLogEvent,
} from 'discord.js'
import { Logger } from './logger.js'
import { handleCreateNotify, handleOwnerClose } from './handleCreateNotify.js'
import { handleReopenNotify } from './handleReopenNotify.js'
import { onInterval } from './onInterval.js'
import { forumChannelSettings } from './forum.js'
import {
  fetchStarterMessageOrNull,
  getOrWaitForStarterMessage,
  lockThreadForNoStarter,
} from './starter.js'
import { handleReactionClose } from './handleReactionClose.js'
import { handleLock } from './handleLock.js'
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
    GatewayIntentBits.GuildModeration,
  ],
})

client.once(Events.ClientReady, async client => {
  const logger = eventLogger.createChild('Ready')

  logger.info(`Logged in ${client.user.tag}`)

  try {
    const forums = await fetchForumsAndStarters(
      logger.createChild('fetchForumsAndStarters')
    )
    await watch(forums)
  } catch (reason) {
    logger.error(reason)
    process.exit(1)
  }
})

client.on(Events.InteractionCreate, async interaction => {
  const logger = eventLogger.createChild('interactionCreate')

  const setting = forumChannelSettings.find(
    it =>
      interaction.channel?.isThread() && it.id === interaction.channel.parentId
  )
  if (!setting) return

  handleOwnerClose(
    logger.createChild('onOwnerCloseButton'),
    interaction,
    setting
  )
})

client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
  const logger = eventLogger.createChild('threadCreate')
  const setting = forumChannelSettings.find(it => it.id === thread.parentId)
  if (!setting) return

  if (!newlyCreated) return

  // ensure that the starter message is posted
  await getOrWaitForStarterMessage(thread)

  handleCreateNotify(logger.createChild('onForumThreadCreate'), thread, setting)
})

client.on(Events.GuildAuditLogEntryCreate, async (auditLogEntry, guild) => {
  const logger = eventLogger.createChild('guildAuditLogEntryCreate')
  if (
    auditLogEntry.action !== AuditLogEvent.ThreadUpdate ||
    auditLogEntry.targetId === null
  )
    return
  const newThread = await guild.channels.fetch(auditLogEntry.targetId)
  if (newThread?.type !== ChannelType.PublicThread) return
  const setting = forumChannelSettings.find(it => it.id === newThread?.parentId)
  if (!setting) return

  if (
    auditLogEntry.changes.some(it => it.key === 'archived' && it.old && !it.new)
  )
    await handleReopenNotify(
      logger.createChild('onForumThreadReopen'),
      auditLogEntry,
      newThread,
      setting
    )
  if (
    auditLogEntry.changes.some(it => it.key === 'locked' && !it.old && it.new)
  )
    await handleLock(
      logger.createChild('onForumThreadLock'),
      auditLogEntry,
      newThread
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

  const setting = forumChannelSettings.find(
    it => it.id === message.channel.parentId
  )

  if (!setting) return
  if (!message.channel.isThread()) return
  if (message.channelId === message.id) {
    await lockThreadForNoStarter(
      logger.createChild('onForumStarterDelete'),
      message.channel,
      setting
    )
  }
})

await client.login()

/**
 * @param {Logger} logger
 * @returns {Promise<Forum[]>}
 */
async function fetchForumsAndStarters(logger) {
  return await Promise.all(
    forumChannelSettings.map(async setting => {
      const channel = await client.channels.fetch(setting.id)
      if (channel?.type !== ChannelType.GuildForum)
        throw new Error(
          `Invalid channel type; ${setting.id} has type ${channel?.type}`
        )
      const { threads: activeThreads } = await channel.threads.fetchActive()
      await Promise.all(activeThreads.map(fetchStarterMessageOrNull))

      logger.info(
        `Fetched ${activeThreads.size} active threads in ${channel.name}`
      )

      return { channel, setting }
    })
  )
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
