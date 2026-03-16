export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { texto, imageBase64, imageType } = req.body;
  if (!texto && !imageBase64) return res.status(400).json({ error: 'Falta el ejercicio' });

  const PROMPT = `Sos un experto en la calculadora científica Casio fx-570ES PLUS con sistema Natural Display VPAM.
Dado un ejercicio de física o matemática (puede venir como texto, imagen, o ambos), devolvé una guía EXACTA de qué teclas presionar para resolverlo.
Si hay imagen, analizá su contenido y usalo para responder.

IMPORTANTE: Respondé ÚNICAMENTE con el objeto JSON. Sin explicaciones, sin texto antes ni después, sin bloques de código, sin markdown. Solo el JSON puro empezando con { y terminando con }.

Formato exacto:
{"tipo":"Categoría breve","modo_inicial":[{"tecla":"MODE","tipo":"fn"},{"tecla":"1","tipo":"numero"}],"pasos":[{"descripcion":"Descripción en español","teclas":[{"tecla":"nombre","tipo":"tipo"}],"pantalla":"opcional","nota":"opcional"}],"resultado":"opcional","consejo":"opcional"}

Tipos de tecla: numero, fn (SHIFT/ALPHA/MODE), especial, op (operadores), equals.
Para raíz cuadrada: SHIFT luego x². Para funciones inversas: SHIFT luego la función.
Solo incluí modo_inicial si se necesita cambiar el modo de la calculadora.`;

  const parts = [];
  if (imageBase64) {
    parts.push({ inlineData: { mimeType: imageType, data: imageBase64 } });
  }
  parts.push({
    text: texto ? `${PROMPT}\n\nEjercicio: ${texto}` : `${PROMPT}\n\nAnalizá la imagen y resolvé el ejercicio.`
  });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 1500 }
      })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: `Gemini API error: ${err}` });
    }
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}});
  }
}
