import { NextResponse } from "next/server";
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey
);

webpush.setVapidDetails(
  "mailto:zona@zonaingenieria.com",
  vapidPublicKey,
  vapidPrivateKey
);

export async function GET() {
  try {
    const { data: subscriptions, error } =
      await supabaseAdmin
        .from("push_subscriptions")
        .select(`
          endpoint,
          p256dh,
          auth,
          empleados (
            nombre
          )
        `);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No hay dispositivos suscriptos." },
        { status: 404 }
      );
    }

    const resultados = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        const nombre =
          sub.empleados?.nombre ?? "Empleado";

        const payload = JSON.stringify({
          title: "⏰ Recordatorio",
          body:
            `Hola, ${nombre} 👋\n` +
            "Todavía no registraste tu jornada de hoy.\n\n" +
            "Tocá para completarla.",
          url: "/dashboard",
        });

        return webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      })
    );

    return NextResponse.json({
      ok: true,
      enviados: resultados.length,
      resultados,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error enviando notificación.",
      },
      { status: 500 }
    );
  }
}