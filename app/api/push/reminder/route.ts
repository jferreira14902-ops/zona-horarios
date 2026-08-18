import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

webpush.setVapidDetails(
  "mailto:zona@zonaingenieria.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function GET() {
  try {
    const hoy = new Date()
      .toISOString()
      .slice(0, 10);

    let empleadosActivos = 0;
    let yaRegistraron = 0;
    let notificados = 0;
    let errores = 0;

    const { data: empleados, error } = await supabase
      .from("empleados")
      .select("id,nombre")
      .eq("activo", true);

    if (error) {
      throw error;
    }

    empleadosActivos = empleados.length;

    for (const empleado of empleados) {
      // ¿Ya registró?
      const { data: jornada } = await supabase
        .from("jornadas")
        .select("id")
        .eq("empleado_id", empleado.id)
        .eq("fecha", hoy)
        .maybeSingle();

      if (jornada) {
        yaRegistraron++;
        continue;
      }

      // Buscar dispositivos
      const { data: dispositivos } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("empleado_id", empleado.id);

      if (!dispositivos?.length) {
        continue;
      }

      const payload = JSON.stringify({
        title: "⏰ Recordatorio",
        body: `Hola, ${empleado.nombre} 👋\nTodavía no registraste tu jornada de hoy.\nTocá para completarla.`,
        url: "/dashboard",
      });

      for (const dispositivo of dispositivos) {
        try {
          await webpush.sendNotification(
            {
              endpoint: dispositivo.endpoint,
              keys: {
                p256dh: dispositivo.p256dh,
                auth: dispositivo.auth,
              },
            },
            payload,
            {
              urgency: "high",
              TTL: 3600,
            }
          );

          notificados++;
        } catch (e: any) {
          errores++;

          console.error(
            "ERROR PUSH:",
            dispositivo.endpoint,
            e.statusCode
          );

          // Eliminar suscripciones inválidas
          if (
            e.statusCode === 404 ||
            e.statusCode === 410
          ) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("id", dispositivo.id);
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      fecha: hoy,
      empleados_activos: empleadosActivos,
      ya_registraron: yaRegistraron,
      notificados,
      errores,
    });
  } catch (e: any) {
    console.error(e);

    return NextResponse.json(
      {
        ok: false,
        error: e.message,
      },
      {
        status: 500,
      }
    );
  }
}