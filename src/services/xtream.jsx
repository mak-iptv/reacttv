// src/services/xtream.js
import axios from 'axios';
import { STREAM_TYPES } from '../constants/iptv';

// Helper për thirrje te proxy API
const callXtreamApi = async (server, username, password, extraParams = {}) => {
  try {
    const response = await axios.get('/api/xtream', {
      params: {
        server,
        username,
        password,
        ...extraParams
      },
      timeout: 10000
    });
    return response.data;
  } catch (error) {
    console.error('XTREAM API ERROR:', error);
    throw error;
  }
};

// ================ XTREAM CODES API ================

export const verifyXtreamCredentials = async (server, username, password) => {
  try {
    const data = await callXtreamApi(server, username, password);

    if (data && data.user_info) {
      return {
        success: true,
        data
      };
    }

    return {
      success: false,
      error: 'Kredencialet e gabuara'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Gabim gjatë lidhjes me serverin'
    };
  }
};

export const xtreamLogin = verifyXtreamCredentials;

export const getXtreamServerInfo = async (server, username, password) => {
  try {
    const data = await callXtreamApi(server, username, password);
    return data || {};
  } catch (error) {
    console.error('Gabim gjatë marrjes së informacionit të serverit:', error);
    return {};
  }
};

export const getXtreamCategories = async (server, username, password, type = 'live') => {
  try {
    let action = 'get_live_categories';
    if (type === 'movie') action = 'get_vod_categories';
    if (type === 'series') action = 'get_series_categories';

    const data = await callXtreamApi(server, username, password, { action });
    return data || [];
  } catch (error) {
    console.error(`Gabim gjatë marrjes së kategorive ${type}:`, error);
    return [];
  }
};

export const getAllCategories = async (server, username, password) => {
  try {
    const [live, movies, series] = await Promise.all([
      getXtreamCategories(server, username, password, 'live'),
      getXtreamCategories(server, username, password, 'movie'),
      getXtreamCategories(server, username, password, 'series')
    ]);

    return {
      live: live || [],
      movies: movies || [],
      series: series || []
    };
  } catch (error) {
    console.error('Gabim gjatë marrjes së kategorive:', error);
    return { live: [], movies: [], series: [] };
  }
};

export const getXtreamChannels = async (server, username, password, type = 'live', categoryId = null) => {
  try {
    let action = 'get_live_streams';
    if (type === 'movie') action = 'get_vod_streams';
    if (type === 'series') action = 'get_series';

    const params = { action };
    if (categoryId) params.category_id = categoryId;

    const data = await callXtreamApi(server, username, password, params);
    return data || [];
  } catch (error) {
    console.error(`Gabim gjatë marrjes së kanaleve ${type}:`, error);
    return [];
  }
};

export const getAllContent = async (server, username, password) => {
  try {
    const [live, movies, series] = await Promise.all([
      getXtreamChannels(server, username, password, 'live'),
      getXtreamChannels(server, username, password, 'movie'),
      getXtreamChannels(server, username, password, 'series')
    ]);

    return {
      live: live || [],
      movies: movies || [],
      series: series || []
    };
  } catch (error) {
    console.error('Gabim gjatë marrjes së përmbajtjes:', error);
    return { live: [], movies: [], series: [] };
  }
};

export const getChannelInfo = async (server, username, password, streamId, type = 'live') => {
  try {
    let action = 'get_live_info';
    if (type === 'movie') action = 'get_vod_info';
    if (type === 'series') action = 'get_series_info';

    const data = await callXtreamApi(server, username, password, {
      action,
      stream_id: streamId
    });

    return data || {};
  } catch (error) {
    console.error('Gabim gjatë marrjes së informacionit të kanalit:', error);
    return {};
  }
};

export const getEPG = async (server, username, password, streamId, limit = 5) => {
  try {
    const data = await callXtreamApi(server, username, password, {
      action: 'get_short_epg',
      stream_id: streamId,
      limit
    });

    return data?.epg_listings || [];
  } catch (error) {
    console.error('Gabim gjatë marrjes së EPG:', error);
    return [];
  }
};

export const buildStreamUrl = (type, streamId, server, username, password, extension = 'm3u8') => {
  if (!streamId || !server || !username || !password) return null;

  let url = '';
  switch (type) {
    case STREAM_TYPES.LIVE:
      url = `${server}/live/${username}/${password}/${streamId}.${extension}`;
      break;
    case STREAM_TYPES.MOVIE:
      url = `${server}/movie/${username}/${password}/${streamId}.${extension}`;
      break;
    case STREAM_TYPES.SERIES:
      url = `${server}/series/${username}/${password}/${streamId}.${extension}`;
      break;
    default:
      url = `${server}/live/${username}/${password}/${streamId}.${extension}`;
  }

  return url;
};

// ================ M3U FUNCTIONS ================

export const isValidM3U = (content) => {
  if (!content || typeof content !== 'string') return false;
  return content.trim().startsWith('#EXTM3U');
};

export const parseM3U = (content) => {
  if (!isValidM3U(content)) return [];

  const lines = content.split('\n');
  const channels = [];
  let currentChannel = null;

  lines.forEach(line => {
    line = line.trim();
    if (!line) return;

    if (line.startsWith('#EXTINF:')) {
      const match = line.match(/#EXTINF:(-?\d+)(?:\s+(.*?))?,(.*)/);
      if (match) {
        const duration = parseInt(match[1]) || -1;
        const attributes = match[2] || '';
        const name = match[3] || 'Pa emër';

        currentChannel = {
          id: `m3u_${Date.now()}_${Math.random()}`,
          name,
          duration,
          tvgId: '',
          tvgName: '',
          tvgLogo: '',
          groupTitle: '',
          url: '',
          stream_url: ''
        };

        const tvgIdMatch = attributes.match(/tvg-id="([^"]*)"/);
        if (tvgIdMatch) currentChannel.tvgId = tvgIdMatch[1];

        const tvgNameMatch = attributes.match(/tvg-name="([^"]*)"/);
        if (tvgNameMatch) currentChannel.tvgName = tvgNameMatch[1];

        const tvgLogoMatch = attributes.match(/tvg-logo="([^"]*)"/);
        if (tvgLogoMatch) currentChannel.tvgLogo = tvgLogoMatch[1];

        const groupMatch = attributes.match(/group-title="([^"]*)"/);
        if (groupMatch) currentChannel.groupTitle = groupMatch[1];
      }
    } else if (!line.startsWith('#') && currentChannel) {
      currentChannel.url = line;
      currentChannel.stream_url = line;
      channels.push({ ...currentChannel });
      currentChannel = null;
    }
  });

  return channels;
};

export const fetchM3UFromUrl = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
    return data;
  } catch (error) {
    console.error('Gabim gjatë marrjes së M3U nga URL:', error);
    throw new Error('Nuk mund të merret playlist nga URL. Përdor opsionin "Nga File" për të ngarkuar playlist-in e shkarkuar.');
  }
};

export const saveM3ULocally = async (content, filename = 'playlist.m3u') => {
  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Gabim gjatë ruajtjes së M3U:', error);
    return false;
  }
};

export const groupChannelsByCategory = (channels) => {
  return channels.reduce((groups, channel) => {
    const category = channel.groupTitle || 'Pa Kategori';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(channel);
    return groups;
  }, {});
};

export const searchChannels = (channels, query) => {
  if (!query) return channels;

  const lowerQuery = query.toLowerCase();
  return channels.filter(channel =>
    channel.name?.toLowerCase().includes(lowerQuery) ||
    channel.tvgName?.toLowerCase().includes(lowerQuery) ||
    channel.groupTitle?.toLowerCase().includes(lowerQuery)
  );
};

export const testChannelUrl = async (url) => {
  try {
    const response = await fetch(url, {
      method: 'HEAD'
    });
    return response.ok;
  } catch {
    return false;
  }
};

export default {
  verifyXtreamCredentials,
  xtreamLogin,
  getXtreamServerInfo,
  getXtreamCategories,
  getAllCategories,
  getXtreamChannels,
  getAllContent,
  getChannelInfo,
  getEPG,
  buildStreamUrl,
  isValidM3U,
  parseM3U,
  fetchM3UFromUrl,
  saveM3ULocally,
  groupChannelsByCategory,
  searchChannels,
  testChannelUrl
};
