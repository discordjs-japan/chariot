// @ts-check
import { AuditLogEvent, ButtonStyle, ComponentType } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 * @typedef {import('discord.js').MessageActionRowComponentData} MessageActionRowComponentData
 * @typedef {import('discord.js').ActionRowData<MessageActionRowComponentData>} ActionRowData
 */

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread ロックされていないスレッド
 * @param {ForumChannelSetting} setting
 */
export async function handleReopenNotify(logger, thread, setting) {
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
    const message = await thread.send({
      content: setting.onReopen(entry.executor?.id),
      components,
    })
    const interaction = await message
      .awaitMessageComponent({
        filter: i => i.user.id === entry.executor?.id,
        time: 1000 * 60 * 5,
      })
      .catch(() => null)
    if (interaction) {
      await message.delete()
      await thread.setArchived()
    }
  } else {
    await thread.send(setting.onReopen())
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
