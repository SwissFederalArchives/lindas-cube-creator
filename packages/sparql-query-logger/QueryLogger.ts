import type StreamClient from 'sparql-http-client/StreamClient'
import type ParsingClient from 'sparql-http-client/ParsingClient'

export type LogFunction = (...args: any[]) => void

export interface QueryLoggerConfig {
  enabled: boolean
  endpointName: string
  log?: LogFunction
}

export interface QueryExecutionResult {
  queryId: string
  query: string
  endpointName: string
  startTime: Date
  endTime: Date
  durationMs: number
  success: boolean
  error?: string
  resultCount?: number
  resultType?: 'stream' | 'bindings' | 'boolean' | 'update'
}

export class QueryLogger {
  private config: QueryLoggerConfig
  private queryCounter = 0
  // eslint-disable-next-line no-console
  private log: LogFunction = console.log

  constructor(config: QueryLoggerConfig) {
    this.config = config
    if (config.log) {
      this.log = config.log
    }
  }

  private generateQueryId(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.queryCounter++
    return `${timestamp}_${this.queryCounter.toString().padStart(4, '0')}`
  }

  private async logStart(queryId: string, query: string, resultType?: QueryExecutionResult['resultType']): Promise<void> {
    if (!this.config.enabled) return

    const preview = query
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 200)
    const typeLabel = resultType ? ` ${resultType}` : ''

    this.log(`start${typeLabel} ${this.config.endpointName} ${queryId} ${preview}`)
  }

  async logExecution(result: QueryExecutionResult): Promise<void> {
    if (!this.config.enabled) return

    const status = result.success ? 'ok' : 'error'
    this.log(`end ${status} ${result.endpointName} ${result.queryId} ${result.durationMs}ms`)
  }

  /**
   * Wraps a SPARQL client to automatically log all queries
   */
  wrapStreamClient(client: StreamClient): StreamClient {
    if (!this.config.enabled) return client

    // Create a proxy that intercepts query execution
    return new Proxy(client, {
      get: (target, prop) => {
        const original = target[prop as keyof StreamClient]

        // Intercept the query.construct, query.select, query.ask, and store methods
        if (prop === 'query') {
          return new Proxy(target.query, {
            get: (queryTarget, queryProp) => {
              const queryOriginal = queryTarget[queryProp as keyof typeof queryTarget]

              if (typeof queryOriginal === 'function' &&
                  typeof queryProp === 'string' &&
                  ['construct', 'select', 'ask'].includes(queryProp)) {
                return async (...args: any[]): Promise<any> => {
                  const query = args[0]?.toString() || ''
                  const queryId = this.generateQueryId()
                  const startTime = new Date()

                  try {
                    await this.logStart(queryId, query, 'stream')
                    const result = await (queryOriginal as any).apply(queryTarget, args)
                    const endTime = new Date()

                    // For streams, we can't easily count results without consuming them
                    // So we just log the successful execution
                    await this.logExecution({
                      queryId,
                      query,
                      endpointName: this.config.endpointName,
                      startTime,
                      endTime,
                      durationMs: endTime.getTime() - startTime.getTime(),
                      success: true,
                      resultType: 'stream',
                    })

                    return result
                  } catch (error: any) {
                    const endTime = new Date()

                    await this.logExecution({
                      queryId,
                      query,
                      endpointName: this.config.endpointName,
                      startTime,
                      endTime,
                      durationMs: endTime.getTime() - startTime.getTime(),
                      success: false,
                      error: error.message || String(error),
                    })

                    throw error
                  }
                }
              }

              return queryOriginal
            },
          })
        }

        if (prop === 'store' && typeof original === 'object' && original !== null) {
          return new Proxy(original, {
            get: (storeTarget, storeProp) => {
              const storeOriginal = storeTarget[storeProp as keyof typeof storeTarget]

              if (typeof storeOriginal === 'function' &&
                  typeof storeProp === 'string' &&
                  ['put', 'post', 'delete'].includes(storeProp)) {
                return async (...args: any[]): Promise<any> => {
                  const queryId = this.generateQueryId()
                  const startTime = new Date()

                  try {
                    await this.logStart(queryId, `# ${storeProp} operation on graph store`, 'update')
                    const result = await (storeOriginal as any).apply(storeTarget, args)
                    const endTime = new Date()

                    await this.logExecution({
                      queryId,
                      query: `# ${storeProp} operation on graph store`,
                      endpointName: this.config.endpointName,
                      startTime,
                      endTime,
                      durationMs: endTime.getTime() - startTime.getTime(),
                      success: true,
                      resultType: 'update',
                    })

                    return result
                  } catch (error: any) {
                    const endTime = new Date()

                    await this.logExecution({
                      queryId,
                      query: `# ${storeProp} operation on graph store`,
                      endpointName: this.config.endpointName,
                      startTime,
                      endTime,
                      durationMs: endTime.getTime() - startTime.getTime(),
                      success: false,
                      error: error.message || String(error),
                    })

                    throw error
                  }
                }
              }

              return storeOriginal
            },
          })
        }

        return original
      },
    })
  }

  /**
   * Wraps a ParsingClient to automatically log all queries
   */
  wrapParsingClient(client: ParsingClient): ParsingClient {
    if (!this.config.enabled) return client

    return new Proxy(client, {
      get: (target, prop) => {
        const original = target[prop as keyof ParsingClient]

        if (prop === 'query') {
          return new Proxy(target.query, {
            get: (queryTarget, queryProp) => {
              const queryOriginal = queryTarget[queryProp as keyof typeof queryTarget]

              if (typeof queryOriginal === 'function' &&
                  typeof queryProp === 'string' &&
                  ['construct', 'select', 'ask', 'update'].includes(queryProp)) {
                return async (...args: any[]): Promise<any> => {
                  const query = args[0]?.toString() || ''
                  const queryId = this.generateQueryId()
                  const startTime = new Date()

                  try {
                    const resultType = queryProp === 'update'
                      ? 'update'
                      : queryProp === 'ask' ? 'boolean' : 'bindings'
                    await this.logStart(queryId, query, resultType)
                    const result = await (queryOriginal as any).apply(queryTarget, args)
                    const endTime = new Date()

                    // Try to determine result count for select/construct
                    let resultCount: number | undefined
                    if (queryProp === 'select' && (result as any)?.length !== undefined) {
                      resultCount = (result as any).length
                    } else if (queryProp === 'construct' && (result as any)?.length !== undefined) {
                      resultCount = (result as any).length
                    } else if (queryProp === 'ask') {
                      resultCount = result ? 1 : 0
                    }

                    await this.logExecution({
                      queryId,
                      query,
                      endpointName: this.config.endpointName,
                      startTime,
                      endTime,
                      durationMs: endTime.getTime() - startTime.getTime(),
                      success: true,
                      resultCount,
                      resultType,
                    })

                    return result
                  } catch (error: any) {
                    const endTime = new Date()

                    await this.logExecution({
                      queryId,
                      query,
                      endpointName: this.config.endpointName,
                      startTime,
                      endTime,
                      durationMs: endTime.getTime() - startTime.getTime(),
                      success: false,
                      error: error.message || String(error),
                    })

                    throw error
                  }
                }
              }

              return queryOriginal
            },
          })
        }

        return original
      },
    })
  }
}
