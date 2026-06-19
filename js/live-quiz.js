// ==========================================
// CONFIGURATION: Set the backend mode here
// Options: 'firebase' or 'gas'
// ==========================================
const BACKEND_MODE = 'firebase';

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAECGMk5F130LcGzpEN1nbJubBSG1AVmgI",
    authDomain: "stem-8237e.firebaseapp.com",
    databaseURL: "https://stem-8237e-default-rtdb.firebaseio.com",
    projectId: "stem-8237e",
    storageBucket: "stem-8237e.firebasestorage.app",
    messagingSenderId: "528768244250",
    appId: "1:528768244250:web:d1b839f579a0eb372e0fa3",
    measurementId: "G-HP35KPYMF6"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==========================================
// GOOGLE APPS SCRIPT CONFIGURATION
// ==========================================
// Paste your deployed Google Apps Script Web App URL here
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbz_REPLACE_THIS_WITH_YOUR_URL/exec";

async function gasPost(action, payload) {
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...payload })
        });
        return await response.json();
    } catch (e) {
        console.error("GAS POST Error", e);
        return { error: e };
    }
}

let gasPollingInterval = null;
let currentRoomDataCache = null;

function startGASPolling() {
    if (gasPollingInterval) clearInterval(gasPollingInterval);
    gasPollingInterval = setInterval(async () => {
        try {
            const res = await fetch(GAS_WEB_APP_URL + '?action=getRoom&roomCode=' + lqRoomCode);
            const data = await res.json();
            if (!data.error) {
                currentRoomDataCache = data;
                handleRoomDataUpdate(data);
            }
        } catch (e) { console.error("Polling error", e); }
    }, 3000); // Poll every 3 seconds
}

// ==========================================
// STATE VARIABLES
// ==========================================
let lqRoomCode = "";
let lqPlayerName = "";
let allQuizData = null; // Contains all grades
let lqQuizData = null;  // Contains the specific grade & unit being played
let lqCurrentQuestionIndex = -1;
let lqQuestionOrder = []; // Shuffled order of questions
let lqMyScore = 0;
let lqCategoryScores = {}; // Tracks score per category: critical_thinking, problem_solving, safety, ethics
let lqCurrentGrade = "";  // Tracks the current grade (e.g. 'grade1') for special rendering
let lqAnsweredCurrent = false;
let studentsData = null;
let teachersData = null;
let isHost = false;
let timerInterval = null;
let lqCurrentSchool = "";

window.lqShowNotification = (msg, isError = true) => {
    const el = document.createElement('div');
    el.innerText = msg;
    el.style.cssText = `position:fixed;top:20px;right:20px;background:${isError ? 'var(--red, #e74c3c)' : 'var(--green, #2ecc71)'};color:white;padding:15px 20px;border-radius:8px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.3);font-weight:bold;transition:opacity 0.3s;`;
    document.body.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
    }, 4000);
};

window.lqShowView = (viewId) => {
    document.querySelectorAll('.lq-view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if (el) el.classList.add('active');
};

window.initLiveQuiz = async () => {
    // ----------------------------------------------------
    // OFFLINE CHECK
    // ----------------------------------------------------
    if (!navigator.onLine) {
        const appEl = document.getElementById('live-quiz-app');
        if (appEl) {
            appEl.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; text-align: center;">
                    <div style="font-size: 5rem; margin-bottom: 20px;">📡</div>
                    <h1 style="font-family: var(--font-head); font-size: 2rem; color: var(--text);">No Internet Connection</h1>
                    <p style="color: var(--text-muted); font-size: 1.1rem; max-width: 500px; margin-top: 15px;">
                        The Live Quiz requires an active internet connection to connect with the teacher and other students. 
                        Please connect to WiFi and try again.
                    </p>
                    <button class="btn-primary" style="margin-top: 25px;" onclick="window.location.reload()">Refresh Page</button>
                </div>
            `;
        }
        return;
    }
    // ----------------------------------------------------

    try {
        const [questionsRes, teachersRes] = await Promise.all([
            fetch('live-quiz-data/questions.json'),
            fetch('live-quiz-data/teachers.json')
        ]);
        if (!questionsRes.ok || !teachersRes.ok) throw new Error('Quiz data files not found');
        allQuizData = await questionsRes.json();
        teachersData = await teachersRes.json();
    } catch (e) {
        console.error("Failed to load live quiz data from local files:", e);
        const homeEl = document.getElementById('lq-home-page');
        if (homeEl) {
            const warn = document.createElement('p');
            warn.style.cssText = 'color:var(--red);margin-top:12px;font-weight:bold;';
            warn.innerText = '⚠️ Quiz data failed to load. Please refresh the page.';
            homeEl.appendChild(warn);
        }
    }
};

window.lqHostLogin = async () => {
    const hostName = document.getElementById('lq-host-name').value.trim();
    const hostPass = document.getElementById('lq-host-pass').value.trim();
    const schoolSelect = document.getElementById('lq-host-school').value;
    const gradeSelect = document.getElementById('lq-host-grade').value;
    const unitSelect = document.getElementById('lq-host-unit') ? document.getElementById('lq-host-unit').value : 'baseline';

    if (teachersData && teachersData.teachers) {
        const teachersArray = Array.isArray(teachersData.teachers) ? teachersData.teachers : Object.values(teachersData.teachers);
        const validTeacher = teachersArray.find(t => t && t.name.toLowerCase() === hostName.toLowerCase() && t.password === hostPass);
        if (!validTeacher) {
            lqShowNotification("Invalid Teacher Name or Password!");
            return;
        }
    } else {
        lqShowNotification("Teacher data not loaded!");
        return;
    }

    if (!allQuizData || !allQuizData[gradeSelect] || !allQuizData[gradeSelect][unitSelect]) {
        lqShowNotification("Exam data for selected class/grade and unit not found!");
        return;
    }

    lqQuizData = allQuizData[gradeSelect][unitSelect];
    lqPlayerName = hostName; // Host plays under their own name!

    await lqCreateRoom(schoolSelect, gradeSelect, unitSelect);
};

async function lqCreateRoom(schoolSelect, gradeSelect, unitSelect) {
    isHost = true;
    lqCurrentSchool = schoolSelect;
    lqCurrentGrade = gradeSelect;
    lqCategoryScores = {};
    lqMyScore = 0;
    lqRoomCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    document.getElementById('lq-display-room-code').innerText = lqRoomCode;

    if (BACKEND_MODE === 'firebase') {
        const roomRef = ref(db, 'rooms/' + lqRoomCode);
        await set(roomRef, {
            status: 'waiting',
            currentQuestion: -1,
            hostId: lqPlayerName,
            school: schoolSelect,
            grade: gradeSelect,
            unit: unitSelect,
            quiz: lqQuizData,
            startTime: 0,
            players: {},
            responses: {}
        });
        lqListenToPlayersFirebase();
        lqListenToGameFirebase();
    } else {
        await gasPost('createRoom', {
            roomCode: lqRoomCode,
            data: {
                status: 'waiting',
                currentQuestion: -1,
                hostId: lqPlayerName,
                school: schoolSelect,
                grade: gradeSelect,
                unit: unitSelect,
                quiz: lqQuizData,
                startTime: 0,
                players: {},
                responses: {}
            }
        });
        startGASPolling();
    }

    window.lqShowView('lq-host-setup-page');
    document.getElementById('lq-host-pre-start').style.display = 'block';
    const activeDash = document.getElementById('lq-host-active-dashboard');
    if (activeDash) activeDash.style.display = 'none';
}

window.lqStartGame = () => {
    if (BACKEND_MODE === 'firebase') {
        update(ref(db, `rooms/${lqRoomCode}`), {
            status: 'active',
            currentQuestion: 0,
            startTime: Date.now() // Start the 10 min timer
        });
    } else {
        gasPost('updateRoom', {
            roomCode: lqRoomCode,
            data: {
                status: 'active',
                currentQuestion: 0,
                startTime: Date.now()
            }
        });
    }

    const preStart = document.getElementById('lq-host-pre-start');
    if (preStart) preStart.style.display = 'none';
    const activeDash = document.getElementById('lq-host-active-dashboard');
    if (activeDash) activeDash.style.display = 'block';
};

window.lqNextQuestion = async () => {
    if (BACKEND_MODE === 'firebase') {
        const snapshot = await get(ref(db, `rooms/${lqRoomCode}/currentQuestion`));
        let nextIndex = snapshot.val() + 1;

        if (nextIndex >= lqQuizData.questions.length) {
            window.lqEndQuiz();
        } else {
            update(ref(db, `rooms/${lqRoomCode}`), { currentQuestion: nextIndex });
        }
    } else {
        let nextIndex = (currentRoomDataCache ? currentRoomDataCache.currentQuestion : 0) + 1;

        if (nextIndex >= lqQuizData.questions.length) {
            window.lqEndQuiz();
        } else {
            gasPost('updateRoom', { roomCode: lqRoomCode, data: { currentQuestion: nextIndex } });
        }
    }
};

window.lqEndQuiz = () => {
    if (BACKEND_MODE === 'firebase') {
        update(ref(db, `rooms/${lqRoomCode}`), { status: 'ended' });
    } else {
        gasPost('updateRoom', { roomCode: lqRoomCode, data: { status: 'ended' } });
    }
};


window.lqJoinGame = async () => {
    lqRoomCode = document.getElementById('lq-join-code').value.trim();
    const rawName = document.getElementById('lq-join-name').value.trim();

    if (lqRoomCode.length !== 6) {
        lqShowNotification("Please enter a valid 6-digit Classroom Code!");
        return;
    }

    // Clean and normalize name: compress consecutive spaces to a single space
    lqPlayerName = rawName.replace(/\s+/g, ' ');

    if (lqPlayerName.length <= 3) {
        lqShowNotification("Name must be more than 3 letters long!");
        return;
    }

    // Enforce letters and single spaces only (no numbers, no symbols)
    const nameRegex = /^[a-zA-Z]+( [a-zA-Z]+)*$/;
    if (!nameRegex.test(lqPlayerName)) {
        lqShowNotification("Name must contain only letters (no numbers or symbols allowed)!");
        return;
    }

    isHost = false;

    if (BACKEND_MODE === 'firebase') {
        const roomSnapshot = await get(ref(db, `rooms/${lqRoomCode}`));
        if (!roomSnapshot.exists()) {
            lqShowNotification("Room not found!");
            return;
        }

        const roomData = roomSnapshot.val();
        lqQuizData = roomData.quiz;
        lqCurrentGrade = roomData.grade || "";
        lqCategoryScores = {};
        lqMyScore = 0;

        // Prevent duplicate player names
        if (roomData.players && roomData.players[lqPlayerName]) {
            lqShowNotification("This name is already taken in this classroom! Please use a different name.");
            return;
        }

        await set(ref(db, `rooms/${lqRoomCode}/players/${lqPlayerName}`), {
            name: lqPlayerName,
            score: 0,
            school: roomData.school || "Unknown"
        });

        document.getElementById('lq-waiting-room-code').innerText = lqRoomCode;
        window.lqShowView('lq-player-waiting-page');

        lqListenToGameFirebase();
        lqListenToPlayersFirebase();
    } else {
        const res = await fetch(GAS_WEB_APP_URL + '?action=getRoom&roomCode=' + lqRoomCode);
        const roomData = await res.json();

        if (roomData.error || !roomData.status) {
            lqShowNotification("Room not found!");
            return;
        }

        lqQuizData = roomData.quiz;
        lqCurrentGrade = roomData.grade || "";
        lqCategoryScores = {};
        lqMyScore = 0;

        if (roomData.players && roomData.players[lqPlayerName]) {
            lqShowNotification("This name is already taken in this classroom! Please use a different name.");
            return;
        }

        await gasPost('joinPlayer', {
            roomCode: lqRoomCode,
            playerName: lqPlayerName,
            playerData: {
                name: lqPlayerName,
                score: 0,
                school: roomData.school || "Unknown"
            }
        });

        document.getElementById('lq-waiting-room-code').innerText = lqRoomCode;
        window.lqShowView('lq-player-waiting-page');

        startGASPolling();
    }
};

// ==========================================
// FIREBASE LISTENERS
// ==========================================
function lqListenToPlayersFirebase() {
    onValue(ref(db, `rooms/${lqRoomCode}/players`), (snapshot) => {
        const players = snapshot.val() || {};
        updatePlayersUI(players);
    });
}

function lqListenToGameFirebase() {
    onValue(ref(db, `rooms/${lqRoomCode}`), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        updateGameStateUI(data, data.players || {});
    });
}

// ==========================================
// GAS LISTENERS / POLLING
// ==========================================
function handleRoomDataUpdate(data) {
    updatePlayersUI(data.players || {});
    updateGameStateUI(data, data.players || {});
}

// ==========================================
// SHARED UI UPDATE FUNCTIONS
// ==========================================
function updatePlayersUI(players) {
    // 1. Update waiting room count
    const count = Object.keys(players).length;
    const countEl = document.getElementById('lq-players-count');
    if (countEl) countEl.innerText = count;

    // 2. Update Host Dashboard list (if visible)
    const hostList = document.getElementById('lq-host-player-list');
    if (hostList) {
        hostList.innerHTML = '';
        const hostCountEl = document.getElementById('lq-host-player-count');
        if (hostCountEl) hostCountEl.innerText = count;
        for (let p in players) {
            const li = document.createElement('li');
            li.innerText = p;
            hostList.appendChild(li);
        }
    }

    // 3. Update Live Sidebar Leaderboard (during quiz)
    const sidebarList = document.getElementById('lq-live-sidebar-list');
    if (sidebarList) {
        sidebarList.innerHTML = '';
        const sorted = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
        sorted.forEach(([p, pdata], i) => {
            const li = document.createElement('li');
            li.style.padding = '10px 0';
            li.style.borderBottom = '1px solid var(--border)';
            li.style.fontSize = '0.95rem';

            let rankStr = `<strong>#${i + 1}</strong>`;
            if (i === 0) rankStr = '🥇';
            if (i === 1) rankStr = '🥈';
            if (i === 2) rankStr = '🥉';

            li.innerHTML = `<span>${rankStr} ${p}</span>`;
            sidebarList.appendChild(li);
        });
    }

    // 4. Update Host Big Leaderboard
    const hostLiveList = document.getElementById('lq-host-live-leaderboard');
    if (hostLiveList) {
        const liveCountEl = document.getElementById('lq-host-live-count');
        if (liveCountEl) liveCountEl.innerText = count;

        hostLiveList.innerHTML = '';
        const sorted = Object.entries(players).sort((a, b) => b[1].score - a[1].score);

        if (sorted.length === 0) {
            hostLiveList.innerHTML = '<li style="text-align:center; padding: 30px; color: var(--text-muted); font-size: 1.2rem;">Waiting for students to join... 😴</li>';
        } else {
            sorted.forEach(([p, pdata], i) => {
                const li = document.createElement('li');
                li.style.padding = '15px 0';
                li.style.borderBottom = '1px solid var(--border)';
                li.style.display = 'flex';
                li.style.justifyContent = 'space-between';
                li.style.alignItems = 'center';

                let rankStr = `<strong>#${i + 1}</strong>`;
                if (i === 0) rankStr = '<span style="font-size:2rem;">🥇</span>';
                if (i === 1) rankStr = '<span style="font-size:1.8rem;">🥈</span>';
                if (i === 2) rankStr = '<span style="font-size:1.6rem;">🥉</span>';

                li.innerHTML = `<span>${rankStr} ${p}</span> <span style="color:var(--cyan); font-weight:bold; font-size: 1.3rem;">${pdata.score} pts</span>`;
                hostLiveList.appendChild(li);
            });
        }
    }
}

function updateGameStateUI(data, players) {
    if (data.status === 'active') {
        if (isHost) {
            if (data.startTime && !timerInterval) {
                startTimer(data.startTime);
            }
        } else {
            if (lqCurrentQuestionIndex === -1 && data.currentQuestion >= 0) {
                lqCurrentQuestionIndex = 0;
                lqAnsweredCurrent = false;

                lqQuestionOrder = Array.from({ length: lqQuizData.questions.length }, (_, i) => i);
                lqQuestionOrder.sort(() => Math.random() - 0.5);

                if (data.startTime) {
                    startTimer(data.startTime);
                }

                lqRenderQuestion();
            }
        }
    } else if (data.status === 'ended') {
        if (timerInterval) clearInterval(timerInterval);
        if (gasPollingInterval) clearInterval(gasPollingInterval);
        lqShowLeaderboard(players);
    }
}

// ==========================================
// TIMER & RENDERING
// ==========================================
function startTimer(startTimeMs) {
    if (timerInterval) clearInterval(timerInterval);
    const durationMinutes = (lqQuizData && lqQuizData.duration) ? lqQuizData.duration : 10;
    const totalTimeSeconds = durationMinutes * 60;

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeMs) / 1000);
        const remaining = totalTimeSeconds - elapsed;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            const timerEl = document.getElementById('lq-timer-display');
            if (timerEl) timerEl.innerText = "⏱️ Time's Up!";
            const hostTimerEl = document.getElementById('lq-host-timer-display');
            if (hostTimerEl) hostTimerEl.innerText = "⏱️ Time's Up!";

            // Disable buttons locally
            const optsContainer = document.getElementById('lq-options-container');
            if (optsContainer) optsContainer.innerHTML = '<h3 style="color:var(--red);">Time is up! Waiting for teacher...</h3>';

            // Only host actually calls endQuiz to update DB
            if (isHost) {
                window.lqEndQuiz();
            }
            return;
        }

        const m = Math.floor(remaining / 60).toString().padStart(2, '0');
        const s = (remaining % 60).toString().padStart(2, '0');
        const timeStr = `⏱️ ${m}:${s}`;

        const timerEl = document.getElementById('lq-timer-display');
        if (timerEl) timerEl.innerText = timeStr;
        const hostTimerEl = document.getElementById('lq-host-timer-display');
        if (hostTimerEl) hostTimerEl.innerText = timeStr;
    }, 1000);
}

function lqRenderQuestion() {
    window.lqShowView('lq-quiz-page');
    let realIndex = lqQuestionOrder[lqCurrentQuestionIndex];
    let qData = lqQuizData?.questions[realIndex];
    if (!qData) return;

    const qCategory = qData.category || 'uncategorized';

    // Category badge label
    const categoryLabels = {
        critical_thinking: '🧠 Critical Thinking',
        problem_solving: '🔧 Problem Solving',
        safety: '🦺 Safety',
        ethics: '⚖️ Ethics'
    };
    const categoryLabel = categoryLabels[qCategory] || '';

    let qText = qData.text || qData.question;
    let headerHTML = '';
    if (categoryLabel) {
        headerHTML = `<span style="display:inline-block;font-size:0.8rem;background:var(--surface2);color:var(--cyan);padding:4px 12px;border-radius:20px;margin-bottom:14px;font-weight:700;border:1px solid var(--border);letter-spacing:0.5px;">${categoryLabel}</span><br>`;
    }
    let imgHTML = '';
    if (qData.image) {
        imgHTML = `<br><img src="${qData.image}" style="max-width:100%;border-radius:12px;margin-top:15px;box-shadow:0 6px 15px rgba(0,0,0,0.3);border:2px solid var(--border);">`;
    }
    document.getElementById('lq-question-text').innerHTML = headerHTML + qText + imgHTML;

    const optionsContainer = document.getElementById('lq-options-container');
    optionsContainer.innerHTML = '';

    const correctVal = (typeof qData.answer === 'number') ? qData.options[qData.answer] : qData.answer;

    // ── Grade 1 special True/False: large emoji buttons ──
    if (qData.type === 'true_false' && lqCurrentGrade === 'grade1') {
        const tfWrap = document.createElement('div');
        tfWrap.style.cssText = 'display:flex;gap:20px;justify-content:center;flex-wrap:wrap;margin-top:24px;';
        qData.options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn lq-btn';
            btn.innerHTML = opt;
            btn.style.cssText = 'font-size:2rem;padding:28px 48px;border-radius:20px;min-width:160px;flex:1;line-height:1.4;font-weight:800;';
            btn.onclick = () => window.lqSubmitAnswer(opt, correctVal, qData.marks, btn, qCategory);
            tfWrap.appendChild(btn);
        });
        optionsContainer.appendChild(tfWrap);

    } else if (qData.type === 'mcq' || qData.type === 'multiple_choice' || qData.type === 'true_false') {
        qData.options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'option-btn lq-btn';
            btn.innerText = opt;
            btn.onclick = () => window.lqSubmitAnswer(opt, correctVal, qData.marks, btn, qCategory);
            optionsContainer.appendChild(btn);
        });

    } else if (qData.type === 'fill_blank' || qData.type === 'short_answer') {
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'lq-text-answer';
        input.placeholder = 'Type your answer here...';
        input.style.cssText = 'width:100%;padding:15px;border-radius:8px;border:2px solid var(--border);background:var(--surface2);color:var(--text);font-size:1.1rem;';
        const btn = document.createElement('button');
        btn.className = 'btn-primary lq-btn';
        btn.innerText = 'Submit';
        btn.style.marginTop = '15px';
        btn.onclick = () => window.lqSubmitAnswer(
            document.getElementById('lq-text-answer').value,
            qData.answer, qData.marks, btn, qCategory
        );
        optionsContainer.appendChild(input);
        optionsContainer.appendChild(btn);

    } else if (qData.type === 'match_following') {
        const wrap = document.createElement('div');
        wrap.className = 'match-grid';
        wrap.style.cssText = 'display:flex;flex-direction:column;gap:15px;';

        qData.left.forEach((leftItem, i) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;gap:15px;align-items:center;';

            const leftLbl = document.createElement('div');
            leftLbl.innerText = leftItem;
            leftLbl.style.cssText = 'flex:1;padding:12px 15px;background:var(--surface);border-radius:8px;border:1px solid var(--cyan);font-weight:bold;';

            const rightSel = document.createElement('select');
            rightSel.className = 'lq-match-select';
            rightSel.style.cssText = 'flex:1;padding:12px 15px;border-radius:8px;border:1px solid var(--border);background:var(--bg2);color:var(--text);';
            const defOpt = document.createElement('option');
            defOpt.innerText = '-- Select Match --';
            defOpt.value = '';
            rightSel.appendChild(defOpt);
            const rightScrambled = [...qData.right].sort(() => Math.random() - 0.5);
            rightScrambled.forEach(rightItem => {
                const opt = document.createElement('option');
                opt.value = rightItem;
                opt.innerText = rightItem;
                rightSel.appendChild(opt);
            });

            row.appendChild(leftLbl);
            row.appendChild(rightSel);
            wrap.appendChild(row);
        });

        const btn = document.createElement('button');
        btn.className = 'btn-primary lq-btn';
        btn.innerText = 'Submit Match';
        btn.style.marginTop = '20px';
        btn.onclick = () => {
            const selects = wrap.querySelectorAll('.lq-match-select');
            let userAns = {};
            let correctCount = 0;
            let allSelected = true;
            selects.forEach((sel, i) => {
                if (!sel.value) allSelected = false;
                userAns[qData.left[i]] = sel.value;
                if (sel.value === qData.answer[qData.left[i]]) correctCount++;
            });
            if (!allSelected) { lqShowNotification("Please match all items!"); return; }
            const isCorrect = correctCount === qData.left.length;
            window.lqSubmitAnswer(
                JSON.stringify(userAns), JSON.stringify(qData.answer),
                isCorrect ? qData.marks : 0, btn, qCategory, isCorrect
            );
        };
        optionsContainer.appendChild(wrap);
        optionsContainer.appendChild(btn);
    }
}

// category: 'critical_thinking' | 'problem_solving' | 'safety' | 'ethics' | 'uncategorized'
window.lqSubmitAnswer = (selected, correct, marks, btnElement, category = 'uncategorized', customIsCorrect = null) => {
    if (lqAnsweredCurrent) return;
    lqAnsweredCurrent = true;

    const isCorrect = customIsCorrect !== null
        ? customIsCorrect
        : (selected.toString().toLowerCase().trim() === correct.toString().toLowerCase().trim());

    if (isCorrect) {
        lqMyScore += marks;
        lqCategoryScores[category] = (lqCategoryScores[category] || 0) + marks;

        if (BACKEND_MODE === 'firebase') {
            update(ref(db, `rooms/${lqRoomCode}/players/${lqPlayerName}`), {
                score: lqMyScore,
                categoryScores: lqCategoryScores
            });
        } else {
            gasPost('updatePlayerScore', {
                roomCode: lqRoomCode,
                playerName: lqPlayerName,
                data: {
                    score: lqMyScore,
                    categoryScores: lqCategoryScores
                }
            });
        }
    }

    const answerData = { answer: selected.toString(), correct: isCorrect };
    let realIndex = lqQuestionOrder[lqCurrentQuestionIndex];

    if (BACKEND_MODE === 'firebase') {
        set(ref(db, `rooms/${lqRoomCode}/players/${lqPlayerName}/answers/${realIndex}`), answerData);
        set(ref(db, `rooms/${lqRoomCode}/responses/${realIndex}/${lqPlayerName}`), answerData);
    } else {
        gasPost('submitAnswer', {
            roomCode: lqRoomCode,
            playerName: lqPlayerName,
            questionIndex: realIndex,
            answerData: answerData
        });
    }

    if (btnElement) {
        btnElement.style.backgroundColor = isCorrect ? 'var(--green)' : 'var(--red)';
        btnElement.style.color = '#fff';
        btnElement.style.borderColor = isCorrect ? 'var(--green)' : 'var(--red)';
        btnElement.style.transform = 'scale(1.05)';
    }

    // Lock all options
    document.querySelectorAll('#lq-options-container .lq-btn').forEach(b => {
        b.style.pointerEvents = 'none';
        if (b !== btnElement) b.style.opacity = '0.45';
    });

    const optionsContainer = document.getElementById('lq-options-container');
    const nextBtnContainer = document.createElement('div');
    nextBtnContainer.style.marginTop = '20px';

    if (lqCurrentQuestionIndex >= lqQuizData.questions.length - 1) {
        nextBtnContainer.innerHTML = '<h4 style="color:var(--cyan);">✅ All done! Waiting for the teacher to end the session...</h4>';
    } else {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'btn-primary lq-btn';
        nextBtn.innerText = 'Next Question ➡️';
        nextBtn.onclick = () => {
            lqCurrentQuestionIndex++;
            lqAnsweredCurrent = false;
            lqRenderQuestion();
        };
        nextBtnContainer.appendChild(nextBtn);
    }
    optionsContainer.appendChild(nextBtnContainer);
};

function lqShowLeaderboard(players) {
    window.lqShowView('lq-leaderboard-page');
    const list = document.getElementById('lq-leaderboard-list');
    list.innerHTML = '';

    const sortedPlayers = Object.entries(players || {}).sort((a, b) => b[1].score - a[1].score);

    sortedPlayers.forEach(([name, data], index) => {
        const li = document.createElement('li');
        let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
        li.innerHTML = `<strong>${medal} ${name}</strong>`;
        list.appendChild(li);
    });

    if (isHost) {
        const finalControls = document.getElementById('lq-final-host-controls');
        if (finalControls) finalControls.style.display = 'block';

        if (!window.hasSubmittedToSheets) {
            window.hasSubmittedToSheets = true;
            for (const [pName, player] of sortedPlayers) {
                const studentMeta = {
                    school: player.school || lqCurrentSchool || "Unknown",
                    grade: lqCurrentGrade,
                    name: player.name || pName
                };
                const cs = player.categoryScores || {};
                const categoryScores = {
                    total: player.score || 0,
                    ct: cs.critical_thinking || 0,
                    ps: cs.problem_solving || 0,
                    safety: cs.safety || 0,
                    ethics: cs.ethics || 0
                };
                const studentAnswers = {};
                const ans = player.answers || {};
                for (let i = 0; i < 20; i++) {
                    studentAnswers['q' + (i + 1)] = ans[i] ? ans[i].answer : '';
                }
                submitQuizToGoogleSheets(studentMeta, categoryScores, studentAnswers);
            }
        }
    }
}


window.lqDownloadCSV = async () => {
    try {
        let players = {};
        let schoolVal = "School";
        let gradeVal = "grade";
        let unitVal = "baseline";
        let quizQuestions = [];

        if (BACKEND_MODE === 'firebase') {
            const roomSnapshot = await get(ref(db, `rooms/${lqRoomCode}`));
            if (!roomSnapshot.exists()) throw new Error("Room data not found in database.");
            const roomData = roomSnapshot.val();
            players = roomData.players || {};
            schoolVal = roomData.school || schoolVal;
            gradeVal = roomData.grade || gradeVal;
            unitVal = roomData.unit || unitVal;
            quizQuestions = (roomData.quiz && roomData.quiz.questions) ? roomData.quiz.questions : [];
        } else {
            const res = await fetch(GAS_WEB_APP_URL + '?action=getRoom&roomCode=' + lqRoomCode);
            const roomData = await res.json();
            if (roomData.error || !roomData.status) throw new Error("Room data not found in GAS.");
            players = roomData.players || {};
            schoolVal = roomData.school || schoolVal;
            gradeVal = roomData.grade || gradeVal;
            unitVal = roomData.unit || unitVal;
            quizQuestions = (roomData.quiz && roomData.quiz.questions) ? roomData.quiz.questions : [];
        }

        // Fallback to in-memory quiz data if room data didn't include questions
        if (quizQuestions.length === 0 && lqQuizData && lqQuizData.questions) {
            quizQuestions = lqQuizData.questions;
        }

        // ── Filename numbers (e.g. HHmm-DMS-1-1.csv) ──
        const now = new Date();
        const hhmm = now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');

        let gradeNum = gradeVal;
        if (gradeVal.startsWith("grade")) gradeNum = gradeVal.substring(5);
        else if (gradeVal === "teachers_baseline") gradeNum = "T1";
        else if (gradeVal === "teachers_baseline_2") gradeNum = "T2";

        let unitNum = unitVal;
        if (unitVal === "baseline") unitNum = "1";
        else if (unitVal.startsWith("unit")) unitNum = unitVal.substring(4);

        const filename = `${hhmm}-${schoolVal}-${gradeNum}-${unitNum}.csv`;

        // ── Display values for CSV body ──
        let gradeDisplay = gradeVal;
        if (gradeVal.startsWith("grade")) gradeDisplay = "Grade " + gradeVal.substring(5);
        else if (gradeVal === "teachers_baseline") gradeDisplay = "Teachers Baseline 1";
        else if (gradeVal === "teachers_baseline_2") gradeDisplay = "Teachers Baseline 2";

        let unitDisplay = unitVal;
        if (unitVal === "baseline") unitDisplay = "Baseline";
        else if (unitVal.startsWith("unit")) unitDisplay = "Unit " + unitVal.substring(4);

        const timestampStr = now.toLocaleString();

        // ── Category label map ──
        const categoryLabels = {
            critical_thinking: '🧠 Critical Thinking',
            problem_solving: '🔧 Problem Solving',
            safety: '🦺 Safety',
            ethics: '⚖️ Ethics'
        };

        // Helper: wrap a value in CSV-safe quotes
        function csvCell(val) {
            const str = (val === null || val === undefined) ? '' : String(val);
            return '"' + str.replace(/"/g, '""') + '"';
        }

        // ── Build dynamic question header columns ──
        // Format: Q1 [🧠 Critical Thinking]: Question text...
        const questionHeaders = quizQuestions.map((q, i) => {
            const catLabel = categoryLabels[q.category] || (q.category ? q.category : 'General');
            const qText = (q.text || q.question || '').substring(0, 80); // truncate for readability
            return csvCell(`Q${i + 1} [${catLabel}]: ${qText}`);
        });

        // ── CSV Header row ──
        const headerCols = [
            csvCell('Timestamp'),
            csvCell('School Name'),
            csvCell('Grade'),
            csvCell('Student Name'),
            csvCell('Overall Marks'),
            csvCell('🧠 Critical Thinking'),
            csvCell('🔧 Problem Solving'),
            csvCell('🦺 Safety'),
            csvCell('⚖️ Ethics'),
            ...questionHeaders
        ];
        let csvContent = headerCols.join(',') + "\n";

        // ── Sort players by score descending ──
        const sortedPlayers = Object.entries(players).sort((a, b) => b[1].score - a[1].score);

        for (const [pName, player] of sortedPlayers) {
            const cs = player.categoryScores || {};
            const answers = player.answers || {};

            // Per-question cells: ✅ Right or ❌ Wrong, plus their actual answer text
            const questionCells = quizQuestions.map((q, i) => {
                const ans = answers[i];
                if (!ans) return csvCell('— Not Answered');
                const status = ans.correct ? '✅ Right' : '❌ Wrong';
                return csvCell(`${status} (Answer: ${ans.answer})`);
            });

            const row = [
                csvCell(timestampStr),
                csvCell(schoolVal),
                csvCell(gradeDisplay),
                csvCell(player.name || pName),
                player.score || 0,
                cs.critical_thinking || 0,
                cs.problem_solving || 0,
                cs.safety || 0,
                cs.ethics || 0,
                ...questionCells
            ].join(',');
            csvContent += row + "\n";
        }

        // Add BOM for Excel UTF-8 compatibility (renders emojis correctly)
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error downloading CSV:", e);
        lqShowNotification("Failed to download results.");
    }
};

function submitQuizToGoogleSheets(studentMeta, categoryScores, studentAnswers) {
    const appsScriptUrl = "https://script.google.com/macros/s/AKfycbyU-IJyB6GxMNotnBgn4N69ZghREGtbDs7SRP_zfbLJHwW_5KTO_kGd2rU-OGGiA4p4LA/exec";

    // Organize the parameters into keys matching the script's 'data' expectations
    const quizPayload = {
        // Student Information
        schoolName: studentMeta.school,       // String
        grade: studentMeta.grade,             // String/Number
        studentName: studentMeta.name,         // String
        overallMarks: categoryScores.total,   // Number

        // Categorized Scores
        criticalThinking: categoryScores.ct,  // Number
        problemSolving: categoryScores.ps,    // Number
        safety: categoryScores.safety,         // Number
        ethics: categoryScores.ethics,         // Number

        // Raw Question Answers (Map strings/choices here)
        q1: studentAnswers.q1,
        q2: studentAnswers.q2,
        q3: studentAnswers.q3,
        q4: studentAnswers.q4,
        q5: studentAnswers.q5,
        q6: studentAnswers.q6,
        q7: studentAnswers.q7,
        q8: studentAnswers.q8,
        q9: studentAnswers.q9,
        q10: studentAnswers.q10,
        q11: studentAnswers.q11,
        q12: studentAnswers.q12,
        q13: studentAnswers.q13,
        q14: studentAnswers.q14,
        q15: studentAnswers.q15,
        q16: studentAnswers.q16,
        q17: studentAnswers.q17,
        q18: studentAnswers.q18,
        q19: studentAnswers.q19,
        q20: studentAnswers.q20
    };

    // POST data to Google Sheets
    fetch(appsScriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(quizPayload)
    })
        .then(() => console.log("All detailed marks logged successfully!"))
        .catch(error => console.error("Error sending response:", error));
}
