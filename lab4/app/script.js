
import { streamChat } from "./chat.js";
import { SYSTEM_PROMPT } from "./lodric.js";

// Елементи інтерфейсу
const chat = document.getElementById("chat");
const form = document.getElementById("chat-form");
const input = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");

// Історія діалогу
const messages = [
    {
        role: "system",
        content: SYSTEM_PROMPT
    }
];

// Поточний запит
let activeController = null;

// Додавання повідомлення до чату
function addMessage(role, content) {
    const messageElement = document.createElement("div");
    messageElement.className = `message ${role}`;

    const authorElement = document.createElement("div");
    authorElement.className = "message-author";

    authorElement.textContent = role === "user"
        ? "Ти"
        : "Вісник Лотріка";

    const contentElement = document.createElement("div");
    contentElement.className = "message-content";
    contentElement.textContent = content;

    messageElement.append(authorElement, contentElement);
    chat.appendChild(messageElement);

    chat.scrollTop = chat.scrollHeight;

    return contentElement;
}

// Блокування елементів на час генерації
function setLoading(isLoading) {
    sendButton.disabled = isLoading;
    input.disabled = isLoading;

    sendButton.textContent = isLoading
        ? "Вісник відповідає..."
        : "Надіслати";
}

// Обробка запиту користувача
async function handleMessage(event) {
    event.preventDefault();

    const userText = input.value.trim();

    if (!userText) return;

    // Відображаємо запит користувача
    addMessage("user", userText);

    // Додаємо запит до історії
    messages.push({
        role: "user",
        content: userText
    });

    input.value = "";
    input.style.height = "auto";

    setLoading(true);

    // Створюємо повідомлення для відповіді
    const assistantContent = addMessage("assistant", "");

    // Контролер дозволяє перервати запит
    activeController = new AbortController();

    try {
        // Отримуємо відповідь від моделі
        const answer = await streamChat(
            messages,
            (fragment) => {
                assistantContent.textContent += fragment;
                chat.scrollTop = chat.scrollHeight;
            },
            activeController.signal
        );

        // Зберігаємо відповідь у контексті
        messages.push({
            role: "assistant",
            content: answer
        });

    } catch (error) {
        console.error("Помилка генерації відповіді:", error);

        assistantContent.textContent =
            "Не вдалося отримати відповідь від Вісника. " +
            "Перевір, чи запущена Ollama та чи доступна модель Qwen3.";

        // Видаляємо невдалий запит з історії
        messages.pop();

    } finally {
        activeController = null;
        setLoading(false);
        input.focus();
    }
}

// Обробка надсилання форми
form.addEventListener("submit", handleMessage);

// Автоматичне збільшення поля введення
input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
});
