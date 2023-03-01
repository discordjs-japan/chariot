// @ts-check
import { ChannelType } from 'discord.js'
/**
 * @typedef {import('./logger.js').Logger} Logger
 * @typedef {import('./forum.js').ForumChannelSetting} ForumChannelSetting
 * @typedef {import('discord.js').AnyThreadChannel} AnyThreadChannel
 * @typedef {import('discord.js').Message} Message
 */

/**
 * @param {Logger} logger
 * @param {ForumChannelSetting} setting
 * @param {AnyThreadChannel} thread
 * @param {Message | null} [starter]
 */
export async function handleReactionClose(logger, setting, thread, starter) {
  if (thread.parent?.type !== ChannelType.GuildForum) return

  starter ??= await thread.fetchStarterMessage()
  if (!starter) {
    await thread.setLocked()
    logger.info(
      `"${thread.parent.name}" (${thread.parentId}) は最初の投稿が削除されたためロックします。`,
      `locked "${thread.parent.name}" (${thread.parentId}) because the starter post was deleted.`
    )
    return
  }

  const [bad, warning] = await Promise.all([
    starter.reactions.resolve('👎')?.fetch(),
    starter.reactions.resolve('⚠️')?.fetch(),
  ])

  // 👎 * 0~2 + ⚠️ * 0 -> なにもしない
  // 👎 * 0~2 + ⚠️ * 1 -> なにもしない
  if (!bad || bad.count < 3) return

  // 👎 * 3~  + ⚠️ * 0 -> ⚠️ つけて 👎 消してclose
  // 👎 * 3~  + ⚠️ * 1 -> ❌ つけてclose
  await Promise.all([
    !warning?.me && bad.remove(),
    starter.react(warning?.me ? '❌' : '⚠️'),
    thread.send(setting[warning?.me ? 'onLock' : 'onClose'](starter.author.id)),
  ])
  const usersString = bad.users.cache
    .map(user => `${user.tag} (${user.id})`)
    .join(', ')
  await thread[warning?.me ? 'setLocked' : 'setArchived'](
    true,
    `:-1: by ${usersString}`
  )
  logger.info(
    `${warning?.me ? 'locked' : 'closed'} "${thread.name}" (${
      thread.id
    }) because it has been :-1:-ed by ${usersString}.`
  )
}
