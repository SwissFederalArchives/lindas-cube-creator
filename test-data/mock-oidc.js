/* eslint-disable @typescript-eslint/no-var-requires, no-console */
// Mock OIDC server for CLI authentication in test environment
const http = require('http')
const crypto = require('crypto')

// Generate RSA key pair for JWT signing
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// Extract modulus and exponent from public key for JWKS
// Simple ASN.1 parsing for RSA public key
const pubKeyObj = crypto.createPublicKey(publicKey)
const jwk = pubKeyObj.export({ format: 'jwk' })

const KID = 'test-key-1'

function base64url(data) {
  return Buffer.from(data).toString('base64url')
}

function createJwt(payload) {
  const header = { alg: 'RS256', typ: 'JWT', kid: KID }
  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const signingInput = headerB64 + '.' + payloadB64
  const signature = crypto.sign('sha256', Buffer.from(signingInput), privateKey)
  return signingInput + '.' + signature.toString('base64url')
}

const PORT = 8888
const ISSUER = `http://mock-oidc:${PORT}`

const server = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json')

  if (req.url === '/.well-known/openid-configuration') {
    res.end(JSON.stringify({
      issuer: ISSUER,
      token_endpoint: ISSUER + '/token',
      jwks_uri: ISSUER + '/jwks',
      response_types_supported: ['token'],
      grant_types_supported: ['client_credentials'],
    }))
    return
  }

  if (req.url === '/jwks') {
    res.end(JSON.stringify({
      keys: [{
        kty: 'RSA',
        kid: KID,
        use: 'sig',
        alg: 'RS256',
        n: jwk.n,
        e: jwk.e,
      }],
    }))
    return
  }

  if (req.url === '/token' && req.method === 'POST') {
    const now = Math.floor(Date.now() / 1000)
    const token = createJwt({
      iss: ISSUER,
      sub: 'cli-service',
      aud: ISSUER,
      iat: now,
      exp: now + 86400,
      name: 'CLI Service',
      permissions: ['pipelines:read', 'pipelines:write'],
    })
    res.end(JSON.stringify({
      access_token: token,
      token_type: 'Bearer',
      expires_in: 86400,
    }))
    return
  }

  res.statusCode = 404
  res.end(JSON.stringify({ error: 'not_found' }))
})

server.listen(PORT, () => {
  console.log('Mock OIDC server listening on port ' + PORT)
})
