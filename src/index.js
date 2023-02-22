// @ts-check
import { setInterval } from 'node:timers/promises'
import { ChannelType, Client, userMention, AuditLogEvent } from 'discord.js'
import * as constants from './constants.js'
import { Logger } from './logger.js'
/**
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

  watchInactiveThread().catch(reason => {
    logger.error(reason)
    process.exit(1)
  })

  logger.info(`Logged in ${client.user.tag}`)
})

client.on('threadCreate', async (thread, newlyCreated) => {
  const logger = eventLogger.createChild('threadCreate')
  const messageContent = constants.forumChannels.find(
    it => it.id === thread.parentId
  )?.message
  if (!newlyCreated) return
  if (!messageContent) return
  if (thread.parent?.type !== ChannelType.GuildForum) return

  await thread
    .send({
      content: messageContent(thread.ownerId),
    })
    .then(it => it.suppressEmbeds())

  logger.info(
    `"${thread.parent.name}" (${thread.parentId}) で"${thread.name}" (${thread.id}) が作成されました。`
  )
})

client.on('threadUpdate', async (oldThread, newThread) => {
  const isForumChannel = constants.forumChannels.some(
    it => it.id === newThread.parentId
  )

  if (!isForumChannel) return
  if (!oldThread.archived) return
  if (newThread.archived) return

  const logger = eventLogger.createChild('threadUpdate')

  logger.info(`"${newThread.name}" (${newThread.id}) has been reopened.`)

  const guild = newThread.guild
  const entries = await guild.fetchAuditLogs({
    type: AuditLogEvent.ThreadUpdate,
    limit: 1,
  })
  const entry = entries.entries.first()
  if (!entry) return
  const unarchived = entry.changes.some(
    it => it.key === 'archived' && it.old && !it.new
  )

  if (entry && entry.target.id === newThread.id && unarchived) {
    await newThread.send(`${entry.executor}がスレッドを再開しました。`)
  } else {
    await newThread.send('スレッドが再開されました。')
  }
})

await client.login()

async function watchInactiveThread() {
  const logger = timerLogger
    .createChild('Interval')
    .createChild('WatchInactiveThread')

  const forumChannels = /** @type {ForumChannel[]} */ (
    await Promise.all(
      constants.forumChannels.map(({ id }) => client.channels.fetch(id))
    )
  )

  for (const forumChannel of forumChannels) {
    if (forumChannel.type === ChannelType.GuildForum) continue

    throw new Error(`"${forumChannel.id}" is not ForumChannel`)
  }

  for await (const _ of setInterval(600000, null, { ref: false })) {
    logger.info('Start checking...')

    /**
     * @param {ForumChannel} forumChannel
     */
    const sendAlertToInactiveThreads = async forumChannel => {
      const activeThreads = (await forumChannel.threads.fetchActive()).threads

      logger.info(`Found ${activeThreads.size} active threads`)

      const activeThreadsWithLastMessage = await Promise.all(
        activeThreads.map(async thread => {
          const messages = await thread.messages.fetch({ limit: 1 })
          return {
            thread,
            lastMessage: messages.first(),
          }
        })
      )

      const inactiveDuration = 172_800_000 // 2日をミリ秒で表現した値
      const inactiveDurationDay = inactiveDuration / (1000 * 60 * 60 * 24)
      const inactiveThreads = activeThreadsWithLastMessage
        .filter(
          ({ lastMessage }) =>
            lastMessage &&
            Date.now() - lastMessage.createdTimestamp > inactiveDuration
        )
        .map(({ thread }) => thread)

      logger.info(
        `Found ${inactiveThreads.length} threads over ${inactiveDurationDay} day since last activity.`
      )

      await Promise.all(
        inactiveThreads.map(it =>
          it.send({
            content: [
              `${
                it.ownerId && userMention(it.ownerId)
              }、このスレッドは${inactiveDurationDay}日間操作がなかったため自動的に閉じさせていただきます。`,
              '',
              'なおこのスレッドは誰でも再開可能です。',
              '誰かによってスレッドが再開された場合は再度このスレッドにお知らせします。',
            ].join('\n'),
          })
        )
      )
      await Promise.all(
        inactiveThreads.map(it =>
          it.setArchived(true, `${inactiveDurationDay}日間操作がなかったため`)
        )
      )
    }

    await Promise.all(forumChannels.map(it => sendAlertToInactiveThreads(it)))

    logger.info(`Done.`)
  }
}
