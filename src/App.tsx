import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

type TxType = 'expense'|'income';
type Tx = { id:string; amount:number; date:string; type:TxType; description:string };

const APP = 'Tu Control Financiero';
const PIN_KEY = 'tcf_pin';
const TX_KEY = 'tcf_tx';
const budgetKey = (yyyymm:string)=>`tcf_budget_${yyyymm}`;

function yyyymm(d=new Date()){
  const z = new Date(d.getTime() - d.getTimezoneOffset()*60000);
  return z.toISOString().slice(0,7); // YYYY-MM
}
function todayISO(){
  const z = new Date(Date.now() - new Date().getTimezoneOffset()*60000);
  return z.toISOString().slice(0,10);
}
function vibrate(ms=40){ try{ (navigator as any).vibrate?.([ms]); }catch{} }

export default function App(){
  const [pin, setPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [auth, setAuth] = useState(false);

  const month = yyyymm();
  const [budget, setBudget] = useState<number>(()=>Number(localStorage.getItem(budgetKey(month))||'0'));
  const [type, setType] = useState<TxType>('expense');
  const [amount, setAmount] = useState<number>(0);
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState(todayISO());
  const [snack, setSnack] = useState<string|null>(null);

  const txAll:Tx[] = useMemo(()=>{
    try{ return JSON.parse(localStorage.getItem(TX_KEY)||'[]'); }catch{ return [] }
  }, [auth]); // reload once auth changes

  const txMonth = txAll.filter(t=>t.date.slice(0,7)===month);
  const spent = txMonth.filter(t=>t.type==='expense').reduce((a,b)=>a+b.amount,0);
  const income = txMonth.filter(t=>t.type==='income').reduce((a,b)=>a+b.amount,0);
  const pct = budget>0? Math.min(100, Math.round(spent*100/budget)) : 0;
  const remain = Math.max(0, budget - spent);

  function saveBudget(){
    localStorage.setItem(budgetKey(month), String(budget||0));
    setSnack('Presupuesto guardado');
    vibrate(20);
  }
  function saveTx(){
    if(!amount || amount<=0){ setSnack('Monto inválido'); return; }
    const tx:Tx = { id: Math.random().toString(36).slice(2), amount, date, type, description: desc.trim() };
    const next = [...txAll, tx];
    localStorage.setItem(TX_KEY, JSON.stringify(next));
    setAmount(0); setDesc(''); setDate(todayISO());
    vibrate(30);
    // Alertas de presupuesto
    const nextSpent = (type==='expense'? spent+amount : spent);
    const nextPct = budget>0? Math.round(nextSpent*100/budget) : 0;
    if(budget>0 && type==='expense'){
      if(nextPct>=90) setSnack('⚠️ Atención: superaste el 90% del presupuesto');
      else if(nextPct>=75) setSnack('🔔 Advertencia: superaste el 75% del presupuesto');
      else setSnack('Movimiento guardado');
    }else{
      setSnack('Movimiento guardado');
    }
  }

  // Auth
  function savePIN(){
    if(newPin.length<4){ setSnack('El PIN debe tener 4 dígitos'); return; }
    localStorage.setItem(PIN_KEY, newPin);
    setNewPin(''); setAuth(true); setSnack('PIN guardado'); vibrate(30);
  }
  function login(){
    const saved = localStorage.getItem(PIN_KEY);
    if(!saved){
      setSnack('Crea un PIN para continuar');
      return;
    }
    if(saved===pin){ setAuth(true); setPin(''); vibrate(30); }
    else setSnack('PIN incorrecto');
  }

  const data = [
    { name: 'Presupuesto', Valor: budget },
    { name: 'Gastado', Valor: spent },
    { name: 'Disponible', Valor: remain },
  ];

  const snackCss:React.CSSProperties = snack?{opacity:1,transform:'translateY(0)',transition:'all .2s'}:{opacity:0,transform:'translateY(8px)',pointerEvents:'none'};

  return (
    <div className="container">
      <h1>{APP}</h1>

      {!auth ? (
        <div className="grid">
          <div className="card">
            <h2>Acceso</h2>
            {localStorage.getItem(PIN_KEY)? (
              <>
                <label>PIN</label>
                <input type="password" inputMode="numeric" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} />
                <div style={{height:10}} />
                <button className="btn primary" onClick={login}>Entrar</button>
              </>
            ): (
              <>
                <label>Crear PIN (mín. 4 dígitos)</label>
                <input type="password" inputMode="numeric" placeholder="Nuevo PIN" value={newPin} onChange={e=>setNewPin(e.target.value)} />
                <div style={{height:10}} />
                <button className="btn primary" onClick={savePIN}>Guardar PIN</button>
              </>
            )}
          </div>
          <div className="card center">
            <div className="muted">Protegé tu app con un PIN. Los datos se guardan en este dispositivo.</div>
          </div>
        </div>
      ):(
        <>
          <div className="grid">
            <div className="card">
              <h2>Presupuesto del mes ({month})</h2>
              <div className="row">
                <div>
                  <label>Monto (PYG)</label>
                  <input placeholder="Gs" inputMode="decimal" value={budget||''} onChange={e=>setBudget(Number(e.target.value||0))} />
                </div>
                <div className="right" style={{alignItems:'end'}}>
                  <button className="btn primary" onClick={saveBudget}>Guardar presupuesto</button>
                </div>
              </div>
              <div style={{height:12}} />
              <div className="row">
                <div className="card">
                  <div className="muted">Gastado:</div>
                  <div className="big">Gs {spent.toLocaleString('es-PY')}</div>
                  <div className="bar" style={{marginTop:8}}>
                    <span style={{width:`${pct}%`, background: pct>=90? 'var(--err)': pct>=75? 'var(--warn)':'var(--ok)'}}></span>
                  </div>
                  <div className="muted" style={{marginTop:6}}>{pct}% del presupuesto</div>
                </div>
                <div className="card">
                  <div className="muted">Disponible:</div>
                  <div className="big">Gs {remain.toLocaleString('es-PY')}</div>
                </div>
              </div>
            </div>
            <div className="card">
              <h2>Resumen</h2>
              <div style={{height:220}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Valor" fill="#4f7cff" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={{height:12}} />
          <div className="grid">
            <div className="card">
              <h2>Nuevo movimiento</h2>
              <div className="row">
                <div className="right" style={{justifyContent:'start', gap:8}}>
                  <span className="pill">Mes: {month}</span>
                  <button className="btn danger" onClick={()=>setType('expense')}>Gasto</button>
                  <button className="btn success" onClick={()=>setType('income')}>Ingreso</button>
                </div>
                <div />
              </div>
              <div style={{height:8}} />
              <div className="row">
                <div>
                  <label>Monto (PYG)</label>
                  <input inputMode="decimal" placeholder="Monto" value={amount||''} onChange={e=>setAmount(Number(e.target.value||0))} />
                </div>
                <div>
                  <label>Descripción</label>
                  <input placeholder="Descripción" value={desc} onChange={e=>setDesc(e.target.value)} />
                </div>
              </div>
              <div style={{height:8}} />
              <div className="row">
                <div>
                  <label>Fecha</label>
                  <input type="date" value={date} max={todayISO()} onChange={e=>setDate(e.target.value)} />
                </div>
                <div className="right" style={{alignItems:'end'}}>
                  <button className="btn primary" onClick={saveTx}>Guardar movimiento</button>
                </div>
              </div>
            </div>
            <div className="card">
              <h2>Últimos movimientos</h2>
              <div className="list">
                {txMonth.length===0 && <div className="muted">Sin movimientos este mes.</div>}
                {txMonth.slice().reverse().slice(0,20).map(t=>(
                  <div className="item" key={t.id}>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <span className="chip">{t.type==='income'?'Ingreso':'Gasto'}</span>
                      <div>{t.description || <span className="muted">(sin descripción)</span>}</div>
                    </div>
                    <div style={{display:'flex',gap:12,alignItems:'center'}}>
                      <div className="muted">{t.date}</div>
                      <div style={{color:t.type==='income'?'#2ecc71':'#e74c3c',fontWeight:700}}>
                        {t.type==='income'?'+':'-'} Gs {t.amount.toLocaleString('es-PY')}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10}} className="muted">PYG neto:{' '}
                {(income-spent).toLocaleString('es-PY')}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="snack" style={snackCss} onAnimationEnd={()=>setSnack(null)}>
        {snack}
      </div>
    </div>
  )
}
