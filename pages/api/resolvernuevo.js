export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { texto, imageBase64, imageType } = req.body;
  if (!texto && !imageBase64) return res.status(400).json({ error: 'Falta el ejercicio' });
  const PROMPT = `Sos un experto en la calculadora Casio fx-570ES PLUS. Dado un ejercicio de fisica o matematica, devuelve una guia EXACTA de que teclas presionar. Si hay imagen, analiza su contenido. Responde UNICAMENTE con JSON puro sin markdown: {"tipo":"categoria","modo_inicial":[{"tecla":"MODE","tipo":"fn"}],"pasos":[{"descripcion":"texto","teclas":[{"tecla":"nombre","tipo":"tipo"}],"pantalla":"opcional","nota":"opcional"}],"resultado":"opcional","consejo":"opcional"} Tipos: numero, fn, especial, op, equals.`;
  const parts = [];
  if (imageBase64) parts.push({ inlineData: { mimeType: imageType, data: imageBase64 } });
  parts.push({ text: texto ? PROMPT + ' Ejercicio: ' + texto : PROMPT + ' Analiza la imagen.' });
  try {
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + process.env.GEMINI_API_KEY;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.1, maxOutputTokens: 1500 } })
    });
    if (!response.ok) {
      const err = await response.text();
      return res.status(500).json({ error: 'Gemini error: ' + err });
    }
    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.status(200).json({ raw });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
