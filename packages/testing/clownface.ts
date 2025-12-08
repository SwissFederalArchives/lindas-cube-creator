import type { BlankNode, NamedNode } from '@rdfjs/types'
import @lindas/clownface, { GraphPointer } from '@lindas/clownface'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'

export function namedNode(term: string | NamedNode): GraphPointer<NamedNode, DatasetExt> {
  return @lindas/clownface({ dataset: $rdf.dataset() }).namedNode(term)
}

export function blankNode(): GraphPointer<BlankNode, DatasetExt> {
  return @lindas/clownface({ dataset: $rdf.dataset() }).blankNode()
}
