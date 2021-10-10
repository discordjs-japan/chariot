const { Client } = require('discord.js')
const { interactiveSetup } = require('./interactive')

const client = new Client({
  intents: ['GUILDS', 'GUILD_MESSAGES', 'GUILD_MESSAGE_REACTIONS'],
  presence: {
    status: 'idle',
    activities: [
      {
        type: 'WATCHING',
        name: 'ガイドライン',
      },
    ],
  },
})

client.once('ready', client => {
  console.log('Ready!')

  /**
   * @param {import('discord.js').GuildChannel} channel
   */
  const fetchGuidelineChannel = async channel => {
    if (!channel.isText()) return
    if (!channel.topic) return
    if (!/\[guideline (\d{17,19})\]/u.test(channel.topic)) return

    return channel.messages.fetch()
  }

  client.guilds
    .fetch()
    .then(guilds => Promise.all(guilds.map(guild => guild.fetch())))
    .then(guilds => guilds.map(guild => guild.channels.cache))
    .then(channels => channels.reduce((prev, current) => prev.concat(current)))
    .then(channels =>
      Promise.all(channels.map(channel => fetchGuidelineChannel(channel)))
    )
    .catch(console.error)
})

client.on('messageCreate', async message => {
  if (message.system || message.author.bot) return
  if (!message.guild) return
  if (!message.mentions.members.has(client.user.id)) return
  if (!message.content.includes('setup')) return
  if (message.member.id !== message.guild.ownerId) return

  const interactive = interactiveSetup(message)
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
    color: 'RANDOM',
    name: `Read the Guideline [${categoryChannel.id}]`,
    permissions: message.guild.roles.everyone.permissions,
    reason: `${guidelineChannel}に同意した人に与えるための役職`,
  })

  await categoryChannel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    {
      VIEW_CHANNEL: false,
    }
  )
  await categoryChannel.permissionOverwrites.create(role, {
    VIEW_CHANNEL: true,
  })
  await guidelineChannel.permissionOverwrites.edit(
    message.guild.roles.everyone,
    {
      ADD_REACTIONS: false,
      VIEW_CHANNEL: true,
    }
  )
  await guidelineMessage.react('✅')
  await Promise.all(
    categoryChannel.children
      .filter(channel => channel.id !== guidelineChannel.id)
      .map(channel =>
        channel.permissionOverwrites.create(role, { VIEW_CHANNEL: true })
      )
  )

  await message.reply('セットアップが完了しました！')
})

client.on('messageReactionAdd', (reaction, user) => {
  const message = reaction.message
  const channel = message.channel
  const guild = message.guild
  const topicGuidelineId = channel?.topic?.match(/\[guideline (\d{17,19})\]/u)

  if (!guild || user.bot) return
  if (!channel.isText()) return
  if (reaction.emoji.name !== '✅') return
  if (!topicGuidelineId) return
  if (topicGuidelineId[1] !== message.id) return
  ;(async () => {
    await reaction.users.remove(user)

    const roles = await guild.roles.fetch()
    const role = roles.find(
      role => role.name === `Read the Guideline [${channel.parentId}]`
    )

    if (!role) return

    const member = await guild.members.fetch(user.id)

    await member.roles.add(role)
  })().catch(console.error)
})

client.login().catch(console.error)
