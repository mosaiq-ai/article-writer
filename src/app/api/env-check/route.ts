import { NextResponse } from 'next/server'

export async function GET() {
  const envStatus = {
    'OPENAI_API_KEY': !!process.env.OPENAI_API_KEY,
    'ANTHROPIC_API_KEY': !!process.env.ANTHROPIC_API_KEY,
    'GOOGLE_AI_API_KEY': !!process.env.GOOGLE_AI_API_KEY,
  }

  // Log for debugging (without exposing actual keys)
  console.log('🔑 Environment variable status:', envStatus)
  console.log('🔑 Available env vars:', Object.keys(process.env).filter(key => 
    key.includes('API_KEY') || key.includes('OPENAI') || key.includes('ANTHROPIC') || key.includes('GOOGLE')
  ))

  return NextResponse.json(envStatus)
} 