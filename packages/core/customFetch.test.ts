import http from 'http'
import zlib from 'zlib'

import { expect } from 'chai'
import { describe, it, before, after } from 'mocha'

import { customFetch } from './customFetch'

describe('customFetch gzip handling', () => {
  let server: http.Server
  let serverPort: number

  before((done) => {
    server = http.createServer((req, res) => {
      const path = req.url || '/'

      if (path === '/valid-gzip') {
        // Valid gzip response - body is actually gzip compressed
        const body = JSON.stringify({ success: true, data: 'test' })
        const compressed = zlib.gzipSync(body)
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip',
        })
        res.end(compressed)
      } else if (path === '/invalid-gzip') {
        // Invalid gzip response - header says gzip but body is NOT compressed
        // This is the bug we're testing for
        const body = JSON.stringify({ success: true, data: 'test' })
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Encoding': 'gzip', // Header claims gzip...
        })
        res.end(body) // ...but body is plain text!
      } else if (path === '/no-encoding') {
        // No compression
        const body = JSON.stringify({ success: true, data: 'test' })
        res.writeHead(200, {
          'Content-Type': 'application/json',
        })
        res.end(body)
      } else {
        res.writeHead(404)
        res.end('Not found')
      }
    })

    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        serverPort = address.port
      }
      done()
    })
  })

  after((done) => {
    server.close(done)
  })

  it('should successfully decompress valid gzip response', async () => {
    const response = await customFetch(`http://127.0.0.1:${serverPort}/valid-gzip`)
    const data = await response.json()

    expect(data).to.deep.equal({ success: true, data: 'test' })
  })

  it('should handle response without compression', async () => {
    const response = await customFetch(`http://127.0.0.1:${serverPort}/no-encoding`)
    const data = await response.json()

    expect(data).to.deep.equal({ success: true, data: 'test' })
  })

  it('should fail when Content-Encoding: gzip but body is not compressed', async () => {
    // This test documents the expected behavior when a server returns
    // Content-Encoding: gzip but the body is NOT actually gzip compressed.
    // node-fetch should throw an error when trying to decompress invalid data.
    // This is the bug that was happening with lindas-admin-ch's xquery plugin.

    let error: Error | null = null
    try {
      const response = await customFetch(`http://127.0.0.1:${serverPort}/invalid-gzip`)
      // Try to consume the response body which will trigger decompression
      await response.text()
    } catch (e) {
      error = e as Error
    }

    // node-fetch with compress: true will attempt to decompress and fail
    // with "incorrect header check" or similar error
    expect(error).to.not.be.null
    expect(error!.message).to.include('incorrect header check')
  })
})
