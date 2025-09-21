import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ⚠️ service role
);

export default async function handler(req, res) {
  try {
    const { barcode } = req.body;

    // 1. Find staff by barcode
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("staff_email, staff_position, staff_name")
      .eq("staff_barcode", barcode)
      .single();

    if (staffError || !staff) {
      return res.status(400).json({ error: "Invalid QR" });
    }

    // 2. Create a session for this user
    const { data: user } = await supabaseAdmin.auth.admin.getUserByEmail(staff.staff_email);

    if (!user) {
      return res.status(404).json({ error: "User not found in Auth" });
    }

    // 3. Issue a session (one-time token)
    const { data: session, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: staff.staff_email,
    });

    if (sessionError) {
      return res.status(500).json({ error: sessionError.message });
    }

    // session.properties contains a `action_link` with an access_token
    return res.status(200).json({
      access_token: session.properties?.access_token,
      staff,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
}
