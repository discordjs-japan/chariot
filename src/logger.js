// @ts-check
import { inspect } from 'node:util'

/**
 * @typedef {'INFO' | 'ERROR'} Level
 */
export class Logger {
  /**
   * @param {string} name
   * @param {Logger} [parent]
   */
  constructor(name, parent) {
    this.name = name

    this.parent = parent
  }

  /**
   * @param {string} name
   * @returns {Logger}
   */
  createChild(name) {
    return new Logger(name, this)
  }

  /**
   * @param  {...unknown} messages
   */
  info(...messages) {
    this.#writeStdout('INFO', ...messages)
  }

  /**
   * @param  {...unknown} messages
   */
  error(...messages) {
    this.#writeStderr('ERROR', ...messages)
  }

  /**
   * @param {Level} level
   * @param  {...unknown} messages
   */
  #writeStdout(level, ...messages) {
    process.stdout.write(this.#makeMessage(level, ...messages), 'utf8')
  }

  /**
   * @param {Level} level
   * @param  {...unknown} messages
   */
  #writeStderr(level, ...messages) {
    process.stderr.write(this.#makeMessage(level, ...messages), 'utf8')
  }

  /**
   * @param {Level} level
   * @param  {...unknown} messages
   */
  #makeMessage(level, ...messages) {
    /** @type {Logger[]} */
    const parents = []
    /** @type {Logger} */
    let child = this

    while (true) {
      if (!child.parent) break

      parents.unshift(child.parent)
      child = child.parent
    }

    return (
      [
        `[${new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
          timeStyle: 'medium',
        }).format(Date.now())}]`,
        `[${[...parents, this].map(it => it.name).join('/')}]`,
        `[${level}]`,
        ...messages.map(it =>
          typeof it === 'string' ? it : inspect(it, { colors: false })
        ),
      ].join(' ') + '\n'
    )
  }
}
