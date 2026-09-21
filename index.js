export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toLowerCase();

    // Store ID from your Komerza dashboard
    const STORE_ID = env.KOMERZA_STORE_ID; // set as a Worker var/secret
    const API_KEY = env.KOMERZA_API_KEY;   // set as a Worker secret (never expose client-side)

    const targetUrl = `https://api.komerza.com/stores/${STORE_ID}/products/all`;

    try {
      const apiResponse = await fetch(targetUrl, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'User-Agent': 'MyStorefront/1.0', // required or Komerza blocks the request
          'Accept': 'application/json'
        }
      });

      if (!apiResponse.ok) {
        return new Response(JSON.stringify({ error: "Upstream API error: " + apiResponse.status }), {
          status: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const json = await apiResponse.json();
      let products = json.data || [];

      // Server-side filtering, since Komerza has no native `q` search
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
