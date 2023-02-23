// @ts-check
import { bold, userMention } from 'discord.js'

/**
 * @typedef {object} ForumChannelSetting
 * @property {string} id
 * @property {(ownerId: string) => string} message
 */

/** @type {ForumChannelSetting[]} */
export const forumChannels = [
  {
    id: '1019744831855153223',
    message: ownerId =>
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
        `${userMention(
          ownerId
        )}さんは問題が解決した場合、スレッドを閉じるようお願いいたします。`,
      ].join('\n'),
  },
]
