// --- ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ В КАВЫЧКАХ ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUZS378rRhdon6w7c4NepfreZ2TcxfXPE9EqEMUZ_a_J4AP06bcDmQZvXkT6bfM-84Vw/exec';

// --- НАСТРОЙКИ ---
const TOTAL_QUESTIONS = 7;
const PASSING_SCORE = 4;

let currentTicket = [];
let currentQuestionIndex = 0;
let score = 0;

// --- ЗАГРУЗКА БИЛЕТА (из папки questions/ или напрямую из корня) ---
async function generateTicket() {
  currentTicket = [];
  
  for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
    let questionData = null;
    
    try {
      // Ищем файлы в папке questions/ (или просто i.txt, если файлы лежат в корне)
      const response = await fetch(`questions/${i}.txt`);
      if (response.ok) {
        const text = await response.text();
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        if (lines.length > 0) {
          const randomIndex = Math.floor(Math.random() * lines.length);
          const rawLine = lines[randomIndex];
          const parts = rawLine.split('|').map(p => p.trim());
          
          questionData = {
            num: i,
            text: parts[0] || `Вопрос №${i}`,
            reference: parts[1] || 'Эталонный ответ не указан преподавателем.',
            link: parts[2] || '#'
          };
        }
      }
    } catch (e) {
      console.warn(`Не удалось загрузить вопросы из файла ${i}`);
    }

    // Резервный вариант на всякий случай
    if (!questionData) {
      questionData = {
        num: i,
        text: `Вопрос №${i}`,
        reference: 'Эталонный ответ',
        link: '#'
      };
    }
    
    currentTicket.push(questionData);
  }
}

// --- УПРАВЛЕНИЕ ЭКРАНАМИ ---

document.getElementById('start-btn').addEventListener('click', async () => {
  const btn = document.getElementById('start-btn');
  btn.innerText = 'Формируем билет...';
  btn.disabled = true;

  await generateTicket();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  
  score = 0;
  showQuestion(0);
});

function showQuestion(index) {
  currentQuestionIndex = index;
  const q = currentTicket[index];
  
  document.getElementById('question-number').innerText = `Вопрос ${index + 1} из ${TOTAL_QUESTIONS}`;
  document.getElementById('question-text').innerText = q.text;
  document.getElementById('user-answer').value = '';
  document.getElementById('progress').style.width = `${((index + 1) / TOTAL_QUESTIONS) * 100}%`;

  // Сбрасываем видимость блоков для нового вопроса:
  // Показываем поле ввода и кнопку "Проверить ответ"
  document.getElementById('user-answer').disabled = false;
  document.getElementById('check-btn').classList.remove('hidden');

  // Полностью скрываем блок с эталоном и кнопками оценки
  document.getElementById('reference-container').classList.add('hidden');
  document.getElementById('evaluation-buttons-wrap').classList.add('hidden');
  document.getElementById('wrong-feedback-block').classList.add('hidden');
}

// Кнопка "Проверить ответ" — ПОСЛЕ НЕЕ ПОЯВЛЯЕТСЯ ЭТАЛОН И ВЕРНО/НЕВЕРНО
document.getElementById('check-btn').addEventListener('click', () => {
  const answer = document.getElementById('user-answer').value.trim();
  if (!answer) {
    alert('Пожалуйста, напишите ответ своими словами перед проверкой.');
    return;
  }

  const q = currentTicket[currentQuestionIndex];
  
  // Заполняем и показываем эталон
  document.getElementById('reference-text').innerText = q.reference;
  document.getElementById('reference-container').classList.remove('hidden');
  
  // Показываем кнопки Верно / Неверно
  document.getElementById('evaluation-buttons-wrap').classList.remove('hidden');

  // Блокируем поле ввода и скрываем кнопку "Проверить", чтобы студент сначала оценил себя
  document.getElementById('user-answer').disabled = true;
  document.getElementById('check-btn').classList.add('hidden');
});

// --- ОЦЕНКА ---

// Нажали "Верно": +1 балл, отправка в табличку, переход дальше
document.getElementById('btn-correct').addEventListener('click', () => {
  score++; 
  const q = currentTicket[currentQuestionIndex];
  const userAnswer = document.getElementById('user-answer').value;

  const data = {
    questionNum: q.num,
    questionText: q.text,
    userAnswer: userAnswer
  };

  fetch(GOOGLE_SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).catch(err => console.error('Ошибка отправки в таблицу:', err));

  proceedNext();
});

// Нажали "Неверно": балл не идет, появляется кнопка "Повтори этот материал"
document.getElementById('btn-incorrect').addEventListener('click', () => {
  const q = currentTicket[currentQuestionIndex];

  // Скрываем кнопки Верно/Неверно, оставляя эталон, и показываем блок повторения
  document.getElementById('evaluation-buttons-wrap').classList.add('hidden');
  
  const theoryLink = document.getElementById('wrong-theory-link');
  if (q.link && q.link !== '#') {
    theoryLink.href = q.link;
    theoryLink.classList.remove('hidden');
  } else {
    theoryLink.classList.add('hidden');
  }

  document.getElementById('wrong-feedback-block').classList.remove('hidden');
});

// Кнопка "Следующий вопрос" после ознакомления с материалом
document.getElementById('next-after-wrong-btn').addEventListener('click', () => {
  proceedNext();
});

function proceedNext() {
  if (currentQuestionIndex < (TOTAL_QUESTIONS - 1)) {
    showQuestion(currentQuestionIndex + 1);
  } else {
    showFinishScreen();
  }
}

function showFinishScreen() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('finish-screen').classList.remove('hidden');
  
  const finalScoreEl = document.getElementById('final-score');
  
  if (score >= PASSING_SCORE) {
    finalScoreEl.innerHTML = `🎉 <b>Зачёт сдан!</b><br>Вы правильно ответили на ${score} из ${TOTAL_QUESTIONS} вопросов (порог: ${PASSING_SCORE}). Отличный результат! Все правильные ответы сохранены в тренировочную базу.`;
  } else {
    finalScoreEl.innerHTML = `💡 <b>Тренировка завершена.</b><br>Вы ответили верно на ${score} из ${TOTAL_QUESTIONS} вопросов. Для зачёта нужно минимум ${PASSING_SCORE}. Рекомендуем повторить материал и попробовать еще раз!`;
  }
}
