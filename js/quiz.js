// =============================================
//  QUIZ
// =============================================
function renderQuizStart(s) {
  return `
  <div class="quiz-start">
    <div style="font-size:3rem;margin-bottom:16px">🧠</div>
    <h2>Session Quiz</h2>
    <p>${s.title}</p>
    <div class="quiz-meta-info">
      <span class="quiz-meta-badge">📝 ${s.quiz.length} Questions</span>
      <span class="quiz-meta-badge">🎯 Test your knowledge</span>
      <span class="quiz-meta-badge">🏆 Score saved to Leaderboard</span>
    </div>
    <input id="quizNameInput" class="quiz-name-input" type="text"
      placeholder="Enter your name to start…" maxlength="30"
      onkeydown="if(event.key==='Enter')startInlineQuiz('${s.id}')" />
    <button class="btn-primary" style="margin-top:8px" onclick="startInlineQuiz('${s.id}')">
      Start Quiz ⚡
    </button>
  </div>`;
}

function startInlineQuiz(sessionId) {
  const inp = document.getElementById('quizNameInput');
  const name = inp ? inp.value.trim() : '';
  if (!name) { if (inp) inp.style.borderColor = 'var(--red)'; return; }
  const s = SESSIONS[sessionId];
  if (!s) return;
  inlineQuizState = {
    sessionId, playerName: name,
    questions: [...s.quiz].sort(() => Math.random() - 0.5),
    currentQ: 0, score: 0, answers: [], answered: false
  };
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const state = inlineQuizState;
  const q = state.questions[state.currentQ];
  const total = state.questions.length;
  const pct = Math.round((state.currentQ / total) * 100);
  const letters = ['A', 'B', 'C', 'D'];
  const container = document.getElementById('quizInline');
  if (!container) return;

  container.innerHTML = `
  <div class="quiz-session">
    <div class="quiz-header">
      <span class="quiz-q-num">Question ${state.currentQ + 1} of ${total}</span>
      <span class="quiz-score-live">Score: ${state.score}/${state.currentQ}</span>
    </div>
    <div class="quiz-progress-bar">
      <div class="quiz-progress-fill" style="width:${pct}%"></div>
    </div>
    <div class="quiz-question">${q.q}</div>
    <div class="quiz-options" id="quizOptions">
      ${q.options.map((opt, i) => `
        <button class="quiz-option" onclick="answerQuiz(${i})" id="opt-${i}">
          <span class="opt-letter">${letters[i]}</span>${opt}
        </button>`).join('')}
    </div>
    <div id="quizExplanation" style="display:none" class="quiz-explanation"></div>
    <div id="quizNextWrap" style="display:none;margin-top:12px">
      <button class="quiz-next-btn" onclick="nextQuestion()">
        ${state.currentQ + 1 === total ? 'See Results 🎉' : 'Next Question →'}
      </button>
    </div>
  </div>`;
}

function answerQuiz(chosen) {
  const state = inlineQuizState;
  if (state.answered) return;
  state.answered = true;
  const q = state.questions[state.currentQ];
  const correct = q.answer;
  const isRight = chosen === correct;
  if (isRight) state.score++;
  state.answers.push({ q: q.q, chosen, correct, isRight, explanation: q.explanation, correctText: q.options[correct] });

  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct) btn.classList.add('correct');
    if (i === chosen && !isRight) btn.classList.add('wrong');
    if (i !== chosen && i !== correct) btn.style.opacity = '0.4';
  });

  const expEl = document.getElementById('quizExplanation');
  if (expEl) {
    expEl.style.display = 'block';
    expEl.innerHTML = `<strong>${isRight ? '✅ Correct!' : '❌ Not quite!'}</strong><br>${q.explanation}`;
  }
  document.getElementById('quizNextWrap').style.display = 'block';
  const scoreEl = document.querySelector('.quiz-score-live');
  if (scoreEl) scoreEl.textContent = `Score: ${state.score}/${state.currentQ + 1}`;
}

function nextQuestion() {
  inlineQuizState.answered = false;
  inlineQuizState.currentQ++;
  if (inlineQuizState.currentQ >= inlineQuizState.questions.length) showQuizResults();
  else renderQuizQuestion();
}

function showQuizResults() {
  const state = inlineQuizState;
  const total = state.questions.length;
  const pct = Math.round((state.score / total) * 100);
  const session = SESSIONS[state.sessionId];
  saveScore(state.sessionId, state.playerName, state.score, total);

  let emoji = '🌱', msg = 'Keep practicing!';
  if (pct >= 90) { emoji = '🏆'; msg = 'Outstanding! You\'re a master tinkerer!'; }
  else if (pct >= 75) { emoji = '🌟'; msg = 'Great work! You really understand this!'; }
  else if (pct >= 60) { emoji = '👍'; msg = 'Good job! Review slides and try again!'; }
  else if (pct >= 40) { emoji = '💪'; msg = 'Nice try! Go through the session again!'; }

  const stars = '⭐'.repeat(Math.max(1, Math.round(pct / 20)));
  const container = document.getElementById('quizInline');
  container.innerHTML = `
  <div class="quiz-results">
    <div style="font-size:3rem">${emoji}</div>
    <h2>${msg}</h2>
    <div class="quiz-score-big" style="color:${pct >= 60 ? 'var(--green)' : 'var(--orange)'}">
      ${state.score}<span style="font-size:2rem;color:var(--text-muted)">/${total}</span>
    </div>
    <div class="quiz-score-label">${pct}% Correct · ${session?.title || ''}</div>
    <div class="quiz-stars">${stars}</div>
    <div class="quiz-breakdown">
      <h4>Answer Review</h4>
      ${state.answers.map((a, i) => `
        <div class="quiz-bd-item">
          <span class="quiz-bd-icon">${a.isRight ? '✅' : '❌'}</span>
          <div>
            <div class="quiz-bd-text">Q${i + 1}: ${a.q.substring(0, 60)}${a.q.length > 60 ? '…' : ''}</div>
            ${!a.isRight ? `<div class="quiz-bd-answer">✓ ${a.correctText}</div>` : ''}
          </div>
        </div>`).join('')}
    </div>
    <div class="quiz-results-btns">
      <button class="btn-primary" onclick="retryQuiz('${state.sessionId}')">Retry Quiz 🔄</button>
      <button class="btn-outline" onclick="showPage('leaderboard');renderLeaderboard()">Leaderboard 🏆</button>
    </div>
  </div>`;
}

function retryQuiz(sessionId) {
  const s = SESSIONS[sessionId];
  if (!s) return;
  document.getElementById('quizInline').innerHTML = renderQuizStart(s);
}
