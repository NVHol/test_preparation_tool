// --- ВСТАВЬТЕ СЮДА ВАШУ ССЫЛКУ В КАВЫЧКАХ ---
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyUZS378rRhdon6w7c4NepfreZ2TcxfXPE9EqEMUZ_a_J4AP06bcDmQZvXkT6bfM-84Vw/exec';

// --- НАСТРОЙКИ ---
const TOTAL_QUESTIONS = 7;
const PASSING_SCORE = 4;

// --- РЕЗЕРВНЫЕ ВОПРОСЫ (Гарантируют запуск, если .txt файлы недоступны) ---
const backupQuestions = {
  1: 'Что изучает теплотехника? | Теплотехника изучает методы получения, преобразования, передачи и использования теплоты. | #',
  2: 'Сформулируйте первое начало термодинамики своими словами. | Изменение внутренней энергии системы равно сумме количества теплоты, переданного системе, и работы, совершенной над системой. | #',
  3: 'Каковы основные способы теплообмена? | Основные способы: теплопроводность, конвекция и тепловое излучение. | #',
  4: 'Что такое идеальный газ в термодинамике? | Это модель газа, в которой пренебрегают взаимодействием между молекулами и их собственным объемом. | #',
  5: 'Опишите цикл Карно. Из каких процессов он состоит? | Цикл Карно состоит из двух изотермических и двух адиабатных процессов. | #',
  6: 'В чем разница между теплопроводностью и конвекцией? | Теплопроводность — передача тепла внутри тела или при контакте; конвекция — передача тепла перемещением объемов жидкости или газа. | #',
  7: 'Сформулируйте закон Бойля-Мариотта. | При постоянной температуре произведение давления газа на его объем есть величина постоянная (pV=const). | #'
};

let currentTicket = [];
let currentQuestionIndex = 0;
let score = 0;

// --- ЗАГРУЗКА БИЛЕТА ---
async function generateTicket() {
  currentTicket = [];
  
  for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
    let questionData = null;
    
    try {
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
      console.warn(`Файл questions/${i}.txt недоступен или пуст. Используем резервный вопрос.`);
    }

    if (!questionData) {
      const parts = backupQuestions[i].split('|').map(p => p.trim());
      questionData = {
        num: i,
        text: parts[0],
        reference: parts[1],
        link: parts[2]
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

  // Возвращаем стандартный блок оценок (скрываем блок "Повтори материал" для нового вопроса)
  document.getElementById('evaluation-block').classList.remove('hidden');
  document.getElementById('wrong-feedback-block').classList.add('hidden');
  
  document.getElementById('evaluation-buttons-wrap').classList.remove('hidden');
  document.getElementById('reference-container').classList.add('hidden');
  
  document.getElementById('check-btn').classList.remove('hidden');
}

// Кнопка "Проверить ответ"
document.getElementById('check-btn').addEventListener('click', () => {
  const answer = document.getElementById('user-answer').value.trim();
  if (!answer) {
    alert('Пожалуйста, напишите ответ своими словами перед проверкой.');
    return;
  }

  const q = currentTicket[currentQuestionIndex];
  
  // Показываем эталон и кнопки Верно/Неверно
  document.getElementById('reference-text').innerText = q.reference;
  document.getElementById('reference-container').classList.remove('hidden');

  document.getElementById('check-btn').classList.add('hidden');
});

// --- ОЦЕНКА ---

document.getElementById('btn-correct').addEventListener('click', () => {
  score++; // +1 балл
  const q = currentTicket[currentQuestionIndex];
  const userAnswer = document.getElementById('user-answer').value;

  // Отправляем в Google Таблицу
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

// Если студент нажал "Неверно"
document.getElementById('btn-incorrect').addEventListener('click', () => {
  // Балл не начисляем, в таблицу ничего не пишем
  const q = currentTicket[currentQuestionIndex];

  // Скрываем кнопки Верно/Неверно и эталон, показываем специальный блок с текстом "Повтори этот материал"
  document.getElementById('evaluation-buttons-wrap').classList.add('hidden');
  document.getElementById('reference-container').classList.add('hidden');
  
  const theoryLink = document.getElementById('wrong-theory-link');
  if (q.link && q.link !== '#') {
    theoryLink.href = q.link;
    theoryLink.classList.remove('hidden');
  } else {
    theoryLink.classList.add('hidden');
  }

  document.getElementById('wrong-feedback-block').classList.remove('hidden');
});

// Кнопка "Далее" после просмотра материала по ошибке
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
