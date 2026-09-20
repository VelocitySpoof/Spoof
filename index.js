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
    const query = url.searchParams.get('q') || '';

    if (!query) {
      return new Response(JSON.stringify([]), { headers: corsHeaders });
    }

    const STORE_ID = env.KOMERZA_STORE_ID; 
    const API_KEY = env.KOMERZA_API_KEY;

    try {
      const targetUrl = `https://api.komerza.com/stores/${STORE_ID}/products?q=${encodeURIComponent(query)}`;
      const response = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        }
      });

      const data = await response.json();
      return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), { 
        status: 500, 
        headers: corsHeaders 
      });
    }
  }
};
