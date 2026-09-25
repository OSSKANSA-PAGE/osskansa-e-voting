export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    // =========================
    // HASIL SUARA
    // =========================
    if (url.pathname === "/api/results" && request.method === "GET") {
      const result = await env.DB
        .prepare("SELECT candidate, count FROM votes")
        .all();

      const votes = {
        "01": 0,
        "02": 0
      };

      for (const row of result.results) {
        votes[row.candidate] = Number(row.count);
      }

      return json({
        totalVoters: 1300,
        active: true,
        votes
      });
    }

    // =========================
    // VOTE
    // =========================
    if (url.pathname === "/api/vote" && request.method === "POST") {
      const body = await request.json();

      const candidate = body.candidate;
      const voterCode = String(body.voterCode || "")
        .trim()
        .toUpperCase();

      if (candidate !== "01" && candidate !== "02") {
        return json({
          success: false,
          message: "Paslon tidak valid."
        }, 400);
      }

      if (!voterCode) {
        return json({
          success: false,
          message: "Kode pemilih wajib diisi."
        }, 400);
      }

      // Cek apakah kode sudah pernah digunakan
      const existing = await env.DB
        .prepare(
          "SELECT voter_code FROM voters WHERE voter_code = ?"
        )
        .bind(voterCode)
        .first();

      if (existing) {
        return json({
          success: false,
          message: "Kode pemilih sudah digunakan."
        }, 409);
      }

      // Tambahkan suara
      await env.DB
        .prepare(
          "UPDATE votes SET count = count + 1 WHERE candidate = ?"
        )
        .bind(candidate)
        .run();

      // Tandai kode pemilih sudah digunakan
      await env.DB
        .prepare(
          "INSERT INTO voters (voter_code) VALUES (?)"
        )
        .bind(voterCode)
        .run();

      // Ambil hasil terbaru
      const result = await env.DB
        .prepare("SELECT candidate, count FROM votes")
        .all();

      const votes = {
        "01": 0,
        "02": 0
      };

      for (const row of result.results) {
        votes[row.candidate] = Number(row.count);
      }

      return json({
        success: true,
        votes
      });
    }

    // =========================
    // RESET
    // =========================
    if (url.pathname === "/api/reset" && request.method === "POST") {
      const body = await request.json();

      if (body.password !== env.ADMIN_PASSWORD) {
        return json({
          success: false,
          message: "Password admin salah."
        }, 401);
      }

      await env.DB
        .prepare("UPDATE votes SET count = 0")
        .run();

      await env.DB
        .prepare("DELETE FROM voters")
        .run();

      return json({
        success: true,
        message: "Semua suara berhasil direset."
      });
    }

    return json({
      message: "OSSKANSA Voting API aktif."
    });
  }
};


// =========================
// JSON RESPONSE
// =========================

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders()
      }
    }
  );
}


// =========================
// CORS
// =========================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}
