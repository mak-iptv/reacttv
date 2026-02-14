// pages/api/xtream-proxy.js
import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge', // Përdor Edge Runtime për performancë më të mirë
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { server, username, password } = req.body;
    
    console.log('🎯 Connecting to:', server);
    
    // Metoda 1: Player API (GET)
    const playerApiUrl = `${server}/player_api.php?username=${username}&password=${password}`;
    
    // Metoda 2: GET channels
    const getApiUrl = `${server}/get.php?username=${username}&password=${password}&type=m3u_plus`;
    
    // Metoda 3: XMLTV API
    const xmltvApiUrl = `${server}/xmltv.php?username=${username}&password=${password}`;
    
    // Provo të gjitha metodat një nga një
    const methods = [
      { url: playerApiUrl, name: 'player_api' },
      { url: getApiUrl, name: 'get' },
      { url: xmltvApiUrl, name: 'xmltv' },
    ];
    
    for (const method of methods) {
      try {
        console.log(`📡 Trying ${method.name}:`, method.url);
        
        const response = await fetch(method.url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Referer': server,
            'Origin': server,
          },
          // Add timeout
          signal: AbortSignal.timeout(8000),
        });
        
        console.log(`📊 ${method.name} status:`, response.status);
        
        // Lexo response si text
        const text = await response.text();
        console.log(`📦 ${method.name} length:`, text.length);
        console.log(`📦 ${method.name} preview:`, text.substring(0, 100));
        
        // Nëse ka përmbajtje
        if (text && text.length > 10) {
          // Provo të parse si JSON
          try {
            const jsonData = JSON.parse(text);
            return res.status(200).json({
              success: true,
              method: method.name,
              data: jsonData,
              server: server
            });
          } catch {
            // Nëse nuk është JSON por ka përmbajtje, mund të jetë M3U ose XML
            return res.status(200).json({
              success: true,
              method: method.name,
              raw: text.substring(0, 1000), // Dërgo vetëm pjesën e parë
              type: text.includes('#EXTM3U') ? 'm3u' : 'unknown',
              server: server
            });
          }
        }
        
      } catch (methodError) {
        console.log(`❌ ${method.name} failed:`, methodError.message);
        continue;
      }
    }
    
    // Nëse asnjë metodë nuk funksionoi, provo me POST
    try {
      console.log('📡 Trying POST method');
      
      const postResponse = await fetch(`${server}/api/v1/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const postText = await postResponse.text();
      
      if (postText && postText.length > 0) {
        try {
          const postJson = JSON.parse(postText);
          return res.status(200).json({
            success: true,
            method: 'post',
            data: postJson
          });
        } catch {
          return res.status(200).json({
            success: true,
            method: 'post',
            raw: postText
          });
        }
      }
      
    } catch (postError) {
      console.log('❌ POST failed:', postError.message);
    }
    
    // Nëse gjithçka dështoi, provo të bësh ping serverin
    try {
      console.log('📡 Trying base URL');
      const baseResponse = await fetch(server, {
        method: 'HEAD',
      });
      
      return res.status(200).json({
        success: false,
        error: 'Server reached but no valid API response',
        status: baseResponse.status,
        server: server,
        message: 'Serveri është online por nuk kthen përgjigje të vlefshme'
      });
      
    } catch (baseError) {
      return res.status(500).json({
        success: false,
        error: 'Server unreachable',
        message: 'Nuk arrihet lidhja me serverin. Kontrollo URL-në.'
      });
    }
    
  } catch (error) {
    console.error('❌ Proxy error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Internal server error'
    });
  }
}
