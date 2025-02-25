const { LUMA_LABS_API_KEY } = require('./config');
const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { prompt, media_type, aspect_ratio } = body;

    if (!prompt || !media_type || !aspect_ratio) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    const apiUrl = 'https://api.lumalabs.ai/dream-machine/v1/generations';

    const payload = {
      prompt,
      aspect_ratio,
      model: media_type === 'photo' ? 'ray-1-6' : 'ray-2', // Ensures valid model selection
      ...(media_type === 'video' && { duration: '5s', resolution: '720p' }),
    };

    console.log("🔹 Sending request to Luma Labs API:", JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LUMA_LABS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log("🔸 Luma Labs API Response:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error("Luma Labs API Error:", responseData);
      return {
        statusCode: response.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Generation request failed', details: responseData }),
      };
    }

    const generationId = responseData.id;

    let generationStatus = 'pending';
    let generationResult = null;

    while (generationStatus === 'pending' || generationStatus === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const statusResponse = await fetch(`${apiUrl}/${generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${LUMA_LABS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        console.error("🔻 Error Fetching Status:", errorData);
        return {
          statusCode: statusResponse.status,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Failed to fetch generation status', details: errorData }),
        };
      }

      generationResult = await statusResponse.json();
      generationStatus = generationResult.state;
    }

    if (generationStatus === 'completed') {
      const mediaUrl = media_type === 'photo' ? generationResult.assets.image : generationResult.assets.video;
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ media_url: mediaUrl }),
      };
    } else {
      console.error("🔻 Final API Error:", generationResult);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Media generation failed', details: generationResult.failure_reason || "Unknown error" }),
      };
    }
  } catch (error) {
    console.error("🔻 Server Error:", error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
    };
  }
};
