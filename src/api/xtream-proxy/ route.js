// app/api/xtream-proxy/route.js
import { NextResponse } from 'next/server';

// Handle POST requests - për login
export async function POST(request) {
  console.log('🎯 API POST called');
  
  try {
    // Lexo body-në e request-it
    const body = await request.json();
    const { server, username, password } = body;
    
    console.log('📦 Received credentials:', { 
      server: server ? server.substring(0, 30) + '...' : null,
      username,
      hasPassword: !!password 
    });

    // Validim bazik
    if (!server || !username || !password) {
      return NextResponse.json(
        { error: 'Të dhënat janë të paplota' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Pastro URL-në e serverit
    let baseUrl = server.trim();
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://' + baseUrl;
    }
    
    // Hiq slash-in në fund nëse ka
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }

    console.log('🔄 Connecting to server:', baseUrl);

    // Provo të lidhesh me serverin Xtream
    try {
      // Metoda 1: Player API (GET)
      const playerApiUrl = `${baseUrl}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
      console.log('📡 Trying Player API:', playerApiUrl);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sekonda timeout

      const response = await fetch(playerApiUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': baseUrl,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📡 Response status:', response.status);
      
      // Lexo përgjigjen si text
      const responseText = await response.text();
      console.log('📦 Response length:', responseText.length);
      console.log('📦 Response preview:', responseText.substring(0, 200));

      // Kontrollo nëse përgjigja është bosh
      if (!responseText || responseText.trim().length === 0) {
        throw new Error('Serveri nuk kthen përgjigje');
      }

      // Provo të parse si JSON
      try {
        const data = JSON.parse(responseText);
        console.log('✅ Valid JSON response');
        
        // Verifiko nëse përmban të dhënat e duhura
        if (data.user_info || data.user || data.data) {
          return NextResponse.json({
            success: true,
            method: 'player_api',
            data: data,
            server: baseUrl
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }
          });
        } else {
          // Nëse ka JSON por jo strukturën e pritur
          return NextResponse.json({
            success: true,
            method: 'player_api',
            data: data,
            warning: 'Struktura e të dhënave nuk është standarde'
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          });
        }
      } catch (parseError) {
        // Nëse nuk është JSON, mund të jetë M3U ose XML
        console.log('⚠️ Response is not JSON');
        
        return NextResponse.json({
          success: true,
          method: 'player_api',
          raw: responseText.substring(0, 1000), // Dërgo vetëm pjesën e parë
          format: responseText.includes('#EXTM3U') ? 'm3u' : 'unknown',
          message: 'Serveri kthen përgjigje jo-JSON'
        }, {
          headers: {
            'Access-Control-Allow-Origin': '*',
          }
        });
      }

    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message);
      
      // Metoda 2: Provo GET API të thjeshtë
      try {
        const getApiUrl = `${baseUrl}/get.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&type=m3u_plus`;
        console.log('📡 Trying GET API:', getApiUrl);
        
        const getResponse = await fetch(getApiUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
          signal: AbortSignal.timeout(5000),
        });
        
        const getText = await getResponse.text();
        
        if (getText && getText.length > 0) {
          return NextResponse.json({
            success: true,
            method: 'get_api',
            raw: getText.substring(0, 1000),
            format: getText.includes('#EXTM3U') ? 'm3u' : 'unknown'
          }, {
            headers: {
              'Access-Control-Allow-Origin': '*',
            }
          });
        }
      } catch (getError) {
        console.log('❌ GET API failed:', getError.message);
      }
      
      // Nëse të gjitha metodat dështojnë, kthe error
      return NextResponse.json({
        success: false,
        error: 'Nuk u arrit të lidhet me serverin',
        details: fetchError.message,
        server: baseUrl,
        checks: [
          'Verifiko që serveri është online',
          'Kontrollo portin (zakonisht 8080 ose 80)',
          'Sigurohu që serveri mbështet Xtream Codes API',
          'Provo me http:// ose https://'
        ]
      }, {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      });
    }

  } catch (error) {
    console.error('❌ Internal error:', error);
    return NextResponse.json({
      success: false,
      error: 'Gabim i brendshëm i serverit',
      details: error.message
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

// Handle GET requests - për testim
export async function GET() {
  console.log('🎯 API GET called');
  
  return NextResponse.json({
    message: '✅ Xtream Proxy API është aktive',
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: {
      POST: '/api/xtream-proxy - Për login',
      GET: '/api/xtream-proxy - Për testim'
    }
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

// Handle OPTIONS requests - për CORS preflight
export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
