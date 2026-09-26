export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();

    const STORE_ID = env.KOMERZA_STORE_ID;
    const API_KEY = env.KOMERZA_API_KEY;

    const KOMERZA_URL = `https://api.komerza.com/stores/${STORE_ID}/products/all`;
    const GITHUB_PAYLOAD_URL = "https://raw.githubusercontent.com/VelocitySpoof/Spoof/refs/heads/main/payload.txt";

    try {
      const [komerzaRes, githubRes] = await Promise.all([
        fetch(KOMERZA_URL, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'MyStorefront/1.0',
            'Accept': 'application/json'
          }
        }),
        fetch(GITHUB_PAYLOAD_URL, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }).catch(() => null)
      ]);

      if (!komerzaRes.ok) {
        return new Response(JSON.stringify({ error: "Komerza API error: " + komerzaRes.status }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const komerzaJson = await komerzaRes.json();
      let products = komerzaJson.data || [];

      // Extract GitHub Statuses
      let githubProducts = [];

      if (githubRes && githubRes.ok) {
        let rawText = await githubRes.text();

        // 1. Unescape escaped slashes if present in Next.js stream
        if (rawText.includes('\\"catalog\\"')) {
          rawText = rawText.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }

        // 2. Try Regex Extraction
        const catalogMatch = rawText.match(/"catalog":\s*(\[\s*\{[\s\S]*?\}\s*\])\s*,\s*"pinned"/);

        if (catalogMatch && catalogMatch[1]) {
          try {
            const catalogData = JSON.parse(catalogMatch[1]);
            catalogData.forEach(entry => {
              if (entry.sections && Array.isArray(entry.sections)) {
                entry.sections.forEach(section => {
                  if (section.products && Array.isArray(section.products)) {
                    githubProducts.push(...section.products);
                  }
                });
              }
            });
          } catch (jsonErr) {
            console.error("Regex extracted string failed JSON.parse:", jsonErr);
          }
        } else {
          // Fallback: Check if the github file is pure standard JSON array
          try {
            const parsedDirect = JSON.parse(rawText);
            if (Array.isArray(parsedDirect)) {
              githubProducts = parsedDirect;
            }
          } catch (e) {
            console.error("Payload is neither Next.js catalog stream nor pure JSON array.");
          }
        }
      }

      // String Normalizer (Removes spaces, symbols, lowercase)
      const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Merge Statuses
      products = products.map(kp => {
        const kpClean = cleanStr(kp.name);

        const match = githubProducts.find(gp => {
          // Direct ID match
          if (gp.id && kp.id && gp.id === kp.id) return true;

          const gpClean = cleanStr(gp.name);
          if (!gpClean || !kpClean) return false;

          // Name similarity / containment checks
          return gpClean === kpClean || gpClean.includes(kpClean) || kpClean.includes(gpClean);
        });

        // Determine raw detection status string
        let detectedStatus = 'undetected';
        if (match) {
          detectedStatus = match.detectionStatus || match.detectionStatusLabel || match.status || 'undetected';
        }

        return {
          ...kp,
          detectionStatus: detectedStatus
        };
      });

      if (q) {
        products = products.filter(p => (p.name || '').toLowerCase().includes(q));
      }

      return new Response(JSON.stringify(products), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
