import {
  ButtonStyle,
  ComponentType,
  DiscordjsError,
  DiscordjsErrorCodes,
} from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').GuildAuditLogsEntry} GuildAuditLogsEntry
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 * @typedef {import('discord.js').MessageActionRowComponentData} MessageActionRowComponentData
 * @typedef {import('discord.js').ActionRowData<MessageActionRowComponentData>} ActionRowData
 */

/**
 * @param {Logger} logger
 * @param {GuildAuditLogsEntry} entry
 * @param {AnyThreadChannel} thread ロックされていないスレッド
 * @param {ForumChannelSetting} setting
 */
export async function handleReopenNotify(logger, entry, thread, setting) {
  logger.info(`"${thread.name}" (${thread.id}) has been reopened.`)
  if (entry.executorId === thread.client.user.id) return
  if (!entry.executorId) {
    await thread.send(setting.onReopen())
    return
  }
  const message = await thread.send({
    content: setting.onReopen(entry.executorId),
    components,
  })
  try {
    const interaction = await message.awaitMessageComponent({
      filter: i => i.user.id === entry.executorId,
      time: 1000 * 60 * 5,
    })
    if (interaction) {
      await message.delete()
      await thread.setArchived()
    }
  } catch (error) {
    if (
      error instanceof DiscordjsError &&
      error.code === DiscordjsErrorCodes.InteractionCollectorError
    ) {
      if (thread.archived) {
        await thread.setArchived(false)
        await message.delete()
        await thread.setArchived()
        return
      }
      await message.edit({
        content: setting.onReopenButtonRejected(entry.executorId),
        components: [],
      })
    } else {
      throw error
    }
  }
}

/** @type {ActionRowData[]} */
const components = [
  {
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        style: ButtonStyle.Primary,
        label: 'クローズする',
        customId: 'close',
      },
    ],
  },
]
