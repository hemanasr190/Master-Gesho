import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    const {
      prompt,
      model = 'google/gemini-2.0-flash-exp',
      aspect_ratio = '1:1',
    } = await req.json();

    if (!prompt?.trim()) {
      throw new Error('Prompt is required');
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) throw new Error('AI configuration missing');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let userId = 'anonymous';
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    console.log(`AI Image: model=${model}, aspect=${aspect_ratio}, user=${userId}`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        modalities: ['image', 'text'],
        messages: [{ role: 'user', content: prompt }],
        image_config: { aspect_ratio, image_size: '1K' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OnSpace AI: ${errorText.slice(0, 200)}`);
    }

    const data = await response.json();
    const imageDataUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageDataUrl) throw new Error('No image generated from AI');

    // Convert base64 to Uint8Array
    const base64Data = imageDataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const fileName = `${userId}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('images')
      .upload(fileName, bytes, { contentType: 'image/png', cacheControl: '3600' });

    if (uploadError) throw new Error(`Storage: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);

    if (userId !== 'anonymous') {
      await supabase.from('ai_generated_images').insert({
        user_id: userId,
        prompt,
        model,
        image_url: publicUrl,
        bucket_path: fileName,
        aspect_ratio,
      });
    }

    return new Response(JSON.stringify({ imageUrl: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI image error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
