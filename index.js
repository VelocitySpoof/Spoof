export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();

    // 1. Environment variables from your Worker settings/secrets
    const STORE_ID = env.KOMERZA_STORE_ID;
    const API_KEY = env.KOMERZA_API_KEY;

    // 2. Data source URLs
    const KOMERZA_URL = `https://api.komerza.com/stores/${STORE_ID}/products/all`;
    const GITHUB_PAYLOAD_URL = "https://raw.githubusercontent.com/VelocitySpoof/Spoof/refs/heads/main/payload.txt";

    try {
      // Execute Komerza API and GitHub Raw fetches concurrently
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
        }).catch(() => null) // Fallback if GitHub request fails
      ]);

      // --- Handle Komerza Response ---
      if (!komerzaRes.ok) {
        return new Response(JSON.stringify({ error: "Upstream API error: " + komerzaRes.status }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const komerzaJson = await komerzaRes.json();
      let products = komerzaJson.data || [];

      // --- Handle GitHub Status Payload Extraction ---
      let statusMap = new Map();

      if (githubRes && githubRes.ok) {
        const rawText = await githubRes.text();
        const catalogMatch = rawText.match(/"catalog":\s*(\[\s*\{[\s\S]*?\}\s*\])\s*,\s*"pinned"/);

        if (catalogMatch && catalogMatch[1]) {
          try {
            const catalogData = JSON.parse(catalogMatch[1]);
            
            // Unpack nested sections/products and build a status map by ID and Name
            catalogData.forEach(entry => {
              if (entry.sections && Array.isArray(entry.sections)) {
                entry.sections.forEach(section => {
                  if (section.products && Array.isArray(section.products)) {
                    section.products.forEach(p => {
                      const status = p.detectionStatus || p.detectionStatusLabel || 'undetected';
                      if (p.id) statusMap.set(p.id, status);
                      if (p.name) statusMap.set(p.name.toLowerCase().trim(), status);
                    });
                  }
                });
              }
            });
          } catch (jsonErr) {
            console.error("Failed to parse extracted catalog JSON:", jsonErr);
          }
        }
      }

      // --- Merge GitHub Detection Status into Komerza Products ---
      products = products.map(p => {
        const status = statusMap.get(p.id) || statusMap.get((p.name || '').toLowerCase().trim()) || 'undetected';
        return {
          ...p,
          detectionStatus: status
        };
      });

      // --- Server-side Search Filtering ---
      if (q) {
        products = products.filter(p => (p.name || '').toLowerCase().includes(q));
      }

      // --- Return Response ---
      return new Response(JSON.stringify(products), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
