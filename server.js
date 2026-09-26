const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = "11172000"

const DATA_FILE = path.join(__dirname, "votes.json");

app.use(express.json());

// Menampilkan website
app.use(express.static(__dirname));

// Membaca data vote
function readData() {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    } catch (error) {
        return {
            totalVoters: 1300,
            active: true,
            votes: {
                "01": 0,
                "02": 0
            }
        };
    }
}

// Menyimpan data vote
function saveData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2),
        "utf8"
    );
}

// Ambil hasil vote
app.get("/api/results", (req, res) => {
    const data = readData();
    res.json(data);
});

// Kirim vote
// Kirim vote
app.post("/api/vote", (req, res) => {
    const { candidate, voterCode } = req.body;

    // Cek paslon
    if (candidate !== "01" && candidate !== "02") {
        return res.status(400).json({
            success: false,
            message: "Paslon tidak valid"
        });
    }

    // Cek kode pemilih
    const validVoterCodes = [
        "OSS001",
        "OSS002",
        "OSS003",
        "OSS004",
        "OSS005"
    ];

    if (!validVoterCodes.includes(voterCode)) {
        return res.status(400).json({
            success: false,
            message: "Kode pemilih tidak valid"
        });
    }

    const data = readData();

    if (!data.active) {
        return res.status(403).json({
            success: false,
            message: "Pemilihan sedang ditutup"
        });
    }

    // Pastikan voters tersedia
    if (!data.voters) {
        data.voters = {};
    }

    // Cek apakah kode sudah digunakan
    if (data.voters[voterCode]) {
        return res.status(409).json({
            success: false,
            message: "Kode pemilih sudah digunakan"
        });
    }

    // Tambahkan suara
    data.votes[candidate]++;

    // Tandai kode sudah memilih
    data.voters[voterCode] = true;

    saveData(data);

    res.json({
        success: true,
        votes: data.votes
    });
});

// Buka / tutup pemilihan
app.post("/api/toggle-election", (req, res) => {
    const { password } = req.body;

    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({
            success: false,
            message: "Password admin salah."
        });
    }

    const data = readData();

    data.active = !data.active;

    saveData(data);

    res.json({
        success: true,
        active: data.active
    });
});


app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});

// Reset semua suara
app.post("/api/reset", (req, res) => {
    const { password } = req.body;

if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({
        success: false,
        message: "Password admin salah."
    });
}
    const data = {
        totalVoters: 1300,
        active: true,
        votes: {
            "01": 0,
            "02": 0
        },
        voters: {}
    };

    saveData(data);

    res.json({
        success: true,
        message: "Semua suara berhasil direset.",
        data: data
    });
});