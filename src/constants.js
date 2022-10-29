import { bold, hyperlink, userMention } from 'discord.js'

export const forumChannels = [
  {
    id: '1019744831855153223',
    message: ownerId =>
      [
        bold('もう一度確認してみよう'),
        `・${hyperlink(
          '質問のガイドライン',
          'https://scrapbox.io/discordjs-japan/質問のガイドライン'
        )}`,
        `・フォーラムチャンネルに設定された${bold('Post Guideline')}`,
        '',
        `質問に回答する方々は、${hyperlink(
          bold('回答のガイドライン'),
          'https://scrapbox.io/discordjs-japan/回答のガイドライン'
        )}を確認しましょう！`,
        '',
        `${userMention(
          ownerId
        )}さんは質問を終えたらスレッドをクローズすることを忘れないでください。（クローズされていない場合は再度通知します）`,
      ].join('\n'),
  },
]
