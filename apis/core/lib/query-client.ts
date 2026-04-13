import StreamClient from 'sparql-http-client'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { customFetch } from '@cube-creator/core/customFetch'
import env from '@cube-creator/core/env'
import { QueryLogger } from '@cube-creator/sparql-query-logger'
import debug from 'debug'

const queryLogEnabled = process.env.SPARQL_QUERY_LOG_ENABLED === 'true'
const cubeCreatorQueryLogger = new QueryLogger({
  enabled: queryLogEnabled,
  endpointName: 'cube-creator',
  log: debug('sparql-cube-creator'),
})
const publicQueryLogger = new QueryLogger({
  enabled: queryLogEnabled,
  endpointName: 'cube-creator-public',
  log: debug('sparql-public-endpoint'),
})

const clientConfig = {
  endpointUrl: env.STORE_QUERY_ENDPOINT,
  updateUrl: env.STORE_UPDATE_ENDPOINT,
  storeUrl: env.STORE_GRAPH_ENDPOINT,
  user: env.maybe.STORE_ENDPOINTS_USERNAME,
  password: env.maybe.STORE_ENDPOINTS_PASSWORD,
  fetch: customFetch,
}

const rawStreamClient = new StreamClient(clientConfig)
export const streamClient = cubeCreatorQueryLogger.wrapStreamClient(rawStreamClient)

const rawParsingClient = new ParsingClient(clientConfig)
export const parsingClient = cubeCreatorQueryLogger.wrapParsingClient(rawParsingClient)

const rawPublicClient = new ParsingClient({
  endpointUrl: env.PUBLIC_QUERY_ENDPOINT,
  fetch: customFetch,
})
export const publicClient = publicQueryLogger.wrapParsingClient(rawPublicClient)
