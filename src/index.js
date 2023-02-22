// @ts-check
import { setInterval } from 'node:timers/promises'
import { ChannelType, Client } from 'discord.js'
import * as constants from './constants.js'
import { Logger } from './logger.js'
import { onForumThreadCreate } from './onForumThreadCreate.js'
import { onForumThreadReopen } from './onForumThreadReopen.js'
import { onInterval } from './onInterval.js'
/**
 * @typedef {import('discord.js').Channel} Channel
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 */

const logger = new Logger('Chariot')
const eventLogger = logger.createChild('EventListener')
const timerLogger = logger.createChild('Timer')
const client = new Client({
  intents: ['Guilds', 'GuildMessages'],
})

client.once('ready', client => {
  const logger = eventLogger.createChild('Ready')

  watch().catch(reason => {
    logger.error(reason)
    process.exit(1)
  })

  logger.info(`Logged in ${client.user.tag}`)
})

client.on('threadCreate', async (thread, newlyCreated) => {
  const logger = eventLogger.createChild('threadCreate')
  const forumSetting = constants.forumChannels.find(
    it => it.id === thread.parentId
  )
  if (!forumSetting) return
  if (!newlyCreated) return

  onForumThreadCreate(logger, thread, forumSetting.message)
})

client.on('threadUpdate', async (oldThread, newThread) => {
  const logger = eventLogger.createChild('threadUpdate')
  const isForumChannel = constants.forumChannels.some(
    it => it.id === newThread.parentId
  )
  if (!isForumChannel) return

  if (oldThread.archived && !newThread.archived)
    onForumThreadReopen(logger, newThread)
})

await client.login()

async function watch() {
  const logger = timerLogger.createChild('Interval')

  const forumChannels = await Promise.all(
    constants.forumChannels.map(({ id }) => client.channels.fetch(id))
  )

  const isAllForumChannel = forumChannels.every(
    /** @type {(channel: Channel | null) => channel is ForumChannel} */
    (channel => channel?.type === ChannelType.GuildForum)
  )

  if (!isAllForumChannel) {
    const invalids = forumChannels.filter(
      channel => channel?.type !== ChannelType.GuildForum
    )
    throw new Error(
      `Invalid channel type: ${invalids.map(it => it?.id).join(', ')}`
    )
  }

  for await (const _ of setInterval(600000, null, { ref: false })) {
    await onInterval(logger, forumChannels)
  }
}
