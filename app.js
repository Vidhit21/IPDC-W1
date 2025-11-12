// app.js — Adapted for Tailwind UI
// This version applies the 'dark' class to the <html> element for better Tailwind integration.

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
   Global Constants & State
   ------------------------- */
const PROGRESS_RING_CIRCUMFERENCE = 2 * Math.PI * 48; // r=48

const SECTION_CONFIG = {
  A: { idRange: [1, 50], draw: 10, marks: 10 },
  B: { idRange: [51, 100], draw: 15, marks: 30 },
  C: { idRange: [101, 130], draw: 15, marks: 30 },
};

let allQuestions = [];
let paperSections = [];
let sectionIndex = 0;
let selectedAnswers = {};
let quizActive = false;

/* -------------------------
   Helpers
   ------------------------- */

/**
 * Loads questions from questions.json. Caches result.
 */
async function loadQuestions() {
  if (allQuestions.length) return allQuestions;
  try {
    const res = await fetch('questions.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('questions.json load failed');
    allQuestions = await res.json();
    return allQuestions;
  } catch (err) {
    console.error(err);
    showToast('Could not load questions.json — open console for details', true);
    return [];
  }
}

/**
 * Returns a new shuffled array.
 * @param {Array<any>} arr - The array to shuffle.
 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Hides all sections and shows the target one with an animation.
 * @param {HTMLElement} sectionEl - The section element to show.
 */
function showSection(sectionEl) {
  [startSection, sectionPage, resultsSection].forEach((s) => (s.hidden = true));
  sectionEl.hidden = false;
  sectionEl.classList.remove('panel-exit');
  sectionEl.classList.add('panel-enter');
  setTimeout(() => sectionEl.classList.remove('panel-enter'), 450);
}

/**
 * Displays a toast message.
 * @param {string} msg - The message to show.
 * @param {boolean} autoHide - Whether to auto-hide the toast.
 * @param {number} ms - The duration to show the toast.
 */
function showToast(msg, autoHide = true, ms = 2800) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastEl._hideTimeout);
  if (autoHide)
    toastEl._hideTimeout = setTimeout(() => (toastEl.hidden = true), ms);
}

/* -------------------------
   Build paper
   ------------------------- */

/**
 * Builds the paper sections based on user selection.
 * @param {Array<string>} selectedSections - e.g., ['A', 'C']
 */
async function buildPaper(selectedSections) {
  await loadQuestions();
  if (!allQuestions.length) {
    showToast('No questions in bank');
    return null;
  }

  const sections = [];
  for (const s of selectedSections) {
    const cfg = SECTION_CONFIG[s];
    if (!cfg) continue;
    const [lo, hi] = cfg.idRange;
    const pool = allQuestions.filter((q) => q.id >= lo && q.id <= hi);
    const chosen = shuffle(pool)
      .slice(0, Math.min(cfg.draw, pool.length))
      .map((q) => ({ ...q, _section: s }));
    sections.push({ id: s, questions: chosen, cfg });
  }
  return sections;
}

/* -------------------------
   Start / Section rendering
   ------------------------- */
function getSelectedChips() {
  return chips
    .filter((c) => c.classList.contains('active'))
    .map((c) => c.dataset.sec);
}

chips.forEach((ch) => {
  ch.addEventListener('click', () => {
    ch.classList.toggle('active');
    const pressed = ch.classList.contains('active');
    ch.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  });
});

startBtn.addEventListener('click', async () => {
  const chosen = getSelectedChips();
  if (!chosen.length) {
    showToast('Select at least one section');
    return;
  }
  const built = await buildPaper(chosen);
  if (!built || !built.length) {
    showToast('Could not build paper');
    return;
  }
  paperSections = built;
  sectionIndex = 0;
  selectedAnswers = {};
  quizActive = true;
  showSectionPage(sectionIndex);
  showSection(sectionPage);
  // Add warning for user leaving the page while quiz is active
  window.addEventListener('beforeunload', beforeUnloadWarn);
});

/**
 * Warns user before they leave the page during an active quiz.
 * @param {Event} e - The beforeunload event.
 */
function beforeUnloadWarn(e) {
  if (quizActive) {
    e.preventDefault();
    e.returnValue = '';
  }
}

/**
 * Renders a specific section page by its index.
 * @param {number} idx - The index of the section in `paperSections`.
 */
function showSectionPage(idx) {
  const sec = paperSections[idx];
  if (!sec) return;
  sectionTitle.textContent = `Section ${sec.id}`;
  sectionProgress.textContent = `${idx + 1} of ${paperSections.length}`;
  miniProgressBar.style.width = `${Math.round(
    ((idx + 1) / paperSections.length) * 100
  )}%`;

  // build questions
  sectionQuestions.innerHTML = '';
  sec.questions.forEach((q, qi) => {
    const qcard = document.createElement('div');
    qcard.className =
      'question-card bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 transition-all duration-200';

    qcard.innerHTML = `
      <div class="question-header px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <h3 class="font-semibold text-lg text-gray-800 dark:text-gray-100">Q${
            qi + 1
          }. <span class="text-sm font-normal text-gray-500 dark:text-gray-400">(${
      sec.id
    })</span></h3>
      </div>
      <div class="question-text p-5 text-gray-800 dark:text-gray-200">${escapeHtml(
        q.question
      )}</div>
      
      <div class="options-container ${
        q.options && q.options.length > 0 ? '' : 'hidden'
      }">
          <div class="options flex flex-col gap-3 p-5 pt-0" role="radiogroup" aria-label="Options for question ${
            qi + 1
          }"></div>
      </div>
    `;

    // Only run the options loop if options actually exist
    if (q.options && q.options.length > 0) {
      const optsWrap = qcard.querySelector('.options');
      q.options.forEach((opt, oi) => {
        const optEl = document.createElement('button');
        optEl.className =
          'option flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 cursor-pointer transition-all duration-200 ease-in-out hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700/50 text-left';
        optEl.type = 'button';
        optEl.dataset.qid = q.id;
        optEl.dataset.index = oi;
        optEl.setAttribute('role', 'radio');
        optEl.setAttribute(
          'aria-checked',
          selectedAnswers[q.id] === oi ? 'true' : 'false'
        );
        optEl.tabIndex = 0;

        optEl.innerHTML = `<div class="radio w-8 h-8 rounded-lg border-2 border-gray-300 dark:border-gray-500 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold transition-all flex-shrink-0" aria-hidden="true">
                            ${String.fromCharCode(65 + oi)}
                         </div>
                         <div class="label flex-1 text-gray-700 dark:text-gray-200">${escapeHtml(
                           opt
                         )}</div>`;
        if (selectedAnswers[q.id] === oi) optEl.classList.add('selected');

        // click / keyboard
        optEl.addEventListener('click', () => selectOption(q.id, oi, qcard));
        optEl.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            selectOption(q.id, oi, qcard);
          }
        });

        optsWrap.appendChild(optEl);
      });
    }

    sectionQuestions.appendChild(qcard);
  });

  // Update navigation button states
  prevSectionBtn.disabled = idx === 0;
  nextSectionBtn.hidden = idx === paperSections.length - 1;
  submitBtn.hidden = idx !== paperSections.length - 1;
}

/**
 * Handles selecting an option for a question.
 * @param {string|number} qid - The question ID.
 * @param {number} index - The index of the selected option.
 * @param {HTMLElement} qcard - The question card element.
 */
function selectOption(qid, index, qcard) {
  // clear previous selection visuals for this question
  qcard.querySelectorAll('.option').forEach((o) => {
    o.classList.remove('selected');
    o.setAttribute('aria-checked', 'false');
  });

  // set selected
  selectedAnswers[qid] = index;
  const chosen = qcard.querySelector(`.option[data-index="${index}"]`);
  if (chosen) {
    chosen.classList.add('selected');
    chosen.setAttribute('aria-checked', 'true');
  }
}

/* -------------------------
   Navigation
   ------------------------- */

/**
 * Checks if all questions in a section have been answered.
 * @param {number} idx - The section index.
 */
function validateSectionAnswered(idx) {
  const sec = paperSections[idx];
  // Handle questions without options (e.g., theory) by not validating them
  const mcqQuestions = sec.questions.filter(
    (q) => q.options && q.options.length > 0
  );
  const missing = mcqQuestions.filter(
    (q) => typeof selectedAnswers[q.id] !== 'number'
  );
  return missing.length === 0;
}

prevSectionBtn.addEventListener('click', () => {
  if (sectionIndex === 0) return;
  sectionIndex--;
  showSectionPage(sectionIndex);
});

nextSectionBtn.addEventListener('click', () => {
  if (!validateSectionAnswered(sectionIndex)) {
    showToast('Please answer all questions in this section to proceed');
    return;
  }
  if (sectionIndex < paperSections.length - 1) {
    sectionIndex++;
    showSectionPage(sectionIndex);
  }
});

submitBtn.addEventListener('click', () => {
  // Final validation check before submitting
  for (let i = 0; i < paperSections.length; i++) {
    if (!validateSectionAnswered(i)) {
      showToast(`Please complete Section ${paperSections[i].id}`);
      sectionIndex = i;
      showSectionPage(sectionIndex);
      return;
    }
  }
  computeAndShowResults();
});

/* -------------------------
   Results
   ------------------------- */
function computeAndShowResults() {
  // Prepare stats object
  const stats = {};
  for (const s in SECTION_CONFIG) {
    const cfg = SECTION_CONFIG[s];
    stats[s] = {
      totalQ: 0,
      correctCount: 0,
      sectionMarks: cfg.marks,
      perQMark: cfg.marks / cfg.draw,
      marksObtained: 0,
    };
  }

  const used = [];
  paperSections.forEach((ps) => ps.questions.forEach((q) => used.push(q)));

  // Only grade questions that have an answerIndex
  const gradableQuestions = used.filter(
    (q) => typeof q.answerIndex === 'number'
  );

  gradableQuestions.forEach((q) => {
    const s = q._section || 'A';
    const st = stats[s];
    st.totalQ++; // Note: This now means total *gradable* questions
    const sel = selectedAnswers[q.id];
    if (sel === q.answerIndex) {
      st.correctCount++;
      st.marksObtained += st.perQMark;
    }
  });

  // Calculate total marks based on the sections that were *actually* built
  const totalMarks = paperSections.reduce((a, ps) => a + ps.cfg.marks, 0);
  const marksObt = Object.values(stats).reduce(
    (a, st) => a + st.marksObtained,
    0
  );
  const totalMarksRounded = parseFloat(totalMarks.toFixed(1));
  const marksObtRounded = parseFloat(marksObt.toFixed(1));

  // Handle division by zero if totalMarks is 0
  const percentRounded =
    totalMarks > 0 ? Math.round((marksObt / totalMarks) * 100) : 0;

  // Render results
  showSection(resultsSection);
  scorePercent.textContent = `${marksObtRounded} / ${totalMarksRounded} — ${percentRounded}%`;

  // Update ring animation
  const pct = percentRounded;
  // Use the global constant
  progressCircle.style.strokeDasharray = PROGRESS_RING_CIRCUMFERENCE;
  const offset =
    PROGRESS_RING_CIRCUMFERENCE - (pct / 100) * PROGRESS_RING_CIRCUMFERENCE;
  // small timeout to allow CSS transition
  setTimeout(() => {
    progressCircle.style.strokeDashoffset = offset;
  }, 40);

  // breakdown
  sectionBreakdown.innerHTML = '';
  paperSections.forEach((ps) => {
    const s = ps.id;
    const st = stats[s];
    const div = document.createElement('div');
    div.className = 'small';
    div.innerHTML = `<strong>Section ${s}:</strong> ${
      st.correctCount
    } / ${st.totalQ} correct — ${parseFloat(st.marksObtained.toFixed(1))} / ${
      st.sectionMarks
    } marks`;
    sectionBreakdown.appendChild(div);
  });

  // wrong items
  wrongItems.innerHTML = '';
  // Only show wrong answers from gradable questions
  const wrong = gradableQuestions.filter(
    (q) => selectedAnswers[q.id] !== q.answerIndex
  );
  if (!wrong.length && gradableQuestions.length > 0) {
    const p = document.createElement('div');
    p.className =
      'correct-item p-4 bg-green-50 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-700 flex items-center gap-3';
    p.innerHTML = `<span class="material-icons text-green-600">check_circle</span>
                   <span class="text-green-800 dark:text-green-200 font-semibold">Great job — all answers correct!</span>`;
    wrongItems.appendChild(p);
  } else if (wrong.length === 0 && gradableQuestions.length === 0) {
    const p = document.createElement('div');
    p.className =
      'correct-item p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center gap-3';
    p.innerHTML = `<span class="material-icons text-gray-600">info</span>
                   <span class="text-gray-800 dark:text-gray-200 font-semibold">No gradable questions were answered.</span>`;
    wrongItems.appendChild(p);
  } else {
    wrong.forEach((q) => {
      const wi = document.createElement('div');
      wi.className =
        'wrong-item p-4 bg-red-50 dark:bg-red-900/50 rounded-lg border border-red-200 dark:border-red-700';
      const ua =
        selectedAnswers[q.id] != null
          ? q.options[selectedAnswers[q.id]]
          : 'No answer';

      wi.innerHTML = `<div class="flex items-start gap-3">
                        <span class="material-icons text-red-500">cancel</span>
                        <div>
                          <strong class="text-gray-800 dark:text-gray-100">${
                            q._section
                          } — ${escapeHtml(q.question)}</strong>
                          <div class="small text-red-700 dark:text-red-300">Your answer: <strong>${escapeHtml(
                            ua
                          )}</strong></div>
                          <div class="small text-green-700 dark:text-green-300">Correct: <strong>${escapeHtml(
                            q.options[q.answerIndex]
                          )}</strong></div>
                        </div>
                      </div>`;
      wrongItems.appendChild(wi);
    });
  }

  // disable beforeunload
  quizActive = false;
  window.removeEventListener('beforeunload', beforeUnloadWarn);
}

/* -------------------------
   Small helpers
   ------------------------- */
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* -------------------------
   Misc events
   ------------------------- */
retakeBtn.addEventListener('click', () => {
  // rebuild same sections
  startBtn.click();
});
goStartBtn.addEventListener('click', () => {
  quizActive = false;
  window.removeEventListener('beforeunload', beforeUnloadWarn);
  showSection(startSection);
});

/* -------------------------
   Initialization
   ------------------------- */
loadQuestions();
