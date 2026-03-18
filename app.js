// app.js — FINAL FIXED VERSION

/* -------------------------
   DOM Element Caching
------------------------- */
const startSection = document.getElementById('start-section');
const sectionPage = document.getElementById('section-page');
const resultsSection = document.getElementById('results-section');

const startBtn = document.getElementById('start-btn');
const chips = Array.from(document.querySelectorAll('.chip'));

const sectionTitle = document.getElementById('section-title');
const sectionProgress = document.getElementById('section-progress');
const sectionQuestions = document.getElementById('section-questions');

const prevSectionBtn = document.getElementById('prev-section-btn');
const nextSectionBtn = document.getElementById('next-section-btn');
const submitBtn = document.getElementById('submit-btn');

const toastEl = document.getElementById('toast');
const miniProgressBar = document.querySelector('#mini-progress-bar span');

const scorePercent = document.getElementById('score-percent');
const sectionBreakdown = document.getElementById('section-breakdown');
const wrongItems = document.getElementById('wrong-items');

const retakeBtn = document.getElementById('retake-btn');
const goStartBtn = document.getElementById('go-start-btn');
const progressCircle = document.getElementById('progress-circle');

/* -------------------------
   Config (UPDATED)
------------------------- */
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 48;

const SECTION_CONFIG = {
  A: { idRange: [1, 29], draw: 10, marks: 10 },
  B: { idRange: [51, 80], draw: 15, marks: 30 },
  C: { idRange: [101, 122], draw: 10, marks: 30 },
};

let allQuestions = [];
let paperSections = [];
let sectionIndex = 0;
let selectedAnswers = {};
let quizActive = false;

/* -------------------------
   Load Questions
------------------------- */
async function loadQuestions() {
  if (allQuestions.length) return allQuestions;
  try {
    const res = await fetch('questions.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load questions');
    allQuestions = await res.json();
    allQuestions = allQuestions.filter((q) => q && q.id);
    return allQuestions;
  } catch (err) {
    console.error(err);
    showToast('Error loading questions.json');
    return [];
  }
}

/* -------------------------
   Helpers
------------------------- */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showSection(sectionEl) {
  [startSection, sectionPage, resultsSection].forEach(
    (s) => (s.hidden = true)
  );
  sectionEl.hidden = false;
}

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  setTimeout(() => (toastEl.hidden = true), 2500);
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* -------------------------
   Build Paper (FIXED)
------------------------- */
async function buildPaper(selectedSections) {
  await loadQuestions();

  const sections = [];
  const usedIds = new Set();

  for (const s of selectedSections) {
    const cfg = SECTION_CONFIG[s];
    if (!cfg) continue;

    const [lo, hi] = cfg.idRange;

    const pool = allQuestions.filter(
      (q) => q.id >= lo && q.id <= hi && !usedIds.has(q.id)
    );

    if (!pool.length) continue;

    const shuffled = shuffle(pool);
    const chosen = shuffled.slice(0, Math.min(cfg.draw, pool.length)).map((q) => {
      usedIds.add(q.id);
      return { ...q, _section: s };
    });

    sections.push({ id: s, questions: chosen, cfg });
  }

  return sections;
}

/* -------------------------
   Start Quiz
------------------------- */
function getSelectedChips() {
  return chips
    .filter((c) => c.classList.contains('active'))
    .map((c) => c.dataset.sec);
}

chips.forEach((ch) =>
  ch.addEventListener('click', () => ch.classList.toggle('active'))
);

startBtn.addEventListener('click', async () => {
  const chosen = getSelectedChips();
  if (!chosen.length) return showToast('Select section');

  paperSections = await buildPaper(chosen);
  sectionIndex = 0;
  selectedAnswers = {};
  quizActive = true;

  showSectionPage(sectionIndex);
  showSection(sectionPage);
});

/* -------------------------
   Render Section
------------------------- */
function showSectionPage(idx) {
  const sec = paperSections[idx];

  sectionTitle.textContent = `Section ${sec.id}`;
  sectionProgress.textContent = `${idx + 1} / ${paperSections.length}`;

  sectionQuestions.innerHTML = '';

  sec.questions.forEach((q) => {
    const card = document.createElement('div');

    card.innerHTML = `
      <h3>Q${q.id}</h3>
      <p>${escapeHtml(q.question)}</p>
      <div class="options"></div>
    `;

    const wrap = card.querySelector('.options');

    q.options.forEach((opt, oi) => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.className = 'option';
      btn.onclick = () => selectOption(q.id, oi, card);
      wrap.appendChild(btn);
    });

    sectionQuestions.appendChild(card);
  });
}

function selectOption(qid, index, card) {
  selectedAnswers[qid] = index;

  card.querySelectorAll('button').forEach((b) =>
    b.classList.remove('selected')
  );

  card.querySelectorAll('button')[index].classList.add('selected');
}

/* -------------------------
   Navigation
------------------------- */
nextSectionBtn.onclick = () => {
  sectionIndex++;
  showSectionPage(sectionIndex);
};

prevSectionBtn.onclick = () => {
  sectionIndex--;
  showSectionPage(sectionIndex);
};

submitBtn.onclick = () => computeResults();

/* -------------------------
   Results (FIXED LOGIC)
------------------------- */
function computeResults() {
  const stats = {};
  for (const s in SECTION_CONFIG) {
    stats[s] = {
      totalQ: 0,
      correct: 0,
      marks: SECTION_CONFIG[s].marks,
      obtained: 0,
    };
  }

  paperSections.forEach((ps) => {
    ps.questions.forEach((q) => {
      const st = stats[q._section];
      st.totalQ++;

      if (selectedAnswers[q.id] === q.answerIndex) {
        st.correct++;
      }
    });
  });

  // FIXED MARKING
  Object.values(stats).forEach((st) => {
    const perQ = st.totalQ ? st.marks / st.totalQ : 0;
    st.obtained = st.correct * perQ;
  });

  const total = Object.values(stats).reduce((a, s) => a + s.marks, 0);
  const obtained = Object.values(stats).reduce(
    (a, s) => a + s.obtained,
    0
  );

  const percent = Math.round((obtained / total) * 100);

  scorePercent.textContent = `${obtained.toFixed(1)} / ${total} (${percent}%)`;

  showSection(resultsSection);
}

/* -------------------------
   Reset
------------------------- */
retakeBtn.onclick = () => startBtn.click();
goStartBtn.onclick = () => showSection(startSection);

/* -------------------------
   Init
------------------------- */
loadQuestions();