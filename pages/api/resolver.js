export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { texto, imageBase64, imageType } = req.body;

  if (!texto && !imageBase64) {
    return res.status(400).json({ error: 'Falta el ejercicio' });
  }

  const SYS = `Sos un experto en la calculadora científica Casio fx-570ES PLUS con sistema Natural Display VPAM.
Dado un ejercicio de física o matemática (puede venir como texto, imagen, o ambos), devolvé una guía EXACTA de qué teclas presionar para resolverlo.
Si hay imagen, analizá su contenido y usalo para responder.

IMPORTANTE: Respondé ÚNICAMENTE con el objeto JSON. Sin explicaciones, sin texto antes ni después, sin bloques de código, sin comillas de markdown. Solo el JSON puro empezando con { y terminando con }.

Formato exacto:
{"tipo":"Categoría breve","modo_inicial":[{"tecla":"MODE","tipo":"fn"},{"tecla":"1","tipo":"numero"}],"pasos":[{"descripcion":"Descripción en español","teclas":[{"tecla":"nombre","tipo":"tipo"}],"pantalla":"opcional","nota":"opcional"}],"resultado":"opcional","consejo":"opcional"}

Tipos de tecla: numero, fn, especial, op, equals.
Para raíz cuadrada: SHIFT luego x². Para funciones inversas: SHIFT luego la función.
Solo incluí modo_inicial si se necesita cambiar el modo de la calculadora.`;

  let content;
  if (imageBase64) {
    content = [
      { type: 'text', text: texto ? `Ejercicio: ${texto}` : 'Analizá la imagen y resolvé el ejercicio.' },
      { type: 'image', source: { type: 'base64', media_type: imageType, data: imageBase64 } }
    ];
  } else {
    content = `Ejercicio: ${texto}`;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: SYS,
        messages: [{ role: 'user', content }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `API error: ${err}` });
    }

    const data = await response.json();
    const raw = (data.content || []).map(b => b.text || '').join('');
    res.status(200).json({ raw });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
