import { handleCorsPreflight, jsonOk } from "../_shared/cors.ts";
import { assertAllowedMethod } from "../_shared/validation.ts";
import { edgeError } from "../_shared/upstream.ts";

Deno.serve(async (request) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return preflight;

  try {
    assertAllowedMethod(request.method, ["POST"]);

    // FCM Server Key or Service Account JSON should be in Deno.env
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      console.warn("FCM_SERVER_KEY is not set. Push notifications are scaffolded but disabled.");
      return jsonOk({ success: true, scaffolded: true });
    }

    const { token, title, body, data } = await request.json();

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          sound: "default",
          badge: "1",
        },
        data: data || {},
      }),
    });

    const result = await response.json();
    return jsonOk(result);
  } catch (error) {
    return edgeError(error);
  }
});
