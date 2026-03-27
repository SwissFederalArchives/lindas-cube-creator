import type { BlankNode, NamedNode } from '@rdfjs/types'
import clownface, { GraphPointer } from 'clownface'
import $rdf from 'rdf-ext'
import DatasetExt from 'rdf-ext/lib/Dataset'

export function namedNode(term: string | NamedNode): GraphPointer<NamedNode, DatasetExt> {
  // Use placeholder IRI if empty string provided to avoid creating absolute IRIs with undefined base.
  const effectiveTerm = term === '' ? 'urn:test:resource' : term
  return clownface({ dataset: $rdf.dataset() }).namedNode(effectiveTerm)
}

export function blankNode(): GraphPointer<BlankNode, DatasetExt> {
  return clownface({ dataset: $rdf.dataset() }).blankNode()
}
