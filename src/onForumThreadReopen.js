// @ts-check
import { AuditLogEvent } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 */

/**
 * @param {Logger} logger
 * @param {AnyThreadChannel} thread
 */
export async function onForumThreadReopen(logger, thread) {
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
    await thread.send(`${entry.executor}がスレッドを再開しました。`)
  } else {
    await thread.send('スレッドが再開されました。')
  }
}
