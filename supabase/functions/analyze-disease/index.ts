import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY tidak dikonfigurasi');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Anda adalah asisten medis anak yang membantu mengidentifikasi kondisi kesehatan dari gambar. Berikan analisis dalam bahasa Indonesia dengan: 1) Kemungkinan kondisi, 2) Tingkat keparahan (ringan/sedang/serius), 3) Rekomendasi tindakan, 4) Kapan harus ke dokter. PENTING: Ini bukan diagnosis medis, selalu sarankan konsultasi dokter untuk kondisi serius.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analisis gambar ini untuk mengidentifikasi kemungkinan kondisi kesehatan anak. Berikan hasil dalam bahasa Indonesia.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: 'Batas penggunaan terlampaui, coba lagi nanti.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: 'Pembayaran diperlukan, silakan tambahkan dana.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('Gagal menganalisis gambar');
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('Tidak ada hasil analisis');
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-disease:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});