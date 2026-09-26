/* =====================================================
   OSSKANSA E-VOTING
   SCRIPT.JS
   ===================================================== */


/* ================= CONFIG ================= */

const STORAGE_KEY = "osskansa_evoting_final_v1";
const API_URL = "https://osskansa-e-voting-api.osskansapage.workers.dev";
const ADMIN_PASSWORD = "11172000";


/* ================= DEFAULT DATA ================= */

const defaultData = {

    totalVoters: 1300,

    active: true,

    voted: false,

    candidates: [

        {
            number: "01",
            chairman: "Nama Ketua 01",
            vice: "Nama Wakil 01",
            photo: "img/paslon 01.png",
            vision: "Mewujudkan OSIS yang aktif, inovatif, dan menjadi wadah aspirasi siswa.",
            mission: [
                "Meningkatkan partisipasi siswa.",
                "Mengembangkan kegiatan siswa.",
                "Membangun komunikasi yang terbuka."
            ]
        },

        {
            number: "02",
            chairman: "Nama Ketua 02",
            vice: "Nama Wakil 02",
            photo: "img/paslon 01.png",
            vision: "Membangun organisasi siswa yang berintegritas, kreatif, dan berorientasi pada prestasi.",
            mission: [
                "Mendorong prestasi siswa.",
                "Meningkatkan kekompakan.",
                "Menciptakan kegiatan yang bermanfaat."
            ]
        }

    ],

    votes: [0, 0]
};


/* ================= STATE ================= */

let data = loadData();
let selectedCandidateIndex = null;
let currentVoterCode = localStorage.getItem("osskansa_current_voter_code") || "";


/* ================= STORAGE ================= */

function loadData() {

    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
        return clone(defaultData);
    }

    try {

        const parsed = JSON.parse(saved);

        if (
            !Array.isArray(parsed.candidates) ||
            parsed.candidates.length !== 2 ||
            !Array.isArray(parsed.votes)
        ) {
            return clone(defaultData);
        }

        parsed.votes = [
            Number(parsed.votes[0]) || 0,
            Number(parsed.votes[1]) || 0
        ];

        parsed.totalVoters = Math.max(
            1,
            Number(parsed.totalVoters) || 100
        );

        parsed.active = parsed.active !== false;
        parsed.voted = parsed.voted === true;

        return parsed;

    } catch {

        return clone(defaultData);

    }
}


function clone(object) {
    return JSON.parse(JSON.stringify(object));
}


function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function syncFromServer() {
    try {
        const response = await fetch(`${API_URL}/api/results`);

        if (!response.ok) {
            throw new Error("Gagal mengambil data server");
        }

        const serverData = await response.json();

        // Ambil data suara dari server
        data.votes = [
            Number(serverData.votes["01"]) || 0,
            Number(serverData.votes["02"]) || 0
        ];

        // Total pemilih dari server
        data.totalVoters = Number(serverData.totalVoters) || 1300;

        // Status pemilihan dari server
        data.active = serverData.active !== false;

        updateAll();

        console.log("Data berhasil disinkronkan dari server:", serverData);

    } catch (error) {
        console.error("Gagal sinkronisasi server:", error);
    }
}

setInterval(syncFromServer, 2000);

/* ================= INITIALIZE ================= */

   document.addEventListener("DOMContentLoaded", () => {
    if (currentVoterCode) {
        data.voted = true;
    }

    const voterCodeInput = document.getElementById("voterCode");

    voterCodeInput.addEventListener("input", () => {
        const code = voterCodeInput.value.trim().toUpperCase();

        if (code !== currentVoterCode) {
            data.voted = false;
            renderCandidates();
        }
    });

    renderCandidates();
    updateAll();
});


/* ================= CANDIDATES ================= */

function renderCandidates() {

    const grid = document.getElementById("candidateGrid");

    grid.innerHTML = "";

    data.candidates.forEach((candidate, index) => {

        const missionHTML = candidate.mission
            .map(item => `<li>${escapeHTML(item)}</li>`)
            .join("");

        const card = document.createElement("article");

        card.className = "candidate-card";

        card.innerHTML = `

            <div class="candidate-top">

                <div class="candidate-number">
                    PASLON ${escapeHTML(candidate.number)}
                </div>

                <div class="candidate-photo">
    <img 
        src="${escapeAttribute(candidate.photo)}"
        alt="Foto Paslon ${escapeAttribute(candidate.number)}"
    >
</div>

            </div>

            <div class="candidate-body">

                <h3>${escapeHTML(candidate.chairman)}</h3>

                <div class="vice">
                    Wakil: ${escapeHTML(candidate.vice)}
                </div>

                <div class="vision">

                    <small>VISI</small>

                    <p>
                        ${escapeHTML(candidate.vision)}
                    </p>

                </div>

                <div class="mission">

                    <span class="mission-title">
                        MISI
                    </span>

                    <ul>
                        ${missionHTML}
                    </ul>

                </div>

                <button
                    class="vote-btn"
                     onclick="openVoteModal(${index})"
                    ${!data.active || data.voted ? "disabled" : ""}
                    >
                 ${data.voted ? "Sudah Memilih" : "Pilih Paslon " + candidate.number}
                </button>

            </div>
        `;

        grid.appendChild(card);

    });
}


/* ================= VOTING ================= */

function openVoteModal(index) {

    if (!data.active) {
        notify("Pemungutan suara sedang ditutup.");
        return;
    }

    selectedCandidateIndex = index;

    const candidate = data.candidates[index];

    document.getElementById("selectedCandidate").innerHTML = `
        <strong>PASLON ${escapeHTML(candidate.number)}</strong><br>
        ${escapeHTML(candidate.chairman)} & ${escapeHTML(candidate.vice)}
    `;

    document.getElementById("voteModal").classList.remove("hidden");
}


function closeVoteModal() {

    document.getElementById("voteModal").classList.add("hidden");

    selectedCandidateIndex = null;
}


async function confirmVote() {

    if (selectedCandidateIndex === null) {
        return;
    }

    if (!data.active) {
        closeVoteModal();
        notify("Pemungutan suara sedang ditutup.");
        return;
    }

    try {
        const candidate = selectedCandidateIndex === 0 ? "01" : "02";

        const voterCodeInput = document.getElementById("voterCode");
const voterCode = voterCodeInput.value.trim().toUpperCase();

if (!voterCode) {
    notify("Masukkan kode pemilih terlebih dahulu.");
    return;
}

        const response = await fetch(`${API_URL}/api/vote`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
    candidate: candidate,
    voterCode: voterCode
})
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Suara gagal dicatat.");
        }

        data.votes = [
            Number(result.votes["01"]) || 0,
            Number(result.votes["02"]) || 0
        ];

        data.voted = true;
currentVoterCode = voterCode;

localStorage.setItem(
    "osskansa_current_voter_code",
    voterCode
);

voterCodeInput.value = "";

        saveData();

        closeVoteModal();

        updateAll();

        notify("Suara berhasil dicatat. Terima kasih!");

    } catch (error) {
        console.error("Gagal mengirim suara:", error);
        notify("Gagal mengirim suara ke server.");
    }
}


/* ================= UPDATE UI ================= */

function updateAll() {

    const totalVotes =
        data.votes.reduce((sum, vote) => sum + vote, 0);

    const percentage = Math.min(
        100,
        Math.round((totalVotes / data.totalVoters) * 100)
    );

    /* HERO */

    document.getElementById("heroTotal").textContent =
        data.totalVoters;

    document.getElementById("heroVotes").textContent =
        totalVotes;

    document.getElementById("heroPercent").textContent =
        percentage + "%";


    /* PROGRESS */

    document.getElementById("progressText").textContent =
        percentage + "%";

    document.getElementById("progressVotes").textContent =
        totalVotes;

    document.getElementById("progressTarget").textContent =
        data.totalVoters;

    document.getElementById("progressFill").style.width =
        percentage + "%";


    /* STATUS */

    updateStatus();


    /* CANDIDATES */

    renderCandidates();


    /* VOTED */

    document
        .getElementById("votedBox")
        .classList.toggle("hidden", !data.voted);

}


/* ================= STATUS ================= */

function updateStatus() {

    const pill = document.getElementById("statusPill");

    if (data.active) {

        pill.innerHTML = `
            <span></span>
            PEMUNGUTAN SUARA DIBUKA
        `;

    } else {

        pill.innerHTML = `
            <span style="background:#ff5b61;box-shadow:none"></span>
            PEMUNGUTAN SUARA DITUTUP
        `;

    }

}


/* ================= ADMIN LOGIN ================= */

function openAdmin() {

    document
        .getElementById("adminLogin")
        .classList.remove("hidden");

    document
        .getElementById("adminPassword")
        .focus();

}


function closeAdmin() {

    document
        .getElementById("adminLogin")
        .classList.add("hidden");

    document.getElementById("adminPassword").value = "";

    document.getElementById("loginError").textContent = "";

}


function loginAdmin() {

    const password =
        document.getElementById("adminPassword").value;

    if (password !== ADMIN_PASSWORD) {

        document.getElementById("loginError").textContent =
            "Password admin salah.";

        return;
    }

    closeAdmin();

    document
        .getElementById("adminPanel")
        .classList.remove("hidden");

    renderAdmin();

}


function logoutAdmin() {

    document
        .getElementById("adminPanel")
        .classList.add("hidden");

}


/* ================= ADMIN ================= */

function renderAdmin() {

    const totalVotes =
        data.votes.reduce((sum, vote) => sum + vote, 0);

    const remaining =
        Math.max(0, data.totalVoters - totalVotes);

    const percentage =
        Math.min(
            100,
            Math.round((totalVotes / data.totalVoters) * 100)
        );


    document.getElementById("adminTotal").textContent =
        data.totalVoters;

    document.getElementById("adminVoted").textContent =
        totalVotes;

    document.getElementById("adminRemaining").textContent =
        remaining;

    document.getElementById("adminPercent").textContent =
        percentage + "%";

    document.getElementById("totalVoterInput").value =
        data.totalVoters;


    /* STATUS */

    const status = document.getElementById("adminStatus");
    const toggle = document.getElementById("toggleBtn");
    const statusText =
        document.getElementById("electionStatusText");

    if (data.active) {

        status.textContent = "AKTIF";
        status.classList.remove("closed");

        toggle.textContent = "Tutup Voting";

        statusText.textContent =
            "Pemungutan suara sedang dibuka.";

    } else {

        status.textContent = "DITUTUP";
        status.classList.add("closed");

        toggle.textContent = "Buka Voting";

        statusText.textContent =
            "Pemungutan suara sedang ditutup.";

    }


    renderResults();
    renderEditor();

}


/* ================= TOGGLE ================= */

async function toggleElection() {

    try {

        const password = prompt("Masukkan password admin:");

if (!password) {
    return;
}

const response = await fetch(`${API_URL}/api/toggle-election`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        password: password
    })
});

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error("Gagal mengubah status pemilihan.");
        }

        data.active = result.active;

        updateAll();
        renderAdmin();

        notify(
            data.active
                ? "Pemungutan suara dibuka."
                : "Pemungutan suara ditutup."
        );

    } catch (error) {

        console.error("Gagal mengubah status pemilihan:", error);

        notify("Gagal mengubah status pemilihan.");
    }
}


/* ================= TOTAL VOTERS ================= */

function saveTotalVoters() {

    const input =
        document.getElementById("totalVoterInput");

    const value = Number(input.value);

    if (!value || value < 1) {

        notify("Jumlah pemilih harus lebih dari 0.");

        return;
    }

    const totalVotes =
        data.votes.reduce((sum, vote) => sum + vote, 0);

    if (value < totalVotes) {

        notify(
            "Jumlah pemilih tidak boleh lebih kecil dari suara yang sudah masuk."
        );

        return;
    }

    data.totalVoters = value;

    saveData();

    updateAll();

    renderAdmin();

    notify("Jumlah pemilih berhasil diperbarui.");

}


/* ================= RESULTS ================= */

function renderResults() {

    const container =
        document.getElementById("resultChart");

    const totalVotes =
        data.votes.reduce((sum, vote) => sum + vote, 0);

    container.innerHTML = "";

    data.candidates.forEach((candidate, index) => {

        const vote = data.votes[index];

        const percent =
            totalVotes === 0
                ? 0
                : Math.round((vote / totalVotes) * 100);

        const item =
            document.createElement("div");

        item.className = "result-item";

        item.innerHTML = `

            <div class="result-head">

                <strong>
                    PASLON ${escapeHTML(candidate.number)}
                </strong>

                <span>
                    ${vote} suara · ${percent}%
                </span>

            </div>

            <div class="result-track">

                <div
                    class="result-fill"
                    style="width:${percent}%"
                ></div>

            </div>

        `;

        container.appendChild(item);

    });

}


/* ================= EDITOR ================= */

function renderEditor() {

    const container =
        document.getElementById("candidateEditor");

    container.innerHTML = "";

    const grid =
        document.createElement("div");

    grid.className = "editor-grid";

    data.candidates.forEach((candidate, index) => {

        const box =
            document.createElement("div");

        box.className = "editor-box";

        box.innerHTML = `

            <h3>Paslon ${escapeHTML(candidate.number)}</h3>

            <label class="editor-label">
                Nama Ketua
            </label>

            <input
                class="editor-input"
                id="chairman-${index}"
                value="${escapeAttribute(candidate.chairman)}"
            >

            <label class="editor-label">
                Nama Wakil
            </label>

            <input
                class="editor-input"
                id="vice-${index}"
                value="${escapeAttribute(candidate.vice)}"
            >

            <label class="editor-label">
                Visi
            </label>

            <textarea
                class="editor-input"
                id="vision-${index}"
                rows="4"
            >${escapeHTML(candidate.vision)}</textarea>

            <button
                class="btn primary editor-save"
                onclick="saveCandidate(${index})"
            >
                Simpan Paslon ${escapeHTML(candidate.number)}
            </button>

        `;

        grid.appendChild(box);

    });

    container.appendChild(grid);

}


/* ================= SAVE CANDIDATE ================= */

function saveCandidate(index) {

    const chairman =
        document.getElementById(`chairman-${index}`).value.trim();

    const vice =
        document.getElementById(`vice-${index}`).value.trim();

    const vision =
        document.getElementById(`vision-${index}`).value.trim();

    if (!chairman || !vice || !vision) {

        notify("Semua data paslon harus diisi.");

        return;
    }

    data.candidates[index].chairman = chairman;
    data.candidates[index].vice = vice;
    data.candidates[index].vision = vision;

    saveData();

    renderCandidates();
    renderEditor();

    notify(
        `Data Paslon ${data.candidates[index].number} berhasil disimpan.`
    );

}


/* ================= RESET ================= */

async function resetVoting() {

    const confirmReset =
        confirm(
            "Yakin ingin mereset seluruh suara?\n\nSemua perolehan suara akan kembali menjadi 0."
        );

    if (!confirmReset) {
        return;
    }

    try {
        const password = prompt("Masukkan password admin:");

if (!password) {
    return;
}

const response = await fetch(`${API_URL}/api/reset`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        password: password
    })
});

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Reset gagal.");
        }

        data.votes = [0, 0];
        data.voted = false;

        saveData();

        updateAll();
        renderAdmin();

        notify("Seluruh suara berhasil direset.");

    } catch (error) {
        console.error("Gagal mereset suara:", error);
        notify("Gagal mereset suara di server.");
    }
}


/* ================= NOTIFICATION ================= */

let notificationTimer;

function notify(message) {

    const notification =
        document.getElementById("notification");

    const text =
        document.getElementById("notificationText");

    text.textContent = message;

    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {

        notification.classList.remove("show");

    }, 3000);

}


/* ================= ESCAPE HTML ================= */

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function escapeAttribute(value) {

    return escapeHTML(value);

}


/* ================= KEYBOARD ================= */

document.addEventListener("keydown", (event) => {

    if (
        event.key === "Enter" &&
        !document
            .getElementById("adminLogin")
            .classList.contains("hidden")
    ) {

        loginAdmin();

    }

    if (event.key === "Escape") {

        closeVoteModal();
        closeAdmin();

    }

});


/* ================= CLICK OUTSIDE ================= */

document
    .getElementById("voteModal")
    .addEventListener("click", function(event) {

        if (event.target === this) {
            closeVoteModal();
        }

    });


document
    .getElementById("adminLogin")
    .addEventListener("click", function(event) {

        if (event.target === this) {
            closeAdmin();
        }

    });

