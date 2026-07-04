import axios from 'axios';

export default async function handler(req, res) {
  const { slug } = req.query;
  
  try {
    // Decode the URL-encoded title
    const title = decodeURIComponent(slug);
    
    console.log(`🔍 Searching for hymn: "${title}"`);
    
    // Search for the hymn by title using your PUBLIC backend endpoint
    const response = await axios.get(
      `https://zuca-backend-iw9p.onrender.com/api/public/hymns?limit=5000`
    );
    
    const hymns = response.data.hymns || [];
    
    // Find exact match (case-insensitive)
    const found = hymns.find(h => 
      h.title.toLowerCase() === title.toLowerCase()
    );
    
    if (!found) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head><title>Hymn Not Found</title></head>
          <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>🙏 Hymn Not Found</h1>
            <p>The hymn "${title}" doesn't exist in our collection.</p>
            <p><a href="https://zetechcatholicaction.com/hymns">Browse all hymns</a></p>
          </body>
        </html>
      `);
    }
    
    // Fetch full lyrics
    const detailResponse = await axios.get(
      `https://zuca-backend-iw9p.onrender.com/api/public/hymns/${found.id}`
    );
    
    const hymn = detailResponse.data.hymn || detailResponse.data;
    
    // Clean lyrics
    let lyrics = hymn.lyrics || 'Lyrics not available';
    lyrics = lyrics.replace(/<[^>]*>/g, '');
    lyrics = lyrics.replace(/\\n/g, '\n');
    
    const lyricsHtml = lyrics.split('\n')
      .map(line => line.trim())
      .filter(line => line)
      .join('<br/>');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${hymn.title} - Hymn Lyrics | Zuca Catholic Action</title>
  <meta name="description" content="${hymn.title} - Catholic hymn lyrics. ${hymn.reference || ''}" />
  <meta property="og:title" content="${hymn.title} - Hymn Lyrics" />
  <meta property="og:url" content="https://zetechcatholicaction.com/hymn/${slug}" />
  <link rel="canonical" href="https://zetechcatholicaction.com/hymn/${slug}" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; background: #f8f5f0; color: #1a1a2e; }
    .container { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    h1 { color: #1a1a2e; font-size: 2rem; margin-bottom: 8px; text-align: center; }
    .reference { text-align: center; color: #666; font-size: 0.95rem; margin-bottom: 30px; }
    .lyrics { font-size: 1.15rem; line-height: 2; white-space: pre-wrap; font-family: 'Georgia', serif; color: #2d2d3f; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 0.85rem; border-top: 1px solid #eee; padding-top: 20px; }
    .footer a { color: #8b1a1a; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${hymn.title}</h1>
    ${hymn.reference ? `<p class="reference">📖 ${hymn.reference}</p>` : ''}
    <div class="lyrics">${lyricsHtml}</div>
    <div class="footer">
      <p>🙏 <a href="https://zetechcatholicaction.com">ZUCA Catholic Action</a></p>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Server error');
  }
}