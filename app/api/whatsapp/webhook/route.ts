import { NextRequest, NextResponse } from 'next/server';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'meu_token_secreto';
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || 'EAAMNNcbWwZBgBQot7Wn1OUTihDpZAKFeMMqZCrUsTUtbDRu8bZAJpZBxQIEAVFv71QD8c5z5y2fV1VDIOZArMB36j4v2XZBCL4cfszWZABt2CjB9GKFG5vyZAERjSZB1WCB6OnhCylL8apbj7gxrw7E6XXkvQRZBMSoAvbfMpEx74vMlKm0p6ceNiFNXwUAwVYAmA4jtawzsrxEfopCsFiZCxGuGkXlWE2CM6ju1jBbROkgZBZBqJGJd9gL2mNWjbZBJq7zn1WeeGPf0bEeoo9rktusufgyOAZDZD';
const PHONE_NUMBER_ID = '978403868934'; // SEU ID!

async function enviarMensagem(to: string, mensagem: string) {
  console.log('📤 Enviando:', mensagem.substring(0, 50) + '...');
  
  const url = `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`;
  const body = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: mensagem }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  console.log('📤 Status resposta:', response.status);
}

export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge);
  }
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(request: NextRequest) {
  console.log('📨 POST webhook RECEBIDO!');
  
  try {
    const body = await request.json();
    console.log('Payload:', JSON.stringify(body.entry?.[0]?.changes?.[0]?.value?.messages?.[0], null, 2));

    const mensagem = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    
    if (!mensagem?.text) {
      return NextResponse.json({ ok: true });
    }

    const from = mensagem.from;
    const texto = mensagem.text.body.toLowerCase().trim();

    let resposta = '';
    if (texto === '1' || texto.includes('serviço') || texto.includes('preço')) {
      resposta = `🪒 Nossos serviços:\n• Corte: R$ 45\n• Barba: R$ 30\n• Corte + Barba: R$ 70\n\nDigite 2 para horários.`;
    } else if (texto === '2' || texto.includes('horário')) {
      resposta = `📅 Horários amanhã (13/02):\n• 10:00\n• 10:30\n• 11:00\n• 14:00\n\nDigite o horário (ex: "10:00").`;
    } else {
      resposta = `Olá! 👋 Barbearia Carlos\n\nDigite:\n1️⃣ Serviços e preços\n2️⃣ Horários disponíveis`;
    }

    await enviarMensagem(from, resposta);
    console.log('✅ Resposta enviada para:', from);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('💥 Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}