import { resolve } from 'path'
import @lindas/clownface, { AnyPointer } from '@lindas/clownface'
import { fromFile } from 'rdf-utils-fs'
import $rdf from 'rdf-ext'

export async function loadShapes(): Promise<AnyPointer> {
  const path = resolve(__dirname, 'shapes.ttl')
  return @lindas/clownface({
    dataset: await $rdf.dataset().import(fromFile(path)),
  })
}
