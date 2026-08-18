self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "Tenés una notificación de Zona Horarios.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: {
      url: data.url || "/dashboard",
    },
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Zona Horarios",
      options
    )
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const url =
    event.notification.data?.url || "/dashboard";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if (
          "focus" in client &&
          client.url.includes(url)
        ) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});