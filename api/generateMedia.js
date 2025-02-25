const fetch = require('node-fetch');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, media_type, aspect_ratio } = req.body;

    if (!prompt || !media_type || !aspect_ratio) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiUrl = 'https://api.lumalabs.ai/dream-machine/v1/generations';
    const payload = {
      prompt,
      aspect_ratio,
      model: media_type === 'photo' ? 'ray-1-6' : 'ray-2',
      ...(media_type === 'video' && { duration: '5s', resolution: '720p' }),
    };

    console.log("🔹 Sending request to Luma Labs API:", JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.LUMA_LABS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log("🔸 Luma Labs API Response:", JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      console.error("Luma Labs API Error:", responseData);
      return res.status(response.status).json({ error: 'Generation request failed', details: responseData });
    }

    const generationId = responseData.id;
    let generationStatus = 'pending';
    let generationResult = null;

    while (generationStatus === 'pending' || generationStatus === 'processing') {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      const statusResponse = await fetch(`${apiUrl}/${generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.LUMA_LABS_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!statusResponse.ok) {
        const errorData = await statusResponse.json();
        console.error("🔻 Error Fetching Status:", errorData);
        return res.status(statusResponse.status).json({ error: 'Failed to fetch generation status', details: errorData });
      }

      generationResult = await statusResponse.json();
      generationStatus = generationResult.state;
    }

    if (generationStatus === 'completed') {
      const mediaUrl = media_type === 'photo' ? generationResult.assets.image : generationResult.assets.video;
      return res.status(200).json({ media_url: mediaUrl });
    } else {
      console.error("🔻 Final API Error:", generationResult);
      return res.status(500).json({ error: 'Media generation failed', details: generationResult.failure_reason || "Unknown error" });
    }
  } catch (error) {
    console.error("🔻 Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
