const { Client, Intents } = require('discord.js')
const { interactiveGenerator } = require('./interactive')

const client = new Client({
  ws: {
    intents: Intents.NON_PRIVILEGED,
  },
})

client.once('ready', () => {
  console.log('Ready!')

  client.guilds.cache.forEach(guild =>
    Promise.all(
      guild.channels.cache
        .filter(channel => channel.type === 'text')
        .map(channel => channel.messages.fetch())
    )
  )
})

client.on('message', async message => {
  if (message.system || message.author.bot) return
  if (!message.guild) return
  if (!message.mentions.members.has(client.user.id)) return
  if (!message.content.includes('setup')) return
  if (message.member.manageable) return

  const interactive = interactiveGenerator(message)
  /** @type {import('discord.js').CategoryChannel} */
  const categoryChannel = (await interactive.next()).value

  if (
    message.guild.roles.cache.some(
      role => role.name === `Read the Guideline [${categoryChannel.id}]`
    )
  )
    return message.reply(
      `そのカテゴリチャンネルは既に登録されています。登録し直すには「Read the Guideline ${categoryChannel.id}」を削除してください`
    )

  /** @type {import('discord.js').TextChannel} */
  const guidelineChannel = (await interactive.next()).value
  /** @type {import('discord.js').Message} */
  const guidelineMessage = (await interactive.next()).value

  await guidelineChannel.setTopic(
    `[guideline ${guidelineMessage.id}]`,
    'ガイドラインが書かれたテキストチャンネルであることを示すため（削除すると機能しなくなります）'
  )

  const role = await message.guild.roles.create({
    data: {
      color: 'RANDOM',
      name: `Read the Guideline [${categoryChannel.id}]`,
      permissions: message.guild.roles.everyone.permissions,
    },
    reason: `${guidelineChannel}に同意した人に与えるための役職`,
  })

  await categoryChannel.updateOverwrite(message.guild.roles.everyone, {
    VIEW_CHANNEL: false,
  })
  await categoryChannel.updateOverwrite(role, { VIEW_CHANNEL: true })
  await guidelineChannel.updateOverwrite(message.guild.roles.everyone, {
    ADD_REACTIONS: false,
    VIEW_CHANNEL: true,
  })
  await guidelineMessage.react('✅')
  await Promise.all(
    categoryChannel.children
      .filter(channel => channel.id !== guidelineChannel.id)
      .map(channel => channel.updateOverwrite(role, { VIEW_CHANNEL: true }))
  )

  await message.reply('セットアップが完了しました！')
})

client.on('messageReactionAdd', (reaction, user) => {
  const message = reaction.message
  const channel = message.channel
  const guild = message.guild

  if (!guild || user.bot) return
  if (channel.type !== 'text') return
  if (reaction.emoji.name !== '✅') return
  const topicGuidelineId = channel.topic.match(/\[guideline (\d{17,19})\]/u)
  if (topicGuidelineId && topicGuidelineId[1] !== message.id) return
  const role = guild.roles.cache.find(
    role => role.name === `Read the Guideline [${channel.parentID}]`
  )
  if (!role) return

  reaction.users
    .remove(user)
    .then(() => guild.members.fetch(user.id))
    .then(member => member.roles.add(role))
    .catch(console.error)
})

client.login().catch(console.error)
