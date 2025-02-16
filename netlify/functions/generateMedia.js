const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const mediaType = body.mediaType || 'photo';
    const endpoint = mediaType === 'photo'
      ? 'https://api.lumalabs.ai/generate-image'
      : 'https://api.lumalabs.ai/generate-video';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer luma-8903d2f1-a33a-42a7-af34-9d2288e4432b-2d31e03a-1e0f-4e4a-9908-6342b0766b72',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

