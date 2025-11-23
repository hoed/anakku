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
    const { type, data } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'growth_analysis':
        systemPrompt = `Anda adalah asisten AI spesialis pertumbuhan anak. Analisis data pertumbuhan anak menggunakan standar WHO dan berikan wawasan yang jelas dan dapat ditindaklanjuti untuk orang tua dalam bahasa Indonesia. Fokus pada memberikan dukungan dan informasi, bukan mengkhawatirkan.`;
        userPrompt = `Analisis data pertumbuhan anak ini:
- Nama: ${data.name}
- Umur: ${data.ageMonths} bulan
- Jenis Kelamin: ${data.gender}
- Tinggi: ${data.height} cm
- Berat: ${data.weight} kg
- BMI: ${data.bmi}

Berikan analisis singkat (maksimal 3 paragraf) yang mencakup:
1. Penilaian pertumbuhan keseluruhan relatif terhadap standar WHO
2. Tren atau pengamatan yang menonjol
3. Rekomendasi praktis untuk orang tua`;
        break;

      case 'milestone_evaluation':
        systemPrompt = `Anda adalah AI spesialis perkembangan anak. Evaluasi pencapaian milestone dan berikan panduan yang mendukung dan sesuai usia kepada orang tua dalam bahasa Indonesia.`;
        userPrompt = `Evaluasi milestone ini untuk anak berusia ${data.ageMonths} bulan:
${data.milestones.map((m: any) => `- ${m.title}: ${m.is_achieved ? 'Tercapai' : 'Belum tercapai'}`).join('\n')}

Berikan evaluasi singkat (maksimal 3 paragraf) yang mencakup:
1. Penilaian perkembangan untuk usia ini
2. Pencapaian yang menonjol
3. Saran lembut untuk mendukung perkembangan berkelanjutan`;
        break;

      case 'general_advice':
        systemPrompt = `Anda adalah asisten AI ramah dengan keahlian dalam perkembangan anak dan nutrisi untuk anak usia 3 bulan hingga 10 tahun. Berikan saran praktis berbasis bukti dalam bahasa Indonesia.`;
        userPrompt = data.question;
        break;

      default:
        throw new Error('Invalid request type');
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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Batas penggunaan terlampaui. Silakan coba lagi nanti.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Layanan AI memerlukan pembayaran. Silakan hubungi dukungan.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const aiResponse = await response.json();
    const advice = aiResponse.choices?.[0]?.message?.content || 'Tidak dapat menghasilkan saran saat ini.';

    return new Response(
      JSON.stringify({ advice }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in growth-assistant:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});