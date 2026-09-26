export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();

    const STORE_ID = env.KOMERZA_STORE_ID;
    const API_KEY = env.KOMERZA_API_KEY;

    const KOMERZA_PRODUCTS_URL = `https://api.komerza.com/stores/${STORE_ID}/products/all`;
    const KOMERZA_CATEGORIES_URL = `https://api.komerza.com/stores/${STORE_ID}/categories/all`;
    const GITHUB_PAYLOAD_URL = "https://raw.githubusercontent.com/VelocitySpoof/Spoof/refs/heads/main/payload.txt";

    try {
      // 1. Fetch Products, Categories, and GitHub Payload in parallel
      const [productsRes, categoriesRes, githubRes] = await Promise.all([
        fetch(KOMERZA_PRODUCTS_URL, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'MyStorefront/1.0',
            'Accept': 'application/json'
          }
        }),
        fetch(KOMERZA_CATEGORIES_URL, {
          headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'User-Agent': 'MyStorefront/1.0',
            'Accept': 'application/json'
          }
        }).catch(() => null),
        fetch(GITHUB_PAYLOAD_URL, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        }).catch(() => null)
      ]);

      if (!productsRes.ok) {
        return new Response(JSON.stringify({ error: "Komerza Products API error: " + productsRes.status }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const productsJson = await productsRes.json();
      let products = productsJson.data || [];

      // 2. Build Category Lookup Map (id -> name)
      const categoryMap = new Map();
      if (categoriesRes && categoriesRes.ok) {
        try {
          const catJson = await categoriesRes.json();
          const categories = catJson.data || [];
          categories.forEach(cat => {
            if (cat.id && cat.name) {
              categoryMap.set(cat.id, cat.name);
            }
          });
        } catch (e) {
          console.error("Failed to parse categories JSON:", e);
        }
      }

      // 3. Extract GitHub Statuses
      let githubProducts = [];
      if (githubRes && githubRes.ok) {
        let rawText = await githubRes.text();
        rawText = rawText.replace(/\\"/g, '"').replace(/\\\\/g, '\\');

        const productBlockRegex = /\{[^{}]*"name"\s*:\s*"[^"]+"[^{}]*"detectionStatus"\s*:\s*"[^"]+"[^{}]*\}/g;
        const matches = rawText.match(productBlockRegex);

        if (matches) {
          matches.forEach(block => {
            try {
              githubProducts.push(JSON.parse(block));
            } catch(e) {
              const nameMatch = block.match(/"name"\s*:\s*"([^"]+)"/);
              const statusMatch = block.match(/"detectionStatus"\s*:\s*"([^"]+)"/);
              if (nameMatch && statusMatch) {
                githubProducts.push({ name: nameMatch[1], detectionStatus: statusMatch[1] });
              }
            }
          });
        }
      }

      const cleanStr = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      // 4. Attach Status and Category Name to Products
      products = products.map(kp => {
        const kpClean = cleanStr(kp.name);

        const match = githubProducts.find(gp => {
          const gpClean = cleanStr(gp.name);
          if (!gpClean || !kpClean) return false;
          return gpClean === kpClean || gpClean.includes(kpClean) || kpClean.includes(gpClean);
        });

        // Determine category name (check categoryId, category_id, or fallback to "Uncategorized")
        const catId = kp.categoryId || kp.category_id || (kp.category ? kp.category.id : null);
        const categoryName = categoryMap.get(catId) || (kp.category ? kp.category.name : 'Uncategorized');

        return {
          ...kp,
          categoryName: categoryName,
          detectionStatus: match ? match.detectionStatus : (kp.detectionStatus || 'undetected')
        };
      });

      if (q) {
        products = products.filter(p => (p.name || '').toLowerCase().includes(q));
      }

      // 5. Group products by Category Name
      const grouped = {};
      products.forEach(product => {
        const cat = product.categoryName || 'Uncategorized';
        if (!grouped[cat]) {
          grouped[cat] = [];
        }
        grouped[cat].push(product);
      });

      // Format response as an array of categories with product arrays
      const responsePayload = Object.keys(grouped).map(catName => ({
        categoryName: catName,
        products: grouped[catName]
      }));

      return new Response(JSON.stringify(responsePayload), {
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
