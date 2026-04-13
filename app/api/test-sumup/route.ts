// Testovací endpoint pro SumUp API
// URL: http://localhost:3000/api/test-sumup

import { NextResponse } from 'next/server'
import axios from 'axios'

export async function GET() {
  const SUMUP_API_KEY = process.env.SUMUP_API_KEY

  console.log('Testing SumUp API...')
  console.log('API Key:', SUMUP_API_KEY?.substring(0, 20) + '...')

  const results: any = {
    apiKey: SUMUP_API_KEY ? 'Nastaven' : 'CHYBÍ!',
    tests: [],
  }

  // Test 1: /me endpoint (základní info o účtu)
  try {
    const response = await axios.get('https://api.sumup.com/v0.1/me', {
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
      },
    })
    results.tests.push({
      endpoint: '/me',
      status: 'OK',
      data: response.data,
    })
  } catch (error: any) {
    results.tests.push({
      endpoint: '/me',
      status: 'ERROR',
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
    })
  }

  // Test 2: /me/products
  try {
    const response = await axios.get('https://api.sumup.com/v0.1/me/products', {
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
      },
    })
    results.tests.push({
      endpoint: '/me/products',
      status: 'OK',
      count: Array.isArray(response.data) ? response.data.length : 'N/A',
      data: response.data,
    })
  } catch (error: any) {
    results.tests.push({
      endpoint: '/me/products',
      status: 'ERROR',
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
    })
  }

  // Test 3: /me/transactions/history
  try {
    const response = await axios.get('https://api.sumup.com/v0.1/me/transactions/history', {
      headers: {
        'Authorization': `Bearer ${SUMUP_API_KEY}`,
      },
      params: {
        limit: 10,
      },
    })
    results.tests.push({
      endpoint: '/me/transactions/history',
      status: 'OK',
      count: Array.isArray(response.data) ? response.data.length : 'N/A',
      data: response.data,
    })
  } catch (error: any) {
    results.tests.push({
      endpoint: '/me/transactions/history',
      status: 'ERROR',
      error: error.response?.data || error.message,
      statusCode: error.response?.status,
    })
  }

  return NextResponse.json(results, { status: 200 })
}
