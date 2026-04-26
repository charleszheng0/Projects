import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { title, description, track, time_minutes, location_type, energy_level, tags, user_id } = body;

  if (!title || !description || !track || !time_minutes || !location_type || !energy_level) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const { data: quest, error } = await supabase
    .from("quests")
    .insert({
      title,
      description,
      track,
      time_minutes,
      location_type,
      energy_level,
      tags: tags ? tags.split(",").map((t: string) => t.trim()).filter(Boolean) : [],
      status: "pending",
      created_by: user_id || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const approveUrl = `${APP_URL}/api/quests/approve?id=${quest.id}&action=approve`;
  const rejectUrl = `${APP_URL}/api/quests/approve?id=${quest.id}&action=reject`;

  await resend.emails.send({
    from: "queued <onboarding@resend.dev>",
    to: ADMIN_EMAIL,
    subject: `New quest submitted: "${title}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #FEFCF3; border-radius: 16px;">
        <p style="color: #16A34A; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; margin: 0 0 8px;">queued</p>
        <h1 style="font-size: 22px; font-weight: 800; color: #1a1a1a; margin: 0 0 24px;">New quest needs your approval</h1>

        <div style="background: white; border-radius: 16px; padding: 20px; margin-bottom: 24px; border: 1px solid #e7e5e4;">
          <p style="margin: 0 0 4px; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Title</p>
          <p style="margin: 0 0 16px; font-size: 18px; font-weight: 700; color: #1a1a1a;">${title}</p>

          <p style="margin: 0 0 4px; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Description</p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #44403c; line-height: 1.6;">${description}</p>

          <div style="display: flex; gap: 16px; flex-wrap: wrap;">
            <div>
              <p style="margin: 0 0 2px; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 600;">Track</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">${track}</p>
            </div>
            <div>
              <p style="margin: 0 0 2px; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 600;">Time</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">${time_minutes} min</p>
            </div>
            <div>
              <p style="margin: 0 0 2px; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 600;">Location</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">${location_type}</p>
            </div>
            <div>
              <p style="margin: 0 0 2px; font-size: 11px; color: #78716c; text-transform: uppercase; font-weight: 600;">Energy</p>
              <p style="margin: 0; font-size: 14px; font-weight: 600; color: #1a1a1a;">${energy_level}/3</p>
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 12px;">
          <a href="${approveUrl}" style="flex: 1; background: #1a1a1a; color: white; text-decoration: none; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 15px;">
            ✅ Approve
          </a>
          <a href="${rejectUrl}" style="flex: 1; background: white; color: #1a1a1a; text-decoration: none; text-align: center; padding: 14px; border-radius: 12px; font-weight: 700; font-size: 15px; border: 2px solid #e7e5e4;">
            ❌ Reject
          </a>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ success: true, id: quest.id });
}
