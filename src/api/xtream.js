// /api/xtream.js
import axios from "axios";

export default async function handler(req, res) {
  const {
    server,
    username,
    password,
    action,
    stream_id,
    category_id,
    limit
  } = req.query;

  if (!server || !username || !password) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    let url = `${server}/player_api.php?username=${username}&password=${password}`;

    if (action) url += `&action=${action}`;
    if (stream_id) url += `&stream_id=${stream_id}`;
    if (category_id) url += `&category_id=${category_id}`;
    if (limit) url += `&limit=${limit}`;

    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true
    });

    res.status(200).json(response.data || {});
  } catch (err) {
    console.error("XTREAM API ERROR:", err.message);
    res.status(500).json({ error: "XTREAM_PROXY_ERROR", message: err.message });
  }
}
