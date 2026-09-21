export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    // Replace this with your actual target store API URL endpoint
    const targetUrl = `https://api.komerza.com/v1/products?q=${encodeURIComponent(q)}`;

    try {
      const apiResponse = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Cloudflare-Worker-Proxy',
          'Accept': 'application/json'
        }
      });

      const data = await apiResponse.json();

      // Return the response back to your website with CORS enabled
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
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
