import type {
  ReturnRequestListItem,
  ReturnRequestDetail,
  CreateReturnInput,
  ApproveReturnInput,
  RejectReturnInput,
  ReceiveGoodsInput,
  ProcessRefundInput,
  StatusTransitionInput,
} from '../types'

const BASE = '/api/returns'

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Chyba serveru')
  return data as T
}

export async function fetchReturns(): Promise<ReturnRequestListItem[]> {
  const res = await fetch(BASE)
  return handleResponse(res)
}

export async function fetchReturnDetail(id: string): Promise<ReturnRequestDetail> {
  const res = await fetch(`${BASE}/${id}`)
  return handleResponse(res)
}

export async function createReturn(input: CreateReturnInput): Promise<ReturnRequestDetail> {
  const res = await fetch(BASE, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  return handleResponse(res)
}

export async function transitionStatus(id: string, input: StatusTransitionInput): Promise<ReturnRequestDetail> {
  const res = await fetch(`${BASE}/${id}/status`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  return handleResponse(res)
}

export async function approveReturn(id: string, input: ApproveReturnInput): Promise<ReturnRequestDetail> {
  const res = await fetch(`${BASE}/${id}/approve`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  return handleResponse(res)
}

export async function rejectReturn(id: string, input: RejectReturnInput): Promise<ReturnRequestDetail> {
  const res = await fetch(`${BASE}/${id}/reject`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  return handleResponse(res)
}

export async function receiveGoods(id: string, input: ReceiveGoodsInput): Promise<ReturnRequestDetail> {
  const res = await fetch(`${BASE}/${id}/receive-goods`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  return handleResponse(res)
}

export async function processRefund(id: string, input: ProcessRefundInput): Promise<ReturnRequestDetail> {
  const res = await fetch(`${BASE}/${id}/process-refund`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(input),
  })
  return handleResponse(res)
}

export async function updateAdminNote(id: string, adminNote: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ adminNote }),
  })
  await handleResponse(res)
}
