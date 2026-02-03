import type { Context } from 'barnard59-core'
import type { Quad } from '@rdfjs/types'
import $rdf from 'rdf-ext'
import through2 from 'through2'

export default function forceGraph(this: Pick<Context, 'variables'>, graphIri?: string) {
  const targetGraph = graphIri || this.variables.get('target-graph')
  const graphTerm = targetGraph ? $rdf.namedNode(targetGraph) : $rdf.defaultGraph()

  return through2.obj(function (quad: Quad, _enc, cb) {
    cb(null, $rdf.quad(quad.subject, quad.predicate, quad.object, graphTerm))
  })
}
