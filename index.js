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

        // Fix escaped slashes from Next.js payload stream
        rawText = rawText.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

        // Extract product objects containing detectionStatus using regular expressions
        const productBlockRegex = /\{[^{}]*"name"\s*:\s*"[^"]+"[^{}]*"detectionStatus"\s*:\s*"[^"]+"[^{}]*\}/g;
        const matches = rawText.match(productBlockRegex);

        if (matches) {
          matches.forEach(block => {
            try {
              const item = JSON.parse(block);
              githubProducts.push(item);
            } catch(e) {
              // Extract via key-value fallback if full object JSON parsing fails
              const nameMatch = block.match(/"name"\s*:\s*"([^"]+)"/);
              const statusMatch = block.match(/"detectionStatus"\s*:\s*"([^"]+)"/);
              if (nameMatch && statusMatch) {
                githubProducts.push({
                  name: nameMatch[1],
                  detectionStatus: statusMatch[1]
                });
              }
            }
          });
        }
      }

      // Normalizer function to clean up product titles for comparison
      const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // Merge Komerza products with GitHub status overrides
      products = products.map(kp => {
        const kpClean = cleanStr(kp.name);

        const match = githubProducts.find(gp => {
          const gpClean = cleanStr(gp.name);
          if (!gpClean || !kpClean) return false;
          
          // Match if names are equal or contain the same core title
          return gpClean === kpClean || gpClean.includes(kpClean) || kpClean.includes(gpClean);
        });

        // Use GitHub status if matched; otherwise default to 'undetected'
        const overrideStatus = match ? match.detectionStatus : 'undetected';

        return {
          ...kp,
          detectionStatus: overrideStatus
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
