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

window.lqShowView = (viewId) => {
    document.querySelectorAll('.lq-view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById(viewId);
    if(el) el.classList.add('active');
};

window.initLiveQuiz = async () => {
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
        const validTeacher = teachersArray.find(t => t && t.name === hostName && t.password === hostPass);
        if (!validTeacher) {
            alert("Invalid Teacher Name or Password!");
            return;
        }
    } else {
        alert("Teacher data not loaded!");
        return;
    }

    if (!allQuizData || !allQuizData[gradeSelect] || !allQuizData[gradeSelect][unitSelect]) {
        alert("Exam data for selected class/grade and unit not found!");
        return;
    }

    lqQuizData = allQuizData[gradeSelect][unitSelect];
    lqPlayerName = hostName; // Host plays under their own name!

    await lqCreateRoom(schoolSelect, gradeSelect, unitSelect);
};

async function lqCreateRoom(schoolSelect, gradeSelect, unitSelect) {
    isHost = true;
    lqCurrentGrade = gradeSelect;
    lqCategoryScores = {};
    lqMyScore = 0;
    lqRoomCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
    document.getElementById('lq-display-room-code').innerText = lqRoomCode;

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

    window.lqShowView('lq-host-setup-page');
    document.getElementById('lq-host-pre-start').style.display = 'block';
    const activeDash = document.getElementById('lq-host-active-dashboard');
    if(activeDash) activeDash.style.display = 'none';

    lqListenToPlayers();
    lqListenToGame();
}

window.lqStartGame = () => {
    update(ref(db, `rooms/${lqRoomCode}`), {
        status: 'active',
        currentQuestion: 0,
        startTime: Date.now() // Start the 10 min timer
    });
    const preStart = document.getElementById('lq-host-pre-start');
    if (preStart) preStart.style.display = 'none';
    const activeDash = document.getElementById('lq-host-active-dashboard');
    if (activeDash) activeDash.style.display = 'block';
};

window.lqNextQuestion = async () => {
    const snapshot = await get(ref(db, `rooms/${lqRoomCode}/currentQuestion`));
    let nextIndex = snapshot.val() + 1;

    if (nextIndex >= lqQuizData.questions.length) {
        window.lqEndQuiz();
    } else {
        update(ref(db, `rooms/${lqRoomCode}`), { currentQuestion: nextIndex });
    }
};

window.lqEndQuiz = () => {
    update(ref(db, `rooms/${lqRoomCode}`), { status: 'ended' });
};


window.lqJoinGame = async () => {
    lqRoomCode = document.getElementById('lq-join-code').value.trim();
    const rawName = document.getElementById('lq-join-name').value.trim();

    if (lqRoomCode.length !== 6) {
        alert("Please enter a valid 6-digit Classroom Code!");
        return;
    }

    // Clean and normalize name: compress consecutive spaces to a single space
    lqPlayerName = rawName.replace(/\s+/g, ' ');

    if (lqPlayerName.length <= 3) {
        alert("Name must be more than 3 letters long!");
        return;
    }

    // Enforce letters and single spaces only (no numbers, no symbols)
    const nameRegex = /^[a-zA-Z]+( [a-zA-Z]+)*$/;
    if (!nameRegex.test(lqPlayerName)) {
        alert("Name must contain only letters (no numbers or symbols allowed)!");
        return;
    }

    const roomSnapshot = await get(ref(db, `rooms/${lqRoomCode}`));
    if (!roomSnapshot.exists()) {
        alert("Room not found!");
        return;
    }

    isHost = false;
    
    // Read the room's quiz data so the client knows the questions
    const roomData = roomSnapshot.val();
    lqQuizData = roomData.quiz;
    lqCurrentGrade = roomData.grade || "";
    lqCategoryScores = {};
    lqMyScore = 0;

    // Prevent duplicate player names inside the same classroom to keep it professional
    if (roomData.players && roomData.players[lqPlayerName]) {
        alert("This name is already taken in this classroom! Please use a different name.");
        return;
    }

    await set(ref(db, `rooms/${lqRoomCode}/players/${lqPlayerName}`), { 
        name: lqPlayerName,
        score: 0,
        school: roomData.school || "Unknown"
    });

    document.getElementById('lq-waiting-room-code').innerText = lqRoomCode;
    window.lqShowView('lq-player-waiting-page');

    lqListenToGame();
    lqListenToPlayers();
};

function lqListenToPlayers() {
    onValue(ref(db, `rooms/${lqRoomCode}/players`), (snapshot) => {
        const players = snapshot.val() || {};
        
        // 1. Update waiting room count
        const count = Object.keys(players).length;
        const countEl = document.getElementById('lq-players-count');
        if(countEl) countEl.innerText = count;

        // 2. Update Host Dashboard list (if visible)
        const hostList = document.getElementById('lq-host-player-list');
        if(hostList) {
            hostList.innerHTML = '';
            const hostCountEl = document.getElementById('lq-host-player-count');
            if(hostCountEl) hostCountEl.innerText = count;
            for (let p in players) {
                const li = document.createElement('li');
                li.innerText = p; // Score hidden
                hostList.appendChild(li);
            }
        }

        // 3. Update Live Sidebar Leaderboard (during quiz)
        const sidebarList = document.getElementById('lq-live-sidebar-list');
        if(sidebarList) {
            sidebarList.innerHTML = '';
            const sorted = Object.entries(players).sort((a,b) => b[1].score - a[1].score);
            sorted.forEach(([p, data], i) => {
                const li = document.createElement('li');
                li.style.padding = '10px 0';
                li.style.borderBottom = '1px solid var(--border)';
                li.style.fontSize = '0.95rem';
                
                let rankStr = `<strong>#${i+1}</strong>`;
                if(i===0) rankStr = '🥇';
                if(i===1) rankStr = '🥈';
                if(i===2) rankStr = '🥉';

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
                sorted.forEach(([p, data], i) => {
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

                    li.innerHTML = `<span>${rankStr} ${p}</span> <span style="color:var(--cyan); font-weight:bold; font-size: 1.3rem;">${data.score} pts</span>`;
                    hostLiveList.appendChild(li);
                });
            }
        }
    });
}

function startTimer(startTimeMs) {
    if(timerInterval) clearInterval(timerInterval);
    const durationMinutes = (lqQuizData && lqQuizData.duration) ? lqQuizData.duration : 10;
    const totalTimeSeconds = durationMinutes * 60;

    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeMs) / 1000);
        const remaining = totalTimeSeconds - elapsed;

        if (remaining <= 0) {
            clearInterval(timerInterval);
            const timerEl = document.getElementById('lq-timer-display');
            if(timerEl) timerEl.innerText = "⏱️ Time's Up!";
            const hostTimerEl = document.getElementById('lq-host-timer-display');
            if(hostTimerEl) hostTimerEl.innerText = "⏱️ Time's Up!";
            
            // Disable buttons locally
            const optsContainer = document.getElementById('lq-options-container');
            if(optsContainer) optsContainer.innerHTML = '<h3 style="color:var(--red);">Time is up! Waiting for teacher...</h3>';

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
        if(timerEl) timerEl.innerText = timeStr;
        const hostTimerEl = document.getElementById('lq-host-timer-display');
        if(hostTimerEl) hostTimerEl.innerText = timeStr;
    }, 1000);
}

function lqListenToGame() {
    onValue(ref(db, `rooms/${lqRoomCode}`), (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        if (data.status === 'active') {
            if (isHost) {
                // Host stays on the setup page but starts the timer
                if(data.startTime && !timerInterval) {
                    startTimer(data.startTime);
                }
            } else {
                if (lqCurrentQuestionIndex === -1 && data.currentQuestion >= 0) {
                    lqCurrentQuestionIndex = 0;
                    lqAnsweredCurrent = false;
                    
                    // Shuffle questions for this student
                    lqQuestionOrder = Array.from({length: lqQuizData.questions.length}, (_, i) => i);
                    lqQuestionOrder.sort(() => Math.random() - 0.5);
                    
                    // If this is the first question, start the 10-minute timer using the DB start time
                    if(data.startTime) {
                        startTimer(data.startTime);
                    }

                    lqRenderQuestion();
                }
            }
        } else if (data.status === 'ended') {
            if(timerInterval) clearInterval(timerInterval);
            lqShowLeaderboard(data.players);
        }
    });
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
            if (!allSelected) { alert("Please match all items!"); return; }
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
        update(ref(db, `rooms/${lqRoomCode}/players/${lqPlayerName}`), {
            score: lqMyScore,
            categoryScores: lqCategoryScores
        });
    }

    const answerData = { answer: selected.toString(), correct: isCorrect };
    let realIndex = lqQuestionOrder[lqCurrentQuestionIndex];
    set(ref(db, `rooms/${lqRoomCode}/players/${lqPlayerName}/answers/${realIndex}`), answerData);
    set(ref(db, `rooms/${lqRoomCode}/responses/${realIndex}/${lqPlayerName}`), answerData);

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
        if(finalControls) finalControls.style.display = 'block';
    }
}

window.lqDownloadCSV = async () => {
    try {
        const roomSnapshot = await get(ref(db, `rooms/${lqRoomCode}`));
        if (!roomSnapshot.exists()) throw new Error("Room data not found in database.");
        const roomData = roomSnapshot.val();
        const players = roomData.players || {};

        const schoolVal = roomData.school || "School";
        const gradeVal = roomData.grade || "grade";
        const unitVal  = roomData.unit  || "baseline";

        // ── Filename numbers (e.g. HHmm-DMS-1-1.csv) ──
        const now = new Date();
        const hhmm = now.getHours().toString().padStart(2,'0') + now.getMinutes().toString().padStart(2,'0');

        let gradeNum = gradeVal;
        if (gradeVal.startsWith("grade")) gradeNum = gradeVal.substring(5);
        else if (gradeVal === "teachers_baseline")   gradeNum = "T1";
        else if (gradeVal === "teachers_baseline_2") gradeNum = "T2";

        let unitNum = unitVal;
        if (unitVal === "baseline") unitNum = "1";
        else if (unitVal.startsWith("unit")) unitNum = unitVal.substring(4);

        const filename = `${hhmm}-${schoolVal}-${gradeNum}-${unitNum}.csv`;

        // ── Display values for CSV body ──
        let gradeDisplay = gradeVal;
        if (gradeVal.startsWith("grade")) gradeDisplay = "Grade " + gradeVal.substring(5);
        else if (gradeVal === "teachers_baseline")   gradeDisplay = "Teachers Baseline 1";
        else if (gradeVal === "teachers_baseline_2") gradeDisplay = "Teachers Baseline 2";

        let unitDisplay = unitVal;
        if (unitVal === "baseline") unitDisplay = "Baseline";
        else if (unitVal.startsWith("unit")) unitDisplay = "Unit " + unitVal.substring(4);

        const timestampStr = now.toLocaleString();

        // ── CSV Header ──
        let csvContent = "Timestamp,School Name,Grade,Student Name,Overall Marks,Critical Thinking,Problem Solving,Safety,Ethics\n";

        // ── Sort by score descending ──
        const sortedPlayers = Object.entries(players).sort((a,b) => b[1].score - a[1].score);

        for (const [pName, player] of sortedPlayers) {
            const cs = player.categoryScores || {};
            const row = [
                `"${timestampStr}"`,
                `"${schoolVal}"`,
                `"${gradeDisplay}"`,
                `"${(player.name || pName).replace(/"/g, '""')}"`,
                player.score || 0,
                cs.critical_thinking || 0,
                cs.problem_solving   || 0,
                cs.safety            || 0,
                cs.ethics            || 0
            ].join(',');
            csvContent += row + "\n";
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url  = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Error downloading CSV:", e);
        alert("Failed to download results.");
    }
};
