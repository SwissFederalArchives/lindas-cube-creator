import @lindas/clownface, { AnyPointer, GraphPointer } from '@lindas/clownface'
import $rdf from 'rdf-ext'
import { query } from '@cube-creator/core/namespace'

export function clone (collection: AnyPointer): GraphPointer {
  const cloned = @lindas/clownface({ dataset: $rdf.dataset() })
  const searchParams = collection.out(query.templateMappings)

  if (!searchParams.term) {
    return cloned.blankNode()
  }

  [...searchParams.dataset.match(searchParams.term)]
    .forEach(quad => {
      cloned.node(quad.subject).addOut(quad.predicate, quad.object)
    })

  return cloned.node(searchParams.term)
}
