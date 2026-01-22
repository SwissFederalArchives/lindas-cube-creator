import type { NamedNode, Quad } from '@rdfjs/types'
import { DESCRIBE } from '@tpluscode/sparql-builder'
import { ParsingClient } from 'sparql-http-client/ParsingClient'
import { applyDescribeEngine } from '@cube-creator/core/describe'

interface DescribeResource {
  resourceId: NamedNode
  client: ParsingClient
  graph?: NamedNode
  engine?: string | null
}

export async function describeResource({ resourceId, client, graph, engine }: DescribeResource): Promise<Quad[]> {
  const describe = applyDescribeEngine(DESCRIBE`${resourceId}`, engine)

  if (graph) {
    return describe.FROM(graph).execute(client.query)
  }

  return describe.execute(client.query)
}
