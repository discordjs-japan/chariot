import { setInterval } from 'node:timers/promises'
import { ChannelType, Client, userMention } from 'discord.js'
import * as constants from './constants.js'

const client = new Client({
  intents: ['Guilds', 'GuildMessages'],
})

client.once('ready', client => {
  checkInactiveThreadTimer().catch(console.error)

  console.log(`Logged in ${client.user.tag}`)
})

client.on('threadCreate', async (thread, newlyCreated) => {
  const messageContent = constants.forumChannels.find(
    it => it.id === thread.parentId
  )?.message
  if (!newlyCreated) return
  if (!messageContent) return
  if (thread.parent?.type !== ChannelType.GuildForum) return

  await thread.send({
    content: messageContent(thread.ownerId),
  }).then(it => it.suppressEmbeds())

  console.log(
    `[Forum#${thread.parentId}]`,
    `[Thread#${thread.id}]`,
    `"${thread.name}" was created.`
  )
})

await client.login()

async function checkInactiveThreadTimer() {
  for await (const _ of setInterval(3600000, null, { ref: false })) {
    for (const { id } of constants.forumChannels) {
      const forumChannel = await client.channels.fetch(id)

      if (forumChannel?.type !== ChannelType.GuildForum)
        throw new Error(`${id} is not ForumChannel`)

      const activeThreads = (await forumChannel.threads.fetchActive()).threads

      activeThreads
        .filter(
          it => !it.archived && it.lastMessage?.author.id !== client.user.id
        )
        .filter(
          it =>
            it.lastMessage &&
            Date.now() - it.lastMessage.createdTimestamp > 259200000
        )
        .forEach(it => {
          console.log(
            `[Forum#${forumChannel} [Thread#${it.id}] Found inactive and unclosed thread.`
          )

          it.send({
            content: [
              `${userMention(it.ownerId)}さん、問題は解決しましたか？`,
              'もし解決済みであれば、スレッドをクローズしてください。',
            ].join('\n'),
          }).catch(console.error)
        })
    }
  }
}
