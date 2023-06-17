// @ts-check
import { PermissionFlagsBits } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('discord.js').GuildAuditLogsEntry} GuildAuditLogsEntry
 * @typedef {import('discord.js').PublicThreadChannel} PublicThreadChannel
 */

/**
 * @param {Logger} logger
 * @param {GuildAuditLogsEntry} entry
 * @param {PublicThreadChannel} thread ロックされたスレッド
 */
export async function handleLock(logger, entry, thread) {
  if (!entry.executorId) return
  const executor = await thread.guild.members.fetch(entry.executorId)
  if (!thread.permissionsFor(executor).has(PermissionFlagsBits.ManageThreads)) {
    thread.setLocked(
      false,
      `${executor.user.tag} (${entry.executorId}) has no ManageThreads permission.`
    )
    logger.info(
      `unlocked "${thread.name}" (${thread.id}) because ${executor.user.tag} (${entry.executorId}) has no ManageThreads permission.`
    )
  }
}
