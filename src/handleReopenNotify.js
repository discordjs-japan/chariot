// @ts-check
import { ButtonStyle, ComponentType, GuildAuditLogsEntry } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
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
  const message = await thread.send({
    content: setting.onReopen(entry.executorId),
    components,
  })
  const interaction = await message
    .awaitMessageComponent({
      filter: i => i.user.id === entry.executorId,
      time: 1000 * 60 * 5,
    })
    .catch(() => null)
  if (interaction) {
    await message.delete()
    await thread.setArchived()
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
