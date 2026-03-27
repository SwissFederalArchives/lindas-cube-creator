import nodeFetch, { Headers as NodeFetchHeaders } from 'node-fetch'

const FetchHeaders: typeof Headers = NodeFetchHeaders as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customFetch = async (url: any, options: any = {}): Promise<any> => {
  const headers = new FetchHeaders(options.headers)

  if (!headers.has('accept-encoding')) {
    // Request gzip and deflate compression (node-fetch v2 supports these)
    // Note: brotli (br) is not supported by node-fetch v2, only by native fetch
    headers.set('accept-encoding', 'gzip, deflate')
  }

  const fetchOptions: any = {
    ...options,
    headers,
    // Enable automatic decompression
    compress: true,
  }

  const response = await nodeFetch(url as any, fetchOptions)

  return response
}

// Expose Headers constructor for libraries like sparql-http-client which expect fetch.Headers
;(customFetch as any).Headers = FetchHeaders
