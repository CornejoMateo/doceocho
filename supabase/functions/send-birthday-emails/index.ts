import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

serve(async (req) => {
  
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  )

  // Get today's date in Argentina timezone
  const argDate = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires'
  })

  const { data: events, error } = await supabase
    .from("events")
    .select(`
      *,
      clients:client_id (name, last_name),
      works:work_id (name, address, locality, zone, hood)
    `)
    .eq("date", argDate)
    .eq("remember", true)

  if (error) {
    console.error(error)
    return new Response("DB error", { status: 500 })
  }

  // if no events, exit
  if (!events || events.length === 0) {
    return new Response("No events today")
  }

  // Use Resend to send emails, get API key and email_to from Subabase secrets
  const resendApiKey = Deno.env.get("RESEND_API_KEY")!
  const emailTo = Deno.env.get("EMAIL_TO")!

  if (!resendApiKey || !emailTo) {
    console.error("Missing RESEND_API_KEY or EMAIL_TO environment variables")
    return new Response("Configuration error", { status: 500 })
  }
  
  // format today's date in Spanish for email content
  const todayFormatted = new Date().toLocaleDateString('es-AR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Argentina/Buenos_Aires'
  })

  let successCount = 0
  let failCount = 0

  // Send email for each event
  for (const event of events) {
     const relatedClientName = event.clients
      ? [event.clients.last_name, event.clients.name].filter(Boolean).join(' ')
      : ''
    const clientName = relatedClientName || event.client_name || ''

    const workName = event.works?.name || ''
    const workLocality = event.works?.locality || event.work_location || ''    
    const workAddress = event.works?.address || ''
    const workZone = event.works?.zone || ''
    const workHood = event.works?.hood || ''

    const eventHtml = `
      <div style="border-left: 4px solid #194236 ; padding: 16px; margin: 16px 0; background-color: #ebebeb; border-radius: 0 8px 8px 0;">
        ${event.type ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Tipo:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(event.type)}</span></div>` : ''}
        ${event.title ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Título:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(event.title)}</span></div>` : ''}
        ${clientName ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Cliente:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(clientName)}</span></div>` : ''}
        ${workName ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Obra:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(workName)}</span></div>` : ''}
        ${workLocality ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Localidad:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(workLocality)}</span></div>` : ''}
        ${workAddress ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Dirección:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(workAddress)}</span></div>` : ''}
        ${workZone ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Zona:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(workZone)}</span></div>` : ''}
        ${workHood ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Barrio:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(workHood)}</span></div>` : ''}
        ${event.description ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Descripción:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(event.description)}</span></div>` : ''}
        ${event.time ? `<div style=\"margin-bottom: 8px;\"><span style=\"font-size: 18px; font-weight: bold; color: #194236;\">Hora:</span> <span style=\"font-size: 16px; font-weight: normal; color: #222;\">${escapeHtml(event.time)}</span></div>` : ''}
      </div>
    `

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Recordatorio</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #194236 0%, #32553a 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">
              Recordatorio
            </h1>
            <p style="color: #fce7f3; margin: 10px 0 0 0; font-size: 16px;">
              ${todayFormatted}
            </p>
          </div>
          <div style="padding: 30px;">
            ${eventHtml}
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            </div>
          </div>
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              Dlay - Doceocho <br />
              <span style="color:#94a3b8;">
                Este mensaje fue generado automáticamente. Podés responder este email si necesitás reprogramar.
              </span>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    const textContent = `Recordatorio: ${event.title}`
    
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: "Doceocho <onboarding@resend.dev>",
          to: emailTo,
          subject: `Recordatorio: ${event.title || ''}`,
          text: textContent,
          html: html,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error(`Error enviando email para ${event.title}:`, errorText)
        failCount++
      } else {
        successCount++
      }
    } catch (err) {
      console.error(`Error enviando email para ${event.title}:`, err)
      failCount++
    }
  }

  return new Response(`Enviados: ${successCount}, Fallidos: ${failCount}`)
})
