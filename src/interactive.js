/**
 * @param {import('discord.js').Message} message
 */
async function* interactiveGenerator(message) {
  const categoryChannels = message.guild.channels.cache.filter(
    channel => channel.type === 'category'
  )

  await message
    .reply(
      'ガイドラインに同意するまで使用させたくないカテゴリチャンネルのIDを選択してください'
    )
    .then(message =>
      message.reply(
        `${categoryChannels
          .map(channel => `${channel}（${channel.id}）`)
          .join(
            ' '
          )} のどれかから選択して、チャンネル名またはIDを送信してください`
      )
    )

  /** @type {import('discord.js').CategoryChannel} */
  const categoryChannel = await message.channel
    .awaitMessages(
      msg =>
        msg.author.id === message.author.id &&
        categoryChannels.some(
          channel => channel.id === msg.content || channel.name === msg.content
        ),
      {
        max: 1,
        idle: 60000,
        errors: ['idle'],
      }
    )
    .then(collection => collection.first())
    .then(message =>
      categoryChannels.find(
        channel =>
          channel.id === message.content || channel.name === message.name
      )
    )

  yield categoryChannel

  const children = categoryChannel.children

  await message.reply(
    `${categoryChannel} にあるテキストチャンネルでガイドラインが書かれているチャンネルを選択し、メンションしてください`
  )

  /** @type {import('discord.js').TextChannel} */
  const guidelineChannel = await message.channel
    .awaitMessages(
      msg =>
        msg.author.id === message.author.id &&
        children.some(
          channel =>
            channel.type === 'text' &&
            channel.id === msg.mentions.channels.firstKey()
        ),
      {
        errors: ['idle'],
        idle: 60000,
        max: 1,
      }
    )
    .then(collection => collection.first())
    .then(message => message.mentions.channels.first())

  yield guidelineChannel

  await message.reply(
    `${guidelineChannel}にガイドラインが書かれたメッセージのIDを送信してください`
  )

  const guidelineMessage = await message.channel
    .awaitMessages(
      msg =>
        msg.author.id === message.author.id && /^\d{17,19}$/.test(msg.content),
      {
        idle: 60000,
        errors: ['idle'],
        max: 1,
      }
    )
    .then(collection => collection.first())
    .then(message => guidelineChannel.messages.fetch(message.content))

  yield guidelineMessage
}

module.exports.interactiveGenerator = interactiveGenerator
