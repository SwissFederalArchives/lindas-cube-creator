import { Readable } from 'stream'
import type { DatasetCore, NamedNode } from '@rdfjs/types'
import type { RequestHandler } from 'express'
import { afterEach, describe, it } from 'mocha'
import { expect } from 'chai'
import sinon from 'sinon'
import $rdf from 'rdf-ext'
import clownface, { GraphPointer } from 'clownface'
import { schema } from '@tpluscode/rdf-ns-builders'
import { md, meta } from '@cube-creator/core/namespace'
import { get, getExternal } from '../../../lib/handlers/hierarchy'
import { patchResponseStream } from '../../../lib/middleware/canonicalRewrite'
import { parsingClient } from '../../../lib/sparql'
import env from '../../../lib/env'

function serializeHierarchy(handler: RequestHandler, hierarchy: GraphPointer<NamedNode>): Promise<DatasetCore> {
  return new Promise((resolve, reject) => {
    const req: any = {
      hydra: { resource: { clownface: async () => hierarchy } },
      dataset: async () => clownface({ dataset: $rdf.dataset() })
        .blankNode().addOut(schema.identifier, hierarchy.term).dataset,
    }
    const res: any = {
      locals: {},
      setLink: sinon.spy(),
      dataset(data: DatasetCore) {
        this.quadStream(Readable.from(data))
      },
      quadStream(stream: Readable) {
        $rdf.dataset().import(stream).then(resolve, reject)
      },
    }

    patchResponseStream(req, res, error => {
      if (error) return reject(error)
      handler(req, res, reject)
    })
  })
}

describe('@cube-creator/shared-dimensions-api/lib/handlers/hierarchy', () => {
  afterEach(() => sinon.restore())

  for (const [name, handler] of [['direct', get], ['proxy', getExternal]] as const) {
    it(`preserves canonical roots in the ${name} response while rewriting API resources`, async () => {
      const hierarchy = clownface({ dataset: $rdf.dataset() })
        .namedNode(`${env.MANAGED_DIMENSIONS_BASE}dimension/hierarchy/pfas`)
      const dimension = $rdf.namedNode(`${env.MANAGED_DIMENSIONS_BASE}dimension/pfas`)
      const root = $rdf.namedNode(`${dimension.value}/all`)
      const externalRoot = $rdf.namedNode('https://example.com/root')
      hierarchy
        .addOut(schema.name, 'PFAS')
        .addOut(md.sharedDimension, dimension)
        .addOut(meta.hierarchyRoot, [root, externalRoot])

      sinon.stub(parsingClient.query, 'construct').resolves([...hierarchy.dataset])

      const response = await serializeHierarchy(handler, hierarchy)
      const apiHierarchy = $rdf.namedNode(`${env.MANAGED_DIMENSIONS_API_BASE}dimension/hierarchy/pfas`)
      const apiDimension = $rdf.namedNode(`${env.MANAGED_DIMENSIONS_API_BASE}dimension/pfas`)
      const pointer = clownface({ dataset: response }).node(apiHierarchy)

      expect(pointer.out(meta.hierarchyRoot).terms).to.deep.equal([root, externalRoot])
      expect(pointer.out(md.sharedDimension).term).to.deep.equal(apiDimension)
      expect(pointer.out(schema.name).value).to.equal('PFAS')
    })
  }
})
