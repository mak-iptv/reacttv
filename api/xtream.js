// /pages/api/xtream.js
import fetch from 'node-fetch';

export default async function handler(req, res) {
  try {
    const { server, username, password } = req.query;

    if (!server || !username || !password) {
      return res.status(400).json({ error: 'Mungojnë kredencialet' });
    }

    // Funksion ndihmës për të marrë të dhëna nga Xtream API
    const fetchCategory = async (action) => {
      const url = `${server}/player_api.php?username=${username}&password=${password}&action=${action}`;
      const response = await fetch(url);
      if (!response.ok) return [];
      return await response.json();
    };

    // Merr Live TV, Movies, Series
    const liveChannels = await fetchCategory('get_live_streams');
    const movies = await fetchCategory('get_vod_streams');
    const series = await fetchCategory('get_series');

    // Funksion për të standardizuar stream-et në HLS URL
    const formatStream = (ch, type) => ({
      id: ch.stream_id || ch.series_id || ch.id,
      name: ch.name,
      category: ch.category || type,
      logo: ch.stream_icon || '',
      type,
      url: `${server}/live/${username}/${password}/${ch.stream_id || ch.series_id || ch.id}.m3u8`
    });

    const streams = [
      ...liveChannels.map(ch => formatStream(ch, 'live')),
      ...movies.map(ch => formatStream(ch, 'movie')),
      ...series.map(ch => formatStream(ch, 'series')),
    ];

    res.status(200).json({ streams });

  } catch (err) {
    console.error('Xtream API error:', err);
    res.status(500).json({ error: 'Gabim serveri' });
  }
}
