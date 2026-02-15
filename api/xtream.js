// /pages/api/xtream.js
export default async function handler(req, res) {
  try {
    const { server, username, password } = req.query;

    if (!server || !username || !password) {
      return res.status(400).json({ error: 'Mungojnë kredencialet' });
    }

    // Funksion ndihmës për të marrë të dhëna nga Xtream API
    const fetchCategory = async (action) => {
      try {
        const url = `${server}/player_api.php?username=${username}&password=${password}&action=${action}`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (!response.ok) return [];
        return await response.json();
      } catch (err) {
        console.error(`Gabim gjatë marrjes së ${action}:`, err);
        return [];
      }
    };

    // Merr Live TV, Movies, Series
    const liveChannels = await fetchCategory('get_live_streams');
    const movies = await fetchCategory('get_vod_streams');
    const series = await fetchCategory('get_series');

    // Funksion për të standardizuar stream-et me URL të sakta
    const formatStream = (ch, type) => {
      let url;
      if (type === 'live') url = `${server}/live/${username}/${password}/${ch.stream_id}.m3u8`;
      else if (type === 'movie') url = `${server}/movie/${username}/${password}/${ch.stream_id}.m3u8`;
      else if (type === 'series') url = `${server}/series/${username}/${password}/${ch.series_id}.m3u8`;

      return {
        id: ch.stream_id || ch.series_id || ch.id,
        name: ch.name,
        category: ch.category || type,
        logo: ch.stream_icon || '',
        type,
        url
      };
    };

    const streams = [
      ...liveChannels.map(ch => formatStream(ch, 'live')),
      ...movies.map(ch => formatStream(ch, 'movie')),
      ...series.map(ch => formatStream(ch, 'series')),
    ];

    res.status(200).json({ streams });

  } catch (err) {
    console.error('Gabim i përgjithshëm në Xtream API:', err);
    res.status(500).json({ error: 'Gabim serveri' });
  }
}
