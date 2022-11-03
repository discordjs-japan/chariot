import { setInterval } from 'node:timers/promises'
import { ChannelType, Client, userMention } from 'discord.js'
import * as constants from './constants.js'
import { Logger } from './logger.js'

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

await client.login()

async function watchInactiveThread() {
  const logger = timerLogger
    .createChild('Interval')
    .createChild('WatchInactiveThread')
  /** @type {Array<import('discord.js').ForumChannel>} */
  const forumChannels = await Promise.all(
    constants.forumChannels.map(({ id }) => client.channels.fetch(id))
  )

  for (const forumChannel of forumChannels) {
    if (forumChannel.type === ChannelType.GuildForum) continue

    throw new Error(`"${forumChannel.id}" is not ForumChannel`)
  }

  for await (const _ of setInterval(600000, null, { ref: false })) {
    logger.info('Start checking...')

    /**
     * @param {import('discord.js').ForumChannel} forumChannel
     */
    const sendAlertToInactiveThreads = async forumChannel => {
      const activeThreads = (await forumChannel.threads.fetchActive()).threads

      logger.info(`Found ${activeThreads.size} active threads`)

      /** @type {Array<import('discord.js').Message<true>>} */
      const lastMessages = await Promise.all(
        activeThreads.mapValues(it => it.messages.fetch({ limit: 1 })).values()
      ).then(it => it.map(it => it.first()))

      const inactiveThreads = lastMessages
        .filter(it => it.author.id !== client.user?.id)
        .filter(it => Date.now() - it.createdTimestamp > 86400000)
        .map(it => it.channel)

      logger.info(
        `Found ${inactiveThreads.length} threads over 24 hours since last activity.`
      )

      await Promise.all(
        inactiveThreads.map(it =>
          it.send({
            content: [
              `${userMention(it.ownerId)}さん、問題は解決しましたか？`,
              'もし解決済みであれば、スレッドをクローズしてください。',
            ].join('\n'),
          })
        )
      )
    }

    await Promise.all(forumChannels.map(it => sendAlertToInactiveThreads(it)))

    logger.info(`Done.`)
  }
}
