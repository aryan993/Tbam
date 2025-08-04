import { NextResponse } from 'next/server';
import { supabase } from '@/app/utils/dbconnect';

// GET: Handles list, birthday, anniversary
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const filterType = url.searchParams.get("filterType");

    if (filterType === "list") {
      const page = parseInt(url.searchParams.get("page")) || 1;
      const limit = parseInt(url.searchParams.get("limit")) || 10;
      const offset = (page - 1) * limit;

      let query = supabase
        .from("user")
        .select("*", { count: "exact" })
        .range(offset, offset + limit - 1);

      ["name", "club", "type", "phone", "email", "dob", "anniversary"].forEach((field) => {
        const value = url.searchParams.get(field);
        if (value) {
          query = query.ilike(field, `%${value}%`);
        }
      });

      const { data, error } = await query;
      if (error) return Response.json({ error: error.message }, { status: 500 });
      return Response.json(data);
    }

    // birthday or anniversary
    const from_date = url.searchParams.get("startDate");
    const to_date = url.searchParams.get("endDate");
    const type = url.searchParams.get("type");

    if (!filterType || !from_date || !to_date) {
      return Response.json({ error: "Missing required parameters: filterType, startDate, or endDate" }, { status: 400 });
    }

    if (!["birthday", "anniversary"].includes(filterType)) {
      return Response.json({ error: 'Invalid filterType. Must be either "birthday" or "anniversary"' }, { status: 400 });
    }

    let query;

    if (filterType === "birthday" && type === "member") {
      query = supabase
        .from("user")
        .select("id, name, club, phone, email, dob, profile,poster,tbam")
        .eq("type", "member")
        .gte("dob", from_date)
        .lte("dob", to_date)
        .eq('active', true)
        .order("dob", { ascending: true });
    } else if (filterType === "birthday" && type === "spouse") {
      query = supabase
        .from("user")
        .select(`id, name, club, phone, email, dob, profile,poster,tbam, partner:partner_id (id,name)`)
        .eq("type", "spouse")
        .gte("dob", from_date)
        .lte("dob", to_date)
        .eq('active', true)
        .order("dob", { ascending: true });
    } else {
      query = supabase
        .from("user")
        .select(`id, name, type, email, phone, anniversary, profile,annposter,tbam, partner:partner_id (id, name, type, profile,active)`)
        .eq("type", "member")
        .gte("anniversary", from_date)
        .lte("anniversary", to_date)
        .eq('active', true)
        .eq('partner.active', true)
        .order("anniversary", { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      if (error.code === "42P01") return Response.json({ message: "Table not found" }, { status: 404 });
      error("Supabase query error:", error);
      throw error;
    }

    if (!data || data.length === 0) {
      return Response.json({ message: "No records found for the specified date range" }, { status: 200 });
    }

    let processedData = data;
    if (filterType === "anniversary") {
      const uniquePairs = new Set();
      processedData = data.filter((item) => {
        // Skip if partner is missing or inactive
        if (!item.partner || item.partner.active !== true) return false;

        const pairKey1 = `${item.id}-${item.partner.id}`;
        const pairKey2 = `${item.partner.id}-${item.id}`;
        if (uniquePairs.has(pairKey2)) return false;
        uniquePairs.add(pairKey1);
        return true;
      });
    }

    return Response.json(processedData);
  } catch (err) {
    return Response.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST: Handles only user and partner update via JSON
export async function POST(request) {
  try {
    const contentType = request.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return NextResponse.json({ error: "Content-Type must be application/json" }, { status: 400 });
    }

    const body = await request.json();
    const { id, partner, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing user ID" }, { status: 400 });
    }

    // Fetch existing data for comparison
    const { data: existingUser, error: fetchUserError } = await supabase
      .from("user")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchUserError || !existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let existingPartner = null;
    if (partner?.id) {
      const { data, error } = await supabase
        .from("user")
        .select("*")
        .eq("id", partner.id)
        .single();
      existingPartner = data || null;
    }

    // Compare and collect changes
    const changeLogMap = {};

    const addChange = (uid, path, oldVal, newVal) => {
      if (!changeLogMap[uid]) changeLogMap[uid] = [];
      changeLogMap[uid].push({ path, old_value: oldVal?.toString() || null, new_value: newVal?.toString() || null });
    };

    for (const key in updateData) {
      if (updateData[key] !== existingUser[key]) {
        addChange(id, `user.${key}`, existingUser[key], updateData[key]);
      }
    }

    if (partner?.id && existingPartner) {
      for (const key in partner) {
        if (key !== "id" && partner[key] !== existingPartner[key]) {
          addChange(partner.id, `partner.${key}`, existingPartner[key], partner[key]);
        }
      }
    }

    // Perform updates
    const userUpdate = supabase.from("user").update(updateData).eq("id", id);
    const updates = [userUpdate];

    if (partner?.id) {
      const { id: partnerId, ...partnerData } = partner;
      const partnerUpdate = supabase.from("user").update(partnerData).eq("id", partnerId);
      updates.push(partnerUpdate);
    }

    const results = await Promise.all(updates);
    const errors = results.map(r => r.error).filter(Boolean);

    if (errors.length > 0) {
      console.error("Update error(s):", errors);
      return NextResponse.json({ error: "Failed to update user or partner", details: errors }, { status: 500 });
    }

    // Insert logs
    const logs = Object.entries(changeLogMap).map(([uid, changes]) => ({
      user_id: uid,
      action: "update",
      changes,
    }));

    if (logs.length > 0) {
      const { error: logError } = await supabase.from("change_log").insert(logs);
      if (logError) {
        console.error("Failed to log changes:", logError);
        // Don't block response
      }
    }

    return NextResponse.json({ success: true, message: "User and partner updated" });

  } catch (error) {
    console.error("Unhandled POST error:", error);
    return NextResponse.json({ error: "Internal server error", details: error.message }, { status: 500 });
  }
}
