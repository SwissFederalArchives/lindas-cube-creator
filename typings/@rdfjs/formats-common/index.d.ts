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
