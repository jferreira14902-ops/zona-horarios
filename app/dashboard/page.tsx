"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Empleado = {
  id: string;
  nombre: string;
  apellido: string;
};

type Estado = "trabajado" | "falto" | "lluvia";

type OpcionFecha = {
  value: string;
  label: string;
};

type JornadaHistorial = {
  id: string;
  fecha: string;
  entrada: string | null;
  inicio_descanso: string | null;
  fin_descanso: string | null;
  salida: string | null;
  estado: string;
};

export default function DashboardPage() {
  const opcionesFecha = useMemo(
    () => obtenerUltimosTresDiasHabiles(),
    []
  );

  const [empleado, setEmpleado] = useState<Empleado | null>(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(
    opcionesFecha[0].value
  );

  const [estado, setEstado] =
    useState<Estado>("trabajado");

  const [inicioDescanso, setInicioDescanso] =
    useState("12:00");

  const [finDescanso, setFinDescanso] =
    useState("13:00");

  const [salida, setSalida] = useState(
    obtenerSalidaPredeterminada(
      opcionesFecha[0].value
    )
  );

  const [historial, setHistorial] =
    useState<JornadaHistorial[]>([]);

  const [loading, setLoading] = useState(true);
  const [cargandoJornada, setCargandoJornada] =
    useState(false);
  const [cargandoHistorial, setCargandoHistorial] =
    useState(false);
  const [guardando, setGuardando] = useState(false);

  const [notificacionesSoportadas, setNotificacionesSoportadas] =
    useState(false);
  const [notificacionesActivas, setNotificacionesActivas] =
    useState(false);
  const [activandoNotificaciones, setActivandoNotificaciones] =
    useState(false);
  const [mensajeNotificaciones, setMensajeNotificaciones] =
    useState("");

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarEmpleado();
  }, []);

  useEffect(() => {
    if (empleado) {
      cargarJornada(fechaSeleccionada);
    }
  }, [fechaSeleccionada, empleado]);

  useEffect(() => {
    if (empleado) {
      cargarHistorial();
      comprobarNotificaciones();
    }
  }, [empleado]);

  function obtenerUltimosTresDiasHabiles(): OpcionFecha[] {
    const fechas: OpcionFecha[] = [];
    const fecha = new Date();

    while (fechas.length < 3) {
      const diaSemana = fecha.getDay();

      const esSabado = diaSemana === 6;
      const esDomingo = diaSemana === 0;

      if (!esSabado && !esDomingo) {
        const value = convertirFechaAString(fecha);

        fechas.push({
          value,
          label: formatearOpcionFecha(
            value,
            fechas.length
          ),
        });
      }

      fecha.setDate(fecha.getDate() - 1);
    }

    return fechas;
  }

  function convertirFechaAString(fecha: Date) {
    const year = fecha.getFullYear();
    const month = String(
      fecha.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      fecha.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function formatearOpcionFecha(
    fecha: string,
    posicion: number
  ) {
    const [year, month, day] = fecha
      .split("-")
      .map(Number);

    const fechaLocal = new Date(
      year,
      month - 1,
      day
    );

    const fechaFormateada =
      fechaLocal.toLocaleDateString("es-UY", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });

    const texto =
      fechaFormateada.charAt(0).toUpperCase() +
      fechaFormateada.slice(1);

    if (posicion === 0) {
      return `Hoy · ${texto}`;
    }

    return texto;
  }

  function obtenerSalidaPredeterminada(fecha: string) {
    const [year, month, day] = fecha
      .split("-")
      .map(Number);

    const fechaLocal = new Date(
      year,
      month - 1,
      day
    );

    const diaSemana = fechaLocal.getDay();

    if (diaSemana === 5) {
      return "16:30";
    }

    return "17:30";
  }

  function formatearFecha(fecha: string) {
    const [year, month, day] = fecha.split("-");

    return `${day}/${month}/${year}`;
  }

  function horaCorta(valor: string | null) {
    if (!valor) return "-";
    return valor.slice(0, 5);
  }

  function nombreEstado(estado: string) {
    if (estado === "trabajado") return "Trabajado";
    if (estado === "falto") return "Faltó";

    if (estado === "lluvia") {
      return "Suspendido por lluvia";
    }

    return estado;
  }

  function calcularHoras(jornada: JornadaHistorial) {
    if (
      jornada.estado !== "trabajado" ||
      !jornada.entrada ||
      !jornada.salida
    ) {
      return "-";
    }

    function minutos(hora: string) {
      const [h, m] = hora
        .slice(0, 5)
        .split(":")
        .map(Number);

      return h * 60 + m;
    }

    let total =
      minutos(jornada.salida) -
      minutos(jornada.entrada);

    if (
      jornada.inicio_descanso &&
      jornada.fin_descanso
    ) {
      total -=
        minutos(jornada.fin_descanso) -
        minutos(jornada.inicio_descanso);
    }

    if (total < 0) return "-";

    const horas = Math.floor(total / 60);
    const mins = total % 60;

    return `${horas}:${String(mins).padStart(2, "0")}`;
  }

  function urlBase64AUint8Array(base64String: string) {
    const padding =
      "=".repeat((4 - (base64String.length % 4)) % 4);

    const base64 = (
      base64String + padding
    )
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);

    return Uint8Array.from(
      [...rawData].map((char) =>
        char.charCodeAt(0)
      )
    );
  }

  async function cargarEmpleado() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: empleadoData, error: empleadoError } =
      await supabase
        .from("empleados")
        .select("id, nombre, apellido")
        .eq("auth_user_id", user.id)
        .single();

    if (empleadoError || !empleadoData) {
      setError("No se pudo cargar el empleado.");
      setLoading(false);
      return;
    }

    setEmpleado(empleadoData);
    setLoading(false);
  }

  async function cargarJornada(fecha: string) {
    if (!empleado) return;

    setCargandoJornada(true);
    setMensaje("");
    setError("");

    const { data: jornada, error: jornadaError } =
      await supabase
        .from("jornadas")
        .select(
          "estado, inicio_descanso, fin_descanso, salida"
        )
        .eq("empleado_id", empleado.id)
        .eq("fecha", fecha)
        .maybeSingle();

    if (jornadaError) {
      console.error(jornadaError);
      setError("No se pudo cargar la jornada.");
      setCargandoJornada(false);
      return;
    }

    if (jornada) {
      setEstado(jornada.estado as Estado);

      setInicioDescanso(
        jornada.inicio_descanso
          ? jornada.inicio_descanso.slice(0, 5)
          : "12:00"
      );

      setFinDescanso(
        jornada.fin_descanso
          ? jornada.fin_descanso.slice(0, 5)
          : "13:00"
      );

      setSalida(
        jornada.salida
          ? jornada.salida.slice(0, 5)
          : obtenerSalidaPredeterminada(fecha)
      );
    } else {
      setEstado("trabajado");
      setInicioDescanso("12:00");
      setFinDescanso("13:00");
      setSalida(
        obtenerSalidaPredeterminada(fecha)
      );
    }

    setCargandoJornada(false);
  }

  async function cargarHistorial() {
    if (!empleado) return;

    setCargandoHistorial(true);

    const { data, error } = await supabase
      .from("jornadas")
      .select(
        "id, fecha, entrada, inicio_descanso, fin_descanso, salida, estado"
      )
      .eq("empleado_id", empleado.id)
      .order("fecha", { ascending: false })
      .limit(5);

    if (error) {
      console.error("ERROR HISTORIAL:", error);
    } else {
      setHistorial(
        (data ?? []) as JornadaHistorial[]
      );
    }

    setCargandoHistorial(false);
  }

  async function comprobarNotificaciones() {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setNotificacionesSoportadas(false);
      return;
    }

    setNotificacionesSoportadas(true);

    try {
      const registration =
        await navigator.serviceWorker.register(
          "/sw.js"
        );

      await navigator.serviceWorker.ready;

      const subscription =
        await registration.pushManager.getSubscription();

      setNotificacionesActivas(
        Boolean(subscription)
      );
    } catch (error) {
      console.error(
        "ERROR SERVICE WORKER:",
        error
      );
    }
  }

  async function activarNotificaciones() {
    if (!empleado) return;

    setActivandoNotificaciones(true);
    setMensajeNotificaciones("");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setMensajeNotificaciones(
          "Este dispositivo no permite notificaciones push."
        );

        setActivandoNotificaciones(false);
        return;
      }

      const permiso =
        await Notification.requestPermission();

      if (permiso !== "granted") {
        setMensajeNotificaciones(
          "No se concedió permiso para las notificaciones."
        );

        setActivandoNotificaciones(false);
        return;
      }

      const vapidPublicKey =
        process.env
          .NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        setMensajeNotificaciones(
          "Falta configurar la clave pública de notificaciones."
        );

        setActivandoNotificaciones(false);
        return;
      }

      const registration =
        await navigator.serviceWorker.register(
          "/sw.js"
        );

      await navigator.serviceWorker.ready;

      let subscription =
        await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription =
          await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey:
              urlBase64AUint8Array(
                vapidPublicKey
              ),
          });
      }

      const subscriptionJSON =
        subscription.toJSON();

      const p256dh =
        subscriptionJSON.keys?.p256dh;

      const auth =
        subscriptionJSON.keys?.auth;

      if (
        !subscription.endpoint ||
        !p256dh ||
        !auth
      ) {
        throw new Error(
          "La suscripción push está incompleta."
        );
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            empleado_id: empleado.id,
            endpoint: subscription.endpoint,
            p256dh,
            auth,
          },
          {
            onConflict: "endpoint",
          }
        );

      if (error) {
        console.error(
          "ERROR GUARDANDO PUSH:",
          error
        );

        setMensajeNotificaciones(
          "No se pudo registrar este dispositivo."
        );

        setActivandoNotificaciones(false);
        return;
      }

      setNotificacionesActivas(true);

      setMensajeNotificaciones(
        "Notificaciones activadas correctamente."
      );
    } catch (error) {
      console.error(
        "ERROR ACTIVANDO NOTIFICACIONES:",
        error
      );

      setMensajeNotificaciones(
        "No se pudieron activar las notificaciones."
      );
    } finally {
      setActivandoNotificaciones(false);
    }
  }

  async function guardarJornada() {
    if (!empleado) return;

    setGuardando(true);
    setMensaje("");
    setError("");

    const fechaValida = opcionesFecha.some(
      (opcion) =>
        opcion.value === fechaSeleccionada
    );

    if (!fechaValida) {
      setError(
        "La fecha seleccionada no está habilitada."
      );

      setGuardando(false);
      return;
    }

    const jornada = {
      empleado_id: empleado.id,
      fecha: fechaSeleccionada,
      entrada: "07:30",
      estado,

      inicio_descanso:
        estado === "trabajado"
          ? inicioDescanso
          : null,

      fin_descanso:
        estado === "trabajado"
          ? finDescanso
          : null,

      salida:
        estado === "trabajado"
          ? salida
          : null,
    };

    const { error: guardarError } =
      await supabase
        .from("jornadas")
        .upsert(jornada, {
          onConflict: "empleado_id,fecha",
        });

    if (guardarError) {
      console.error(guardarError);

      setError(
        "No se pudo guardar la jornada."
      );

      setGuardando(false);
      return;
    }

    setMensaje(
      "Jornada guardada correctamente."
    );

    await cargarHistorial();

    setGuardando(false);
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        Cargando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-700">
              Zona Horarios
            </h1>

            <p className="text-sm text-gray-500">
              Registro de jornada
            </p>
          </div>

          <button
            onClick={cerrarSesion}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold">
            Hola, {empleado?.nombre}
          </h2>

          <p className="mt-1 text-gray-500">
            Seleccioná el día y completá tu jornada
          </p>
        </div>

        {/* NOTIFICACIONES */}
        <div className="mb-6 rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold">
                🔔 Notificaciones
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Recibí un recordatorio para completar tu jornada.
              </p>
            </div>

            {notificacionesSoportadas ? (
              notificacionesActivas ? (
                <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  Activadas
                </span>
              ) : (
                <button
                  onClick={activarNotificaciones}
                  disabled={
                    activandoNotificaciones
                  }
                  className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                >
                  {activandoNotificaciones
                    ? "Activando..."
                    : "Activar notificaciones"}
                </button>
              )
            ) : (
              <span className="text-sm text-gray-400">
                No disponibles
              </span>
            )}
          </div>

          {mensajeNotificaciones && (
            <p className="mt-3 text-sm text-gray-600">
              {mensajeNotificaciones}
            </p>
          )}
        </div>

        {/* FORMULARIO */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <label className="mb-2 block font-medium">
              Fecha de la jornada
            </label>

            <select
              value={fechaSeleccionada}
              onChange={(e) =>
                setFechaSeleccionada(
                  e.target.value
                )
              }
              className="w-full rounded-lg border p-3"
            >
              {opcionesFecha.map((opcion) => (
                <option
                  key={opcion.value}
                  value={opcion.value}
                >
                  {opcion.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-gray-400">
              Solo se muestran los últimos 3 días hábiles.
            </p>
          </div>

          {cargandoJornada ? (
            <p className="text-gray-500">
              Cargando jornada...
            </p>
          ) : (
            <>
              <div className="mb-6">
                <label className="mb-2 block font-medium">
                  Estado del día
                </label>

                <select
                  value={estado}
                  onChange={(e) =>
                    setEstado(
                      e.target.value as Estado
                    )
                  }
                  className="w-full rounded-lg border p-3"
                >
                  <option value="trabajado">
                    Trabajado
                  </option>

                  <option value="falto">
                    Falté
                  </option>

                  <option value="lluvia">
                    Suspendido por lluvia
                  </option>
                </select>
              </div>

              {estado === "trabajado" && (
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block font-medium">
                      Entrada
                    </label>

                    <input
                      value="07:30"
                      disabled
                      className="w-full rounded-lg border bg-gray-100 p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Inicio descanso
                    </label>

                    <input
                      type="time"
                      value={inicioDescanso}
                      onChange={(e) =>
                        setInicioDescanso(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Fin descanso
                    </label>

                    <input
                      type="time"
                      value={finDescanso}
                      onChange={(e) =>
                        setFinDescanso(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Salida
                    </label>

                    <input
                      type="time"
                      value={salida}
                      onChange={(e) =>
                        setSalida(
                          e.target.value
                        )
                      }
                      className="w-full rounded-lg border p-3"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="mt-5 text-sm text-red-600">
                  {error}
                </p>
              )}

              {mensaje && (
                <p className="mt-5 text-sm text-green-700">
                  {mensaje}
                </p>
              )}

              <button
                onClick={guardarJornada}
                disabled={guardando}
                className="mt-6 w-full rounded-lg bg-blue-700 p-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {guardando
                  ? "Guardando..."
                  : "Guardar jornada"}
              </button>
            </>
          )}
        </div>

        {/* HISTORIAL */}
        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-xl font-bold">
              Mis últimas jornadas
            </h3>

            <p className="mt-1 text-sm text-gray-500">
              Tus últimos 5 registros
            </p>
          </div>

          {cargandoHistorial ? (
            <p className="text-gray-500">
              Cargando historial...
            </p>
          ) : historial.length === 0 ? (
            <p className="text-sm text-gray-500">
              Todavía no tenés jornadas registradas.
            </p>
          ) : (
            <div className="divide-y">
              {historial.map((jornada) => (
                <div
                  key={jornada.id}
                  className="py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">
                        {formatearFecha(
                          jornada.fecha
                        )}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {nombreEstado(
                          jornada.estado
                        )}
                      </p>
                    </div>

                    <div className="text-right">
                      {jornada.estado ===
                        "trabajado" && (
                        <>
                          <p className="text-sm font-medium">
                            {horaCorta(
                              jornada.entrada
                            )}
                            {" - "}
                            {horaCorta(
                              jornada.salida
                            )}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {calcularHoras(
                              jornada
                            )}{" "}
                            h
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {jornada.estado ===
                    "trabajado" && (
                    <p className="mt-2 text-xs text-gray-400">
                      Descanso:{" "}
                      {horaCorta(
                        jornada.inicio_descanso
                      )}{" "}
                      -{" "}
                      {horaCorta(
                        jornada.fin_descanso
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}