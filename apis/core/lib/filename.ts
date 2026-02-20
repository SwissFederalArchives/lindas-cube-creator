import { createHash } from 'crypto'

export function toSafeFilename(filename: string): string {
  const normalized = filename.normalize('NFC')

  if (isAsciiPrintable(normalized)) {
    return normalized
  }

  const { base, ext } = splitFilename(normalized)
  const safeBase = toAsciiSegment(base) || 'file'
  const safeExt = toAsciiExtension(ext)
  const hash = shortHash(normalized)

  const withHash = `${safeBase}-${hash}`

  return safeExt ? `${withHash}.${safeExt}` : withHash
}

export function isAsciiPrintable(value: string): boolean {
  return /^[\x20-\x7E]+$/.test(value)
}

function splitFilename(filename: string): { base: string; ext: string } {
  const lastDot = filename.lastIndexOf('.')

  if (lastDot <= 0 || lastDot === filename.length - 1) {
    return { base: filename, ext: '' }
  }

  return {
    base: filename.slice(0, lastDot),
    ext: filename.slice(lastDot + 1),
  }
}

function toAsciiSegment(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toAsciiExtension(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '')
    .toLowerCase()
}

function shortHash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 8)
}
