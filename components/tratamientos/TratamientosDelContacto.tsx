"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api/client";
import {
  resumenDelTratamiento,
  sesionesCompletas,
  soles,
  type Sesion,
  type Tratamiento,
} from "@/lib/tratamientos/tratamiento";
import { cn } from "@/lib/utils";

/**
 * Claud.ia — "Tratamiento": lo que el cliente contrató, cuánto pagó y sus
 * sesiones. La secretaria lo llena a mano; cada sesión con fecha se pone sola
 * en la Agenda, y desde ahí el recordatorio por WhatsApp le llega al cliente.
 *
 * `compacto` es la versión del panel del chat: solo el resumen y el enlace a
 * la ficha, donde se edita.
 */

const ZONA = "America/Lima";
const fechaLarga = new Intl.DateTimeFormat("es-PE", {
  timeZone: ZONA,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** ISO → valor de <input type="datetime-local"> en hora de Lima (UTC−5, sin horario de verano). */
function aInputLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 5 * 3600_000);
  return d.toISOString().slice(0, 16);
}
/** Valor del input (hora de Lima) → ISO con zona. */
function deInputLocal(v: string): string | null {
  if (!v) return null;
  return new Date(`${v}:00-05:00`).toISOString();
}

type TipoDeCita = { id: string; name: string; is_active: boolean };

function useTratamientos(contactId: string) {
  return useQuery({
    queryKey: ["tratamientos", contactId],
    queryFn: async () =>
      (await apiClient.get<{ data: Tratamiento[] }>(`/api/v1/contacts/${contactId}/tratamientos`)).data,
  });
}

function useTiposDeCita(activo: boolean) {
  return useQuery({
    queryKey: ["agenda-tipos-para-tratamiento"],
    enabled: activo,
    staleTime: 5 * 60_000,
    queryFn: async () =>
      ((await apiClient.get<{ data: TipoDeCita[] }>("/api/v1/agenda/tipos")).data ?? []).filter((t) => t.is_active),
  });
}

function mensajeDeError(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Inténtalo de nuevo.";
}

export function TratamientosDelContacto({
  contactId,
  compacto = false,
  readonly = false,
}: {
  contactId: string;
  compacto?: boolean;
  readonly?: boolean;
}) {
  const { data, isLoading, isError, refetch } = useTratamientos(contactId);
  const [creando, setCreando] = useState(false);
  const lista = Array.isArray(data) ? data : [];

  if (compacto) {
    return (
      <section data-testid="tratamiento-compacto">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-text">{TX.titulo}</h3>
          <Link className="text-xs underline" href={`/app/contacts/${contactId}?tab=tratamiento`}>
            {lista.length ? TX.verEditar : TX.agregar}
          </Link>
        </div>
        {isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">{TX.cargando}</p>
        ) : isError ? (
          <p className="mt-2 text-xs text-muted-foreground">{TX.errorLeer}</p>
        ) : lista.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">{TX.sinTratamiento}</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {lista.filter((t) => t.estado !== "cancelado").map((t) => (
              <ResumenCorto key={t.id} t={t} />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section data-testid="tratamientos" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{TX.explicacion}</p>
        {!readonly && !creando && (
          <Button size="sm" onClick={() => setCreando(true)}>
            {TX.nuevo}
          </Button>
        )}
      </div>
      {creando && (
        <NuevoTratamiento
          contactId={contactId}
          onListo={() => {
            setCreando(false);
            void refetch();
          }}
          onCancelar={() => setCreando(false)}
        />
      )}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">{TX.cargando}</p>
      ) : isError ? (
        <p className="text-sm text-muted-foreground">{TX.errorLeer}</p>
      ) : lista.length === 0 && !creando ? (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{TX.sinTratamiento}</p>
      ) : (
        lista.map((t) => <EditorDeTratamiento key={t.id} t={t} contactId={contactId} readonly={readonly} />)
      )}
    </section>
  );
}

function ResumenCorto({ t }: { t: Tratamiento }) {
  const r = resumenDelTratamiento(t);
  return (
    <li className="rounded-md border p-2 text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{t.nombre}</span>
        <span className="shrink-0 text-muted-foreground">
          {r.hechas} {TX.de} {r.total} {TX.sesiones}
        </span>
      </div>
      {r.proxima?.fecha && (
        <div className="mt-0.5 text-muted-foreground">
          {TX.proxima}: {fechaLarga.format(new Date(r.proxima.fecha))}
        </div>
      )}
      {r.falta != null && r.falta > 0 && (
        <div className="mt-0.5 text-muted-foreground">
          {TX.faltaPagar} {soles(r.falta)}
        </div>
      )}
    </li>
  );
}

function NuevoTratamiento({
  contactId,
  onListo,
  onCancelar,
}: {
  contactId: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const tipos = useTiposDeCita(true);
  const [nombre, setNombre] = useState("");
  const [sesiones, setSesiones] = useState("1");
  const [precio, setPrecio] = useState("");
  const [pagado, setPagado] = useState("");
  const [tipo, setTipo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tipo && tipos.data?.[0]) setTipo(tipos.data[0].id);
  }, [tipo, tipos.data]);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/contacts/${contactId}/tratamientos`, {
        nombre: nombre.trim(),
        sesiones_total: Math.min(50, Math.max(1, Number(sesiones) || 1)),
        precio_total: precio === "" ? null : Number(precio),
        pagado: Number(pagado) || 0,
        event_type_id: tipo || null,
      });
      onListo();
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-4">
      <label className="block space-y-1 text-sm">
        <span>{TX.nombre}</span>
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={TX.nombreEjemplo} maxLength={120} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1 text-sm">
          <span>{TX.nSesiones}</span>
          <Input type="number" min={1} max={50} value={sesiones} onChange={(e) => setSesiones(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span>{TX.precio}</span>
          <Input type="number" min={0} step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" />
        </label>
        <label className="space-y-1 text-sm">
          <span>{TX.pagado}</span>
          <Input type="number" min={0} step="0.01" value={pagado} onChange={(e) => setPagado(e.target.value)} placeholder="0.00" />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>{TX.tipoDeCita}</span>
        <select
          className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={tipo}
          onChange={(e) => setTipo(e.target.value)}
        >
          {(tipos.data ?? []).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <span className="block text-xs text-muted-foreground">{TX.tipoAyuda}</span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={guardando || !nombre.trim()} onClick={() => void guardar()}>
          {guardando ? TX.guardando : TX.guardar}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          {TX.cancelar}
        </Button>
      </div>
    </div>
  );
}

function EditorDeTratamiento({ t, contactId, readonly }: { t: Tratamiento; contactId: string; readonly: boolean }) {
  const qc = useQueryClient();
  const [abierto, setAbierto] = useState(false);
  const [pagado, setPagado] = useState(String(t.pagado ?? 0));
  const [estado, setEstado] = useState(t.estado);
  const [sesiones, setSesiones] = useState<Sesion[]>(() => sesionesCompletas(t.sesiones_total, t.sesiones));
  const [guardando, setGuardando] = useState(false);
  const [avisos, setAvisos] = useState<string[]>([]);
  const r = resumenDelTratamiento({ ...t, sesiones });

  function cambiar(n: number, parche: Partial<Sesion>) {
    setSesiones((prev) => prev.map((s) => (s.numero === n ? { ...s, ...parche } : s)));
  }

  /** Pone en la Agenda lo que cambió. Nunca bloquea el guardado del tratamiento. */
  async function sincronizarConLaAgenda(lista: Sesion[]): Promise<{ lista: Sesion[]; avisos: string[] }> {
    const antes = new Map(sesionesCompletas(t.sesiones_total, t.sesiones).map((s) => [s.numero, s]));
    const salida: Sesion[] = [];
    const problemas: string[] = [];
    for (const s of lista) {
      const previa = antes.get(s.numero);
      let actual = s;
      try {
        if (s.fecha && !s.appointment_id && !s.hecha && new Date(s.fecha).getTime() > Date.now()) {
          if (!t.event_type_id) {
            problemas.push(`${TX.sesion} ${s.numero}: ${TX.sinTipo}`);
          } else {
            const res = await apiClient.post<{ data: { id: string } }>("/api/v1/agenda/agendamentos", {
              event_type_id: t.event_type_id,
              starts_at: s.fecha,
              contact_id: contactId,
              title: `${t.nombre} · ${TX.sesion} ${s.numero} ${TX.de} ${t.sesiones_total}`,
            });
            actual = { ...s, appointment_id: res.data?.id ?? null };
          }
        } else if (s.appointment_id && s.fecha && previa?.fecha !== s.fecha && !s.hecha) {
          await apiClient.patch("/api/v1/agenda/agendamentos", { id: s.appointment_id, starts_at: s.fecha });
        } else if (s.appointment_id && s.hecha && !previa?.hecha) {
          await apiClient.patch("/api/v1/agenda/agendamentos", { id: s.appointment_id, status: "completed" });
        }
      } catch (e) {
        problemas.push(`${TX.sesion} ${s.numero}: ${TX.noAgenda} ${mensajeDeError(e)}`);
      }
      salida.push(actual);
    }
    return { lista: salida, avisos: problemas };
  }

  async function guardar() {
    setGuardando(true);
    setAvisos([]);
    try {
      const { lista, avisos: problemas } = await sincronizarConLaAgenda(sesiones);
      setSesiones(lista);
      await apiClient.patch(`/api/v1/tratamientos/${t.id}`, {
        pagado: Number(pagado) || 0,
        estado,
        sesiones: lista,
      });
      setAvisos(problemas.length ? problemas : [TX.guardado]);
      void qc.invalidateQueries({ queryKey: ["tratamientos", contactId] });
    } catch (e) {
      setAvisos([mensajeDeError(e)]);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-md border" data-testid="tratamiento">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full flex-wrap items-baseline justify-between gap-2 p-4 text-left"
      >
        <span className="font-medium">
          {t.nombre}
          {t.estado !== "en_curso" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">({TX.estados[t.estado]})</span>
          )}
        </span>
        <span className="text-sm text-muted-foreground">
          {r.hechas} {TX.de} {r.total} {TX.sesiones}
          {t.precio_total != null && ` · ${TX.pagadoCorto} ${soles(t.pagado)} ${TX.de} ${soles(t.precio_total)}`}
        </span>
      </button>

      {abierto && (
        <div className="space-y-4 border-t p-4">
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-sm">
              <span>{TX.pagado}</span>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={pagado}
                disabled={readonly}
                onChange={(e) => setPagado(e.target.value)}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span>{TX.estado}</span>
              <select
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={estado}
                disabled={readonly}
                onChange={(e) => setEstado(e.target.value as Tratamiento["estado"])}
              >
                {(Object.keys(TX.estados) as Tratamiento["estado"][]).map((k) => (
                  <option key={k} value={k}>
                    {TX.estados[k]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <ol className="space-y-3">
            {sesiones.map((s) => (
              <li key={s.numero} className={cn("space-y-2 rounded-md border p-3", s.hecha && "bg-muted/40")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {TX.sesion} {s.numero}
                  </span>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={s.hecha}
                      disabled={readonly}
                      onChange={(e) => cambiar(s.numero, { hecha: e.target.checked })}
                    />
                    {TX.hecha}
                  </label>
                </div>
                <Input
                  type="datetime-local"
                  value={aInputLocal(s.fecha)}
                  disabled={readonly}
                  onChange={(e) => cambiar(s.numero, { fecha: deInputLocal(e.target.value) })}
                  aria-label={`${TX.fechaDe} ${s.numero}`}
                />
                {s.appointment_id && <p className="text-xs text-muted-foreground">{TX.enAgenda}</p>}
                <Input
                  value={s.nota}
                  disabled={readonly}
                  maxLength={500}
                  onChange={(e) => cambiar(s.numero, { nota: e.target.value })}
                  placeholder={TX.notaEjemplo}
                  aria-label={`${TX.notaDe} ${s.numero}`}
                />
              </li>
            ))}
          </ol>

          {avisos.length > 0 && (
            <ul className="space-y-1 text-sm">
              {avisos.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
          {!readonly && (
            <Button size="sm" disabled={guardando} onClick={() => void guardar()}>
              {guardando ? TX.guardando : TX.guardarCambios}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/** Claud.ia es solo en español: los textos van directo. */
const TX = {
  titulo: "Tratamiento",
  explicacion:
    "Lo que el cliente contrató, cuánto pagó y sus sesiones. Cada sesión con fecha se pone en la Agenda y el cliente recibe su recordatorio por WhatsApp.",
  nuevo: "Nuevo tratamiento",
  agregar: "Agregar",
  verEditar: "Ver / editar",
  cargando: "Cargando…",
  errorLeer: "No se pudo leer el tratamiento.",
  sinTratamiento: "Sin tratamiento todavía.",
  de: "de",
  sesiones: "sesiones",
  sesion: "Sesión",
  proxima: "Próxima",
  faltaPagar: "Falta pagar",
  nombre: "Tratamiento",
  nombreEjemplo: "Ej.: Enzimas para papada",
  nSesiones: "N.º de sesiones",
  precio: "Precio total (S/)",
  pagado: "Pagado (S/)",
  pagadoCorto: "pagado",
  tipoDeCita: "Tipo de cita para las sesiones",
  tipoAyuda: "Con este tipo se ponen las sesiones en la Agenda.",
  guardar: "Guardar",
  guardarCambios: "Guardar cambios",
  guardando: "Guardando…",
  guardado: "Guardado.",
  cancelar: "Cancelar",
  estado: "Estado",
  estados: { en_curso: "En curso", terminado: "Terminado", cancelado: "Cancelado" } as Record<Tratamiento["estado"], string>,
  hecha: "Hecha",
  fechaDe: "Fecha de la sesión",
  notaDe: "Qué se hizo en la sesión",
  notaEjemplo: "Qué se le hizo / observaciones",
  enAgenda: "✓ En la Agenda (recibirá su recordatorio)",
  sinTipo: "no se puso en la Agenda porque el tratamiento no tiene tipo de cita.",
  noAgenda: "no se pudo poner en la Agenda —",
};
