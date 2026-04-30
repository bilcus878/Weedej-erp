// ─── Accounting Export Job Processor ─────────────────────────────────────────
// Orchestrates data fetching, rendering and file storage for every export format.
// Synchronous — runs inline in the API route. Records job in DB for history.

import path from 'path'
import fs from 'fs/promises'
import { prisma } from '@/lib/prisma'
import { fetchDocuments } from './normalizer'
import { buildCombinedCsv, buildAccountingCsv } from './renderers/csv'
import { buildAccountingXlsx } from './renderers/xlsx'
import { buildAccountingZip } from './renderers/zip'
import { buildPohodaXml } from './adapters/pohoda'
import { buildMoneyS3Xml } from './adapters/money-s3'
import { buildGenericCsv } from './adapters/generic-csv'
import type { ExportParams, DocType, CompanyInfo } from './types'

// ─── Storage root for export files ────────────────────────────────────────────

const EXPORT_STORAGE = process.env.ACCOUNTING_EXPORT_PATH
  ?? path.join(process.cwd(), 'storage', 'accounting-exports')

// ─── Format metadata ──────────────────────────────────────────────────────────

interface FormatMeta {
  fileName: (from: string, to: string) => string
  mimeType: string
}

const FORMAT_META: Record<string, FormatMeta> = {
  csv:         { fileName: (f, t) => `ucetni_export_${f}_${t}.csv`,         mimeType: 'text/csv; charset=utf-8' },
  xlsx:        { fileName: (f, t) => `ucetni_export_${f}_${t}.xlsx`,        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  zip:         { fileName: (f, t) => `ucetni_export_${f}_${t}.zip`,         mimeType: 'application/zip' },
  pohoda_xml:  { fileName: (f, t) => `pohoda_export_${f}_${t}.xml`,         mimeType: 'application/xml' },
  money_xml:   { fileName: (f, t) => `money_s3_export_${f}_${t}.xml`,       mimeType: 'application/xml' },
  generic_csv: { fileName: (f, t) => `generic_export_${f}_${t}.csv`,        mimeType: 'text/csv; charset=utf-8' },
}

// ─── Get company info from settings ───────────────────────────────────────────

async function getCompanyInfo(): Promise<CompanyInfo> {
  const s = await prisma.settings.findUnique({ where: { id: 'default' } })
  return {
    name:        s?.companyName ?? '',
    ico:         s?.ico         ?? '',
    dic:         s?.dic         ?? '',
    address:     s?.address     ?? '',
    bankAccount: s?.bankAccount ?? '',
  }
}

// ─── Core processor ───────────────────────────────────────────────────────────

export async function processExport(
  params: ExportParams,
  userId: string,
  userName: string,
): Promise<string> {
  const dateFrom = params.dateFrom.toISOString().slice(0, 10)
  const dateTo   = params.dateTo.toISOString().slice(0, 10)
  const meta     = FORMAT_META[params.format]

  if (!meta) throw new Error(`Unknown export format: ${params.format}`)

  // Create job record (status: processing)
  const job = await prisma.accountingExportJob.create({
    data: {
      createdBy:     userId,
      createdByName: userName,
      dateFrom:      params.dateFrom,
      dateTo:        params.dateTo,
      documentTypes: JSON.stringify(params.documentTypes),
      exportFormat:  params.format,
      status:        'processing',
    },
  })

  try {
    // Fetch and normalize data
    const docs    = await fetchDocuments(params)
    const company = await getCompanyInfo()
    const rowCount = [...docs.values()].reduce((s, v) => s + v.length, 0)

    // Render
    let buffer: Buffer

    switch (params.format) {
      case 'csv':
        buffer = buildCombinedCsv(docs)
        break
      case 'xlsx':
        buffer = await buildAccountingXlsx(docs, dateFrom, dateTo)
        break
      case 'zip':
        buffer = await buildAccountingZip(docs, params)
        break
      case 'pohoda_xml':
        buffer = buildPohodaXml(docs, company, dateFrom, dateTo)
        break
      case 'money_xml':
        buffer = buildMoneyS3Xml(docs, company, dateFrom, dateTo)
        break
      case 'generic_csv':
        buffer = buildGenericCsv(docs)
        break
      default:
        throw new Error(`Unsupported format: ${params.format}`)
    }

    // Write file to disk
    const fileName    = meta.fileName(dateFrom, dateTo)
    const relPath     = path.join(job.id, fileName)
    const fullPath    = path.join(EXPORT_STORAGE, relPath)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, buffer)

    // Update job record to completed
    await prisma.accountingExportJob.update({
      where: { id: job.id },
      data: {
        status:      'completed',
        fileName,
        filePath:    relPath,
        fileMimeType: meta.mimeType,
        fileSize:    buffer.length,
        rowCount,
        completedAt: new Date(),
        expiresAt:   new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    })

    return job.id

  } catch (err) {
    await prisma.accountingExportJob.update({
      where: { id: job.id },
      data:  { status: 'failed', errorMessage: String(err) },
    })
    throw err
  }
}

// ─── Read export file from disk ───────────────────────────────────────────────

export async function readExportFile(jobId: string): Promise<{
  buffer:   Buffer
  fileName: string
  mimeType: string
} | null> {
  const job = await prisma.accountingExportJob.findUnique({ where: { id: jobId } })
  if (!job || job.status !== 'completed' || !job.filePath || !job.fileName) return null

  try {
    const fullPath = path.join(EXPORT_STORAGE, job.filePath)
    const buffer   = await fs.readFile(fullPath)
    return { buffer, fileName: job.fileName, mimeType: job.fileMimeType ?? 'application/octet-stream' }
  } catch {
    return null
  }
}
