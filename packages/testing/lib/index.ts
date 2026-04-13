import StreamClient from 'sparql-http-client/StreamClient'
import ParsingClient from 'sparql-http-client/ParsingClient'
import { customFetch } from '@cube-creator/core/customFetch'

const endpoints = (db: 'cube-creator' | 'shared-dimensions') => {
  if (db === 'cube-creator') {
    return {
      updateUrl: process.env.STORE_UPDATE_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/update`,
      endpointUrl: process.env.STORE_QUERY_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/query`,
      storeUrl: process.env.STORE_GRAPH_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/data`,
    }
  }

  return {
    updateUrl: process.env.MANAGED_DIMENSIONS_STORE_UPDATE_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/update`,
    endpointUrl: process.env.MANAGED_DIMENSIONS_STORE_QUERY_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/query`,
    storeUrl: process.env.MANAGED_DIMENSIONS_STORE_GRAPH_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/data`,
  }
}

// Use customFetch to ensure gzip/deflate handling and proper Headers support in tests.
export const ccClients = {
  parsingClient: new ParsingClient({ ...endpoints('cube-creator'), fetch: customFetch }),
  streamClient: new StreamClient({ ...endpoints('cube-creator'), fetch: customFetch }),
}

export const mdClients = {
  parsingClient: new ParsingClient({ ...endpoints('shared-dimensions'), fetch: customFetch }),
  streamClient: new StreamClient({ ...endpoints('shared-dimensions'), fetch: customFetch }),
}
