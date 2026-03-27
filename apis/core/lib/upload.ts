import os from 'os'
import express from 'express'
import * as companion from '@uppy/companion'
import env from '@cube-creator/core/env'
import bodyParser from 'body-parser'
import { nanoid } from 'nanoid'
import $rdf from 'rdf-ext'

import { sourceWithFilenameExists } from './domain/queries/csv-source'
import { isAsciiPrintable, toSafeFilename } from './filename'

const apiURL = new URL(env.API_CORE_BASE)

const app = express.Router()

app.use(bodyParser.json())

function getUploadUrls(): string[] {
  return [env.AWS_S3_ENDPOINT]
}

// Check if file already exists before companion handler
app.post('/s3/multipart', async (req, res, next) => {
  const filename = req.body.filename
  const metadata = req.body.metadata || {}
  // Validate filename
  if (!filename || typeof filename !== 'string' || filename.includes('..') || filename.includes('/')) {
    res.status(400).send({ message: 'Invalid filename' })
    return
  }

  const csvMapping = $rdf.namedNode(metadata.csvMapping)
  const isReplace = !!metadata.replace
  req.body.metadata = sanitizeMultipartMetadata(metadata, filename)

  if (!metadata.csvMapping) {
    res.status(400).send({ message: 'Missing csvMapping metadata' })
  } else if (!isReplace && await sourceWithFilenameExists(csvMapping, filename)) {
    res.status(409).send({ message: `A file named ${filename} has already been added to the project` })
  } else {
    next()
  }
})

app.use(companion.app({
  s3: {
    awsClientOptions: {
      endpoint: env.AWS_S3_ENDPOINT,
      signatureVersion: 'v4',
      region: env.maybe.AWS_REGION,
      s3ForcePathStyle: true,
    },
    key: env.AWS_ACCESS_KEY_ID,
    secret: env.AWS_SECRET_ACCESS_KEY,
    bucket: env.AWS_S3_BUCKET,
    acl: 'private',
    getKey: (req: express.Request, filename: string, metadata: Record<string, string>) => buildKey(filename, metadata),
  },
  server: {
    host: apiURL.host,
    protocol: apiURL.protocol,
    // This MUST match the path you specify in `app.use()`
    path: '/upload',
  },
  filePath: os.tmpdir(),
  secret: nanoid(30),
  uploadUrls: getUploadUrls(),
}).app)

function buildKey(filename: string, metadata: Record<string, string>) {
  const isReplace = !!metadata.replace
  const csvMappingURI = metadata.csvMapping

  const prefix = csvMappingURI.replace(env.API_CORE_BASE, '').replace(/\/+$/, '')
  const safeFilename = toSafeFilename(filename)
  const fileKey = isReplace ? addRandom(safeFilename) : safeFilename

  return `${prefix}/${fileKey}`
}

function addRandom(filename: string) {
  const parts = filename.split('.')
  const random = nanoid()

  const start = parts.slice(0, -1).join('.')
  const ext = parts.slice(-1)[0]

  return [start, random].filter(Boolean).join('-') + '.' + ext
}

function sanitizeMultipartMetadata(metadata: Record<string, any>, filename: string) {
  const sanitized: Record<string, any> = { ...metadata }

  if (typeof sanitized.name === 'string' && !isAsciiPrintable(sanitized.name)) {
    sanitized.name = filename
  }

  if (typeof sanitized.originalName === 'string' && !isAsciiPrintable(sanitized.originalName)) {
    delete sanitized.originalName
  }

  for (const [key, value] of Object.entries(sanitized)) {
    if (key === 'csvMapping' || key === 'replace') continue
    if (typeof value === 'string' && !isAsciiPrintable(value)) {
      delete sanitized[key]
    }
  }

  return sanitized
}

export default app
