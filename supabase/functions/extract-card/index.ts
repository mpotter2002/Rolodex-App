const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const scanSchema = {
  name: 'structured_contact_scan',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      primary: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          title: { type: 'string' },
          company: { type: 'string' },
          phone: { type: 'string' },
          email: { type: 'string' },
          website: { type: 'string' },
          address: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['name', 'title', 'company', 'phone', 'email', 'website', 'address', 'notes'],
      },
      candidates: {
        type: 'object',
        additionalProperties: false,
        properties: {
          names: { type: 'array', items: { type: 'string' } },
          titles: { type: 'array', items: { type: 'string' } },
          companies: { type: 'array', items: { type: 'string' } },
          phones: { type: 'array', items: { type: 'string' } },
          emails: { type: 'array', items: { type: 'string' } },
          websites: { type: 'array', items: { type: 'string' } },
          addresses: { type: 'array', items: { type: 'string' } },
          notes: { type: 'array', items: { type: 'string' } },
        },
        required: ['names', 'titles', 'companies', 'phones', 'emails', 'websites', 'addresses', 'notes'],
      },
      multipleDetected: { type: 'boolean' },
      needsReview: { type: 'boolean' },
    },
    required: ['primary', 'candidates', 'multipleDetected', 'needsReview'],
  },
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const openAiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY is not configured.' }, 500);
  }

  let payload: { rawText?: string; imageDataUrl?: string | null };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const rawText = (payload.rawText || '').trim();
  const imageDataUrl = payload.imageDataUrl?.trim() || '';

  if (!rawText && !imageDataUrl) {
    return jsonResponse({ error: 'rawText or imageDataUrl is required.' }, 400);
  }

  const prompt = [
    'You extract structured contact information from business cards.',
    'Use both the OCR text and the image when available.',
    'If OCR missed fields, recover them from the image if they are legible.',
    'If multiple people, emails, phones, or websites appear, include them in candidate arrays.',
    'Choose the best single primary contact for the primary object, but preserve alternates in candidates.',
    'Infer company from a professional email domain only when it is strongly supported.',
    'Return JSON only.',
    '',
    'OCR text:',
    rawText || '(empty)',
  ].join('\n');

  const content: Array<Record<string, unknown>> = [
    { type: 'input_text', text: prompt },
  ];

  if (imageDataUrl) {
    content.push({
      type: 'input_image',
      image_url: imageDataUrl,
      detail: 'high',
    });
  }

  const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'user',
          content,
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          ...scanSchema,
        },
      },
    }),
  });

  const responseJson = await openAiResponse.json();

  if (!openAiResponse.ok) {
    return jsonResponse(
      { error: responseJson?.error?.message || 'OpenAI request failed.' },
      openAiResponse.status,
    );
  }

  const outputText = responseJson?.output_text;
  if (!outputText) {
    return jsonResponse({ error: 'Model returned no structured output.' }, 502);
  }

  try {
    return jsonResponse(JSON.parse(outputText));
  } catch {
    return jsonResponse({ error: 'Structured output could not be parsed.' }, 502);
  }
});
