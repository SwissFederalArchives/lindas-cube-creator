import $rdf from 'rdf-ext'

export const graphDbCbd = $rdf.namedNode('http://www.ontotext.com/describe/outgoing')

export function applyDescribeEngine<T extends { FROM: (graph: any) => T }>(
  query: T,
  engine?: string | null,
): T
export function applyDescribeEngine<T extends { query?: { FROM: (graph: any) => any } }>(
  query: T,
  engine?: string | null,
): T
export function applyDescribeEngine(query: any, engine?: string | null): any {
  if (engine !== 'graphdb') {
    return query
  }
  if (!query) {
    return query
  }
  if (typeof query.FROM === 'function') {
    return query.FROM(graphDbCbd)
  }
  if (query.query && typeof query.query.FROM === 'function') {
    query.query = query.query.FROM(graphDbCbd)
  }
  return query
}
