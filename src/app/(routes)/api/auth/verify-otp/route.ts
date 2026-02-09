import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { otp } = await request.json()
    console.log(`OTP Verify : ${otp}`);
    return NextResponse.json(
      { message: 'Login successful' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}