let allQuestions = [];
let filteredQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let userAnswers = [];

// Fetch questions from JSON
fetch('questions.json')
    .then(res => res.json())
    .then(data => { allQuestions = data; });

function startQuiz(section) {
    if (section === 'ALL') {
        filteredQuestions = allQuestions;
    } else {
        // Logic to filter based on IDs from your provided document
        if (section === 'SECTION -A') {
            filteredQuestions = allQuestions.filter(q => q.id <= 50);
        } else if (section === 'SECTION -B') {
            filteredQuestions = allQuestions.filter(q => q.id > 50 && q.id <= 100);
        } else if (section === 'SECTION -C') {
            filteredQuestions = allQuestions.filter(q => q.id > 100);
        }
    }

    document.getElementById('selection-page').classList.add('hidden');
    document.getElementById('quiz-page').classList.remove('hidden');
    document.getElementById('current-section-title').innerText = section;
    showQuestion();
}

function showQuestion() {
    const q = filteredQuestions[currentQuestionIndex];
    document.getElementById('progress').innerText = `Question ${currentQuestionIndex + 1} of ${filteredQuestions.length}`;
    document.getElementById('question-text').innerText = q.question;
    
    const optionsDiv = document.getElementById('options-container');
    optionsDiv.innerHTML = '';
    
    q.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.className = 'option-btn';
        btn.onclick = () => selectOption(index, btn);
        optionsDiv.appendChild(btn);
    });
    document.getElementById('next-btn').disabled = true;
}

function selectOption(index, btn) {
    const allBtns = document.querySelectorAll('.option-btn');
    allBtns.forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    
    userAnswers[currentQuestionIndex] = index;
    document.getElementById('next-btn').disabled = false;
}

function nextQuestion() {
    if (userAnswers[currentQuestionIndex] === filteredQuestions[currentQuestionIndex].answerIndex) {
        score++;
    }

    currentQuestionIndex++;
    if (currentQuestionIndex < filteredQuestions.length) {
        showQuestion();
    } else {
        showResults();
    }
}


function showResults() {
    document.getElementById('quiz-page').classList.add('hidden');
    document.getElementById('result-page').classList.remove('hidden');
    
    document.getElementById('score-summary').innerHTML = `
        <h2>Your Score: ${score} / ${filteredQuestions.length}</h2>
    `;

    const wrongList = document.getElementById('wrong-answers-list');
    wrongList.innerHTML = '';

    filteredQuestions.forEach((q, i) => {
        if (userAnswers[i] !== q.answerIndex) {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.innerHTML = `
                <p><strong>Q:</strong> ${q.question}</p>
                <p><strong>Your Answer:</strong> <span style="color:red">${q.options[userAnswers[i]]}</span></p>
                <p><strong>Correct Answer:</strong> <span class="correct-text">${q.options[q.answerIndex]}</span></p>
            `;
            wrongList.appendChild(item);
        }
    });
}