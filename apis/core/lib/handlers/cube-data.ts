import error from 'http-errors'
import { protectedResource } from '@hydrofoil/labyrinth/resource'
import asyncMiddleware from 'middleware-async'
import $rdf from 'rdf-ext'
import env from '@cube-creator/core/env'
import { describeResource } from '../domain/queries/cube-data'
import { parsingClient, publicClient } from '../query-client'

export const get = protectedResource(asyncMiddleware(async (req, res, next) => {
  const resourceUri = req.query.resource
  if (!resourceUri || typeof resourceUri !== 'string') {
    return next(new error.BadRequest("Missing 'resource' query parameter"))
  }
  // Validate URI format
  if (!resourceUri.startsWith('http://') && !resourceUri.startsWith('https://')) {
    return next(new error.BadRequest('Invalid resource URI format'))
  }

  const graph = req.hydra.term
  const resourceId = $rdf.namedNode(resourceUri)

  let params
  if (req.query.sharedTerm === 'true') {
    params = { resourceId, client: publicClient, engine: env.maybe.PUBLIC_STORE_ENGINE }
  } else {
    params = { graph, resourceId, client: parsingClient, engine: env.maybe.STORE_ENGINE }
  }

  const quads = await describeResource(params)

  return res.dataset($rdf.dataset(quads))
}))
