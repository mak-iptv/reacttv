// app/api/xtream/route.js
import { NextResponse } from 'next/server';

export async function GET(request) {
  console.log('🎯 Xtream API GET called');
  
  try {
    // Merr parametrat nga URL
    const { searchParams } = new URL(request.url);
    const server = searchParams.get('server');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    const action = searchParams.get('action') || 'user_info';
    const stream_id = searchParams.get('stream_id');
    const category_id = searchParams.get('category_id');
    const limit = searchParams.get('limit');

    console.log('📦 Request params:', { 
      server: server?.substring(0, 30) + '...', 
      username, 
      action,
      hasPassword: !!password 
    });

    // Validim
    if (!server || !username || !password) {
      return NextResponse.json(
        { error: 'Parametrat server, username dhe password janë të detyrueshëm' },
        { status: 400 }
      );
    }

    // Pastro URL-në e serverit
    let baseUrl = server.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    // Ndërto URL-në e API-së Xtream
    let xtreamUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    // Shto action nëse ka
    if (action && action !== 'user_info') {
      xtreamUrl += `&action=${encodeURIComponent(action)}`;
      
      // Shto parametra shtesë
      if (stream_id) xtreamUrl += `&stream_id=${encodeURIComponent(stream_id)}`;
      if (category_id) xtreamUrl += `&category_id=${encodeURIComponent(category_id)}`;
      if (limit) xtreamUrl += `&limit=${encodeURIComponent(limit)}`;
    }

    console.log('🔄 Calling Xtream API:', xtreamUrl.replace(password, '***'));

    // Thirr API-në Xtream
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(xtreamUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': baseUrl,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('📡 Xtream response status:', response.status);

    // Lexo përgjigjen
    const text = await response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Serveri nuk kthen përgjigje');
    }

    // Provo të parse si JSON
    try {
      const data = JSON.parse(text);
      console.log('✅ JSON response received');
      
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    } catch (parseError) {
      console.log('⚠️ Response is not JSON');
      
      // Nëse nuk është JSON, ktheje si raw
      return NextResponse.json({
        success: true,
        raw: text.substring(0, 1000),
        format: text.includes('#EXTM3U') ? 'm3u' : 'unknown'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

  } catch (error) {
    console.error('❌ Xtream API error:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Gabim gjatë lidhjes me serverin',
        details: error.name === 'AbortError' ? 'Timeout' : undefined
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

// Për POST requests (nëse nevojitet)
export async function POST(request) {
  return GET(request);
}

// Për OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
