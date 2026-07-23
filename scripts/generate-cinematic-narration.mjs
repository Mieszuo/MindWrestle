import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();

async function loadEnv(filePath) {
  const source = await fs.readFile(filePath, "utf8");
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

await loadEnv(path.join(root, ".env.local"));

const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
const configuredVoiceId = process.env.ELEVENLABS_NARRATOR_VOICE_ID?.trim();
if (!apiKey || !configuredVoiceId) {
  throw new Error("Missing ELEVENLABS_API_KEY or ELEVENLABS_NARRATOR_VOICE_ID");
}

const voiceId = configuredVoiceId;

const entries = [
  {
    id: "intro-01",
    file: "public/audio/narrator/intro/01-seven-silences.mp3",
    text: "Przy drodze odnajdujesz Kronikę, która nie zna twojego imienia. Wszystkie jej strony są puste, poza jednym zdaniem. Siedmioro oddało światu swoje milczenie. Wysłuchaj pierwszego głosu, a droga zapisze następny.",
  },
  {
    id: "intro-02",
    file: "public/audio/narrator/intro/02-nameless-wanderer.mp3",
    text: "Ciebie nie ma w Kronice świata. Dlatego możesz usłyszeć tych, których ona przemilczała. Nie masz miecza ani tytułu. Masz pytania — i drogę, na końcu której być może odzyskasz swoje imię.",
  },
  {
    id: "intro-03",
    file: "public/audio/narrator/intro/03-every-silence-different.mp3",
    text: "Każde milczenie ma inny głos. Mila boi się pamięci. Handlarz zna cenę sekretów, a Rycerz ukrywa się za przysięgą. Słuchaj uważnie, bo słowo, które otworzy jedne drzwi, może zamknąć następne.",
  },
  {
    id: "intro-04",
    file: "public/audio/narrator/intro/04-truth-from-their-lips.mp3",
    text: "Nie wystarczy, że sam poznasz odpowiedź. Prawda odzyska głos dopiero wtedy, gdy rozmówca zdecyduje się wypowiedzieć ją własnymi słowami. Nie wybierasz gotowych kwestii. Każdą rozmowę budujesz sam.",
  },
  {
    id: "intro-05",
    file: "public/audio/narrator/intro/05-chronicle-road.mp3",
    text: "Każde oddane Milczenie zapisze nowy fragment historii i wskaże następny krok. Pierwsza czeka Mila. Posłuchaj uważnie. Czasem najważniejsza prawda zaczyna się od wspomnienia, którego ktoś boi się nazwać.",
  },
  {
    id: "ending-01",
    file: "public/audio/narrator/ending/01-seven-voices.mp3",
    text: "Każde milczenie miało powód. Każdy sekret — ranę. Nie pokonałeś ich. Każde z nich zdecydowało się oddać fragment prawdy, którego nie mogło dłużej nieść samotnie.",
  },
  {
    id: "ending-02",
    file: "public/audio/narrator/ending/02-first-word.mp3",
    text: "Bóg nie zagrzmiał. Wyszeptał prawdę tak cicho, jakby bał się, że świat znów jej nadużyje. Milczenie nie było karą. Było schronieniem — aż ktoś przyszedł słuchać, zamiast żądać.",
  },
  {
    id: "ending-03",
    file: "public/audio/narrator/ending/03-name.mp3",
    text: "Na ostatniej stronie Kroniki pojawiło się imię. Nie jako wyrok, lecz jako wybór. Twoja strona była pusta, dopóki nie zacząłeś nieść cudzych prawd. Teraz możesz zapisać na niej własną.",
  },
  {
    id: "ending-04",
    file: "public/audio/narrator/ending/04-breath.mp3",
    text: "Prawda nie uleczyła wszystkiego. Królewski rozkaz nie przestał być winą, a dawne rany nie zniknęły. Lecz odtąd nikt nie musiał milczeć za cały świat. Każde miejsce mogło znów przemówić własnym głosem.",
  },
  {
    id: "ending-05",
    file: "public/audio/narrator/ending/05-road.mp3",
    text: "Nie potrzebowałeś miecza. Potrzebowałeś odwagi, by słuchać — i odpowiedzialności za słowa, które niosłeś dalej. Opowieść została domknięta. Milczenie oddane. Droga pozostaje.",
  },
];

const authoredPerformance = {
  "intro-01": { direction: "slowly", pauseAfterSentence: [1], pauseLength: "short" },
  "intro-02": { direction: "quietly", pauseAfterSentence: [], pauseLength: "short" },
  "intro-03": { direction: "slowly", pauseAfterSentence: [2], pauseLength: "short" },
  "intro-04": { direction: "slowly", pauseAfterSentence: [], pauseLength: "short" },
  "intro-05": { direction: "softly", pauseAfterSentence: [1], pauseLength: "short" },
  "ending-01": { direction: "solemnly", pauseAfterSentence: [1], pauseLength: "short" },
  "ending-02": { direction: "quietly", pauseAfterSentence: [1], pauseLength: "long" },
  "ending-03": { direction: "softly", pauseAfterSentence: [1], pauseLength: "short" },
  "ending-04": { direction: "slowly", pauseAfterSentence: [], pauseLength: "short" },
  "ending-05": { direction: "quietly", pauseAfterSentence: [3], pauseLength: "short" },
};

const narratorDirections = new Set(["slowly", "quietly", "softly", "solemnly"]);
for (const [id, performance] of Object.entries(authoredPerformance)) {
  if (!narratorDirections.has(performance.direction)) {
    throw new Error(`${id}: unsupported narrator direction "${performance.direction}"`);
  }
  if (performance.pauseAfterSentence.length > 1) {
    throw new Error(`${id}: narrator may use at most one explicit pause`);
  }
}

function sentenceRanges(text) {
  const ranges = [];
  const expression = /[^.!?…]+[.!?…]+|[^.!?…]+$/gu;
  for (const match of text.matchAll(expression)) {
    const raw = match[0];
    const leading = raw.length - raw.trimStart().length;
    const sentence = raw.trim();
    if (!sentence) continue;
    const start = (match.index ?? 0) + leading;
    ranges.push({ text: sentence, start, end: start + sentence.length - 1 });
  }
  return ranges;
}

function directedNarration(entry) {
  const performance = authoredPerformance[entry.id];
  const sentences = sentenceRanges(entry.text);
  const directedText = sentences
    .map((sentence, index) => {
      const pause = performance.pauseAfterSentence.includes(index)
        ? ` [${performance.pauseLength} pause]`
        : "";
      return `${sentence.text}${pause}`;
    })
    .join(" ");
  return `[${performance.direction}] ${directedText}`;
}

const manifest = {};
const generatedAudio = [];
for (const [index, entry] of entries.entries()) {
  process.stdout.write(`[${index + 1}/${entries.length}] ${entry.id}... `);
  const makeRequest = (selectedVoiceId, modelId = "eleven_v3") =>
    fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}/with-timestamps?output_format=mp3_44100_128`,
      {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: modelId === "eleven_v3" ? directedNarration(entry) : entry.text,
        model_id: modelId,
        language_code: "pl",
        seed: 17071994,
        voice_settings: {
          stability: 0.68,
          similarity_boost: 0.76,
          style: 0.24,
          speed: 0.91,
          use_speaker_boost: true,
        },
      }),
      },
    );

  let response = await makeRequest(voiceId);
  if (response.status === 400 || response.status === 422) {
    process.stdout.write("v3 incompatible; using multilingual v2 without tags... ");
    response = await makeRequest(voiceId, "eleven_multilingual_v2");
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${entry.id}: ElevenLabs ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const alignment = payload.alignment ?? payload.normalized_alignment;
  if (!payload.audio_base64 || !alignment?.character_start_times_seconds) {
    throw new Error(`${entry.id}: response did not include audio or alignment`);
  }

  const outputPath = path.join(root, entry.file);
  generatedAudio.push({
    outputPath,
    bytes: Buffer.from(payload.audio_base64, "base64"),
  });

  const starts = alignment.character_start_times_seconds;
  const ends = alignment.character_end_times_seconds;
  const alignedCharacters = Array.isArray(alignment.characters)
    ? alignment.characters.join("")
    : String(alignment.characters ?? entry.text);
  let searchFrom = 0;
  const cues = sentenceRanges(entry.text).map((sentence) => {
    const alignedStart = alignedCharacters.indexOf(sentence.text, searchFrom);
    if (alignedStart < 0) {
      throw new Error(`${entry.id}: could not align canonical sentence: ${sentence.text}`);
    }
    const alignedEnd = alignedStart + sentence.text.length - 1;
    searchFrom = alignedEnd + 1;
    return {
      text: sentence.text,
      startMs: Math.round((starts[alignedStart] ?? 0) * 1000),
      endMs: Math.round((ends[alignedEnd] ?? starts[alignedEnd] ?? 0) * 1000),
    };
  });
  manifest[entry.id] = {
    audio: `/${entry.file.replaceAll("\\", "/").replace(/^public\//, "")}`,
    text: entry.text,
    durationMs: cues.at(-1)?.endMs ?? 0,
    cues,
  };
  process.stdout.write("done\n");
}

const manifestPath = path.join(root, "public/audio/narrator/manifest.json");
for (const generated of generatedAudio) {
  await fs.mkdir(path.dirname(generated.outputPath), { recursive: true });
  await fs.writeFile(generated.outputPath, generated.bytes);
}
await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Saved ${entries.length} recordings and ${path.relative(root, manifestPath)}`);
