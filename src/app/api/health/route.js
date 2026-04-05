import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
}
