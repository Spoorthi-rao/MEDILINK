const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const OriginalgTTS = require('gtts');

// Robust wrapper to bypass gTTS's internal language validation
const gTTS = function(text, lang, debug) {
  const target = (lang || 'en').toLowerCase();
  // Call original with 'en' to bypass the 'Language not supported' check in constructor
  const instance = new OriginalgTTS(text, 'en', debug);
  // Manually override the language property for the actual request
  instance.lang = target;
  return instance;
};

const Consultation = require('../models/Consultation');
const Prescription = require('../models/Prescription');
const LabOrder = require('../models/LabOrder');

const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || 'dummy_key_to_prevent_crash' });


// ← THIS IS THE FIX — forces .webm extension on saved file
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });


/* ── 1. PATIENT MIC: Audio (Lang) → Text (Lang) → Text (English) ── */
router.post('/transcribe-patient', upload.single('audio'), async (req, res) => {
  let filePath; 
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio' });
    filePath = req.file.path;
    console.log(`[STT] Received audio file: ${filePath} (${req.file.size} bytes)`);
    const patientLang = req.body.language || 'ta';

    const PROMPTS = {
      ta: "மருத்துவமனை ஆலோசனை. காய்ச்சல், இருமல், வலி, சர்க்கரை நோய், இரத்த அழுத்தம், மாத்திரை, மருந்துகள், காலம், அறிகுறிகள்.",
      hi: "अस्पताल में डॉक्टर और मरीज के बीच बातचीत। बुखार, खांसी, दर्द, बीपी, शुगर, दवाइयां, लक्षण, दिन।",
      te: "ఆసుపత్రిలో వైద్య సంప్రదింపు. జ్వరం, దగ్గు, నొప్పి, మందులు, లక్షణాలు.",
      kn: "ಆಸ್ಪತ್ರೆಯಲ್ಲಿ ವೈದ್ಯಕೀಯ ಸಮಾಲೋಚನೆ. ಜ್ವರ, ಕೆಮ್ಮು, ನೋವು, ಮಾತ್ರೆಗಳು, ರೋಗಲಕ್ಷಣಗಳು, ದಿನಗಳು.",
      ml: "ആശുപത്രിയിൽ മെഡിക്കൽ കൺസൾട്ടേഷൻ. പനി, ചുമ, വേദന, മരുന്നുകൾ, ലക്ഷണങ്ങൾ.",
      bn: "হাসপাতালে চিকিৎসকের পরামর্শ। জ্বর, কাশি, ব্যথা, ওষুধ, উপসর্গ।"
    };

    // 1. Whisper transcribes Patient's voice
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3', 
      language: patientLang,
      prompt: PROMPTS[patientLang] || "Medical consultation, symptoms, medicine.", 
      response_format: 'json',
      temperature: 0.1 
    });

    const originalText = transcription.text.trim();
    console.log(`[STT DEBUG] Patient language: ${patientLang} | Whisper Raw: "${originalText}"`);

    // Robust Silence and Hallucination Filter
    // Relaxed Hallucination Filter
    const lower = originalText.toLowerCase();
    const hallucinations = ["thank you for watching", "please subscribe", "is that it"];
    const isHallucination = 
      hallucinations.some(h => lower.includes(h)) || 
      lower === "." || 
      lower === " ";

    if (isHallucination) {
      console.log(`[STT] Ignoring probable silence/hallucination: "${originalText}"`);
      return res.json({ ignored: true, raw: originalText });
    }

    // 2. Llama translates to English
    const LANG_NAMES = { ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali' };
    const translation = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a medical translator. Translate the patient's ${LANG_NAMES[patientLang] || 'local language'} speech into proper English for a doctor. Maintain the EXACT medical meaning, symptoms, and duration perfectly. Return ONLY the English translation, nothing else.` },
        { role: 'user', content: originalText }
      ],
      temperature: 0.1, // Near-zero for factual precision
      max_tokens: 300
    });

    res.json({
      original: originalText,
      translated: translation.choices[0].message.content.trim(),
      language: patientLang
    });
  } catch (err) {
    console.error('PATIENT MIC ERROR Details:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: err.message, 
      details: err.response?.data,
      hint: "Try holding the button for at least 1-2 seconds." 
    });
  } finally {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
});


/* ── 1b. PATIENT TEXT FALLBACK: Text (Lang) → Text (English) ── */
router.post('/translate-patient-text', async (req, res) => {
  try {
    const { text, language } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });
    
    const LANG_NAMES = { ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali' };
    const patientLangName = LANG_NAMES[language] || 'local language';

    const translation = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a medical translator. Translate the patient's ${patientLangName} text into proper English for a doctor. Maintain the EXACT medical meaning and symptoms. Return ONLY the English translation.` },
        { role: 'user', content: text }
      ],
      temperature: 0.1,
      max_tokens: 300
    });

    res.json({
      translated: translation.choices[0].message.content.trim()
    });
  } catch (err) {
    console.error('PATIENT TEXT ERROR:', err.message);
    res.status(500).json({ error: 'Fallback translation failed' });
  }
});


/* ── 2. DOCTOR MIC: Audio (English) → Text (English) → Text (Target Lang) ── */
router.post('/transcribe-doctor', upload.single('audio'), async (req, res) => {
  let filePath; // Declare filePath here to ensure it's accessible in finally
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio' });
    filePath = req.file.path;
    const targetLang = req.body.targetLang || 'ta';

    // 1. Whisper transcribes Doctor's English voice
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3', // Using full model for Indian-English accents
      language: 'en',
      prompt: "A doctor's official advice and prescription in English. Medicine names, dosage, and diagnostic instructions.",
      response_format: 'json',
      temperature: 0.0
    });

    const doctorEnglish = transcription.text.trim();
    console.log(`[STT DEBUG] Doctor language: English | Whisper Raw: "${doctorEnglish}"`);

    // Robust Silence and Hallucination Filter
    const lower = doctorEnglish.toLowerCase();
    const isHallucination = 
      lower === "" || 
      /thank you|amara\.org|subtitles by|bye\.$|amém|you\.$/i.test(lower) || 
      /^[\W_]+$/.test(lower); // Drops messages that are only punctuation

    if (isHallucination) {
      fs.unlinkSync(req.file.path);
      return res.json({ ignored: true });
    }

    // 2. Llama translates to Patient's Language
    const LANG_NAMES = { ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali' };
    const langName = LANG_NAMES[targetLang] || 'Tamil';

    const translation = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a medical translator. Translate the doctor's English advice into accurate, culturally appropriate ${langName} for the patient. Ensure medical accuracy and a comforting tone. Return ONLY the ${langName} translation, strictly without any preamble or quotes.` },
        { role: 'user', content: doctorEnglish }
      ],
      temperature: 0.1, // Near-zero for strict accuracy
      max_tokens: 300
    });

    const translatedText = translation.choices[0].message.content.trim();

    fs.unlinkSync(req.file.path);
    res.json({
      englishText: doctorEnglish,
      translated: translatedText,
      targetLang
    });

  } catch (err) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('DOCTOR MIC ERROR Details:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: err.message, 
      details: err.response?.data,
      hint: "Try holding the button for at least 1-2 seconds." 
    });
  }
});


/* ── 3. DOCTOR TEXT (Alternative text input) ── */
router.post('/translate-to-patient', async (req, res) => {
  try {
    const { text, targetLang } = req.body;
    if (!text || !targetLang) return res.status(400).json({ error: 'Required fields missing' });
    const LANG_NAMES = { ta: 'Tamil', hi: 'Hindi', te: 'Telugu', kn: 'Kannada', ml: 'Malayalam', bn: 'Bengali' };
    
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `Translate the doctor's English advice into accurate ${LANG_NAMES[targetLang] || 'Tamil'} for the patient. Return ONLY the translation.` },
        { role: 'user', content: text }
      ],
      temperature: 0.2, max_tokens: 300
    });

    res.json({ original: text, translated: response.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/* ── 3. AI STRUCTURE (kept for Generate AI Record button) ──
   Full transcript → Groq Llama → structured JSON
   Saves to MongoDB: Consultation + Prescriptions + LabOrders
──────────────────────────────────────────────────────────── */
router.post('/structure', async (req, res) => {
  try {
    const { patient_id, transcript } = req.body;

    if (!patient_id || !transcript) {
      return res.status(400).json({ error: 'patient_id and transcript are required' });
    }

    const prompt = `You are a clinical documentation AI for an Indian hospital.
Read this doctor-patient consultation and extract structured medical data.
Return ONLY valid JSON. No explanation. No markdown. No backticks.

Transcript:
${transcript}

Return exactly this JSON:
{
  "symptoms": ["symptom1", "symptom2"],
  "diagnosis": "diagnosis in 2-4 words",
  "clinical_notes": "2 sentence clinical summary",
  "prescriptions": [
    {"medicine": "name", "dosage": "amount", "frequency": "how often", "duration": "X days"}
  ],
  "lab_tests": [
    {"test": "test name", "urgency": "routine or urgent"}
  ],
  "followup": "follow-up instruction"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    });

    // Parse JSON — handle if Llama wraps in backticks
    let structured;
    const raw = completion.choices[0].message.content
      .replace(/```json/g, '').replace(/```/g, '').trim();
    structured = JSON.parse(raw);

    // ── Generate consultation_id (THIS WAS MISSING — BUG #1 FIXED) ──
    const consultation_id = 'C' + uuidv4().slice(0, 6).toUpperCase();

    // Save Consultation
    await new Consultation({
      consultation_id,
      patient_id,
      eng_transcript: transcript,
      symptoms: structured.symptoms || [],
      diagnosis: structured.diagnosis || '',
      clinical_notes: structured.clinical_notes || '',
      followup: structured.followup || ''
    }).save();

    // Save Prescriptions
    for (const rx of structured.prescriptions || []) {
      await new Prescription({
        rx_id: 'RX' + uuidv4().slice(0, 5).toUpperCase(),
        consultation_id,
        patient_id,
        medicine: rx.medicine,
        dosage: rx.dosage,
        frequency: rx.frequency,
        duration: rx.duration
      }).save();
    }

    // Save Lab Orders
    for (const test of structured.lab_tests || []) {
      await new LabOrder({
        order_id: 'LB' + uuidv4().slice(0, 5).toUpperCase(),
        consultation_id,
        patient_id,
        test_name: test.test,
        urgency: test.urgency || 'routine'
      }).save();
    }

    res.json({ success: true, consultation_id, structured });

  } catch (err) {
    console.error('STRUCTURE ERROR:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/* ── 4. TEXT TO SPEECH (FREE gTTS) ────────────────────────
   Returns base64 mp3 of the translated text
──────────────────────────────────────────────────────────── */
router.post('/speak', async (req, res) => {
  let filename;
  try {
    const { text, language } = req.body;
    const langMap = { ta: 'ta', hi: 'hi', te: 'te', kn: 'kn', ml: 'ml', bn: 'bn' };
    const lang = langMap[language] || 'en';
    filename = `speech_${Date.now()}.mp3`;

    console.log(`[TTS] Generating audio for ${lang}. Length: ${text?.length} chars`);
    const tts = new gTTS(text, lang);
    tts.save(filename, function (err) {
      if (err) {
        console.error(`[TTS ERROR] gTTS save failed for ${lang}:`, err);
        return res.status(500).json({ error: 'TTS service failed' });
      }
      try {
        const audio = fs.readFileSync(filename).toString('base64');
        res.json({ audio });
      } catch (readErr) {
        console.error(`[TTS ERROR] File read failed for ${lang}:`, readErr);
        res.status(500).json({ error: 'TTS file processing failed' });
      } finally {
        if (filename && fs.existsSync(filename)) fs.unlinkSync(filename);
      }
    });
  } catch (err) {
    console.error('TTS ERROR:', err);
    res.status(500).json({ error: 'TTS failed' });
    if (filename && fs.existsSync(filename)) fs.unlinkSync(filename);
  }
});

module.exports = router;