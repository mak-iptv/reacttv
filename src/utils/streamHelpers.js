// src/utils/streamHelpers.js

/**
 * Merr ID e item-it (kanal, film, serial)
 */
export const getItemId = (item) => {
  if (!item) return null;
  return item.stream_id || item.series_id || item.id || item.channel_id || item.tvgId || null;
};

/**
 * Merr emrin e item-it
 */
export const getItemName = (item) => {
  if (!item) return 'Pa emër';
  return item.name || item.title || item.channel_name || item.stream_display_name || item.tvgName || 'Pa emër';
};

/**
 * Merr URL e logos së item-it
 */
export const getItemLogo = (item) => {
  if (!item) return null;
  return item.stream_icon || item.logo || item.tvgLogo || item.channel_logo || item.tvg_logo || null;
};

/**
 * Merr kategorinë e item-it - VERSIONI I RREGULLUAR
 */
export const getItemCategory = (item, activeTab) => {
  if (!item) return 'Pa Kategori';
  
  // Për M3U - groupTitle është më i rëndësishmi!
  if (item.groupTitle && item.groupTitle.trim() !== '') {
    return item.groupTitle.trim();
  }
  
  // Për Xtream Live
  if (item.category_name && item.category_name.trim() !== '') {
    return item.category_name.trim();
  }
  
  // Për Xtream (category)
  if (item.category && item.category.trim() !== '') {
    return item.category.trim();
  }
  
  // Për seriale
  if (activeTab === 'series' && item.genre && item.genre.trim() !== '') {
    return item.genre.trim();
  }
  
  // Nëse ka tvg-group (ndonjëherë përdoret në M3U)
  if (item.tvg_group && item.tvg_group.trim() !== '') {
    return item.tvg_group.trim();
  }
  
  // Nëse ka group (variant tjetër)
  if (item.group && item.group.trim() !== '') {
    return item.group.trim();
  }
  
  return 'Pa Kategori';
};

/**
 * Merr tipin e stream-it (live, movie, series)
 */
export const getStreamType = (item, activeTab) => {
  if (!item) return 'live';
  
  if (activeTab) return activeTab;
  
  if (item.type) return item.type;
  if (item.stream_type) return item.stream_type;
  if (item.series_id) return 'series';
  if (item.container_extension) return 'movie';
  
  return 'live';
};

/**
 * Grupon item-et sipas kategorive
 */
export const groupItemsByCategory = (items, activeTab) => {
  if (!items || !Array.isArray(items)) return {};
  
  return items.reduce((groups, item) => {
    const category = getItemCategory(item, activeTab);
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});
};

/**
 * Merr të gjitha kategoritë nga items
 */
export const getAllCategories = (items, activeTab) => {
  if (!items || !Array.isArray(items)) return [];
  
  const categories = new Set();
  items.forEach(item => {
    const category = getItemCategory(item, activeTab);
    if (category && category !== 'Pa Kategori' && category.trim() !== '') {
      categories.add(category);
    }
  });
  
  return Array.from(categories).sort();
};

/**
 * Filtron items sipas kategorisë
 */
export const filterItemsByCategory = (items, category, activeTab) => {
  if (!items || !Array.isArray(items)) return [];
  if (!category || category === 'Të gjitha kanalet' || category === 'Të gjitha') return items;
  
  return items.filter(item => getItemCategory(item, activeTab) === category);
};

/**
 * Kërkon items sipas query
 */
export const searchItems = (items, query) => {
  if (!items || !Array.isArray(items)) return [];
  if (!query) return items;
  
  const searchTerm = query.toLowerCase();
  return items.filter(item => {
    const name = getItemName(item).toLowerCase();
    const category = getItemCategory(item).toLowerCase();
    return name.includes(searchTerm) || category.includes(searchTerm);
  });
};

export default {
  getItemId,
  getItemName,
  getItemLogo,
  getItemCategory,
  getStreamType,
  groupItemsByCategory,
  getAllCategories,
  filterItemsByCategory,
  searchItems
};