"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api/client";
import {
  resumenDelTratamiento,
  sesionesCompletas,
  soles,
  sumaDePagos,
  type Pago,
  type Sesion,
  type Tratamiento,
} from "@/lib/tratamientos/tratamiento";
import { cn } from "@/lib/utils";

/**
 * Claud.ia — la ficha del TRATAMIENTO de un cliente.
 *
 * Pensada como la hoja que la secretaria llenaría a mano: arriba el
 * tratamiento y su avance (una fila de sesiones numeradas), a la izquierda las
 * sesiones —cada una con su fecha, si ya se hizo y qué se le hizo— y a la
 * derecha la plata (cuánto pagó, cuánto falta, cada pago) y los comentarios.
 *
 * Cada acción se guarda sola, al momento: poner fecha, marcar hecha, anotar,
 * registrar un pago. Poner fecha a una sesión la pone en la Agenda (y en Google
 * Calendar), así el cliente recibe su recordatorio por WhatsApp; cambiar la
 * fecha la mueve; quitarla la cancela.
 *
 * `compacto` es la versión del panel del chat: el avance, la próxima sesión y
 * lo que falta pagar, con el enlace a esta ficha.
 */

// ─── Fechas en hora de Lima (UTC−5, sin horario de verano) ──────────────────
const ZONA = "America/Lima";
const OFFSET = "-05:00";
const fmtDia = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
const fmtHora = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, hour: "numeric", minute: "2-digit" });
const fmtCorto = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtFechaPago = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, day: "numeric", month: "short", year: "numeric" });

function partesLocales(iso: string | null): { dia: string; hora: string } {
  if (!iso) return { dia: "", hora: "" };
  const local = new Date(new Date(iso).getTime() - 5 * 3600_000).toISOString();
  return { dia: local.slice(0, 10), hora: local.slice(11, 16) };
}
function aIso(dia: string, hora: string): string | null {
  if (!dia || !hora) return null;
  return new Date(`${dia}T${hora}:00${OFFSET}`).toISOString();
}
const mayuscula = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

// ─── Datos ──────────────────────────────────────────────────────────────────
type TipoDeCita = { id: string; name: string; is_active: boolean };

function useTratamientos(contactId: string) {
  return useQuery({
    queryKey: ["tratamientos", contactId],
    queryFn: async () =>
      (await apiClient.get<{ data: Tratamiento[] }>(`/api/v1/contacts/${contactId}/tratamientos`)).data,
  });
}
function useTiposDeCita(activo = true) {
  return useQuery({
    queryKey: ["agenda-tipos-para-tratamiento"],
    enabled: activo,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const r = (await apiClient.get<{ data: TipoDeCita[] }>("/api/v1/agenda/tipos")).data;
      return (Array.isArray(r) ? r : []).filter((t) => t.is_active);
    },
  });
}
const mensajeDeError = (e: unknown) => (e instanceof Error && e.message ? e.message : TX.reintentar);

/** Los pagos a mostrar: si la ficha es de antes de la lista de pagos, el total pagado cuenta como uno. */
function pagosDe(t: Tratamiento): Pago[] {
  const lista = Array.isArray(t.pagos) ? t.pagos : [];
  if (lista.length || !(Number(t.pagado) > 0)) return lista;
  return [{ monto: Number(t.pagado), fecha: t.created_at, nota: TX.pagoRegistrado }];
}

type EstadoSesion = "hecha" | "agendada" | "con_fecha" | "sin_fecha";
function estadoDe(s: Sesion): EstadoSesion {
  if (s.hecha) return "hecha";
  if (!s.fecha) return "sin_fecha";
  return s.appointment_id ? "agendada" : "con_fecha";
}

// ─── Componente principal ───────────────────────────────────────────────────
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
    const visibles = lista.filter((t) => t.estado !== "cancelado");
    return (
      <section data-testid="tratamiento-compacto">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold text-text">{TX.titulo}</h3>
          <Link className="text-xs underline underline-offset-4" href={`/app/contacts/${contactId}?tab=tratamiento`}>
            {visibles.length ? TX.abrirFicha : TX.agregar}
          </Link>
        </div>
        {isLoading ? (
          <p className="mt-2 text-xs text-muted-foreground">{TX.cargando}</p>
        ) : isError ? (
          <p className="mt-2 text-xs text-muted-foreground">{TX.errorLeer}</p>
        ) : visibles.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">{TX.sinTratamiento}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {visibles.map((t) => (
              <ResumenCompacto key={t.id} t={t} />
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <section data-testid="tratamientos" className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{TX.explicacion}</p>
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
        <div className="border-y border-dashed border-border py-10 text-center">
          <p className="font-display text-2xl">{TX.sinTratamiento}</p>
          <p className="mt-1 text-sm text-muted-foreground">{TX.sinTratamientoAyuda}</p>
        </div>
      ) : (
        lista.map((t) => <FichaDeTratamiento key={t.id} t={t} contactId={contactId} readonly={readonly} />)
      )}
    </section>
  );
}

// ─── Panel del chat ─────────────────────────────────────────────────────────
function ResumenCompacto({ t }: { t: Tratamiento }) {
  const sesiones = sesionesCompletas(t.sesiones_total, t.sesiones);
  const r = resumenDelTratamiento({ ...t, pagado: sumaDePagos(pagosDe(t)) || Number(t.pagado) });
  return (
    <li className="py-2 text-xs">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{t.nombre}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {r.hechas}/{r.total}
        </span>
      </div>
      <PistaDeSesiones sesiones={sesiones} pequena className="mt-1.5" />
      {r.proxima?.fecha && (
        <div className="mt-1 text-muted-foreground">
          {TX.proxima}: {fmtCorto.format(new Date(r.proxima.fecha))}
        </div>
      )}
      {r.falta != null && r.falta > 0 && (
        <div className="mt-0.5 text-amber-700 dark:text-amber-400">
          {TX.falta} {soles(r.falta)}
        </div>
      )}
    </li>
  );
}

// ─── La fila de sesiones (1 · 2 · 3) ────────────────────────────────────────
function PistaDeSesiones({
  sesiones,
  pequena = false,
  seleccionada,
  onElegir,
  className,
}: {
  sesiones: Sesion[];
  pequena?: boolean;
  seleccionada?: number | null;
  onElegir?: (n: number) => void;
  className?: string;
}) {
  return (
    <ol className={cn("flex items-center", className)} aria-label={TX.avance}>
      {sesiones.map((s, i) => {
        const e = estadoDe(s);
        const marca = (
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full font-medium tabular-nums transition-colors",
              pequena ? "size-4 text-[9px]" : "size-9 text-sm",
              e === "hecha" && "bg-emerald-700 text-white dark:bg-emerald-500 dark:text-black",
              e === "agendada" && "border-2 border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300",
              e === "con_fecha" && "border-2 border-amber-500 text-amber-700",
              e === "sin_fecha" && "border border-dashed border-muted-foreground/60 text-muted-foreground",
              seleccionada === s.numero && !pequena && "ring-2 ring-offset-2 ring-foreground/70 ring-offset-background",
            )}
          >
            {e === "hecha" ? "✓" : s.numero}
          </span>
        );
        return (
          <li key={s.numero} className={cn("flex items-center", i < sesiones.length - 1 && "flex-1")}>
            {onElegir ? (
              <button type="button" onClick={() => onElegir(s.numero)} aria-label={`${TX.sesion} ${s.numero}`}>
                {marca}
              </button>
            ) : (
              marca
            )}
            {i < sesiones.length - 1 && (
              <span
                aria-hidden
                className={cn(
                  "mx-1 h-px flex-1",
                  pequena ? "min-w-1.5" : "min-w-4",
                  estadoDe(sesiones[i + 1]!) === "hecha" || e === "hecha" ? "bg-emerald-700/60" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── Nuevo tratamiento ──────────────────────────────────────────────────────
function NuevoTratamiento({
  contactId,
  onListo,
  onCancelar,
}: {
  contactId: string;
  onListo: () => void;
  onCancelar: () => void;
}) {
  const tipos = useTiposDeCita();
  const [nombre, setNombre] = useState("");
  const [sesiones, setSesiones] = useState(1);
  const [precio, setPrecio] = useState("");
  const [inicial, setInicial] = useState("");
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
        sesiones_total: sesiones,
        precio_total: precio === "" ? null : Number(precio),
        pagado: Number(inicial) || 0,
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
    <div className="border-y border-foreground/80 py-6" data-testid="nuevo-tratamiento">
      <h3 className="font-display text-2xl">{TX.nuevo}</h3>
      <div className="mt-5 grid gap-5 md:grid-cols-[2fr_1fr]">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.queTratamiento}</span>
          <Input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={TX.nombreEjemplo}
            maxLength={120}
            className="h-11 text-base"
          />
        </label>
        <div className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.cuantasSesiones}</span>
          <div className="flex h-11 items-center justify-between rounded-md border border-input px-1">
            <button
              type="button"
              className="size-9 rounded text-lg hover:bg-muted disabled:opacity-30"
              disabled={sesiones <= 1}
              onClick={() => setSesiones((n) => Math.max(1, n - 1))}
              aria-label={TX.menos}
            >
              −
            </button>
            <span className="font-display text-2xl tabular-nums">{sesiones}</span>
            <button
              type="button"
              className="size-9 rounded text-lg hover:bg-muted disabled:opacity-30"
              disabled={sesiones >= 50}
              onClick={() => setSesiones((n) => Math.min(50, n + 1))}
              aria-label={TX.mas}
            >
              +
            </button>
          </div>
        </div>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.precioTotal}</span>
          <CampoSoles value={precio} onChange={setPrecio} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.pagoInicial}</span>
          <CampoSoles value={inicial} onChange={setInicial} />
        </label>
      </div>
      {(tipos.data?.length ?? 0) > 1 ? (
        <label className="mt-5 block max-w-sm space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.tipoDeCita}</span>
          <select
            className="h-10 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
          >
            {(tipos.data ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      ) : tipos.data?.[0] ? (
        <p className="mt-4 text-xs text-muted-foreground">
          {TX.seAgendaComo} <strong>{tipos.data[0].name}</strong>.
        </p>
      ) : null}
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-6 flex items-center gap-3">
        <Button disabled={guardando || !nombre.trim()} onClick={() => void guardar()}>
          {guardando ? TX.guardando : TX.crear}
        </Button>
        <Button variant="ghost" onClick={onCancelar}>
          {TX.cancelar}
        </Button>
      </div>
    </div>
  );
}

function CampoSoles({ value, onChange, autoFocus }: { value: string; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="flex h-11 items-center rounded-md border border-input focus-within:ring-1 focus-within:ring-ring">
      <span className="pl-3 pr-1 text-sm text-muted-foreground">S/</span>
      <input
        autoFocus={autoFocus}
        inputMode="decimal"
        type="number"
        min={0}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        className="h-full w-full bg-transparent pr-3 text-base tabular-nums outline-none"
      />
    </div>
  );
}

// ─── La ficha de un tratamiento ─────────────────────────────────────────────
type Parche = Partial<Pick<Tratamiento, "sesiones" | "pagos" | "pagado" | "estado" | "notas" | "nombre" | "sesiones_total" | "precio_total" | "event_type_id">>;

function FichaDeTratamiento({ t, contactId, readonly }: { t: Tratamiento; contactId: string; readonly: boolean }) {
  const qc = useQueryClient();
  const tipos = useTiposDeCita();
  const [actual, setActual] = useState<Tratamiento>(t);
  useEffect(() => setActual(t), [t]);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [errorDeSesion, setErrorDeSesion] = useState<Record<number, string>>({});
  const [ocupado, setOcupado] = useState(false);
  const [seleccionada, setSeleccionada] = useState<number | null>(null);
  const [editandoDatos, setEditandoDatos] = useState(false);

  const sesiones = useMemo(() => sesionesCompletas(actual.sesiones_total, actual.sesiones), [actual]);
  const pagos = pagosDe(actual);
  const pagado = sumaDePagos(pagos);
  const precio = actual.precio_total == null ? null : Number(actual.precio_total);
  const falta = precio == null ? null : Math.max(0, Math.round((precio - pagado) * 100) / 100);
  const hechas = sesiones.filter((s) => s.hecha).length;
  const nombreDelTipo = tipos.data?.find((x) => x.id === actual.event_type_id)?.name ?? null;

  async function guardar(parche: Parche, textoOk = TX.guardado): Promise<boolean> {
    setOcupado(true);
    try {
      const res = await apiClient.patch<{ data: Tratamiento }>(`/api/v1/tratamientos/${actual.id}`, parche);
      setActual(res.data ?? { ...actual, ...parche });
      setAviso({ tipo: "ok", texto: textoOk });
      void qc.invalidateQueries({ queryKey: ["tratamientos", contactId] });
      return true;
    } catch (e) {
      setAviso({ tipo: "error", texto: mensajeDeError(e) });
      return false;
    } finally {
      setOcupado(false);
    }
  }

  /** Cambia UNA sesión: primero la Agenda, después la ficha. La ficha se guarda aunque la Agenda falle. */
  async function cambiarSesion(n: number, cambio: Partial<Sesion>, textoOk: string) {
    const antes = sesiones.find((s) => s.numero === n)!;
    let despues: Sesion = { ...antes, ...cambio };
    setErrorDeSesion(({ [n]: _quitado, ...resto }) => resto);
    try {
      if ("fecha" in cambio) {
        if (!despues.fecha && antes.appointment_id) {
          await apiClient.delete("/api/v1/agenda/agendamentos", { id: antes.appointment_id, reason: TX.motivoSinFecha });
          despues = { ...despues, appointment_id: null };
        } else if (despues.fecha && antes.appointment_id && despues.fecha !== antes.fecha) {
          await apiClient.patch("/api/v1/agenda/agendamentos", { id: antes.appointment_id, starts_at: despues.fecha });
        } else if (despues.fecha && !antes.appointment_id && !despues.hecha) {
          if (!actual.event_type_id) throw new Error(TX.sinTipo);
          const res = await apiClient.post<{ data: { id: string } }>("/api/v1/agenda/agendamentos", {
            event_type_id: actual.event_type_id,
            starts_at: despues.fecha,
            contact_id: contactId,
            title: `${actual.nombre} · ${TX.sesion} ${n} ${TX.de} ${actual.sesiones_total}`,
            description: despues.nota || undefined,
          });
          despues = { ...despues, appointment_id: res.data?.id ?? null };
        }
      }
      if (cambio.hecha === true && antes.appointment_id && despues.fecha && new Date(despues.fecha) <= new Date()) {
        await apiClient.patch("/api/v1/agenda/agendamentos", { id: antes.appointment_id, status: "completed" }).catch(() => null);
      }
    } catch (e) {
      setErrorDeSesion((prev) => ({ ...prev, [n]: `${TX.noAgenda} ${mensajeDeError(e)}` }));
    }
    const nuevas = sesiones.map((s) => (s.numero === n ? despues : s));
    await guardar({ sesiones: nuevas }, textoOk);
  }

  async function registrarPago(monto: number, nota: string) {
    const nuevos = [...pagos, { monto, nota, fecha: new Date().toISOString() }];
    return guardar({ pagos: nuevos, pagado: sumaDePagos(nuevos) }, TX.pagoGuardado);
  }
  async function quitarPago(i: number) {
    const nuevos = pagos.filter((_, j) => j !== i);
    return guardar({ pagos: nuevos, pagado: sumaDePagos(nuevos) }, TX.pagoQuitado);
  }

  return (
    <article className="border-t-2 border-foreground pt-5" data-testid="tratamiento">
      {/* Cabecera: qué es, en qué va, y su estado */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display text-3xl leading-tight">{actual.nombre}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {hechas} {TX.de} {actual.sesiones_total} {actual.sesiones_total === 1 ? TX.sesionMin : TX.sesionesMin}{" "}
            {TX.hechasMin}
            {nombreDelTipo && (
              <>
                {" · "}
                {TX.seAgendaComo} {nombreDelTipo}
              </>
            )}
            {!readonly && (
              <>
                {" · "}
                <button type="button" className="underline underline-offset-4 hover:text-foreground" onClick={() => setEditandoDatos((v) => !v)}>
                  {editandoDatos ? TX.cerrar : TX.editarDatos}
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex rounded-md border border-border p-0.5 text-sm" role="radiogroup" aria-label={TX.estado}>
          {(["en_curso", "terminado", "cancelado"] as const).map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={actual.estado === e}
              disabled={readonly || ocupado}
              onClick={() => actual.estado !== e && void guardar({ estado: e }, TX.estadoGuardado)}
              className={cn(
                "rounded px-3 py-1.5 transition-colors",
                actual.estado === e ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {TX.estados[e]}
            </button>
          ))}
        </div>
      </header>

      {editandoDatos && !readonly && (
        <EditarDatos
          t={actual}
          tipos={tipos.data ?? []}
          ocupado={ocupado}
          onGuardar={async (p) => {
            if (await guardar(p, TX.datosGuardados)) setEditandoDatos(false);
          }}
          onBorrar={async () => {
            await apiClient.delete(`/api/v1/tratamientos/${actual.id}`);
            void qc.invalidateQueries({ queryKey: ["tratamientos", contactId] });
          }}
        />
      )}

      <PistaDeSesiones
        sesiones={sesiones}
        seleccionada={seleccionada}
        onElegir={(n) => {
          setSeleccionada(n);
          document.getElementById(`sesion-${actual.id}-${n}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }}
        className="mt-6 max-w-xl"
      />

      {aviso && (
        <p
          role="status"
          className={cn("mt-4 text-sm", aviso.tipo === "ok" ? "text-emerald-700 dark:text-emerald-400" : "text-destructive")}
        >
          {aviso.texto}
        </p>
      )}

      <div className="mt-6 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Sesiones */}
        <section>
          <h4 className="border-b border-foreground/80 pb-2 font-display text-xl">{TX.sesiones}</h4>
          <ol className="divide-y divide-border">
            {sesiones.map((s) => (
              <FilaDeSesion
                key={s.numero}
                id={`sesion-${actual.id}-${s.numero}`}
                s={s}
                resaltada={seleccionada === s.numero}
                error={errorDeSesion[s.numero] ?? null}
                readonly={readonly}
                ocupado={ocupado}
                onCambiar={(cambio, textoOk) => cambiarSesion(s.numero, cambio, textoOk)}
              />
            ))}
          </ol>
        </section>

        {/* Pagos y comentarios */}
        <aside className="space-y-8">
          <section>
            <h4 className="border-b border-foreground/80 pb-2 font-display text-xl">{TX.pagos}</h4>
            <div className="mt-3 flex items-baseline justify-between gap-3">
              <div>
                <div className="font-display text-3xl tabular-nums">{soles(pagado)}</div>
                <div className="text-sm text-muted-foreground">
                  {precio != null ? `${TX.pagadoDe} ${soles(precio)}` : TX.sinPrecio}
                </div>
              </div>
              {falta != null && (
                <div className={cn("text-right text-sm", falta > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400")}>
                  {falta > 0 ? (
                    <>
                      {TX.falta}
                      <div className="font-display text-xl tabular-nums">{soles(falta)}</div>
                    </>
                  ) : (
                    TX.pagadoCompleto
                  )}
                </div>
              )}
            </div>
            {precio != null && precio > 0 && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-emerald-700 transition-[width] dark:bg-emerald-500"
                  style={{ width: `${Math.min(100, (pagado / precio) * 100)}%` }}
                />
              </div>
            )}
            {pagos.length > 0 && (
              <ul className="mt-4 divide-y divide-border text-sm">
                {pagos.map((p, i) => (
                  <li key={`${p.fecha}-${i}`} className="group flex items-baseline justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="text-muted-foreground">{fmtFechaPago.format(new Date(p.fecha))}</span>
                      {p.nota && <span className="ml-2">{p.nota}</span>}
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      <span className="tabular-nums">{soles(p.monto)}</span>
                      {!readonly && Array.isArray(actual.pagos) && actual.pagos.length > 0 && (
                        <button
                          type="button"
                          className="text-xs text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                          onClick={() => void quitarPago(i)}
                          aria-label={TX.quitarPago}
                        >
                          ✕
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {!readonly && <RegistrarPago ocupado={ocupado} sugerido={falta} onGuardar={registrarPago} />}
          </section>

          <Comentarios
            valor={actual.notas ?? ""}
            readonly={readonly}
            ocupado={ocupado}
            onGuardar={(notas) => guardar({ notas: notas.trim() || null }, TX.comentarioGuardado)}
          />
        </aside>
      </div>
    </article>
  );
}

// ─── Una sesión ─────────────────────────────────────────────────────────────
function FilaDeSesion({
  id,
  s,
  resaltada,
  error,
  readonly,
  ocupado,
  onCambiar,
}: {
  id: string;
  s: Sesion;
  resaltada: boolean;
  error: string | null;
  readonly: boolean;
  ocupado: boolean;
  onCambiar: (cambio: Partial<Sesion>, textoOk: string) => Promise<void>;
}) {
  const e = estadoDe(s);
  const [editandoFecha, setEditandoFecha] = useState(false);
  const [dia, setDia] = useState("");
  const [hora, setHora] = useState("");
  const [editandoNota, setEditandoNota] = useState(false);
  const [nota, setNota] = useState(s.nota);

  function abrirFecha() {
    const p = partesLocales(s.fecha);
    setDia(p.dia);
    setHora(p.hora || "10:00");
    setEditandoFecha(true);
  }

  return (
    <li id={id} className={cn("py-4 transition-colors", resaltada && "bg-muted/40")}>
      <div className="flex items-start gap-4">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm tabular-nums",
            e === "hecha" && "bg-emerald-700 text-white dark:bg-emerald-500 dark:text-black",
            e === "agendada" && "border-2 border-emerald-700 text-emerald-800 dark:border-emerald-400 dark:text-emerald-300",
            e === "con_fecha" && "border-2 border-amber-500 text-amber-700",
            e === "sin_fecha" && "border border-dashed border-muted-foreground/60 text-muted-foreground",
          )}
        >
          {e === "hecha" ? "✓" : s.numero}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div>
              <div className="text-xs text-muted-foreground">
                {TX.sesion} {s.numero} · {TX.estadosSesion[e]}
              </div>
              {s.fecha ? (
                <div className="text-base">
                  {mayuscula(fmtDia.format(new Date(s.fecha)))}
                  <span className="text-muted-foreground"> · {fmtHora.format(new Date(s.fecha))}</span>
                </div>
              ) : (
                <div className="text-base text-muted-foreground">{TX.sinFecha}</div>
              )}
            </div>
            {!readonly && !editandoFecha && (
              <div className="flex flex-wrap gap-1.5">
                {!s.hecha && (
                  <Button size="sm" variant="outline" disabled={ocupado} onClick={abrirFecha}>
                    {s.fecha ? TX.cambiarFecha : TX.ponerFecha}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={s.hecha ? "ghost" : "default"}
                  disabled={ocupado}
                  onClick={() => void onCambiar({ hecha: !s.hecha }, s.hecha ? TX.sesionReabierta : TX.sesionHecha)}
                >
                  {s.hecha ? TX.deshacer : TX.marcarHecha}
                </Button>
              </div>
            )}
          </div>

          {editandoFecha && (
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>{TX.dia}</span>
                <Input type="date" value={dia} onChange={(ev) => setDia(ev.target.value)} className="h-10 w-44" />
              </label>
              <label className="space-y-1 text-xs text-muted-foreground">
                <span>{TX.hora}</span>
                <Input type="time" step={300} value={hora} onChange={(ev) => setHora(ev.target.value)} className="h-10 w-32" />
              </label>
              <Button
                size="sm"
                className="h-10"
                disabled={ocupado || !dia || !hora}
                onClick={async () => {
                  await onCambiar({ fecha: aIso(dia, hora) }, TX.fechaGuardada);
                  setEditandoFecha(false);
                }}
              >
                {TX.guardar}
              </Button>
              {s.fecha && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-10 text-destructive"
                  disabled={ocupado}
                  onClick={async () => {
                    await onCambiar({ fecha: null }, TX.fechaQuitada);
                    setEditandoFecha(false);
                  }}
                >
                  {TX.quitarFecha}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-10" onClick={() => setEditandoFecha(false)}>
                {TX.cancelar}
              </Button>
            </div>
          )}

          {e === "agendada" && !editandoFecha && <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{TX.enAgenda}</p>}
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

          {/* Qué se le hizo */}
          {editandoNota ? (
            <div className="mt-3 space-y-2">
              <Textarea
                autoFocus
                rows={2}
                maxLength={500}
                value={nota}
                onChange={(ev) => setNota(ev.target.value)}
                placeholder={TX.notaEjemplo}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={ocupado}
                  onClick={async () => {
                    await onCambiar({ nota: nota.trim() }, TX.notaGuardada);
                    setEditandoNota(false);
                  }}
                >
                  {TX.guardar}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNota(s.nota);
                    setEditandoNota(false);
                  }}
                >
                  {TX.cancelar}
                </Button>
              </div>
            </div>
          ) : s.nota ? (
            <button
              type="button"
              disabled={readonly}
              onClick={() => setEditandoNota(true)}
              className="mt-2 block w-full border-l-2 border-border pl-3 text-left text-sm text-foreground/90 hover:border-foreground/50 disabled:cursor-default"
            >
              {s.nota}
            </button>
          ) : (
            !readonly && (
              <button
                type="button"
                onClick={() => setEditandoNota(true)}
                className="mt-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {TX.agregarNota}
              </button>
            )
          )}
        </div>
      </div>
    </li>
  );
}

// ─── Registrar pago ─────────────────────────────────────────────────────────
function RegistrarPago({
  ocupado,
  sugerido,
  onGuardar,
}: {
  ocupado: boolean;
  sugerido: number | null;
  onGuardar: (monto: number, nota: string) => Promise<boolean>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");

  if (!abierto) {
    return (
      <Button
        size="sm"
        variant="outline"
        className="mt-4"
        onClick={() => {
          setMonto(sugerido && sugerido > 0 ? String(sugerido) : "");
          setNota("");
          setAbierto(true);
        }}
      >
        {TX.registrarPago}
      </Button>
    );
  }
  const valor = Number(monto);
  return (
    <div className="mt-4 space-y-2 border-l-2 border-foreground/70 pl-3">
      <CampoSoles value={monto} onChange={setMonto} autoFocus />
      <Input value={nota} onChange={(e) => setNota(e.target.value)} maxLength={200} placeholder={TX.notaPagoEjemplo} />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={ocupado || !(valor > 0)}
          onClick={async () => {
            if (await onGuardar(Math.round(valor * 100) / 100, nota.trim())) setAbierto(false);
          }}
        >
          {TX.guardarPago}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setAbierto(false)}>
          {TX.cancelar}
        </Button>
      </div>
    </div>
  );
}

// ─── Comentarios del tratamiento ────────────────────────────────────────────
function Comentarios({
  valor,
  readonly,
  ocupado,
  onGuardar,
}: {
  valor: string;
  readonly: boolean;
  ocupado: boolean;
  onGuardar: (v: string) => Promise<boolean>;
}) {
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  const cambiado = texto.trim() !== valor.trim();
  return (
    <section>
      <h4 className="border-b border-foreground/80 pb-2 font-display text-xl">{TX.comentarios}</h4>
      {readonly ? (
        <p className="mt-3 whitespace-pre-wrap text-sm">{valor || TX.sinComentarios}</p>
      ) : (
        <>
          <Textarea
            rows={4}
            maxLength={2000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={TX.comentariosEjemplo}
            className="mt-3"
          />
          {cambiado && (
            <Button size="sm" className="mt-2" disabled={ocupado} onClick={() => void onGuardar(texto)}>
              {TX.guardarComentario}
            </Button>
          )}
        </>
      )}
    </section>
  );
}

// ─── Editar datos del tratamiento ───────────────────────────────────────────
function EditarDatos({
  t,
  tipos,
  ocupado,
  onGuardar,
  onBorrar,
}: {
  t: Tratamiento;
  tipos: TipoDeCita[];
  ocupado: boolean;
  onGuardar: (p: Parche) => Promise<void>;
  onBorrar: () => Promise<void>;
}) {
  const [nombre, setNombre] = useState(t.nombre);
  const [sesiones, setSesiones] = useState(t.sesiones_total);
  const [precio, setPrecio] = useState(t.precio_total == null ? "" : String(t.precio_total));
  const [tipo, setTipo] = useState(t.event_type_id ?? "");
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const conDatos = t.sesiones.filter((s) => s.numero > sesiones && (s.fecha || s.hecha || s.nota)).length;

  return (
    <div className="mt-4 space-y-4 border-l-2 border-foreground/70 pl-4">
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.queTratamiento}</span>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.cuantasSesiones}</span>
          <Input type="number" min={1} max={50} value={sesiones} onChange={(e) => setSesiones(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} />
        </label>
        <label className="space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.precioTotal}</span>
          <CampoSoles value={precio} onChange={setPrecio} />
        </label>
      </div>
      {tipos.length > 0 && (
        <label className="block max-w-sm space-y-1.5 text-sm">
          <span className="text-muted-foreground">{TX.tipoDeCita}</span>
          <select className="h-10 w-full rounded-md border border-input bg-transparent px-2 text-sm" value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {tipos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {conDatos > 0 && <p className="text-xs text-amber-700">{TX.avisoMenosSesiones}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={ocupado || !nombre.trim()}
          onClick={() =>
            void onGuardar({
              nombre: nombre.trim(),
              sesiones_total: sesiones,
              precio_total: precio === "" ? null : Number(precio),
              event_type_id: tipo || null,
              sesiones: t.sesiones.filter((s) => s.numero <= sesiones),
            })
          }
        >
          {TX.guardarDatos}
        </Button>
        {confirmarBorrado ? (
          <>
            <span className="text-sm">{TX.confirmarBorrar}</span>
            <Button size="sm" variant="destructive" onClick={() => void onBorrar()}>
              {TX.siBorrar}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmarBorrado(false)}>
              {TX.no}
            </Button>
          </>
        ) : (
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmarBorrado(true)}>
            {TX.borrar}
          </Button>
        )}
      </div>
    </div>
  );
}

/** Claud.ia es solo en español: los textos van directo. */
const TX = {
  titulo: "Tratamiento",
  explicacion:
    "Lo que el cliente contrató, sus sesiones y sus pagos. Al ponerle fecha a una sesión, queda en la Agenda y el cliente recibe su recordatorio por WhatsApp.",
  nuevo: "Nuevo tratamiento",
  crear: "Crear tratamiento",
  agregar: "Agregar",
  abrirFicha: "Abrir ficha",
  cargando: "Cargando…",
  errorLeer: "No se pudo leer el tratamiento.",
  sinTratamiento: "Sin tratamiento todavía",
  sinTratamientoAyuda: "Cuando el cliente contrate algo, anótalo aquí con «Nuevo tratamiento».",
  reintentar: "Inténtalo de nuevo.",
  avance: "Avance de las sesiones",
  de: "de",
  sesion: "Sesión",
  sesionMin: "sesión",
  sesionesMin: "sesiones",
  hechasMin: "hechas",
  sesiones: "Sesiones",
  proxima: "Próxima",
  falta: "Falta pagar",
  queTratamiento: "Tratamiento",
  nombreEjemplo: "Ej.: Toxina botulínica, Enzimas para papada…",
  cuantasSesiones: "Sesiones",
  menos: "Una sesión menos",
  mas: "Una sesión más",
  precioTotal: "Precio total",
  pagoInicial: "Pagó ahora (opcional)",
  tipoDeCita: "Las sesiones se agendan como",
  seAgendaComo: "se agenda como",
  guardar: "Guardar",
  guardando: "Guardando…",
  guardado: "Guardado.",
  cancelar: "Cancelar",
  cerrar: "Cerrar",
  editarDatos: "Editar datos",
  estado: "Estado del tratamiento",
  estados: { en_curso: "En curso", terminado: "Terminado", cancelado: "Cancelado" } as Record<Tratamiento["estado"], string>,
  estadoGuardado: "Estado actualizado.",
  estadosSesion: { hecha: "hecha", agendada: "agendada", con_fecha: "con fecha, sin agendar", sin_fecha: "pendiente" } as Record<EstadoSesion, string>,
  sinFecha: "Sin fecha todavía",
  ponerFecha: "Poner fecha",
  cambiarFecha: "Cambiar fecha",
  quitarFecha: "Quitar fecha",
  marcarHecha: "Marcar hecha",
  deshacer: "Deshacer",
  dia: "Día",
  hora: "Hora",
  fechaGuardada: "Fecha guardada.",
  fechaQuitada: "Fecha quitada y cita cancelada.",
  sesionHecha: "Sesión marcada como hecha.",
  sesionReabierta: "Sesión marcada como pendiente.",
  enAgenda: "✓ En la Agenda — el cliente recibirá su recordatorio",
  agregarNota: "+ Anotar qué se le hizo",
  notaEjemplo: "Qué se le hizo, dosis, zona, observaciones…",
  notaGuardada: "Nota guardada.",
  sinTipo: "el tratamiento no tiene tipo de cita (Editar datos).",
  noAgenda: "No se pudo poner en la Agenda:",
  motivoSinFecha: "Sesión sin fecha",
  pagos: "Pagos",
  pagadoDe: "pagado de",
  sinPrecio: "pagado (sin precio total)",
  pagadoCompleto: "✓ Pagado completo",
  pagoRegistrado: "Pago registrado",
  registrarPago: "+ Registrar pago",
  notaPagoEjemplo: "Nota (Yape, efectivo, 2da cuota…)",
  guardarPago: "Guardar pago",
  pagoGuardado: "Pago registrado.",
  pagoQuitado: "Pago quitado.",
  quitarPago: "Quitar este pago",
  comentarios: "Comentarios",
  comentariosEjemplo: "Indicaciones, alergias, cuidados después del tratamiento…",
  sinComentarios: "Sin comentarios.",
  guardarComentario: "Guardar comentario",
  comentarioGuardado: "Comentario guardado.",
  guardarDatos: "Guardar datos",
  datosGuardados: "Datos guardados.",
  avisoMenosSesiones: "Hay sesiones con datos que se quitarían al bajar el número. Sus citas en la Agenda no se borran.",
  borrar: "Borrar tratamiento",
  confirmarBorrar: "¿Borrar este tratamiento?",
  siBorrar: "Sí, borrar",
  no: "No",
};
