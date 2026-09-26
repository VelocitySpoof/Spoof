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
        return new Response(JSON.stringify({ error: "Upstream API error: " + komerzaRes.status }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const komerzaJson = await komerzaRes.json();
      let products = komerzaJson.data || [];

      // Extract GitHub Statuses
      let githubProducts = [];
      if (githubRes && githubRes.ok) {
        const rawText = await githubRes.text();
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
            console.error("Failed to parse extracted catalog JSON:", jsonErr);
          }
        }
      }

      // Helper function for flexible string matching
      const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Merge Statuses using Exact ID -> Clean Name -> Partial Match
      products = products.map(kp => {
        const kpCleanName = cleanStr(kp.name);

        // Find match in GitHub payload
        const match = githubProducts.find(gp => {
          if (gp.id && kp.id && gp.id === kp.id) return true;

          const gpCleanName = cleanStr(gp.name);
          if (gpCleanName && kpCleanName) {
            return gpCleanName === kpCleanName || gpCleanName.includes(kpCleanName) || kpCleanName.includes(gpCleanName);
          }
          return false;
        });

        return {
          ...kp,
          detectionStatus: match ? (match.detectionStatus || match.detectionStatusLabel || 'undetected') : 'undetected'
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
