// @ts-check
import { setInterval } from 'node:timers/promises'
import { ChannelType, Client, GatewayIntentBits, Events } from 'discord.js'
import { Logger } from './logger.js'
import { onForumThreadCreate } from './onForumThreadCreate.js'
import { onForumThreadReopen } from './onForumThreadReopen.js'
import { onInterval } from './onInterval.js'
import { forumChannelSettings } from './forum.js'
import { onForumPostReactionAdd } from './onForumPostReactionAdd.js'
/**
 * @typedef {import('discord.js').Channel} Channel
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('discord.js').Message} Message
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 * @typedef {import('./forum.js').Forum} Forum
 */

const logger = new Logger('Chariot')
const eventLogger = logger.createChild('EventListener')
const timerLogger = logger.createChild('Timer')
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
})

client.once(Events.ClientReady, client => {
  const logger = eventLogger.createChild('Ready')

  watch().catch(reason => {
    logger.error(reason)
    process.exit(1)
  })

  logger.info(`Logged in ${client.user.tag}`)
})

client.on(Events.ThreadCreate, async (thread, newlyCreated) => {
  const logger = eventLogger.createChild('threadCreate')
  const setting = forumChannelSettings.find(it => it.id === thread.parentId)
  if (!setting) return

  if (newlyCreated)
    onForumThreadCreate(
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
    onForumThreadReopen(
      logger.createChild('onForumThreadReopen'),
      newThread,
      setting
    )
})

client.on(Events.MessageReactionAdd, async reaction => {
  const logger = eventLogger.createChild('messageReactionAdd')
  const setting = forumChannelSettings.find(
    it => it.id === reaction.message.channelId
  )
  if (!setting) return

  const message = await reaction.message.fetch()
  if (!isThreadStarter(message)) return

  onForumPostReactionAdd(
    logger.createChild('onForumPostReactionAdd'),
    setting,
    message
  )
})

/**
 * @param {Message} message
 * @returns {message is Message & { channel: AnyThreadChannel }}
 */
function isThreadStarter(message) {
  return message.channel.isThread()
}

await client.login()

async function watch() {
  const logger = timerLogger.createChild('Interval')

  const forums = await Promise.all(
    forumChannelSettings.map(async setting => {
      const channel = await client.channels.fetch(setting.id)
      return { channel, setting }
    })
  )

  const isAllForumChannel = forums.every(
    /**
     * @type {(forum: { channel: Channel | null, setting: ForumChannelSetting }) => forum is Forum}
     */
    (({ channel }) => channel?.type === ChannelType.GuildForum)
  )

  if (!isAllForumChannel) {
    const invalids = forums.filter(
      ({ channel }) => channel?.type !== ChannelType.GuildForum
    )
    throw new Error(
      `Invalid channel type: ${invalids
        .map(({ setting }) => setting.id)
        .join(', ')}`
    )
  }

  for await (const _ of setInterval(600000, null, { ref: false })) {
    await onInterval(logger.createChild(new Date().toISOString()), forums)
  }
}
