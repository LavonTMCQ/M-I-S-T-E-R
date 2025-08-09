import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    
    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'Address parameter required'
      }, { status: 400 });
    }
    
    console.log('📊 [SERVER] Fetching Strike Finance positions for:', address.substring(0, 20) + '...');
    
    // Call Strike Finance directly from server-side (no CORS issues)
    const response = await fetch(`https://app.strikefinance.org/api/perpetuals/getPositions?address=${encodeURIComponent(address)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MISTER-Trading-Platform/1.0'
      }
    });
    
    if (!response.ok) {
      console.error('❌ [SERVER] Strike Finance API error:', response.status, response.statusText);
      return NextResponse.json({
        success: false,
        error: `Strike Finance API error: ${response.status}`,
        data: []
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('✅ [SERVER] Strike Finance response received, positions count:', Array.isArray(data) ? data.length : 0);
    
    return NextResponse.json({
      success: true,
      data: data || []
    });
    
  } catch (error) {
    console.error('❌ [SERVER] Strike Finance proxy error:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      data: []
    }, { status: 500 });
  }
}