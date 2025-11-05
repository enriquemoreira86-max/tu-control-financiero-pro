import React, { useEffect, useMemo, useState } from "react";

type TxType = "expense" | "income";
type Tx = {
  id: string;
  type: TxType;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  category: string;
};

const APP = "Tu Control Financiero";
const BUDGET_KEY = (ym: string) => `budget_${ym}`;
const TX_KEY = (ym: string) => `tx_${ym}`;

function ymToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function prevYM(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextYM(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function formatPYG(n: number) {
  return n.toLocaleString("es-PY");
}

export default function App() {
  // Mes activo
  const [ym, setYm] = useState(ymToday());

  // Presupuesto y movimientos del mes
  const [budget, setBudget] = useState<number>(0);
  const [txs, setTxs] = useState<Tx[]>([]);

  // Formulario de nuevo/edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState<number | "">("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("General");

  // Cargar mes al cambiar ym
  useEffect(() => {
    const b = Number(localStorage.getItem(BUDGET_KEY(ym)) || 0);
    setBudget(b);

    const raw = localStorage.getItem(TX_KEY(ym));
    setTxs(raw ? (JSON.parse(raw) as Tx[]) : []);
    resetForm();
  }, [ym]);

  function resetForm() {
    setEditingId(null);
    setType("expense");
    setAmount("");
    setDesc("");
    setDate(new Date().toISOString().slice(0, 10));
    setCategory("General");
  }

  function saveBudget() {
    const v = Number(budget) || 0;
    localStorage.setItem(BUDGET_KEY(ym), String(v));
    setBudget(v);
  }

  function persistTx(next: Tx[]) {
    setTxs(next);
    localStorage.setItem(TX_KEY(ym), JSON.stringify(next));
  }

  function submitTx() {
    const v = typeof amount === "number" ? amount : Number(amount || 0);
    if (!v || v <= 0) return alert("Monto inválido");
    if (!date) return alert("Fecha inválida");

    if (editingId) {
      persistTx(
        txs.map((t) =>
          t.id === editingId
            ? { ...t, type, amount: v, description: desc.trim(), date, category }
            : t
        )
      );
    } else {
      const tx: Tx = {
        id: crypto.randomUUID(),
        type,
        amount: v,
        description: desc.trim(),
        date,
        category,
      };
      persistTx([tx, ...txs]);
    }
    resetForm();
  }

  function editTx(id: string) {
    const t = txs.find((x) => x.id === id);
    if (!t) return;
    setEditingId(t.id);
    setType(t.type);
    setAmount(t.amount);
    setDesc(t.description);
    setDate(t.date);
    setCategory(t.category || "General");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function deleteTx(id: string) {
    if (!confirm("¿Eliminar este movimiento?")) return;
    persistTx(txs.filter((t) => t.id !== id));
  }

  // Totales
  const spent = useMemo(
    () => txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    [txs]
  );
  const income = useMemo(
    () => txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
    [txs]
  );
  const available = Math.max(0, budget - spent + income);
  const pygNeto = income - spent;

  // Exportar CSV
  function exportCSV() {
    const rows = [
      ["Fecha", "Tipo", "Monto", "Categoría", "Descripción"],
      ...txs
        .slice()
        .reverse()
        .map((t) => [
          t.date,
          t.type === "expense" ? "Gasto" : "Ingreso",
          String(t.amount),
          t.category || "General",
          t.description.replaceAll(";", ","),
        ]),
    ];
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tu-control-${ym}.csv`;
    a.click();
  }

  return (
    <div style={{ minHeight: "100vh", padding: 24, color: "#e8ecf1", background: "#0f172a" }}>
      <h1 style={{ marginBottom: 16 }}>{APP}</h1>

      {/* Selector de mes */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
        <button className="btn" onClick={() => setYm(prevYM(ym))}>◀ Mes anterior</button>
        <div style={{ fontWeight: 600 }}>{ym}</div>
        <button className="btn" onClick={() => setYm(nextYM(ym))}>Mes siguiente ▶</button>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={exportCSV}>Exportar CSV</button>
      </div>

      {/* Presupuesto */}
      <div className="card">
        <h3>Presupuesto del mes</h3>
        <div className="row">
          <input
            className="input"
            type="number"
            placeholder="Gs"
            value={budget || ""}
            onChange={(e) => setBudget(Number(e.target.value || 0))}
          />
          <button className="btn primary" onClick={saveBudget}>Guardar presupuesto</button>
        </div>

        <div className="grid2">
          <div className="box">
            <div className="muted">Gastado</div>
            <div className="big">Gs {formatPYG(spent)}</div>
          </div>
          <div className="box">
            <div className="muted">Disponible</div>
            <div className="big">Gs {formatPYG(available)}</div>
          </div>
        </div>
      </div>

      {/* Nuevo / Editar */}
      <div className="card">
        <h3>{editingId ? "Editar movimiento" : "Nuevo movimiento"}</h3>
        <div className="row" style={{ gap: 8 }}>
          <div className="btnGroup">
            <button
              className={`btn ${type === "expense" ? "danger" : ""}`}
              onClick={() => setType("expense")}
            >
              Gasto
            </button>
            <button
              className={`btn ${type === "income" ? "success" : ""}`}
              onClick={() => setType("income")}
            >
              Ingreso
            </button>
          </div>

          <input
            className="input"
            type="number"
            placeholder="Monto (PYG)"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <input
            className="input"
            placeholder="Categoría (p.ej. Comida, Transporte)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="row" style={{ gap: 8 }}>
          <input
            className="input"
            placeholder="Descripción"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <input
            className="input"
            type="date"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
          <button className="btn primary" onClick={submitTx}>
            {editingId ? "Guardar cambios" : "Guardar movimiento"}
          </button>
          {editingId && (
            <button className="btn" onClick={resetForm}>Cancelar</button>
          )}
        </div>
      </div>

      {/* Resumen */}
      <div className="card">
        <h3>Últimos movimientos</h3>
        <div className="muted">PYG neto: {pygNeto >= 0 ? "+" : "-"}Gs {formatPYG(Math.abs(pygNeto))}</div>
        <div style={{ marginTop: 8 }}>
          {txs.length === 0 ? (
            <div className="muted">Sin movimientos este mes.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td style={{ color: t.type === "expense" ? "#f87171" : "#34d399" }}>
                      {t.type === "expense" ? "Gasto" : "Ingreso"}
                    </td>
                    <td>Gs {formatPYG(t.amount)}</td>
                    <td>{t.category || "General"}</td>
                    <td>{t.description}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button className="btn" onClick={() => editTx(t.id)}>Editar</button>{" "}
                      <button className="btn danger" onClick={() => deleteTx(t.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* estilos mínimos en línea */}
      <style>{`
        .card { background:#0b1220; border:1px solid #1e293b; padding:16px; border-radius:12px; margin-bottom:16px; }
        .row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .grid2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-top:12px; }
        .box { background:#0a0f1a; border:1px solid #1e293b; padding:12px; border-radius:10px; }
        .input { background:#0a0f1a; border:1px solid #334155; color:#e8ecf1; padding:10px 12px; border-radius:10px; min-width:220px; }
        .btn { background:#0b1324; border:1px solid #334155; color:#e8ecf1; padding:10px 12px; border-radius:10px; cursor:pointer; }
        .btn:hover { filter:brightness(1.1); }
        .btn.primary { background:#2563eb; border-color:#2563eb; }
        .btn.success { background:#16a34a; border-color:#16a34a; }
        .btn.danger { background:#dc2626; border-color:#dc2626; }
        .btnGroup { display:flex; gap:8px; }
        .big { font-size:22px; font-weight:700; }
        .muted { color:#94a3b8; }
        table { width:100%; border-collapse:collapse; }
        th, td { border-bottom:1px solid #1e293b; padding:8px; text-align:left; }
      `}</style>
    </div>
  );
}
