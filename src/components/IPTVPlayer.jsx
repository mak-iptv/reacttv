import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function IPTVWebAppProDebug() {
  const videoRef = useRef(null);
  const [categories, setCategories] = useState({ live: [], movies: [], series: [] });
  const [activeTab, setActiveTab] = useState("live");
  const [channels, setChannels] = useState([]);
  const [streamUrl, setStreamUrl] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [debugMsg, setDebugMsg] = useState(null);

  // ===== PLAYER =====
  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;
    const video = videoRef.current;
    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, d) => d.fatal && setError("Stream error"));
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
    }
    return () => hls && hls.destroy();
  }, [streamUrl]);

  // ===== XTREAM LOGIN DEBUG =====
  const xtreamLogin = async (server, user, pass) => {
    setError(null);
    setDebugMsg(null);
    try {
      const url = `${server}/player_api.php?username=${user}&password=${pass}&action=get_live_streams`;
      const res = await fetch(url);
      const text = await res.text();
      setDebugMsg(text); // shfaq raw response
      const data = JSON.parse(text);
      if (!data.available_channels) {
        setError("Xtream login failed - check server/user/pass/CORS");
        return;
      }
      const live = data.available_channels.map(c => ({
        name: c.name,
        url: `${server}/live/${user}/${pass}/${c.stream_id}.m3u8`
      }));
      setCategories({ live, movies: [], series: [] });
      setChannels(live);
    } catch (err) {
      setError("Xtream login failed - check console / network");
      console.error(err);
    }
  };

  const filtered = channels.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-zinc-950 text-white grid grid-cols-12">
      <aside className="col-span-12 md:col-span-3 bg-zinc-900 p-4 space-y-3">
        <h1 className="text-xl font-bold">IPTV PRO DEBUG</h1>

        {/* XTREAM */}
        <input id="server" placeholder="Server URL" className="w-full p-2 text-black rounded" />
        <input id="user" placeholder="Username" className="w-full p-2 text-black rounded" />
        <input id="pass" placeholder="Password" type="password" className="w-full p-2 text-black rounded" />
        <button
          onClick={() => xtreamLogin(server.value, user.value, pass.value)}
          className="w-full bg-blue-600 p-2 rounded"
        >
          Login Xtream
        </button>

        {/* TABS */}
        <div className="flex gap-2">
          {['live', 'movies', 'series'].map(t => (
            <button
              key={t}
              onClick={() => {
                setActiveTab(t);
                setChannels(categories[t]);
              }}
              className={`flex-1 p-2 rounded ${activeTab===t?'bg-blue-600':'bg-zinc-800'}`}
            >{t.toUpperCase()}</button>
          ))}
        </div>

        <input
          placeholder="Search"
          className="w-full p-2 rounded text-black"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="max-h-[50vh] overflow-y-auto space-y-1">
          {filtered.map((c,i)=>(
            <button key={i} onClick={()=>setStreamUrl(c.url)} className="w-full text-left p-2 rounded bg-zinc-800 hover:bg-zinc-700">{c.name}</button>
          ))}
        </div>

        {/* DEBUG MESSAGE */}
        {debugMsg && <pre className="text-xs mt-2 p-2 bg-zinc-700 rounded overflow-x-auto">{debugMsg}</pre>}
        {error && <p className="text-red-400 mt-1">{error}</p>}
      </aside>

      <main className="col-span-12 md:col-span-9 p-6">
        <video ref={videoRef} controls autoPlay className="w-full aspect-video rounded-2xl bg-black" />
      </main>
    </div>
  );
}
