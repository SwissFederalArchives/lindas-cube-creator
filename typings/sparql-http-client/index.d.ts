import type { NamedNode } from '@rdfjs/types'

// Type augmentation for sparql-http-client to support defaultGraphUri option
// This matches the runtime patch in patches/sparql-http-client+2.4.0.patch
declare module 'sparql-http-client/StreamClient' {
  namespace StreamClient {
    interface QueryOptions {
      defaultGraphUri?: Array<NamedNode> | undefined;
      namedGraphUri?: Array<NamedNode> | undefined;
    }
  }
}

declare module 'sparql-http-client/ParsingClient' {
  namespace ParsingClient {
    interface QueryOptions {
      defaultGraphUri?: Array<NamedNode> | undefined;
      namedGraphUri?: Array<NamedNode> | undefined;
    }
  }
}
