const GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/AKfycbyUZS378rRhdon6w7c4NepfreZ2TcxfXPE9EqEMUZ_a_J4AP06bcDmQZvXkT6bfM-84Vw/exec;

let currentTicket = [];
let currentQuestionIndex = 0;
let correctCount = 0;

// Безопасная загрузка вопросов из 7 файлов (questions/1.txt ... 7.txt)
async function generateTicket() {
  currentTicket = [];
  for (let i = 1; i <= 7; i++) {
    try {
      const response = await fetch(`questions/${i}.txt`);
      if (!response.ok) throw new Error('Файл не найден');
      
      const text = await response.text();
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      if (lines.length > 0) {
        const randomIndex = Math.floor(Math.random() * lines.length);
        const rawLine = lines[randomIndex];
        const parts = rawLine.split('|').map(p => p.trim());
        
        currentTicket.push({
          num: i,
          text: parts[0] || `Вопрос №${i}`,
          reference: parts[1] || 'Эталонный ответ не указан преподавателем.',
          link: parts[2] || '#'
        });
        continue;
      }
    } catch (e) {
      console.warn(`Не удалось загрузить questions/${i}.txt, используется резервный вопрос.`, e);
    }
    
    // Резервный вариант, если файл не загрузился или пустой, чтобы кнопка никогда не зависала
    currentTicket.push({
      num: i,
      text: `Тестовый вопрос №${i} (проверьте наличие файла questions/${i}.txt в репозитории)`,
      reference: 'Эталонный ответ для проверки.',
      link: '#'
    });
  }
}

document.getElementById('start-btn').addEventListener('click', async () => {
  const btn = document.getElementById('start-btn');
  btn.innerText = 'Формируем билет...';
  btn.disabled = true;

  await generateTicket();

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  
  showQuestion(0);
});

function showQuestion(index) {
  currentQuestionIndex = index;
  const q = currentTicket[index];
  
  document.getElementById('question-number').innerText = `Вопрос ${index + 1} из 7`;
  document.getElementById('question-text').innerText = q.text;
  document.getElementById('user-answer').value = '';
  document.getElementById('progress').style.width = `${((index + 1) / 7) * 100}%`;

  document.getElementById('reference-text').innerText = q.reference;
  
  const theoryLink = document.getElementById('theory-link');
  if (q.link && q.link !== '#') {
    theoryLink.href = q.link;
    theoryLink.classList.remove('hidden');
  } else {
    theoryLink.classList.add('hidden');
  }

  document.getElementById('evaluation-block').classList.add('hidden');
  document.getElementById('check-btn').classList.remove('hidden');
}

document.getElementById('check-btn').addEventListener('click', () => {
  const answer = document.getElementById('user-answer').value.trim();
  if (!answer) {
    alert('Пожалуйста, напишите ответ перед проверкой.');
    return;
  }

  document.getElementById('check-btn').classList.add('hidden');
  document.getElementById('evaluation-block').classList.remove('hidden');
});

document.getElementById('btn-correct').addEventListener('click', () => submitGrade('Верно'));
document.getElementById('btn-incorrect').addEventListener('click', () => submitGrade('Неверно'));

async function submitGrade(grade) {
  const q = currentTicket[currentQuestionIndex];
  const userAnswer = document.getElementById('user-answer').value;

  if (grade === 'Верно') {
    correctCount++;

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
    }).catch(err => console.error(err));

  } else {
    if (q.link && q.link !== '#') {
      if (confirm('Вы отметили ответ как неверный. Хотите открыть материал для повторения этой темы?')) {
        window.open(q.link, '_blank');
      }
    }
  }

  proceedNext();
}

function proceedNext() {
  if (currentQuestionIndex < 6) {
    showQuestion(currentQuestionIndex + 1);
  } else {
    showFinishScreen();
  }
}

function showFinishScreen() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('finish-screen').classList.remove('hidden');
  
  const finalScoreEl = document.getElementById('final-score');
  
  if (correctCount >= 4) {
    finalScoreEl.innerHTML = `🎉 <b>Зачёт сдан!</b><br>Вы правильно ответили на ${correctCount} из 7 вопросов (порог: 4). Отличный результат! Все правильные ответы сохранены в тренировочную базу.`;
  } else {
    finalScoreEl.innerHTML = `💡 <b>Тренировка завершена.</b><br>Вы ответили верно на ${correctCount} из 7 вопросов. Для зачёта нужно минимум 4. Рекомендуем повторить материал и попробовать еще раз!`;
  }
}
