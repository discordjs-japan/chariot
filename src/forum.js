// @ts-check
import { bold, channelMention, underscore, userMention } from 'discord.js'
/**
 * @typedef {import('discord.js').ForumChannel} ForumChannel
 */

/**
 * @typedef {object} ForumChannelSetting
 * @property {string} id
 * @property {(ownerId: string | null | undefined) => string} onCreate
 * @property {(by?: string | null | undefined) => string} onReopen
 * @property {(ownerId: string | null | undefined, days: number) => string} onStale
 * @property {(ownerId: string) => string} onClose
 * @property {(ownerId: string) => string} onLock
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
        ? [
            `${userMention(by)}がスレッドを再開しました。`,
            `${userMention(
              by
            )}さんは、間違って再開した場合は下のボタンを押してください。`,
          ].join('\n')
        : 'スレッドが再開されました。',
    onStale: (ownerId, days) =>
      [
        ownerId && userMention(ownerId),
        `このスレッドは${days}日間操作がなかったため自動的に閉じさせていただきます。`,
        '',
        'なおこのスレッドは誰でも再開可能です。',
        '誰かによってスレッドが再開された場合は再度このスレッドにお知らせします。',
      ].join('\n'),
    onClose(ownerId) {
      return [
        userMention(ownerId),
        'この質問は複数のコミュニティメンバーからガイドラインに沿っていないと判断されたため、クローズします。',
        '',
        '質問のガイドラインを再度熟読してください。',
        'https://scrapbox.io/discordjs-japan/質問のガイドライン',
        '',
        bold('◆特に確認すべき事項'),
        underscore('・Discord.jsに関する内容になっていますか？'),
        `　JavaScriptの文法や、Discord.jsを用いない内容（別のライブラリに関する内容など）の質問は ${channelMention(
          this.id
        )} では受け付けていません。`,
        underscore('・何が知りたいのか、相手に伝わる文章になっていますか？'),
        '　回答者は質問内容を把握できなければなにもできません。',
        underscore('・丸投げになっていませんか？'),
        '　回答者はあなたのソースコードを代わりに書くロボットではありません。',
        '',
        'ガイドラインに沿うように修正できるのであれば、質問内容を修正してください。修正を確定すると質問が再開されます。',
        '⚠️ 再開後、ガイドラインに沿わない状態が解消されていないと判断された場合、この質問をクローズののちロックします。',
      ].join('\n')
    },
    onLock: ownerId =>
      [
        userMention(ownerId),
        'この修正された質問は、複数のコミュニティメンバーからガイドラインに沿っていないと判断されたため、クローズします。',
        '',
        '❌ 今後この投稿はロックされ、内容の追記・編集はできません。',
      ].join('\n'),
  },
]
