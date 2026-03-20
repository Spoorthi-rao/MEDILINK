# 🏥 MediLink — Multilingual Hospital Management System

MediLink bridges the language gap between patients and doctors in Indian hospitals.
A patient speaks in their native language (Tamil, Kannada, Hindi, Telugu, Malayalam),
the doctor responds in English — MediLink handles all translation in real-time using AI.
One unique Patient ID connects Reception, Doctor, Pharmacy and Lab — eliminating
manual paperwork and inter-department communication errors.

## 🚀 Features
- Patient speaks in Tamil/Kannada/Hindi/Telugu/Malayalam → AI converts to English for doctor
- Doctor responds in English → AI translates back → Patient hears audio in their own language
- AI automatically extracts diagnosis, prescriptions and lab tests from the conversation
- Doctor reviews and confirms before anything is saved — human always in control
- Pharmacy sees medicines ordered and marks them as dispensed
- Lab sees tests ordered and uploads results directly
- All departments connected through one unique Patient ID
- Print prescription, lab report and patient summary directly from the app

## 🌐 Supported Languages
Tamil, Kannada, Hindi, Telugu, Malayalam

## 🛠️ Tech Stack
- **Frontend** — React.js + Tailwind CSS
- **Backend** — Node.js + Express.js
- **Database** — MongoDB Atlas
- **Speech to Text** — Groq Whisper Large V3 (converts patient voice to text)
- **Translation** — Groq Llama 3.3 70B (translates between English and regional languages)
- **Clinical AI** — Groq Llama 3.3 70B (extracts diagnosis, prescriptions, lab tests)
- **Text to Speech** — Browser Web Speech API (speaks translated text to patient)
- **Audio Capture** — MediaRecorder API (records patient and doctor voice)

## 👥 User Roles
- **Doctor** — Live multilingual consultation, AI clinical record generation
- **Receptionist** — Patient registration, unique Patient ID generation
- **Pharmacy** — View prescriptions, mark medicines as dispensed, print report
- **Lab** — View test orders, upload results, print lab report
- **Patient** — View own records, medicines, lab results in their language

## ⚙️ Setup

**Backend**
```bash
cd backend
npm install
node server.js
```

**Frontend**
```bash
cd frontend
npm install
npm start
```

**Create `backend/.env`**
```
PORT=5000
MONGODB_URI=your_mongodb_connection_string
GROQ_API_KEY=your_groq_api_key
```

## 🔁 How It Works
1. Receptionist registers patient and generates unique Patient ID
2. Patient speaks in their language — Groq Whisper converts voice to text
3. Groq Llama translates to English — doctor reads on screen
4. Doctor responds in English — Groq Llama translates to patient language
5. Browser speaks the translation aloud to the patient
6. After consultation, AI extracts structured clinical record
7. Doctor reviews and confirms — saved to MongoDB
8. Pharmacy and Lab access orders instantly using the same Patient ID
