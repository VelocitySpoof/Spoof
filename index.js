export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';

    // Replace with your actual store's upstream API endpoint
    const targetUrl = `https://api.komerza.com/v1/products${q ? '?q=' + encodeURIComponent(q) : ''}`;

    try {
      const apiResponse = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'application/json'
        }
      });

      if (!apiResponse.ok) {
        return new Response(JSON.stringify({ error: "Upstream API error: " + apiResponse.status }), {
          status: 200, // Return 200 with empty array so frontend doesn't break
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      const data = await apiResponse.json();

      return new Response(JSON.stringify(data), {
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
