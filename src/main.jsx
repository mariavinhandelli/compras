import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  Check,
  Image,
  Link as LinkIcon,
  Loader2,
  Pencil,
  Plus,
  ShoppingBag,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import "./style.css";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || "enxoval";
const cats = ["Cozinha", "Eletrodomesticos/Eletroportateis", "Cama, Mesa e Banho", "Quarto", "Banheiro", "Sala", "Lavanderia", "Escritorio", "Decoracao", "Outros"];
const CategoriesContext = React.createContext(cats);
const money = (v = 0) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const parseMoney = (value) => Number(String(value || "").replace(".", "").replace(",", ".")) || 0;
const numberFromForm = (form, name, fallback = 0) => {
  const value = form.get(name);
  if (name.includes("valor")) return parseMoney(value || fallback);
  return Number(value || fallback || 0);
};
const totalFromForm = (form) => {
  const quantidade = numberFromForm(form, "quantidade", 1) || 1;
  const unitario = numberFromForm(form, "valor_unitario", 0);
  const total = numberFromForm(form, "valor", 0);
  return total || unitario * quantidade;
};
const unitFromForm = (form) => {
  const quantidade = numberFromForm(form, "quantidade", 1) || 1;
  const unitario = numberFromForm(form, "valor_unitario", 0);
  const total = numberFromForm(form, "valor", 0);
  return unitario || (total ? total / quantidade : 0);
};

function groupByCategory(items, categories = cats) {
  const groups = {};

  items.forEach((item) => {
    const category = String(item.categoria || "Outros").trim() || "Outros";
    if (!groups[category]) groups[category] = [];
    groups[category].push(item);
  });

  const orderedCategories = [
    ...categories,
    ...Object.keys(groups).filter((category) => !categories.includes(category)).sort(),
  ];

  return orderedCategories.reduce((acc, category) => {
    acc[category] = groups[category] || [];
    return acc;
  }, {});
}

async function fetchAll(table) {
  const pageSize = 1000;
  const rows = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .order("categoria")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
  }
}

async function uploadPhoto(file, folder) {
  if (!file || !file.name) return "";
  const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
  if (error) {
    alert(`Nao foi possivel subir a imagem no bucket "${bucket}". Detalhe: ${error.message}`);
    throw error;
  }
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function saveDb(operation, action) {
  const { error } = await operation;
  if (error) {
    alert(`Nao foi possivel ${action}. Detalhe: ${error.message}`);
    throw error;
  }
}

function Button({ children, subtle, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
        subtle ? "border-line bg-white hover:bg-paper" : "border-ink bg-ink text-white hover:bg-black"
      }`}
    >
      {children}
    </button>
  );
}

function IconButton({ label, children, ...props }) {
  return (
    <button {...props} className="rounded-md p-2 hover:bg-paper" aria-label={label} title={label}>
      {children}
    </button>
  );
}

function Field(props) {
  return (
    <input
      {...props}
      className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
    />
  );
}

function Select({ defaultValue = cats[0], name, ...props }) {
  const categories = React.useContext(CategoriesContext);
  const existingCategory = categories.includes(defaultValue);
  const [selected, setSelected] = useState(existingCategory ? defaultValue : "__new__");

  return (
    <div className="space-y-2">
      <select
        {...props}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        aria-label="Categoria"
        className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-ink"
      >
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        <option value="__new__">Nova categoria</option>
      </select>
      {selected === "__new__" ? (
        <Field
          name={name}
          defaultValue={existingCategory ? "" : defaultValue}
          placeholder="Nome da nova categoria"
          required
          autoFocus
        />
      ) : (
        <input type="hidden" name={name} value={selected} />
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/20 p-4">
      <div className="w-full max-w-md rounded-md border border-line bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-paper" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Dashboard({ comprados, necessarios, categories }) {
  const total = comprados.reduce(
    (s, i) => s + Number(i.valor || 0),
    0
  );

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs text-neutral-500">Total gasto</p>
          <strong className="mt-2 block text-2xl">{money(total)}</strong>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs text-neutral-500">Itens adquiridos</p>
          <strong className="mt-2 block text-2xl">{comprados.length}</strong>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <p className="text-xs text-neutral-500">Itens faltantes</p>
          <strong className="mt-2 block text-2xl">{necessarios.length}</strong>
        </div>
      </div>

      <div className="rounded-md border border-line bg-white p-4 shadow-soft">
        <h2 className="mb-4 text-sm font-semibold">Progresso por categoria</h2>
        <div className="space-y-4">
          {categories.map((cat) => {
            const done = comprados.filter((i) => i.categoria === cat).length;
            const missing = necessarios.filter((i) => i.categoria === cat).length;
            const pct = done + missing ? Math.round((done / (done + missing)) * 100) : 0;
            return (
              <div key={cat}>
                <div className="mb-2 flex justify-between text-sm">
                  <span>{cat}</span>
                  <span className="text-neutral-500">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-paper">
                  <div className="h-1.5 rounded-full bg-ink" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Comprados({ items, reload, categories }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preview, setPreview] = useState("");

  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const foto_url = await uploadPhoto(f.get("foto"), "comprados");
    await saveDb(supabase.from("comprados").insert({
      nome: f.get("nome"),
      categoria: f.get("categoria"),
      quantidade: Number(f.get("quantidade") || 1),
      marca: f.get("marca"),
      valor: totalFromForm(f),
      valor_unitario: unitFromForm(f),
      foto_url,
    }), "salvar o item");
    setOpen(false);
    reload();
  }

  async function edit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPhoto = await uploadPhoto(f.get("foto"), "comprados");
    await saveDb(supabase.from("comprados").update({
      nome: f.get("nome"),
      categoria: f.get("categoria"),
      quantidade: Number(f.get("quantidade") || 1),
      marca: f.get("marca"),
      valor: totalFromForm(f),
      valor_unitario: unitFromForm(f),
      foto_url: newPhoto || editing.foto_url || null,
    }).eq("id", editing.id), "salvar as alteracoes");
    setEditing(null);
    reload();
  }

  async function back(item) {
    await saveDb(supabase.from("necessarios").insert({
      nome: item.nome,
      categoria: item.categoria,
      checado: false,
    }), "salvar o item");
    await supabase.from("comprados").delete().eq("id", item.id);
    reload();
  }

  return (
    <section className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus size={16} />Adicionar</Button>
      </div>
      {Object.entries(groupByCategory(items, categories)).map(([cat, rows]) => rows.length > 0 && (
        <div key={cat} className="rounded-md border border-line bg-white shadow-soft">
          <h2 className="border-b border-line px-4 py-3 text-sm font-semibold">{cat}</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="text-xs text-neutral-500">
                <tr><th className="p-3">Item</th><th>Qtd.</th><th>Marca</th><th>Valor unit.</th><th>Valor total</th><th>Foto</th><th></th></tr>
              </thead>
              <tbody>{rows.map((i) => (
                <tr key={i.id} className="border-t border-line">
                  <td className="p-3 font-medium">{i.nome}</td>
                  <td>{i.quantidade}</td>
                  <td>{i.marca}</td>
                  <td>{money(i.valor_unitario || (Number(i.valor || 0) / Number(i.quantidade || 1)))}</td>
                  <td>{money(i.valor)}</td>
                  <td>{i.foto_url && <button onClick={() => setPreview(i.foto_url)}><img src={i.foto_url} className="h-10 w-10 rounded-md object-cover" /></button>}</td>
                  <td className="pr-3 text-right">
                    <IconButton onClick={() => setEditing(i)} label={`Editar ${i.nome}`}><Pencil size={16} /></IconButton>
                    <IconButton onClick={() => back(i)} label={`Mover ${i.nome} para necessarios`}><Undo2 size={16} /></IconButton>
                    <IconButton onClick={async () => { await supabase.from("comprados").delete().eq("id", i.id); reload(); }} label={`Excluir ${i.nome}`}><Trash2 size={16} /></IconButton>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      ))}
      {open && <Modal title="Novo item comprado" onClose={() => setOpen(false)}><form onSubmit={add} className="space-y-3"><Field name="nome" placeholder="Nome" required /><Select name="categoria" /><Field name="quantidade" type="number" placeholder="Quantidade" defaultValue="1" /><Field name="marca" placeholder="Marca" /><Field name="valor_unitario" type="text" inputMode="decimal" placeholder="Valor unitario" /><Field name="valor" type="text" inputMode="decimal" placeholder="Valor total" /><Field name="foto" type="file" accept="image/*" /><Button><Check size={16} />Salvar</Button></form></Modal>}
      {editing && <Modal title="Editar item comprado" onClose={() => setEditing(null)}><form onSubmit={edit} className="space-y-3"><Field name="nome" placeholder="Nome" defaultValue={editing.nome} required /><Select name="categoria" defaultValue={editing.categoria || "Outros"} /><Field name="quantidade" type="number" placeholder="Quantidade" defaultValue={editing.quantidade || 1} /><Field name="marca" placeholder="Marca" defaultValue={editing.marca || ""} /><Field name="valor_unitario" type="text" inputMode="decimal" placeholder="Valor unitario" defaultValue={String(editing.valor_unitario || (Number(editing.valor || 0) / Number(editing.quantidade || 1))).replace(".", ",")} /><Field name="valor" type="text" inputMode="decimal" placeholder="Valor total" defaultValue={String(editing.valor || 0).replace(".", ",")} /><Field name="foto" type="file" accept="image/*" /><Button><Check size={16} />Salvar</Button></form></Modal>}
      {preview && <Modal title="Foto" onClose={() => setPreview("")}><img src={preview} className="w-full rounded-md" /></Modal>}
    </section>
  );
}

function Necessarios({ items, reload, categories }) {
  const [item, setItem] = useState(null);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState(null);

  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await saveDb(supabase.from("necessarios").insert({
      nome: f.get("nome"),
      categoria: f.get("categoria"),
      checado: false,
    }), "salvar o item");
    setOpenAdd(false);
    reload();
  }

  async function edit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await saveDb(supabase.from("necessarios").update({
      nome: f.get("nome"),
      categoria: f.get("categoria"),
    }).eq("id", editing.id), "salvar as alteracoes");
    setEditing(null);
    reload();
  }

  async function buy(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const foto_url = await uploadPhoto(f.get("foto"), "comprados");
    await saveDb(supabase.from("comprados").insert({
      nome: item.nome,
      categoria: item.categoria,
      marca: f.get("marca"),
      valor: totalFromForm(f),
      valor_unitario: unitFromForm(f),
      quantidade: Number(f.get("quantidade") || 1),
      foto_url,
    }), "salvar o item");
    await supabase.from("necessarios").delete().eq("id", item.id);
    setItem(null);
    reload();
  }

  return (
    <section className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpenAdd(true)}><Plus size={16} />Adicionar</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(groupByCategory(items, categories)).map(([cat, rows]) => rows.length > 0 && (
          <div key={cat} className="rounded-md border border-line bg-white p-4 shadow-soft">
            <h2 className="mb-3 text-sm font-semibold">{cat}</h2>
            <div className="space-y-2">{rows.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-paper">
                <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={false} onChange={() => setItem(i)} className="h-4 w-4 accent-ink" />
                  <span className="truncate text-sm">{i.nome}</span>
                </label>
                <div className="flex items-center">
                  <IconButton onClick={() => setEditing(i)} label={`Editar ${i.nome}`}><Pencil size={16} /></IconButton>
                  <IconButton onClick={async () => { await supabase.from("necessarios").delete().eq("id", i.id); reload(); }} label={`Excluir ${i.nome}`}><Trash2 size={16} /></IconButton>
                </div>
              </div>
            ))}</div>
          </div>
        ))}
      </div>
      {openAdd && <Modal title="Novo item necessario" onClose={() => setOpenAdd(false)}><form onSubmit={add} className="space-y-3"><Field name="nome" placeholder="Nome" required /><Select name="categoria" /><Button><Check size={16} />Salvar</Button></form></Modal>}
      {editing && <Modal title="Editar item necessario" onClose={() => setEditing(null)}><form onSubmit={edit} className="space-y-3"><Field name="nome" placeholder="Nome" defaultValue={editing.nome} required /><Select name="categoria" defaultValue={editing.categoria || "Outros"} /><Button><Check size={16} />Salvar</Button></form></Modal>}
      {item && <Modal title={`Comprar: ${item.nome}`} onClose={() => setItem(null)}><form onSubmit={buy} className="space-y-3"><Field name="marca" placeholder="Marca" /><Field name="valor_unitario" type="text" inputMode="decimal" placeholder="Valor unitario" /><Field name="valor" type="text" inputMode="decimal" placeholder="Valor total" /><Field name="quantidade" type="number" placeholder="Quantidade" defaultValue="1" /><Field name="foto" type="file" accept="image/*" /><Button><ShoppingBag size={16} />Transferir</Button></form></Modal>}
    </section>
  );
}

function Desejos({ items, reload, categories }) {
  const [editing, setEditing] = useState(null);

  async function add(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const foto_url = await uploadPhoto(f.get("foto"), "desejos");
    await saveDb(supabase.from("desejos").insert({
      nome: f.get("nome"),
      categoria: f.get("categoria"),
      link: f.get("link"),
      foto_url,
    }), "salvar o item");
    e.currentTarget.reset();
    reload();
  }

  async function edit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newPhoto = await uploadPhoto(f.get("foto"), "desejos");
    await saveDb(supabase.from("desejos").update({
      nome: f.get("nome"),
      categoria: f.get("categoria"),
      link: f.get("link"),
      foto_url: newPhoto || editing.foto_url || null,
    }).eq("id", editing.id), "salvar as alteracoes");
    setEditing(null);
    reload();
  }

  async function buy(i) {
    await saveDb(supabase.from("comprados").insert({
      nome: i.nome,
      categoria: i.categoria,
      quantidade: 1,
      marca: "",
      valor: 0,
      valor_unitario: 0,
      foto_url: i.foto_url,
    }), "salvar o item comprado");
    await supabase.from("desejos").delete().eq("id", i.id);
    reload();
  }

  return (
    <section className="space-y-5">
      <form onSubmit={add} className="grid gap-3 rounded-md border border-line bg-white p-4 shadow-soft md:grid-cols-5">
        <Field name="nome" placeholder="Nome" required />
        <Select name="categoria" />
        <Field name="link" placeholder="Link de compra" />
        <Field name="foto" type="file" accept="image/*" />
        <Button><Plus size={16} />Adicionar</Button>
      </form>
      {Object.entries(groupByCategory(items, categories)).map(([cat, rows]) => rows.length > 0 && (
          <div key={cat}>
            <h2 className="mb-3 text-sm font-semibold">{cat}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map((i) => (
              <article key={i.id} className="rounded-md border border-line bg-white p-3 shadow-soft">
                {i.foto_url ? <img src={i.foto_url} className="mb-3 aspect-video w-full rounded-md object-cover" /> : <div className="mb-3 grid aspect-video place-items-center rounded-md bg-paper"><Image size={20} /></div>}
                <h3 className="font-medium">{i.nome}</h3>
                {i.link && <a href={i.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-neutral-500"><LinkIcon size={14} />Abrir link</a>}
                <div className="mt-3 flex items-center gap-2">
                  <Button onClick={() => buy(i)} subtle><ShoppingBag size={16} />Comprar</Button>
                  <button onClick={() => setEditing(i)} className="rounded-md border border-line bg-white p-2 hover:bg-paper" aria-label={`Editar ${i.nome}`} title={`Editar ${i.nome}`}><Pencil size={16} /></button>
                  <button onClick={async () => { await supabase.from("desejos").delete().eq("id", i.id); reload(); }} className="rounded-md border border-line bg-white p-2 hover:bg-paper" aria-label={`Excluir ${i.nome}`}><Trash2 size={16} /></button>
                </div>
              </article>
            ))}</div>
          </div>
        ))}
      {editing && <Modal title="Editar desejo" onClose={() => setEditing(null)}><form onSubmit={edit} className="space-y-3"><Field name="nome" placeholder="Nome" defaultValue={editing.nome} required /><Select name="categoria" defaultValue={editing.categoria || "Outros"} /><Field name="link" placeholder="Link de compra" defaultValue={editing.link || ""} /><Field name="foto" type="file" accept="image/*" /><Button><Check size={16} />Salvar</Button></form></Modal>}
    </section>
  );
}

function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ comprados: [], necessarios: [], desejos: [] });

  async function reload() {
    try {
      const [comprados, necessarios, desejos] = await Promise.all([
        fetchAll("comprados"),
        fetchAll("necessarios"),
        fetchAll("desejos"),
      ]);
      setData({ comprados, necessarios, desejos });
    } catch (error) {
      alert(`Nao foi possivel carregar os itens. Detalhe: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    const channel = supabase.channel("enxoval-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "comprados" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "necessarios" }, reload)
      .on("postgres_changes", { event: "*", schema: "public", table: "desejos" }, reload)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const tabs = [
    ["dashboard", "Dashboard"],
    ["comprados", "Itens já comprados"],
    ["necessarios", "Itens pendentes"],
    ["desejos", "Wishlist"],
  ];

  const categories = [...new Set([
    ...cats,
    ...data.comprados.map((item) => item.categoria),
    ...data.necessarios.map((item) => item.categoria),
    ...data.desejos.map((item) => item.categoria),
  ].filter(Boolean))];

  return (
    <CategoriesContext.Provider value={categories}>
      <main className="min-h-screen bg-paper px-4 py-6 font-sans text-ink md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Controle de Compras</h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`rounded-md px-3 py-2 text-sm ${tab === id ? "bg-ink text-white" : "bg-white hover:bg-paper"}`}
              >
                {label}
              </button>
            ))}
          </nav>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="animate-spin" size={16} />Carregando</div>
        ) : tab === "dashboard" ? (
          <Dashboard {...data} categories={categories} />
        ) : tab === "comprados" ? (
          <Comprados items={data.comprados} reload={reload} categories={categories} />
        ) : tab === "necessarios" ? (
          <Necessarios items={data.necessarios} reload={reload} categories={categories} />
        ) : (
          <Desejos items={data.desejos} reload={reload} categories={categories} />
        )}
      </div>
      </main>
    </CategoriesContext.Provider>
  );
}

createRoot(document.getElementById("root")).render(<App />);






