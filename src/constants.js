import { bold, hyperlink, userMention } from 'discord.js'

export const forumChannels = [
  {
    id: '1019744831855153223',
    message: ownerId =>
      [
        userMention(ownerId),
        bold('もう一度確認してみよう:'),
        `• https://scrapbox.io/discordjs-japan/質問のガイドライン`,
        `• フォーラムチャンネルに設定された${bold('Post Guideline')}`,
        '',
        `質問に回答する方々は、${bold(
          '回答のガイドライン'
        )}を確認するようにしてください。`,
        '• https://scrapbox.io/discordjs-japan/回答のガイドライン',
        '',
        'スレッドに対して二日間操作が確認されない場合はスレッドを自動的に閉じますが、いつでも再開可能です。',
      ].join('\n'),
  },
]
