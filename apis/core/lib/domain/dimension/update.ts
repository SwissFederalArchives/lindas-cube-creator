import type { NamedNode, Quad, Term } from '@rdfjs/types'
import clownface, { GraphPointer } from 'clownface'
import TermSet from '@rdfjs/term-set'
import $rdf from 'rdf-ext'
import { DimensionMetadataCollection, Project } from '@cube-creator/model'
import { createNoMeasureDimensionError, Error } from '@cube-creator/model/DimensionMetadata'
import { prov, rdf, schema } from '@tpluscode/rdf-ns-builders'
import env from '@cube-creator/shared-dimensions-api/lib/env'
import { cc } from '@cube-creator/core/namespace'
import { ResourceStore } from '../../ResourceStore'
import * as id from '../identifiers'
import { findProject } from '../cube-projects/queries'
import { canBeMappedToSharedDimension } from './DimensionMetadata'

interface UpdateDimensionCommand {
  metadataCollection: NamedNode
  dimensionMetadata: GraphPointer
  store: ResourceStore
}

function normalizeHierarchyProxyUrls(pointer: GraphPointer): GraphPointer {
  const quads = [...pointer.dataset].map(quad => $rdf.quad(
    quad.subject,
    quad.predicate,
    toCanonicalHierarchyTerm(quad.object),
    quad.graph,
  ))
  return clownface({ dataset: $rdf.dataset(quads) }).node(pointer.term)
}

function toCanonicalHierarchyTerm<T extends Term>(term: T): T {
  if (term.termType !== 'NamedNode') {
    return term
  }

  try {
    const url = new URL(term.value)
    const canonicalId = url.searchParams.get('id')
    if (canonicalId && url.pathname.includes('_hierarchy/proxy')) {
      return $rdf.namedNode(canonicalId) as unknown as T
    }

    if (url.pathname.startsWith('/dimension/')) {
      return $rdf.namedNode(new URL(`${url.pathname.slice(1)}${url.search}${url.hash}`, env.MANAGED_DIMENSIONS_BASE).toString()) as unknown as T
    }
  } catch {
    // Ignore non-URL values and fall back to simple base rewrite below.
  }

  if (term.value.startsWith(env.MANAGED_DIMENSIONS_API_BASE)) {
    return $rdf.namedNode(term.value.replace(env.MANAGED_DIMENSIONS_API_BASE, env.MANAGED_DIMENSIONS_BASE)) as unknown as T
  }

  return term
}

function * extractSubgraph(pointer: GraphPointer, visited = new TermSet()): Iterable<Quad> {
  if (visited.has(pointer.term)) {
    return
  }

  for (const quad of pointer.dataset.match(pointer.term)) {
    yield quad

    if (quad.object.termType === 'BlankNode') {
      visited.add(quad.object)
      for (const child of extractSubgraph(pointer.node(quad.object))) {
        yield child
      }
    }
  }
}

export async function update({
  metadataCollection,
  store,
  dimensionMetadata,
}: UpdateDimensionCommand): Promise<GraphPointer> {
  const metadata = await store.getResource<DimensionMetadataCollection>(metadataCollection)

  const dimension = metadata.updateDimension(normalizeHierarchyProxyUrls(dimensionMetadata))

  if (canBeMappedToSharedDimension(dimension) && !dimension.mappings) {
    const project = await store.getResource<Project>(await findProject({ metadataCollection: metadata }))

    const slug = dimension.id.value.substring(dimension.id.value.lastIndexOf('/') + 1)
    const dimensionMapping = store.create(id.dimensionMapping(project, slug))
    dimensionMapping
      .addOut(rdf.type, prov.Dictionary)
      .addOut(schema.about, dimension.about)
      .addOut(cc.batchMapping, $rdf.namedNode(dimensionMapping.value + '/_import-terms'))

    dimension.mappings = dimensionMapping.term
  } else if (!canBeMappedToSharedDimension(dimension) && dimension.mappings) {
    store.delete(dimension.mappings)
    dimension.mappings = undefined
  }

  if (!metadata.hasPart.some(dim => dim.isMeasureDimension)) {
    metadata.addError?.(createNoMeasureDimensionError)
  } else {
    metadata.removeError?.(Error.MissingMeasureDimension)
  }

  const dataset = $rdf.dataset([...extractSubgraph(metadata.pointer.node(dimensionMetadata.term))])
  return clownface({ dataset }).node(dimensionMetadata.term)
}

interface ClearDimensionChangedWarning {
  id: Term
  store: ResourceStore
}

export async function clearDimensionChangedWarning({ id, store }: ClearDimensionChangedWarning) {
  const collection = await store.getResource<DimensionMetadataCollection>(id)

  collection.removeError?.(Error.DimensionMappingChanged)
}
