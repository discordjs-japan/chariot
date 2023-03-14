// @ts-check
import { MessageFlags } from 'discord.js'
import { fetchStarterMessageOrNull, lockThreadForNoStarter } from './starter.js'
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
  starter ??= await fetchStarterMessageOrNull(thread)
  if (!starter) {
    await lockThreadForNoStarter(logger, thread)
    return
  }

  if (thread.locked) return

  const [bad, warning] = await Promise.all([
    starter.reactions.resolve('👎')?.fetch(),
    starter.reactions.resolve('⚠️')?.fetch(),
  ])

  // 👎 * 0~2 + ⚠️ * 0 -> なにもしない
  // 👎 * 0~2 + ⚠️ * 1 -> なにもしない
  if (!bad || bad.count < 3) return

  // must be before bad.remove()
  const users = await bad.users.fetch()
  const usersString = users.map(user => `${user.tag} (${user.id})`).join(', ')

  // 👎 * 3~  + ⚠️ * 0 -> ⚠️ つけて 👎 消してclose
  // 👎 * 3~  + ⚠️ * 1 -> ❌ つけてclose
  await Promise.all([
    !warning?.me && bad.remove(),
    starter.react(warning?.me ? '❌' : '⚠️'),
    thread.send({
      content: setting[warning?.me ? 'onLock' : 'onClose'](starter.author.id),
      flags: MessageFlags.SuppressEmbeds,
    }),
  ])

  if (warning?.me) await thread.setLocked()
  await thread.setArchived(true, `:-1: by ${usersString}`)

  logger.info(
    `${warning?.me ? 'locked' : 'closed'} "${thread.name}" (${
      thread.id
    }) because it has been :-1:-ed by ${usersString}.`
  )
}
