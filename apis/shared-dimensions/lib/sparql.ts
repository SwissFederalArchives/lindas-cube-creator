import ParsingClient from 'sparql-http-client/ParsingClient'
import StreamClient from 'sparql-http-client/StreamClient'
import { customFetch } from '@cube-creator/core/customFetch'
import { QueryLogger } from '@cube-creator/sparql-query-logger'
import debug from 'debug'
import env from './env'

const sparqlLog = debug('sparql-shared-dimensions')
const queryLogEnabled = process.env.SPARQL_QUERY_LOG_ENABLED === 'true'
const lindasQueryLogger = new QueryLogger({
  enabled: queryLogEnabled,
  endpointName: 'lindas',
  log: sparqlLog,
})

export const sparql = {
  endpointUrl: env.MANAGED_DIMENSIONS_STORE_QUERY_ENDPOINT,
  updateUrl: env.MANAGED_DIMENSIONS_STORE_UPDATE_ENDPOINT,
  storeUrl: env.MANAGED_DIMENSIONS_STORE_GRAPH_ENDPOINT,
  user: env.maybe.MANAGED_DIMENSIONS_STORE_USERNAME,
  password: env.maybe.MANAGED_DIMENSIONS_STORE_PASSWORD,
  fetch: customFetch,
}

const rawParsingClient = new ParsingClient(sparql)
const rawStreamClient = new StreamClient(sparql)
export const parsingClient = lindasQueryLogger.wrapParsingClient(rawParsingClient)
export const streamClient = lindasQueryLogger.wrapStreamClient(rawStreamClient)
