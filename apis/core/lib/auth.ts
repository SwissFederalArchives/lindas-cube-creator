import { Router, Request, Response, NextFunction, RequestHandler } from 'express'
import error from 'http-errors'
import env from '@cube-creator/core/env'
import fetch from 'node-fetch'
import { expressjwt } from 'express-jwt'
import { expressJwtSecret, GetVerificationKey } from 'jwks-rsa'
import { DELETE } from '@tpluscode/sparql-builder'
import { hydra, schema } from '@tpluscode/rdf-ns-builders'
import TermSet from '@rdfjs/term-set'
import { log, warning } from './log'
import * as idOf from './domain/identifiers'

declare module '@hydrofoil/labyrinth' {
  export interface User {
    sub: string
    name: string
    email?: string
    permissions: string[]
    groups?: string[]
  }
}

const createJwtHandler = (credentialsRequired: boolean, jwksUri: string) => expressjwt({
  // Dynamically provide a signing key
  // based on the kid in the header and
  // the signing keys provided by the JWKS endpoint.
  secret: <GetVerificationKey>expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri,
  }),

  // Validate the audience and the issuer.
  audience: env.AUTH_AUDIENCE,
  issuer: env.AUTH_ISSUER,
  algorithms: ['RS256'],
  requestProperty: 'user',
  credentialsRequired,
})

function devAuthHandler(req: Request, res: Response, next: NextFunction) {
  const sub = req.header('X-User')

  if (req.user) {
    return next()
  }

  if (sub) {
    const permissionHeader = req.headers['x-permission']
    const groupHeader = req.headers['x-group']
    const emailHeader = req.headers['x-email']

    const permissions = typeof permissionHeader === 'string' ? permissionHeader.split(',').map(s => s.trim()) : permissionHeader || []
    const groups = typeof groupHeader === 'string' ? groupHeader.split(',').map(s => s.trim()) : groupHeader || []
    const email = typeof emailHeader === 'string' ? emailHeader : (emailHeader || []).shift()

    req.user = {
      sub,
      name: sub,
      email,
      permissions,
      groups,
    }

    return next()
  }

  next(new error.Unauthorized())
}

function requireAccessMembership(req: Request, _res: Response, next: NextFunction) {
  const requiredGroup = env.maybe.AUTH_REQUIRED_GROUP

  if (!requiredGroup) {
    return next()
  }

  const user = (req.user || {}) as Partial<{
    groups: string[]
  }>
  const groups = Array.isArray(user.groups) ? user.groups : []

  if (groups.includes(requiredGroup)) {
    return next()
  }

  return next(new error.Forbidden('Access denied'))
}

function setUserId(req: Request, res: Response, next: NextFunction) {
  if (req.user && req.user.sub) {
    req.user.id = idOf.user(req.user.sub)
  }

  return next()
}

export default async () => {
  const router = Router()
  const useMockAuth = process.env.MOCK_AUTH === 'true'

  if (useMockAuth) {
    log('Skipping OIDC setup in CI/mock auth mode')
  } else if (env.has('AUTH_ISSUER')) {
    log('Setting up OIDC')
    const response = await fetch(`${env.AUTH_ISSUER}/.well-known/openid-configuration`)
    if (response.ok) {
      const oidcConfig = await response.json()
      router.use(createJwtHandler(env.production, oidcConfig.jwks_uri))
    } else {
      warning('Failed to load OpenID Connect settings from issuer')
    }
  }

  if (!env.production) {
    log('Enabling dev authentication backdoor')
    router.use(devAuthHandler)
  }

  router.use(requireAccessMembership).use(setUserId).use(updateUserResource())

  return router
}

function updateUserResource(): RequestHandler {
  const users = new TermSet()

  return (req, res, next) => {
    if (req.user?.id && !users.has(req.user.id)) {
      const { id, name, sub } = req.user
      users.add(id)

      req.once('end', () => {
        DELETE`
          GRAPH ${id} {
            ${id} ${schema.name} ?name .
          }
        `.INSERT`
          GRAPH ${id} {
            ${id} ${schema.name} "${name || sub}"; a ${schema.Person} , ${hydra.Resource} .
          }
        `.WHERE`
            OPTIONAL {
              GRAPH ${id} {
                ${id} ${schema.name} ?name .
              }
            }
        `.execute(req.labyrinth.sparql.query)
          .catch(warning)
      })
    }
    next()
  }
}
