import { ButtonStyle, ChannelType, ComponentType } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('discord.js').Interaction} Interaction
 * @typedef {import('discord.js').Message} Message
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 * @typedef {import('discord.js').MessageActionRowComponentData} MessageActionRowComponentData
 * @typedef {import('discord.js').ActionRowData<MessageActionRowComponentData>} ActionRowData
 */

/**
 * Whether {@link handleCreateNotify} has handled the thread/message.
 * @type {Set<string>}
 */
const handled = new Set()

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 * @param {Message} _starter to make sure the starter message exists
 * @param {ForumChannelSetting} setting
 */
export async function handleCreateNotify(logger, thread, _starter, setting) {
  if (handled.has(thread.id)) return
  handled.add(thread.id)

  if (thread.parent?.type !== ChannelType.GuildForum) return
  if (!thread.ownerId) return

  await thread
    .send({
      content: setting.onCreate(thread.ownerId),
      components,
    })
    .then(it => it.suppressEmbeds())

  logger.info(
    `"${thread.name}" (${thread.id}) has been created in "${thread.parent.name}" (${thread.parentId}).`
  )
}

/**
 * @param {Logger} logger
 * @param {Interaction} interaction
 * @param {ForumChannelSetting} setting
 */
export async function handleOwnerClose(logger, interaction, setting) {
  if (!interaction.isButton()) return
  if (interaction.customId !== components[0].components[0].customId) return

  const message = interaction.message
  const thread = message.channel
  if (!thread.isThread() || thread.parent?.type !== ChannelType.GuildForum)
    return

  if (interaction.user.id !== thread.ownerId) return

  await interaction.reply({
    content: setting.onOwnerClose,
  })

  await thread.setArchived(true, 'Owner used Close button')

  logger.info(
    `"${thread.name}" (${thread.id}) has been closed because the owner used Close button.`
  )
}

/** @satisfies {ActionRowData[]} */
const components = [
  {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        label: 'クローズ',
        customId: 'owner_close',
      },
    ],
  },
]
