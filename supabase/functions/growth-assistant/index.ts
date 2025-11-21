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
        systemPrompt = `You are a pediatric growth specialist AI assistant. Analyze child growth data using WHO standards and provide clear, actionable insights for parents. Focus on being supportive and informative, not alarming.`;
        userPrompt = `Analyze this child's growth data:
- Name: ${data.name}
- Age: ${data.ageMonths} months
- Gender: ${data.gender}
- Height: ${data.height} cm
- Weight: ${data.weight} kg
- BMI: ${data.bmi}

Provide a brief analysis (max 3 paragraphs) covering:
1. Overall growth assessment relative to WHO standards
2. Any notable trends or observations
3. Practical recommendations for parents`;
        break;

      case 'milestone_evaluation':
        systemPrompt = `You are a child development specialist AI. Evaluate milestone achievements and provide supportive, age-appropriate guidance to parents.`;
        userPrompt = `Evaluate these milestones for a ${data.ageMonths}-month-old child:
${data.milestones.map((m: any) => `- ${m.title}: ${m.is_achieved ? 'Achieved' : 'Not yet'}`).join('\n')}

Provide a brief evaluation (max 3 paragraphs) covering:
1. Development assessment for this age
2. Notable achievements
3. Gentle suggestions for supporting continued development`;
        break;

      case 'general_advice':
        systemPrompt = `You are a friendly parenting AI assistant with expertise in child development and nutrition for children aged 3 months to 10 years. Provide practical, evidence-based advice.`;
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
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service requires payment. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI service error');
    }

    const aiResponse = await response.json();
    const advice = aiResponse.choices?.[0]?.message?.content || 'Unable to generate advice at this time.';

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