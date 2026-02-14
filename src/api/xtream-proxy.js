// app/api/xtream-proxy/route.js (ose pages/api/xtream-proxy.js)
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { server, username, password } = body;
    
    console.log('🔵 Proxy received:', { server, username });
    
    // Pastro server URL
    let baseUrl = server.trim();
    if (!baseUrl.startsWith('http')) {
      baseUrl = 'http://' + baseUrl;
    }
    
    // Xtream Codes përdor formate të ndryshme API
    // Provo formatet e ndryshme
    const endpoints = [
      `${baseUrl}/player_api.php?username=${username}&password=${password}`,
      `${baseUrl}/api/v1/authenticate?username=${username}&password=${password}`,
      `${baseUrl}/api.php?act=login&username=${username}&password=${password}`,
      `${baseUrl}/xmltv.php?username=${username}&password=${password}`,
    ];
    
    let lastError = null;
    
    // Provo çdo endpoint derisa njëri të funksionojë
    for (const url of endpoints) {
      try {
        console.log('🟡 Trying endpoint:', url);
        
        const response = await fetch(url, {
          method: 'GET', // Xtream Codes shpesh përdor GET
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 10000, // 10 sekonda timeout
        });
        
        console.log('🔵 Response status:', response.status);
        console.log('🔵 Response headers:', response.headers.get('content-type'));
        
        // Lexo si text fillimisht
        const text = await response.text();
        console.log('📦 Raw response:', text.substring(0, 200)); // Log first 200 chars
        
        // Kontrollo nëse përgjigja është HTML
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.log('⚠️ Received HTML instead of JSON');
          continue; // Provo endpoint-in tjetër
        }
        
        // Provoni të parse JSON
        try {
          const data = JSON.parse(text);
          console.log('✅ Success with endpoint:', url);
          
          // Shto CORS headers dhe kthe përgjigjen
          return NextResponse.json(data, {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          });
        } catch (parseError) {
          console.log('❌ JSON parse failed for endpoint:', url);
          lastError = parseError;
          continue; // Provo endpoint-in tjetër
        }
        
      } catch (fetchError) {
        console.log('❌ Fetch failed for endpoint:', url, fetchError.message);
        lastError = fetchError;
        continue;
      }
    }
    
    // Nëse asnjë endpoint nuk funksionoi
    console.error('❌ All endpoints failed');
    return NextResponse.json(
      { 
        error: 'Nuk u arrit të lidhet me serverin. Kontrollo URL-në dhe provo përsëri.',
        details: lastError?.message 
      },
      { 
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Për preflight requests
export async function OPTIONS() {
  return NextResponse.json(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// pages/api/xtream-proxy.js ose app/api/xtream-proxy/route.js

export default async function handler(req, res) {
  // Shto CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { server, username, password } = req.body;
    
    console.log('Connecting to:', server);
    
    // Përdor GET me query parameters (Xtream Codes shpesh përdor GET)
    const apiUrl = `${server}/player_api.php?username=${username}&password=${password}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });
    
    const data = await response.text();
    
    // Provo të parse si JSON
    try {
      const jsonData = JSON.parse(data);
      return res.status(200).json(jsonData);
    } catch {
      // Nëse nuk është JSON, ktheje si text
      return res.status(200).json({ 
        success: true, 
        raw: data,
        message: 'Non-JSON response received'
      });
    }
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: error.message,
      message: 'Failed to connect to server'
    });
  }
}
