// @ts-check
import { setInterval } from 'node:timers/promises'
import { ChannelType, Client, userMention, AuditLogEvent } from 'discord.js'
import * as constants from './constants.js'
import { Logger } from './logger.js'
/**
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 * @typedef {import('discord.js').Channel} Channel
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
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

  onThreadCreate(logger, thread, forumSetting.message)
})

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 * @param {(ownerId: string) => string} messageContent
 */
async function onThreadCreate(logger, thread, messageContent) {
  if (thread.parent?.type !== ChannelType.GuildForum) return
  if (!thread.ownerId) return

  await thread
    .send({
      content: messageContent(thread.ownerId),
    })
    .then(it => it.suppressEmbeds())

  logger.info(
    `"${thread.parent.name}" (${thread.parentId}) で"${thread.name}" (${thread.id}) が作成されました。`
  )
}

client.on('threadUpdate', async (oldThread, newThread) => {
  const logger = eventLogger.createChild('threadUpdate')
  const isForumChannel = constants.forumChannels.some(
    it => it.id === newThread.parentId
  )
  if (!isForumChannel) return

  if (oldThread.archived && !newThread.archived)
    onThreadReopen(logger, newThread)
})

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 */
async function onThreadReopen(logger, thread) {
  logger.info(`"${thread.name}" (${thread.id}) has been reopened.`)

  const guild = thread.guild
  const entries = await guild.fetchAuditLogs({
    type: AuditLogEvent.ThreadUpdate,
    limit: 1,
  })
  const entry = entries.entries.first()
  if (!entry) return
  const unarchived = entry.changes.some(
    it => it.key === 'archived' && it.old && !it.new
  )

  if (entry && entry.target.id === thread.id && unarchived) {
    await thread.send(`${entry.executor}がスレッドを再開しました。`)
  } else {
    await thread.send('スレッドが再開されました。')
  }
}

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

/**
 * @param {Logger} logger
 * @param {ForumChannel[]} forumChannels
 */
async function onInterval(logger, forumChannels) {
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
