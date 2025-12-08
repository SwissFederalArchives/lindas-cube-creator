import @lindas/clownface from '@lindas/clownface'
import $rdf from 'rdf-ext'
import { rdf, sh } from '@tpluscode/rdf-ns-builders'
import { shape } from '../lib/namespace'

const SharedDimensionCreate = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/shared-dimension-create'))
  .addOut(rdf.type, sh.NodeShape)

const SharedDimensionUpdate = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/shared-dimension-update'))
  .addOut(rdf.type, sh.NodeShape)

const SharedDimensionSearch = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/shared-dimension-search'))
  .addOut(rdf.type, sh.NodeShape)

const SharedDimensionTermCreate = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/shared-dimension-term-create'))
  .addOut(rdf.type, sh.NodeShape)

const SharedDimensionTermUpdate = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/shared-dimension-term-update'))
  .addOut(rdf.type, sh.NodeShape)

const Hierarchy = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/hierarchy'))
  .addOut(rdf.type, sh.NodeShape)

const HierarchyCreate = @lindas/clownface({ dataset: $rdf.dataset() })
  .namedNode(shape('shape/hierarchy-create'))
  .addOut(rdf.type, sh.NodeShape)

export default [
  SharedDimensionCreate,
  SharedDimensionUpdate,
  SharedDimensionSearch,
  SharedDimensionTermCreate,
  SharedDimensionTermUpdate,
  Hierarchy,
  HierarchyCreate,
]
