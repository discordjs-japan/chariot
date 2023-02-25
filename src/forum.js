// @ts-check
import { bold, userMention } from 'discord.js'
/**
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 */

/**
 * @typedef {object} ForumChannelSetting
 * @property {string} id
 * @property {(ownerId: string | null | undefined) => string} onCreate
 * @property {(by?: string | null | undefined) => string} onReopen
 * @property {(ownerId: string | null | undefined, days: number) => string} onStale
 */

/**
 * @typedef {object} Forum
 * @property {ForumChannel} channel
 * @property {ForumChannelSetting} setting
 */

/** @type {ForumChannelSetting[]} */
export const forumChannelSettings = [
  {
    id: '1019744831855153223',
    onCreate: ownerId =>
      [
        bold('もう一度確認してみよう:'),
        `• https://scrapbox.io/discordjs-japan/質問のガイドライン`,
        `• フォーラムチャンネルに設定された${bold('Post Guideline')}`,
        '',
        `質問に回答する方々は、${bold(
          '回答のガイドライン'
        )}を確認するようにしてください。`,
        '• https://scrapbox.io/discordjs-japan/回答のガイドライン',
        '',
        ownerId && userMention(ownerId),
        '問題が解決した場合、スレッドを閉じるようお願いいたします。',
      ].join('\n'),
    onReopen: by =>
      by
        ? `${userMention(by)}がスレッドを再開しました。`
        : 'スレッドが再開されました。',
    onStale: (ownerId, days) =>
      [
        ownerId && userMention(ownerId),
        `このスレッドは${days}日間操作がなかったため自動的に閉じさせていただきます。`,
        '',
        'なおこのスレッドは誰でも再開可能です。',
        '誰かによってスレッドが再開された場合は再度このスレッドにお知らせします。',
      ].join('\n'),
  },
]
