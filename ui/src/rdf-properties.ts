import $rdf from '@rdf-esm/dataset'
import dataModel from '@rdf-esm/data-model'
import type { Quad } from '@rdfjs/types'
import { shrink as _shrink } from '@lindas/rdf-vocabularies/shrink'
import { expand as _expand } from '@lindas/rdf-vocabularies/expand'
import prefixes from '@lindas/rdf-vocabularies/prefixes'
import { rdf } from '@tpluscode/rdf-ns-builders'

// Create factory wrapper for vocabulary packages
const rdfEnv = { factory: dataModel } as any

export async function loadCommonProperties (): Promise<string[]> {
  const vocabs = await import('./vocabularies')

  return Object.entries(vocabs).flatMap(([prefix, factory]) => {
    const dataset = $rdf.dataset((factory as any)(rdfEnv))
    const baseIRI = (prefixes as Record<string, string>)[prefix]
    const graph = $rdf.namedNode(baseIRI)
    const properties = [...dataset.match(null, rdf.type, rdf.Property, graph)]

    return properties.map((property: Quad) => _shrink(property.subject.value))
  })
}

export function expand (uri: string): string {
  if (uri && !uri.includes(':')) return uri

  if (uri.startsWith('http://')) return uri

  try {
    return _expand(uri)
  } catch {
    return uri
  }
}

export function shrink (uri: string, customBase?: string): string {
  if (customBase && uri.startsWith(customBase)) {
    return uri.replace(customBase, '').replace(/^[/#]/, '')
  } else {
    return _shrink(uri) || uri
  }
}
