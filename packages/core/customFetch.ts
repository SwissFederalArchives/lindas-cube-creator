import nodeFetch, { Headers as NodeFetchHeaders } from 'node-fetch'

const FetchHeaders: typeof Headers = NodeFetchHeaders as any

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const customFetch = async (url: any, options: any = {}): Promise<any> => {
  const headers = new FetchHeaders(options.headers)

  if (!headers.has('accept-encoding')) {
    // Prefer gzip/deflate. Servers can still send Brotli responses, which
    // node-fetch v2 decodes; the Node runtime must have a patched Brotli decoder.
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
