import { useState, useRef, useCallback } from 'react';
import Head from 'next/head';

const EJEMPLOS = [
  { label: '√144', value: 'Calcular la raíz cuadrada de 144' },
  { label: '3x²+5x-2=0', value: 'Resolver la ecuación cuadrática 3x² + 5x - 2 = 0' },
  { label: 'sen(45°)', value: 'Calcular sen(45°) con la calculadora en grados' },
  { label: '2³ × π', value: 'Calcular 2 elevado a la 3 multiplicado por pi' },
  { label: '72km/h→m/s', value: 'Convertir 72 km/h a metros por segundo' },
];

function tryParse(raw) {
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(s); } catch {}
  let depth = 0, start = -1;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (s[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch {}
      }
    }
  }
  return null;
}

function Key({ k }) {
  const text = k.tecla || k;
  const tipo = (k.tipo || '').toLowerCase();
  let cls = 'key';
  if (['especial', 'special'].includes(tipo)) cls += ' ksp';
  else if (['funcion', 'fn'].includes(tipo)) cls += ' kfn';
  else if (['numero', 'number'].includes(tipo)) cls += ' knum';
  else if (['operacion', 'op'].includes(tipo)) cls += ' kop';
  else if (['igual', 'equals'].includes(tipo)) cls += ' keq';
  else {
    if (/^[0-9.,]$/.test(text)) cls += ' knum';
    else if (['=', 'EXE'].includes(text)) cls += ' keq';
    else if (['SHIFT', 'ALPHA', 'MODE'].includes(text.toUpperCase())) cls += ' kfn';
    else if (['×', '÷', '+', '−', '-'].includes(text)) cls += ' kop';
    else if (['CALC', 'SOLVE', 'ANS'].includes(text.toUpperCase())) cls += ' ksp';
  }
  return <span className={cls}>{text}</span>;
}

function Result({ data }) {
  if (!data) return null;
  return (
    <div className="result-card">
      <div className="res-head">
        <span className="res-title">▶ Secuencia de teclas</span>
        <span className="res-tag">{data.tipo || '—'}</span>
      </div>
      <div className="res-body">
        {data.modo_inicial && (
          <>
            <div className="slabel">Configuración inicial</div>
            <div className="mode-row">
              {Array.isArray(data.modo_inicial)
                ? data.modo_inicial.map((k, i) => (
                    <span key={i} className="key-group">
                      {i > 0 && <span className="arr">→</span>}
                      <Key k={k} />
                    </span>
                  ))
                : <span className="muted-text">{data.modo_inicial}</span>
              }
            </div>
          </>
        )}

        <div className="slabel">Pasos</div>
        <div className="steps">
          {data.pasos.map((paso, i) => (
            <div key={i}>
              <div className="step" style={{ animationDelay: `${i * 55}ms` }}>
                <div className="snum">{i + 1}</div>
                <div className="scontent">
                  <div className="sdesc">{paso.descripcion || paso.desc}</div>
                  {paso.teclas?.length > 0 && (
                    <div className="keys-row">
                      {paso.teclas.map((k, j) => (
                        <span key={j} className="key-group">
                          {j > 0 && <span className="arr">›</span>}
                          <Key k={k} />
                        </span>
                      ))}
                    </div>
                  )}
                  {paso.pantalla && <div><span className="lcd">{paso.pantalla}</span></div>}
                  {paso.nota && <div className="notebox"><strong>Nota:</strong> {paso.nota}</div>}
                </div>
              </div>
              {i < data.pasos.length - 1 && <div className="divider" />}
            </div>
          ))}
        </div>

        {data.resultado && (
          <div className="final">
            <span>✓</span>
            <span>Resultado esperado: <strong>{data.resultado}</strong></span>
          </div>
        )}
        {data.consejo && (
          <div className="tipbox"><strong>Consejo:</strong> {data.consejo}</div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [texto, setTexto] = useState('');
  const [imgB64, setImgB64] = useState(null);
  const [imgType, setImgType] = useState(null);
  const [imgName, setImgName] = useState('');
  const [imgPreview, setImgPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  const loadImg = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target.result;
      setImgB64(url.split(',')[1]);
      setImgType(file.type);
      setImgName(file.name || 'imagen');
      setImgPreview(url);
    };
    reader.readAsDataURL(file);
  }, []);

  const removeImg = () => {
    setImgB64(null); setImgType(null);
    setImgName(''); setImgPreview(null);
  };

  const handlePaste = useCallback((e) => {
    for (const item of (e.clipboardData?.items || []))
      if (item.type.startsWith('image/')) { loadImg(item.getAsFile()); break; }
  }, [loadImg]);

  const resolver = async () => {
    if (!texto.trim() && !imgB64) return;
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('/api/resolver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, imageBase64: imgB64, imageType: imgType })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error del servidor');

      const parsed = tryParse(data.raw);
      if (parsed?.pasos) {
        setResult(parsed);
      } else {
        setError('No se pudo generar la guía. Intentá ser más específico.');
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Guía Casio 570 — Paso a Paso</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </Head>

      <div className="container" onPaste={handlePaste}>
        <header>
          <span className="badge">CASIO fx-570 ES PLUS / NATURAL-VPAM</span>
          <h1>Guía <span>paso a paso</span></h1>
          <p className="subtitle">Escribí tu ejercicio o adjuntá una foto — te digo exactamente qué teclas tocar</p>
        </header>

        <div className="input-card">
          <div className="ilabel">Tu ejercicio</div>
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) resolver(); }}
            placeholder={`Escribí el ejercicio acá (o adjuntá una foto abajo)\nEj: Resolver 3x² + 5x - 2 = 0\nEj: Calcular sen(45°) + cos(30°)`}
            rows={3}
          />

          {/* Drop zone */}
          {!imgPreview && (
            <div
              className={`drop-zone${dragOver ? ' over' : ''}`}
              onClick={() => fileRef.current.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); loadImg(e.dataTransfer.files[0]); }}
            >
              <div className="drop-icon">🖼️</div>
              <div className="drop-main"><strong>Adjuntar imagen</strong> del ejercicio</div>
              <div className="drop-hint">Click · Arrastrar · o Pegar (Ctrl+V) — JPG / PNG</div>
            </div>
          )}

          {/* Image preview */}
          {imgPreview && (
            <div className="img-preview">
              <div className="thumb-wrap">
                <img src={imgPreview} className="thumb" alt="ejercicio" />
                <button className="rm-btn" onClick={removeImg}>✕</button>
              </div>
              <div className="img-meta">
                <div className="ok">Imagen adjunta</div>
                <div className="hint">{imgName}</div>
                <div className="hint">La IA va a leer el contenido</div>
              </div>
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { loadImg(e.target.files[0]); e.target.value = ''; }}
          />

          <div className="ifoot">
            <div className="chips">
              {EJEMPLOS.map(ej => (
                <span key={ej.label} className="chip" onClick={() => setTexto(ej.value)}>
                  {ej.label}
                </span>
              ))}
            </div>
            <button className="solve-btn" onClick={resolver} disabled={loading}>
              {loading ? '...' : 'RESOLVER →'}
            </button>
          </div>
        </div>

        {loading && (
          <div className="loading">
            <div className="dots">
              <div className="dot" /><div className="dot" /><div className="dot" />
            </div>
            <span>{imgB64 ? 'Analizando imagen y ejercicio...' : 'Analizando ejercicio...'}</span>
          </div>
        )}

        {error && (
          <div className="err-box">
            <span>⚠</span><span>{error}</span>
          </div>
        )}

        {result && <Result data={result} />}

        <footer>fx-570ES PLUS · NATURAL DISPLAY · VPAM</footer>
      </div>

      <style jsx>{`
        .container {
          width: 100%; max-width: 720px;
          padding: 0 20px 60px;
          position: relative; z-index: 1;
        }
        header { padding: 40px 0 28px; display: flex; flex-direction: column; gap: 6px; }
        .badge {
          font-family: var(--mono); font-size: 11px; color: var(--acc);
          background: rgba(245,166,35,0.1); border: 1px solid rgba(245,166,35,0.25);
          padding: 4px 10px; border-radius: 4px; letter-spacing: 0.05em;
          text-transform: uppercase; display: inline-block;
        }
        h1 { font-family: var(--mono); font-size: clamp(22px,5vw,32px); font-weight: 700; line-height: 1.2; }
        h1 span { color: var(--acc); }
        .subtitle { font-size: 14px; color: var(--muted); }

        .input-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); overflow: hidden; margin-bottom: 20px;
          transition: border-color 0.2s;
        }
        .input-card:focus-within { border-color: var(--acc); }
        .ilabel {
          font-family: var(--mono); font-size: 11px; color: var(--muted);
          padding: 14px 16px 0; letter-spacing: 0.08em; text-transform: uppercase;
        }
        textarea {
          width: 100%; background: transparent; border: none; outline: none;
          color: var(--text); font-family: var(--sans); font-size: 15px;
          padding: 8px 16px 14px; resize: none; min-height: 70px; line-height: 1.6;
        }
        textarea::placeholder { color: var(--muted); }

        .drop-zone {
          margin: 0 16px 14px; border: 2px dashed var(--border);
          border-radius: 8px; padding: 16px; text-align: center;
          cursor: pointer; transition: all 0.2s; user-select: none;
        }
        .drop-zone:hover, .drop-zone.over { border-color: var(--acc); background: rgba(245,166,35,0.04); }
        .drop-icon { font-size: 22px; margin-bottom: 4px; }
        .drop-main { font-size: 13px; color: var(--muted); }
        .drop-main strong { color: var(--acc); }
        .drop-hint { font-family: var(--mono); font-size: 10px; color: var(--muted); opacity: 0.6; margin-top: 3px; }

        .img-preview {
          display: flex; margin: 0 16px 14px; padding: 10px 12px;
          background: rgba(0,0,0,0.2); border: 1px solid var(--border);
          border-radius: 8px; align-items: center; gap: 12px;
        }
        .thumb-wrap { position: relative; flex-shrink: 0; }
        .thumb { height: 64px; max-width: 150px; object-fit: cover; border-radius: 5px; border: 1px solid var(--border); display: block; }
        .rm-btn {
          position: absolute; top: -6px; right: -6px;
          width: 20px; height: 20px; background: var(--red);
          border: none; border-radius: 50%; color: white;
          font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;
        }
        .img-meta { display: flex; flex-direction: column; gap: 3px; }
        .ok { color: var(--green); font-size: 13px; font-weight: 500; }
        .hint { font-family: var(--mono); font-size: 10px; color: var(--muted); }

        .ifoot {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; border-top: 1px solid var(--border);
          background: rgba(0,0,0,0.2); gap: 8px; flex-wrap: wrap;
        }
        .chips { display: flex; gap: 5px; flex-wrap: wrap; }
        .chip {
          font-family: var(--mono); font-size: 11px; color: var(--muted);
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 4px; padding: 3px 8px; cursor: pointer; transition: all 0.15s;
        }
        .chip:hover { color: var(--acc); border-color: var(--acc); }

        .solve-btn {
          background: var(--acc); color: #0d0f14; border: none;
          border-radius: 7px; padding: 10px 22px;
          font-family: var(--mono); font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s; white-space: nowrap;
        }
        .solve-btn:hover:not(:disabled) { background: var(--acc2); transform: translateY(-1px); }
        .solve-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        .loading {
          display: flex; align-items: center; gap: 10px;
          padding: 18px 0; font-size: 14px; color: var(--muted);
        }
        .dots { display: flex; gap: 5px; }
        .dot {
          width: 7px; height: 7px; background: var(--acc);
          border-radius: 50%; animation: boing 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes boing {
          0%,60%,100% { transform: translateY(0); opacity: 0.35; }
          30% { transform: translateY(-7px); opacity: 1; }
        }

        .err-box {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 16px; margin-bottom: 16px;
          background: rgba(232,86,58,0.1); border: 1px solid rgba(232,86,58,0.3);
          border-radius: var(--radius); color: #ff9080; font-size: 14px;
        }

        /* RESULT */
        .result-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius); overflow: hidden;
          animation: slideup 0.25s ease;
        }
        @keyframes slideup {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .res-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; border-bottom: 1px solid var(--border);
          background: rgba(245,166,35,0.05);
        }
        .res-title { font-family: var(--mono); font-size: 11px; color: var(--acc); letter-spacing: 0.08em; text-transform: uppercase; }
        .res-tag {
          font-family: var(--mono); font-size: 11px; color: var(--muted);
          background: var(--surface2); border: 1px solid var(--border);
          padding: 3px 8px; border-radius: 4px;
        }
        .res-body { padding: 20px; }

        .slabel {
          font-family: var(--mono); font-size: 10px; color: var(--muted);
          letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 10px; padding-bottom: 6px;
          border-bottom: 1px solid var(--border);
        }
        .mode-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 16px; }
        .steps { display: flex; flex-direction: column; gap: 10px; }
        .step {
          display: grid; grid-template-columns: 28px 1fr; gap: 14px;
          align-items: start; animation: fadestep 0.3s ease both;
        }
        @keyframes fadestep {
          from { opacity: 0; transform: translateX(-5px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .snum {
          width: 28px; height: 28px; background: var(--surface2);
          border: 1px solid var(--border); border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-family: var(--mono); font-size: 11px; color: var(--acc);
          flex-shrink: 0; margin-top: 2px;
        }
        .scontent { display: flex; flex-direction: column; gap: 8px; }
        .sdesc { font-size: 14px; color: var(--text); line-height: 1.6; }
        .keys-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; }
        .key-group { display: inline-flex; align-items: center; gap: 5px; }

        :global(.key) {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 36px; height: 32px; padding: 0 8px;
          background: #252a3a; border: 1px solid #3a4060;
          border-bottom: 3px solid #0d1020; border-radius: 5px;
          font-family: var(--mono); font-size: 12px; color: #c8cfe8;
          white-space: nowrap; cursor: default; user-select: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.4);
        }
        :global(.key.kfn) { background: #0f1f30; border-color: rgba(74,144,217,0.4); border-bottom-color: rgba(74,144,217,0.7); color: var(--blue); }
        :global(.key.ksp) { background: #2a1f0a; border-color: rgba(245,166,35,0.4); border-bottom-color: rgba(245,166,35,0.7); color: var(--acc); }
        :global(.key.knum) { color: #ffffff; }
        :global(.key.kop) { color: #ff9a6c; }
        :global(.key.keq) { background: #1a3020; border-color: rgba(78,203,113,0.4); border-bottom-color: rgba(78,203,113,0.7); color: var(--green); }

        .arr { color: var(--muted); font-size: 14px; }
        .lcd {
          background: #1a2a1a; border: 2px solid #2a4a2a; border-radius: 4px;
          padding: 6px 12px; font-family: var(--mono); font-size: 13px;
          color: #7acb7a; display: inline-block;
          text-shadow: 0 0 6px rgba(122,203,122,0.4);
        }
        .notebox {
          padding: 10px 14px; background: rgba(74,144,217,0.08);
          border-left: 3px solid var(--blue); border-radius: 0;
          font-size: 13px; color: #a8c8f0; line-height: 1.6;
        }
        .notebox strong { color: var(--blue); }
        .divider { height: 1px; background: var(--border); margin: 4px 0; }
        .final {
          margin-top: 14px; padding: 12px 16px;
          background: rgba(78,203,113,0.08); border: 1px solid rgba(78,203,113,0.25);
          border-radius: 7px; display: flex; align-items: center; gap: 10px;
          font-family: var(--mono); font-size: 14px; color: var(--green);
        }
        .tipbox {
          margin-top: 12px; padding: 12px 14px;
          background: rgba(74,144,217,0.08); border-left: 3px solid var(--blue);
          font-size: 13px; color: #a8c8f0; line-height: 1.6;
        }
        .tipbox strong { color: var(--blue); }
        .muted-text { font-size: 13px; color: var(--muted); }

        footer {
          text-align: center; padding: 24px 0 0;
          font-family: var(--mono); font-size: 12px; color: var(--muted);
        }
      `}</style>
    </>
  );
}
