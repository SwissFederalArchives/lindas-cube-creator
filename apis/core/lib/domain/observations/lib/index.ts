import type { Term } from '@rdfjs/types'
import CubeQuery from 'rdf-cube-view-query'
import { Source } from 'rdf-cube-view-query/lib/Source'
import { View } from 'rdf-cube-view-query/lib/View'
import { Cube } from 'rdf-cube-view-query/lib/Cube'
import env from '@cube-creator/core/env'
import * as ns from '@cube-creator/core/namespace'
import clownface, { AnyPointer, GraphPointer } from 'clownface'
import { Collection, CollectionMixin, IriTemplate } from '@rdfine/hydra'
import { cc } from '@cube-creator/core/namespace'
import $rdf from 'rdf-ext'
import { hydra } from '@tpluscode/rdf-ns-builders'

export function createSource(sourceGraph: string): Source {
  return new CubeQuery.Source({
    endpointUrl: env.STORE_QUERY_ENDPOINT,
    user: env.maybe.STORE_ENDPOINTS_USERNAME,
    password: env.maybe.STORE_ENDPOINTS_PASSWORD,
    sourceGraph,
  })
}

export function populateFilters(view: View, filters: AnyPointer): void {
  filters.has(ns.view.dimension)
    .forEach(requestedFilter => {
      const cubeDimension = requestedFilter.out(ns.view.dimension).term
      const operation = requestedFilter.out(ns.view.operation).term
      const argument = requestedFilter.out(ns.view.argument).term

      const dimension = view.dimension({ cubeDimension })
      if (dimension && operation && argument) {
        view.ptr.addOut(ns.view.filter, filter => {
          filter.addOut(ns.view.dimension, dimension.ptr)
          filter.addOut(ns.view.operation, operation)
          filter.addOut(ns.view.argument, argument)
        })
      }
    })
}

export function createView(cube: Cube, pageSize: number, offset: number): View {
  const view = CubeQuery.View.fromCube(cube)
    .offset(offset)
    .limit(pageSize)

  const order = view.ptr.blankNode()
    .addOut(ns.view.dimension, view.dimensions[0].ptr)
    .addOut(ns.view.direction, ns.view.Ascending)

  view.ptr.out(ns.view.projection).addList(ns.view.orderBy, order)

  return view
}

interface HydraCollectionParams {
  template: IriTemplate
  templateParams: GraphPointer
  observations: Record<string, Term>[]
  totalItems: number
  pageSize: number
}

function pageId({ offset, page, template, ...rest }: { template: IriTemplate; templateParams: GraphPointer; page?: number; offset?: number }) {
  const templateParams = clownface({
    dataset: $rdf.dataset([...rest.templateParams.dataset]),
    term: rest.templateParams.term,
  })

  if (page) {
    templateParams.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, page)
  } else if (offset) {
    const pageIndex = Number.parseInt(templateParams.out(hydra.pageIndex).value || '1')
    if (pageIndex === 1) {
      return undefined
    }

    templateParams.deleteOut(hydra.pageIndex).addOut(hydra.pageIndex, pageIndex + offset)
  }

  return $rdf.namedNode(new URL(template.expand(templateParams), env.API_CORE_BASE).toString())
}

// Builds an optimized SPARQL query for GraphDB that avoids the N-way join explosion
// caused by placing all observation patterns in a single GRAPH block.
// The inner sub-SELECT fetches only the ORDER BY dimension with LIMIT/OFFSET so GraphDB
// can apply top-N pruning early; the outer GRAPH block then does 10 cheap point-lookups.
export function buildOptimizedObservationsQuery(viewQuery: any): string {
  const src = viewQuery.sources.array[0]
  const resultDims: any[] = viewQuery.dimensions.array.filter((d: any) => d.isResult)

  const orderBy: [any, string][] = viewQuery.result.buildOrderBy()
  const orderDimVar = orderBy.length > 0 ? orderBy[0][0].value : resultDims[0].variable.value
  const orderDir = orderBy.length > 0 ? orderBy[0][1] : 'ASC'

  const orderDim = resultDims.find((d: any) => d.variable.value === orderDimVar) ?? resultDims[0]
  const otherDims = resultDims.filter((d: any) => d !== orderDim)

  const sourceGraph = src.graph.value
  const sourceVar = src.variable.value
  const orderVar = orderDim.variable.value
  const orderPred = orderDim.property.value
  const limit = viewQuery.result.limit ?? 20
  const offset = viewQuery.result.offset ?? 0

  const selectVars = resultDims.map((d: any) => `?${d.variable.value}`).join(' ')

  const outerBlock = otherDims.length > 0
    ? `  GRAPH <${sourceGraph}> {\n` +
      otherDims.map((d: any) => `    ?${sourceVar} <${d.property.value}> ?${d.variable.value} .`).join('\n') +
      '\n  }'
    : ''

  return `SELECT ${selectVars}\nWHERE {\n  {\n    SELECT ?${sourceVar} ?${orderVar}\n    WHERE {\n      GRAPH <${sourceGraph}> {\n        ?${sourceVar} <${orderPred}> ?${orderVar} .\n      }\n    }\n    ORDER BY ${orderDir}(?${orderVar})\n    LIMIT ${limit}\n    OFFSET ${offset}\n  }${outerBlock ? `\n${outerBlock}` : ''}\n}`
}

// Counts all observations via the first result dimension — equivalent to a full scan count
// but much simpler for GraphDB to execute (single GRAPH + predicate lookup).
export function buildOptimizedCountQuery(viewQuery: any): string {
  const src = viewQuery.sources.array[0]
  const resultDims: any[] = viewQuery.dimensions.array.filter((d: any) => d.isResult)

  const orderDim = resultDims[0]
  const sourceGraph = src.graph.value
  const sourceVar = src.variable.value
  const orderDimVar = orderDim.variable.value
  const orderDimPred = orderDim.property.value

  return `SELECT (COUNT(?${sourceVar}) AS ?count)\nWHERE {\n  GRAPH <${sourceGraph}> {\n    ?${sourceVar} <${orderDimPred}> ?${orderDimVar} .\n  }\n}`
}

export function mapObservationRows(rows: any[], viewQuery: any): Record<string, Term>[] {
  const columns: [any, any][] = viewQuery.dimensions.array
    .filter((d: any) => d.isResult)
    .map((d: any) => [d.variable, d.property])

  return rows.map((row: any) => {
    const output: Record<string, Term> = {}
    for (const [variable, property] of columns) {
      if (row[variable.value]) {
        output[property.value] = row[variable.value]
      }
    }
    return output
  })
}

export function createHydraCollection({ templateParams, template, observations, totalItems, pageSize }: HydraCollectionParams): Collection {
  const collectionId = template.expand(
    clownface({ dataset: $rdf.dataset() }).blankNode()
      .addOut(cc.cube, templateParams.out(cc.cube))
      .addOut(cc.cubeGraph, templateParams.out(cc.cubeGraph)),
  )

  const collectionPointer = clownface({ dataset: $rdf.dataset() })
    .namedNode(new URL(collectionId, env.API_CORE_BASE).toString())

  const lastPage = Math.ceil(totalItems / pageSize)

  return new CollectionMixin.Class(collectionPointer, {
    member: observations,
    totalItems,
    view: {
      types: [hydra.PartialCollectionView],
      id: pageId({ template, templateParams }),
      first: pageId({ template, templateParams, page: 1 }),
      next: pageId({ template, templateParams, offset: 1 }),
      previous: pageId({ template, templateParams, offset: -1 }),
      last: pageId({ template, templateParams, page: lastPage }),
    },
  }) as any
}
