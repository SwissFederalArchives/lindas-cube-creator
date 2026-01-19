import fs from 'fs'
import path from 'path'
import type { DatasetCore } from '@rdfjs/types'
import ParsingClient from 'sparql-http-client/ParsingClient'
import StreamClient from 'sparql-http-client/StreamClient'
import { parsers } from '@rdfjs/formats-common'
import $rdf from 'rdf-ext'
import { xsd, _void, rdf } from '@tpluscode/rdf-ns-builders'
import { sparql } from '@tpluscode/rdf-string'
import RdfPxParser from 'rdf-parser-px'
import TripleToQuadTransform from 'rdf-transform-triple-to-quad'
import { DELETE } from '@tpluscode/sparql-builder'
import { VALUES } from '@tpluscode/sparql-builder/expressions'
import { customFetch } from '@cube-creator/core/customFetch'
import { ex } from './namespace'
import { ccClients, mdClients } from './index'

async function removeTestGraphs(client: ParsingClient, dataset: DatasetCore) {
  const graphs = [...dataset.match(null, _void.inDataset)].map(({ subject }) => subject)

  const dropGraphs = sparql`${graphs.map(graph => sparql`DROP SILENT GRAPH ${graph};`)}`.toString()
  return client.query.update(dropGraphs)
}

async function removeRootResources(client: ParsingClient, dataset: DatasetCore) {
  const rootResources = [...dataset.match(null, rdf.type, _void.rootResource)]
    .map(quad => ({ root: quad.subject }))
  if (rootResources.length) {
    // Use a BASE so relative IRIs in fixtures are resolved consistently across SPARQL engines.
    const deleteQuery = DELETE`GRAPH ?g { ?s ?p ?o }`
      .WHERE`
        GRAPH ?g {
          ${VALUES(...rootResources)}

          ?root (<>|!<>)* ?s .

          ?s ?p ?o .
          FILTER (?s = ?root || isblank(?s))
        }
      `
      .build()

    const queryWithBase = `BASE <${ex.DUMMY.value}>\n${deleteQuery}`
    await client.query.update(queryWithBase)
  }
}

const insertTestData = async (pathName: string, { parsingClient, streamClient }: { parsingClient: ParsingClient; streamClient: StreamClient }) => {
  const file = fs.createReadStream(path.resolve(process.cwd(), pathName))
  const stream = parsers.import('application/trig', file)

  if (stream) {
    const ds = await $rdf.dataset().import(stream)
    await removeTestGraphs(parsingClient, ds)
    await removeRootResources(parsingClient, ds)
    await streamClient.store.post(ds.toStream())
  }
}

export const insertTestProject = async () => {
  await insertTestData('fuseki/sample-ubd.trig', ccClients)
  await insertTestData('fuseki/sample-px.trig', ccClients)
}

export const insertTestDimensions = () => {
  return insertTestData('fuseki/shared-dimensions.trig', mdClients)
}

export const insertTestHierarchies = () => {
  return insertTestData('fuseki/hierarchies.trig', mdClients)
}

export const insertPxCube = () => {
  const client = new StreamClient({
    endpointUrl: process.env.PX_CUBE_QUERY_ENDPOINT!,
    storeUrl: process.env.PX_CUBE_GRAPH_ENDPOINT!,
    // Ensure gzip/deflate handling and proper Headers support in tests.
    fetch: customFetch,
  })

  const pxStream = fs.createReadStream(path.resolve(__dirname, '../../../fuseki/px-x-0703010000_103.px'))
  const parser = new RdfPxParser({
    baseIRI: process.env.PX_CUBE_BASE!,
    encoding: 'iso-8859-15',
    metadata: [{
      titles: 'Jahr',
      datatype: xsd.gYear.value,
    }],
    observer: 'http://example.org/observer',
  })

  const pxCubeStream = parser.import(pxStream)
    .pipe(new TripleToQuadTransform($rdf.namedNode(process.env.PX_CUBE_GRAPH!)))

  return client.store.put(pxCubeStream)
}
