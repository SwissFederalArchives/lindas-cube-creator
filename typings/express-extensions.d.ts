// Express Request extensions for cube-creator
import type { NamedNode, DatasetCore, Quad } from '@rdfjs/types'
import type { GraphPointer } from 'clownface'
import type { HydraBox } from 'hydra-box'
import type { ResourceStore } from '../apis/core/lib/ResourceStore'

declare module 'express-serve-static-core' {
  interface Request {
    // From hydra-box
    hydra: HydraBox

    // From auth middleware
    user?: {
      id?: NamedNode
    }

    // From resource middleware
    resourceStore: ResourceStore

    // From express-rdf-request
    parseFromMultipart(): Promise<GraphPointer<NamedNode>>
    multipartFileQuadsStreams(): AsyncIterable<{ filename: string; stream: any }>
    resource(): Promise<GraphPointer<NamedNode>>
    absoluteUrl(): URL
    dataset?(): Promise<DatasetCore<Quad>>
  }
}

// Module augmentation for sparql-http-client
declare module 'sparql-http-client/StreamClient' {
  namespace StreamClient {
    interface QueryOptions {
      defaultGraphUri?: Array<NamedNode> | undefined
      namedGraphUri?: Array<NamedNode> | undefined
    }
  }
}

declare module 'sparql-http-client/ParsingClient' {
  namespace ParsingClient {
    interface QueryOptions {
      defaultGraphUri?: Array<NamedNode> | undefined
      namedGraphUri?: Array<NamedNode> | undefined
    }
  }
}

// Module declaration for @rdfjs/formats-common
declare module '@rdfjs/formats-common' {
  import type { Stream, Quad } from '@rdfjs/types'
  import type { Readable } from 'stream'

  interface SinkMap {
    import(mediaType: string, input: Stream<Quad>): Readable | null
  }

  interface ParserMap {
    import(mediaType: string, input: Readable): Stream<Quad> | null
  }

  export const parsers: ParserMap
  export const serializers: SinkMap
}

export {}
