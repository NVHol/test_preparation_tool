const GOOGLE_SCRIPT_URL = https://script.google.com/macros/s/AKfycbyUZS378rRhdon6w7c4NepfreZ2TcxfXPE9EqEMUZ_a_J4AP06bcDmQZvXkT6bfM-84Vw/exec;

// --- НАСТРОЙКИ ---
const TOTAL_QUESTIONS = 7;
const PASSING_SCORE = 4;

// --- РЕЗЕРВНЫЕ ВОПРОСЫ (Гарантируют запуск, если .txt файлы недоступны) ---
// Формат: 'Вопрос | Эталонный ответ | Ссылка на теорию (или #)'
const backupQuestions = {
  1: 'Что изучает теплотехника? | Теплотехника изучает методы получения, преобразования, передачи и использования теплоты. | #',
  2: 'Сформулируйте первое начало термодинамики своими словами. | Изменение внутренней энергии системы равно сумме количества теплоты, переданного системе, и работы, совершенной над системой. | #',
  3: 'Каковы основные способы теплообмена? | Основные способы: теплопроводность, конвекция и тепловое излучение. | #',
  4: 'Что такое идеальный газ в термодинамике? | Это модель газа, в которой пренебрегают взаимодействием между молекулами и их собственным объемом. | #',
  5: 'Опишите цикл Карно. Из каких процессов он состоит? | Цикл Карно состоит из двух изотермических и двух адиабатных процессов. | #',
  6: 'В чем разница между теплопроводностью и конвекцией? | Теплопроводность — передача тепла внутри тела или при контакте; конвекция — передача тепла перемещением объемов жидкости или газа. | #',
  7: 'Сформулируйте закон Бойля-Мариотта. | При постоянной температуре произведение давления газа на его объем есть величина постоянная (pV=const). | #'
};

// --- ПЕРЕМЕННЫЕ СОСТОЯНИЯ ТЕСТА ---
let currentTicket = [];
let currentQuestionIndex = 0;
let score = 0; // Набранные баллы студента

// --- ЛОГИКА ЗАГРУЗКИ БИЛЕТА ---
// Функция пытается загрузить вопросы из файлов 1.txt...7.txt
// Если файл недоступен, использует резервный вопрос из backupQuestions.
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
          // Выбираем случайную строку из файла
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

    // Если данные не загрузились из файла, используем резервную копию
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

// --- ЛОГИКА ПЕРЕКЛЮЧЕНИЯ ЭКРАНОВ И ОТОБРАЖЕНИЯ ВОПРОСОВ ---

// Кнопка "Сформировать билет"
document.getElementById('start-btn').addEventListener('click', async () => {
  const btn = document.getElementById('start-btn');
  btn.innerText = 'Формируем билет...';
  btn.disabled = true; // Блокируем кнопку, пока идет загрузка

  // Формируем билет (теперь это не зависнет)
  await generateTicket();

  // Переключаем экраны
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  
  score = 0; // Сбрасываем баллы
  showQuestion(0);
});

// Функция отображения текущего вопроса
function showQuestion(index) {
  currentQuestionIndex = index;
  const q = currentTicket[index];
  
  // Обновляем текст заголовка, вопроса и очищаем поле ввода ответа
  document.getElementById('question-number').innerText = `Вопрос ${index + 1} из ${TOTAL_QUESTIONS}`;
  document.getElementById('question-text').innerText = q.text;
  document.getElementById('user-answer').value = '';
  
  // Обновляем прогресс-бар
  document.getElementById('progress').style.width = `${((index + 1) / TOTAL_QUESTIONS) * 100}%`;

  // Скрываем блок проверки и эталон
  document.getElementById('evaluation-block').classList.add('hidden');
  document.getElementById('check-btn').classList.remove('hidden'); // Показываем кнопку "Проверить"
}

// Кнопка "Проверить ответ"
document.getElementById('check-btn').addEventListener('click', () => {
  const answer = document.getElementById('user-answer').value.trim();
  if (!answer) {
    alert('Пожалуйста, напишите ответ своими словами перед проверкой.');
    return;
  }

  const q = currentTicket[currentQuestionIndex];
  
  // Показываем эталон и ссылку на теорию
  document.getElementById('reference-text').innerText = q.reference;
  
  const theoryLink = document.getElementById('theory-link');
  if (q.link && q.link !== '#') {
    theoryLink.href = q.link;
    theoryLink.classList.remove('hidden');
  } else {
    theoryLink.classList.add('hidden');
  }

  // Переключаем видимость кнопок: скрываем "Проверить", показываем эталон и Верно/Неверно
  document.getElementById('check-btn').classList.add('hidden');
  document.getElementById('evaluation-block').classList.remove('hidden');
});

// --- ЛОГИКА ОЦЕНКИ И БАЛЛОВ ---

// Нажали кнопку "Верно"
document.getElementById('btn-correct').addEventListener('click', () => submitGrade('Верно'));
// Нажали кнопку "Неверно"
document.getElementById('btn-incorrect').addEventListener('click', () => submitGrade('Неверно'));

// Функция обработки оценки студента
async function submitGrade(grade) {
  const q = currentTicket[currentQuestionIndex];
  const userAnswer = document.getElementById('user-answer').value;

  // ЛОГИКА ИЗ ВАШЕГО ЗАПРОСА:
  if (grade === 'Верно') {
    score++; // Студенту +1 балл

    // Отправляем данные в Google Таблицу ТОЛЬКО если ответ верный (анонимно)
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

  } else {
    // Если студент ответил «Неверно»:
    // 1. Балл не начисляется (score не меняется)
    // 2. В таблицу ничего не отправляется.
    // 3. Предлагаем повторить теорию (если есть ссылка)
    if (q.link && q.link !== '#') {
      if (confirm('Вы отметили ответ как неверный. Рекомендуем повторить материал. Открыть теоретический материал?')) {
        window.open(q.link, '_blank');
      }
    }
  }

  // Переходим к следующему вопросу или финалу
  proceedNext();
}

// Функция перехода дальше
function proceedNext() {
  if (currentQuestionIndex < (TOTAL_QUESTIONS - 1)) {
    // Если есть еще вопросы, показываем следующий
    showQuestion(currentQuestionIndex + 1);
  } else {
    // Если это был последний вопрос, показываем экран финала
    showFinishScreen();
  }
}

// ЭКРАН ФИНАЛА: Результат
function showFinishScreen() {
  document.getElementById('quiz-screen').classList.add('hidden');
  document.getElementById('finish-screen').classList.remove('hidden');
  
  const finalScoreEl = document.getElementById('final-score');
  
  // Проверяем порог зачёта (минимум 4 из 7)
  if (score >= PASSING_SCORE) {
    finalScoreEl.innerHTML = `🎉 <b>Зачёт сдан!</b><br>Вы правильно ответили на ${score} из ${TOTAL_QUESTIONS} вопросов (порог: ${PASSING_SCORE}). Отличный результат! Все правильные ответы сохранены в тренировочную базу.`;
  } else {
    finalScoreEl.innerHTML = `💡 <b>Тренировка завершена.</b><br>Вы ответили верно на ${score} из ${TOTAL_QUESTIONS} вопросов. Для зачёта нужно минимум ${PASSING_SCORE}. Рекомендуем повторить материал и попробовать еще раз!`;
  }
}
