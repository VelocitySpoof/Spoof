export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const query = (url.searchParams.get('q') || '').trim().toLowerCase();

    if (!query) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    const STORE_ID = env.KOMERZA_STORE_ID; 
    const API_KEY = env.KOMERZA_API_KEY;

    try {
      // Fetch all products from Komerza API
      const targetUrl = `https://api.komerza.com/stores/${STORE_ID}/products`;
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      const rawProducts = Array.isArray(data) ? data : (data.products || data.data || []);

      // Filter products locally by query string against name, title, or category
      const filteredProducts = rawProducts.filter(item => {
        const title = (item.name || item.title || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const category = (item.category || '').toLowerCase();

        return title.includes(query) || description.includes(query) || category.includes(query);
      });

      return new Response(JSON.stringify(filteredProducts), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
