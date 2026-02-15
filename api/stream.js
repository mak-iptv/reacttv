export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const headers = {};

    // Forward Range header (shumë e rëndësishme për video streaming)
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    // Forward User-Agent nëse duhet (nga server side lejohet)
    headers["User-Agent"] =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      return res.status(response.status).send("Upstream error");
    }

    // ===== CORS HEADERS =====
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Range");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Length, Content-Range"
    );

    // ===== CONTENT HEADERS =====
    const contentType = response.headers.get("content-type");
    const contentLength = response.headers.get("content-length");
    const contentRange = response.headers.get("content-range");

    if (contentType) res.setHeader("Content-Type", contentType);
    if (contentLength) res.setHeader("Content-Length", contentLength);
    if (contentRange) res.setHeader("Content-Range", contentRange);

    // ===== STATUS CODE (206 për partial content) =====
    res.status(response.status);

    // ===== STREAM DIRECT (pa e ngarkuar komplet në memory) =====
    const reader = response.body.getReader();

    const pump = async () => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      await pump();
    };

    await pump();

  } catch (error) {
    console.error("Proxy stream error:", error);
    res.status(500).send("Stream proxy error");
  }
}
