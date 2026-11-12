
const API_ENDPOINT = "http://localhost:11434/api/chat";

const MODEL_NAME = "qwen3:4b-q4_K_M";

const GENERATION_OPTIONS = {
    temperature: 0.2,
    num_predict: 500,
    num_ctx: 4096,
    repeat_penalty: 1.15,
    repeat_last_n: 128,
    top_p: 0.85,
    top_k: 30
};

// Обробка отриманого потоку даних
async function readStream(response, onDelta) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let buffer = "";
    let fullAnswer = "";

    function processLine(line) {
        if (!line.trim()) return false;

        const data = JSON.parse(line);

        if (data.error) {
            throw new Error(data.error);
        }

        const fragment = data.message?.content ?? "";

        if (fragment) {
            fullAnswer += fragment;
            onDelta(fragment);
        }

        return data.done === true;
    }

    try {
        while (true) {
            const { value, done } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                processLine(line);
            }
        }

        buffer += decoder.decode();

        if (buffer.trim()) {
            processLine(buffer);
        }


        console.log("Відповідь моделі:", fullAnswer);
        console.log("Довжина відповіді:", fullAnswer.length);
        return fullAnswer;

    } finally {
        reader.releaseLock();
    }
}

// Надсилання повідомлень до локальної моделі
export async function streamChat(messages, onDelta, signal) {
    const response = await fetch(API_ENDPOINT, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            model: MODEL_NAME,
            messages,
            stream: true,
            think: false,
            options: GENERATION_OPTIONS
        }),

        signal
    });

    if (!response.ok) {
        throw new Error(
            `Помилка підключення до Ollama: HTTP ${response.status}`
        );
    }

    if (!response.body) {
        throw new Error("Потік відповіді недоступний.");
    }

    return await readStream(response, onDelta);
}
