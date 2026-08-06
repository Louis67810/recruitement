import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#039;",
    '"': "&quot;",
  })[character] ?? character);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const configuredFrom = Deno.env.get("RESEND_FROM") ?? Deno.env.get("RESEND_FORM");
  const adminEmail = (Deno.env.get("ADMIN_EMAIL") ?? "louisstaub67@gmail.com").toLowerCase();

  if (!resendApiKey || !configuredFrom) return json({ error: "Email service is not configured" }, 503);
  const from = configuredFrom.includes("<")
    ? configuredFrom.replace(/^[^<]+(?=<)/, "RUFF Recruitment ")
    : `RUFF Recruitment <${configuredFrom}>`;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const token = authorization.slice("Bearer ".length);
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || user?.email?.toLowerCase() !== adminEmail) return json({ error: "Forbidden" }, 403);

  let applicationId = "";
  try {
    applicationId = String((await request.json()).applicationId ?? "");
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!/^[0-9a-f-]{36}$/i.test(applicationId)) return json({ error: "Invalid application ID" }, 400);

  const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: application, error: applicationError } = await adminClient
    .from("applications")
    .select("id, full_name, email, status, email_status, rejection_reason")
    .eq("id", applicationId)
    .single();

  if (applicationError || !application) return json({ error: "Application not found" }, 404);
  if (application.status !== "rejected") return json({ error: "Application is not rejected" }, 409);
  if (application.email_status === "sent") return json({ sent: true, alreadySent: true });

  const firstName = escapeHtml(application.full_name.trim().split(/\s+/)[0] || "there");
  const reason = application.rejection_reason
    ? `<p style="margin:16px 0 0"><strong>Additional feedback:</strong><br>${escapeHtml(application.rejection_reason)}</p>`
    : "";
  const html = `<!doctype html><html><body style="margin:0;background:#f5f7f9;font-family:Arial,sans-serif;color:#17191b"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="background:#fff;border-radius:18px;padding:32px"><h1 style="font-size:24px;margin:0 0 20px">An update on your RUFF application</h1><p>Hi ${firstName},</p><p>Thank you for taking the time to apply and share your work with us. After reviewing your application, we’ve decided not to move forward with it at this time.</p><p>We appreciate your interest in RUFF and wish you the very best with your next projects.</p>${reason}<p style="margin-top:24px">The RUFF team</p></div></div></body></html>`;

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `ruff-rejection-${application.id}`,
    },
    body: JSON.stringify({
      from,
      to: [application.email],
      subject: "An update on your RUFF application",
      html,
    }),
  });

  if (!resendResponse.ok) {
    const providerError = await resendResponse.text();
    await adminClient.from("applications").update({ email_status: "failed" }).eq("id", application.id);
    console.error("Resend error", resendResponse.status, providerError);
    return json({ error: "Email provider rejected the message" }, 502);
  }

  const { error: updateError } = await adminClient
    .from("applications")
    .update({ email_status: "sent" })
    .eq("id", application.id);
  if (updateError) return json({ error: "Email sent, but status update failed" }, 500);

  await adminClient.from("application_events").insert({
    event_type: "email_sent",
    application_id: application.id,
  });

  return json({ sent: true });
});
