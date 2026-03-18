import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const BACKEND = "https://momenta-backend.onrender.com";
const today = () => new Date().toISOString().split("T")[0];
const COLORS = ["#5ee7df","#b490ca","#f7971e","#56ccf2","#f093fb","#4facfe","#43e97b"];
const DEFAULT_RADIO_OPTIONS = ["Never","Rarely","Sometimes","Often","Always"];

// Translated radio option sets — keys match the English option text exactly
const RADIO_TRANSLATIONS = {
  // Default frequency scale: Never/Rarely/Sometimes/Often/Always
  "Never,Rarely,Sometimes,Often,Always": {
    zh: ["从不","很少","有时","经常","总是"],
    ms: ["Tidak pernah","Jarang","Kadang-kadang","Kerap","Selalu"],
    ta: ["ஒருபோதும் இல்லை","அரிதாக","சில நேரம்","அடிக்கடி","எப்போதும்"],
    th: ["ไม่เคย","นาน ๆ ครั้ง","บางครั้ง","บ่อยครั้ง","เสมอ"],
    jv: ["Ora tau","Arang-arang","Kadang-kadang","Kerep","Tansah"],
  },
  // Interest scale
  "None at all,Very little,Some,Mostly normal,Fully normal": {
    zh: ["完全没有","很少","有一些","基本正常","完全正常"],
    ms: ["Langsung tidak","Sangat sedikit","Ada sedikit","Kebanyakan normal","Sepenuhnya normal"],
    ta: ["அறவே இல்லை","மிகவும் குறைவாக","சிறிதளவு","பெரும்பாலும் சாதாரண","முழுமையாக சாதாரண"],
    th: ["ไม่มีเลย","น้อยมาก","บ้าง","ปกติเกือบทั้งหมด","ปกติเต็มที่"],
    jv: ["Ora ana babar pisan","Sithik banget","Ana sithik","Umume normal","Normal kabeh"],
  },
};

// Get translated radio options for a question
function getRadioOptions(q, lang) {
  if (lang === "en") return q.radioOptions?.length ? q.radioOptions : DEFAULT_RADIO_OPTIONS;
  const key = (q.radioOptions?.length ? q.radioOptions : DEFAULT_RADIO_OPTIONS).join(",");
  const translated = RADIO_TRANSLATIONS[key]?.[lang];
  if (translated) return translated;
  // Fallback: return originals
  return q.radioOptions?.length ? q.radioOptions : DEFAULT_RADIO_OPTIONS;
}

// Map a translated answer back to its English equivalent for scoring
function getEnglishOption(translatedAnswer, q, lang) {
  if (lang === "en") return translatedAnswer;
  const key = (q.radioOptions?.length ? q.radioOptions : DEFAULT_RADIO_OPTIONS).join(",");
  const translated = RADIO_TRANSLATIONS[key]?.[lang];
  if (!translated) return translatedAnswer;
  const idx = translated.indexOf(translatedAnswer);
  const english = q.radioOptions?.length ? q.radioOptions : DEFAULT_RADIO_OPTIONS;
  return idx >= 0 ? english[idx] : translatedAnswer;
}


const LANGUAGES = [
  { code:"en", label:"English", flag:"🇬🇧", sealionLang:"English" },
  { code:"zh", label:"中文",    flag:"🇨🇳", sealionLang:"Mandarin Chinese" },
  { code:"ms", label:"Melayu", flag:"🇲🇾", sealionLang:"Bahasa Melayu" },
  { code:"ta", label:"தமிழ்", flag:"🇮🇳", sealionLang:"Tamil" },
  { code:"th", label:"ไทย",    flag:"🇹🇭", sealionLang:"Thai" },
  { code:"jv", label:"Jawa",   flag:"🇮🇩", sealionLang:"Javanese" },
];

// All hardcoded — no LLM needed for UI or chat wrapping strings
const T = {
  en: {
    appTagline:"Mental health check-in assistant",
    selectProfile:"Select your profile", selectAccount:"Select your account",
    choosePrompt:"— Choose —", signIn:"Sign in →",
    demoNote:"Demo mode — no password required",
    patientTab:"👤 Patient", doctorTab:"🩺 Doctor", signOut:"Sign out",
    hello:(n)=>`Hello, ${n} 👋`,
    healthOverview:"Here's your health overview.",
    diagnoses:"Diagnoses", sessions:"Sessions", streak:"Streak",
    yourConditions:"Your conditions", questions:"questions",
    checkinDue:"Daily check-in due", checkinDueDesc:"Your doctor is waiting for your update.",
    checkInNow:"Check in now", allDone:"All done for today!", allDoneDesc:"See you tomorrow.",
    startCheckin:"Start today's check-in →", anotherSession:"Start another session",
    dailyCheckin:"Daily Check-in", backBtn:"← Back",
    questionOf:(a,b)=>`${a} / ${b} questions`,
    freeTextHint:"Share how you're feeling… (Enter to send)",
    micHint:"💬 Free text · 🎙 Tap mic to speak",
    transcribing:"Transcribing…", sessionComplete:"Session complete!",
    sessionSaved:"Your responses have been saved for your doctor.",
    backHome:"Back to home", responseRecorded:"✓ Response recorded",
    scale15:"🎚 Scale 1–5", yesNo:"✅ Yes / No", chooseOne:"🔘 Choose one",
    notAtAll:"1 — Not at all", severely:"5 — Severely",
    confirmBtn:"Confirm →", yesBtn:"✅ Yes", noBtn:"❌ No",
    streakDays:(n)=>n?"1 day":"0 days", langLabel:"Language",
    chatGreeting:(n)=>`Hey ${n}! 😊 Let's do your daily check-in — just a few questions today.`,
    chatWidgetIntro:"Here's a question for you:",
    chatAck:["Got it, thanks! 👍","Noted, appreciate you sharing.","Thanks for letting me know! 😊","Understood, thank you.","That's helpful, thanks!"],
    chatOutro:(n)=>`Thanks for checking in today, ${n}! Your responses have been saved for your doctor. Take care! 💙`,
  },
  zh: {
    appTagline:"心理健康每日报到助手",
    selectProfile:"选择您的账号", selectAccount:"选择您的账号",
    choosePrompt:"— 请选择 —", signIn:"登录 →",
    demoNote:"演示模式 — 无需密码",
    patientTab:"👤 患者", doctorTab:"🩺 医生", signOut:"退出登录",
    hello:(n)=>`你好，${n} 👋`,
    healthOverview:"这是您的健康概况。",
    diagnoses:"诊断", sessions:"记录", streak:"连续",
    yourConditions:"您的病症", questions:"道题目",
    checkinDue:"今日报到提醒", checkinDueDesc:"您的医生在等待您的更新。",
    checkInNow:"立即报到", allDone:"今天已完成！", allDoneDesc:"明天见。",
    startCheckin:"开始今日报到 →", anotherSession:"再次报到",
    dailyCheckin:"每日报到", backBtn:"← 返回",
    questionOf:(a,b)=>`第 ${a} / ${b} 题`,
    freeTextHint:"分享您的感受…（按 Enter 发送）",
    micHint:"💬 自由回答 · 🎙 点击麦克风说话",
    transcribing:"正在转录…", sessionComplete:"报到完成！",
    sessionSaved:"您的回答已保存，供医生查阅。",
    backHome:"返回主页", responseRecorded:"✓ 已记录回答",
    scale15:"🎚 评分 1–5", yesNo:"✅ 是 / 否", chooseOne:"🔘 选择一项",
    notAtAll:"1 — 完全没有", severely:"5 — 非常严重",
    confirmBtn:"确认 →", yesBtn:"✅ 是", noBtn:"❌ 否",
    streakDays:(n)=>n?"1 天":"0 天", langLabel:"语言",
    chatGreeting:(n)=>`你好，${n}！😊 我们来做今天的每日报到吧，就几个问题。`,
    chatWidgetIntro:"请回答以下问题：",
    chatAck:["好的，谢谢！👍","已记录，感谢您的分享。","谢谢您告诉我！😊","明白了，谢谢。","很有帮助，谢谢！"],
    chatOutro:(n)=>`感谢今天的报到，${n}！您的回答已保存给医生。保重！💙`,
  },
  ms: {
    appTagline:"Pembantu daftar masuk kesihatan mental",
    selectProfile:"Pilih profil anda", selectAccount:"Pilih akaun anda",
    choosePrompt:"— Pilih —", signIn:"Log masuk →",
    demoNote:"Mod demo — tiada kata laluan diperlukan",
    patientTab:"👤 Pesakit", doctorTab:"🩺 Doktor", signOut:"Log keluar",
    hello:(n)=>`Helo, ${n} 👋`,
    healthOverview:"Ini adalah gambaran kesihatan anda.",
    diagnoses:"Diagnosis", sessions:"Sesi", streak:"Berturut",
    yourConditions:"Keadaan anda", questions:"soalan",
    checkinDue:"Daftar masuk harian diperlukan", checkinDueDesc:"Doktor anda menunggu kemas kini anda.",
    checkInNow:"Daftar masuk sekarang", allDone:"Selesai untuk hari ini!", allDoneDesc:"Jumpa esok.",
    startCheckin:"Mulakan daftar masuk hari ini →", anotherSession:"Mulakan sesi lain",
    dailyCheckin:"Daftar Masuk Harian", backBtn:"← Kembali",
    questionOf:(a,b)=>`Soalan ${a} / ${b}`,
    freeTextHint:"Kongsi perasaan anda… (Enter untuk hantar)",
    micHint:"💬 Teks bebas · 🎙 Ketik mikrofon",
    transcribing:"Menulis transkripsi…", sessionComplete:"Sesi selesai!",
    sessionSaved:"Jawapan anda telah disimpan untuk doktor anda.",
    backHome:"Kembali ke laman utama", responseRecorded:"✓ Jawapan direkodkan",
    scale15:"🎚 Skala 1–5", yesNo:"✅ Ya / Tidak", chooseOne:"🔘 Pilih satu",
    notAtAll:"1 — Langsung tidak", severely:"5 — Sangat teruk",
    confirmBtn:"Sahkan →", yesBtn:"✅ Ya", noBtn:"❌ Tidak",
    streakDays:(n)=>n?"1 hari":"0 hari", langLabel:"Bahasa",
    chatGreeting:(n)=>`Helo ${n}! 😊 Jom buat daftar masuk harian anda — beberapa soalan sahaja.`,
    chatWidgetIntro:"Ini soalan untuk anda:",
    chatAck:["Baik, terima kasih! 👍","Direkodkan, terima kasih kerana berkongsi.","Terima kasih kerana memberitahu saya! 😊","Faham, terima kasih.","Berguna sekali, terima kasih!"],
    chatOutro:(n)=>`Terima kasih kerana daftar masuk hari ini, ${n}! Jawapan anda telah disimpan. Jaga diri! 💙`,
  },
  ta: {
    appTagline:"மன நல தினசரி சரிபார்ப்பு உதவியாளர்",
    selectProfile:"உங்கள் சுயவிவரத்தை தேர்ந்தெடுக்கவும்", selectAccount:"உங்கள் கணக்கை தேர்ந்தெடுக்கவும்",
    choosePrompt:"— தேர்ந்தெடுக்கவும் —", signIn:"உள்நுழைக →",
    demoNote:"டெமோ பயன்முறை — கடவுச்சொல் தேவையில்லை",
    patientTab:"👤 நோயாளி", doctorTab:"🩺 மருத்துவர்", signOut:"வெளியேறு",
    hello:(n)=>`வணக்கம், ${n} 👋`,
    healthOverview:"இது உங்கள் உடல்நல சுருக்கம்.",
    diagnoses:"நோய் கண்டறிதல்", sessions:"அமர்வுகள்", streak:"தொடர்ச்சி",
    yourConditions:"உங்கள் நிலைமைகள்", questions:"கேள்விகள்",
    checkinDue:"இன்றைய சரிபார்ப்பு நிலுவையில் உள்ளது", checkinDueDesc:"உங்கள் மருத்துவர் காத்திருக்கிறார்.",
    checkInNow:"இப்போது சரிபார்க்கவும்", allDone:"இன்று முடிந்தது!", allDoneDesc:"நாளை சந்திப்போம்.",
    startCheckin:"இன்றைய சரிபார்ப்பை தொடங்கவும் →", anotherSession:"மற்றொரு அமர்வை தொடங்கவும்",
    dailyCheckin:"தினசரி சரிபார்ப்பு", backBtn:"← திரும்பு",
    questionOf:(a,b)=>`கேள்வி ${a} / ${b}`,
    freeTextHint:"உங்கள் உணர்வுகளை பகிரவும்… (Enter அனுப்பவும்)",
    micHint:"💬 சுதந்திர உரை · 🎙 பேச மைக்கை தட்டவும்",
    transcribing:"எழுத்தாக்கம் செய்கிறது…", sessionComplete:"அமர்வு முடிந்தது!",
    sessionSaved:"உங்கள் பதில்கள் மருத்துவருக்காக சேமிக்கப்பட்டன.",
    backHome:"முகப்புக்கு திரும்பவும்", responseRecorded:"✓ பதில் பதிவு செய்யப்பட்டது",
    scale15:"🎚 அளவு 1–5", yesNo:"✅ ஆம் / இல்லை", chooseOne:"🔘 ஒன்றை தேர்ந்தெடுக்கவும்",
    notAtAll:"1 — இல்லவே இல்லை", severely:"5 — மிகவும் கடுமையான",
    confirmBtn:"உறுதிப்படுத்து →", yesBtn:"✅ ஆம்", noBtn:"❌ இல்லை",
    streakDays:(n)=>n?"1 நாள்":"0 நாட்கள்", langLabel:"மொழி",
    chatGreeting:(n)=>`வணக்கம் ${n}! 😊 இன்றைய சரிபார்ப்பை செய்வோம் — சில கேள்விகள் மட்டுமே.`,
    chatWidgetIntro:"உங்களுக்கு ஒரு கேள்வி:",
    chatAck:["சரி, நன்றி! 👍","பதிவு செய்யப்பட்டது, பகிர்ந்தமைக்கு நன்றி.","எனக்கு சொன்னதற்கு நன்றி! 😊","புரிந்தது, நன்றி.","மிகவும் உதவியாக இருந்தது, நன்றி!"],
    chatOutro:(n)=>`இன்று சரிபார்த்தமைக்கு நன்றி, ${n}! உங்கள் பதில்கள் மருத்துவருக்கு சேமிக்கப்பட்டன. கவனமாக இருங்கள்! 💙`,
  },
  th: {
    appTagline:"ผู้ช่วยเช็คอินสุขภาพจิตประจำวัน",
    selectProfile:"เลือกโปรไฟล์ของคุณ", selectAccount:"เลือกบัญชีของคุณ",
    choosePrompt:"— เลือก —", signIn:"เข้าสู่ระบบ →",
    demoNote:"โหมดทดลอง — ไม่ต้องใช้รหัสผ่าน",
    patientTab:"👤 ผู้ป่วย", doctorTab:"🩺 แพทย์", signOut:"ออกจากระบบ",
    hello:(n)=>`สวัสดี, ${n} 👋`,
    healthOverview:"นี่คือภาพรวมสุขภาพของคุณ",
    diagnoses:"การวินิจฉัย", sessions:"เซสชัน", streak:"ต่อเนื่อง",
    yourConditions:"สภาวะของคุณ", questions:"คำถาม",
    checkinDue:"ถึงเวลาเช็คอินประจำวัน", checkinDueDesc:"แพทย์ของคุณรอการอัพเดทจากคุณ",
    checkInNow:"เช็คอินเดี๋ยวนี้", allDone:"เสร็จสิ้นสำหรับวันนี้!", allDoneDesc:"พบกันพรุ่งนี้",
    startCheckin:"เริ่มเช็คอินวันนี้ →", anotherSession:"เริ่มเซสชันอื่น",
    dailyCheckin:"เช็คอินประจำวัน", backBtn:"← กลับ",
    questionOf:(a,b)=>`คำถาม ${a} / ${b}`,
    freeTextHint:"แชร์ความรู้สึกของคุณ… (กด Enter เพื่อส่ง)",
    micHint:"💬 ข้อความอิสระ · 🎙 แตะไมค์เพื่อพูด",
    transcribing:"กำลังถอดความ…", sessionComplete:"เซสชันเสร็จสมบูรณ์!",
    sessionSaved:"คำตอบของคุณถูกบันทึกสำหรับแพทย์แล้ว",
    backHome:"กลับหน้าหลัก", responseRecorded:"✓ บันทึกคำตอบแล้ว",
    scale15:"🎚 ระดับ 1–5", yesNo:"✅ ใช่ / ไม่ใช่", chooseOne:"🔘 เลือกหนึ่งข้อ",
    notAtAll:"1 — ไม่มีเลย", severely:"5 — รุนแรงมาก",
    confirmBtn:"ยืนยัน →", yesBtn:"✅ ใช่", noBtn:"❌ ไม่ใช่",
    streakDays:(n)=>n?"1 วัน":"0 วัน", langLabel:"ภาษา",
    chatGreeting:(n)=>`สวัสดี ${n}! 😊 มาเช็คอินประจำวันกันเลย — มีคำถามไม่กี่ข้อ`,
    chatWidgetIntro:"นี่คือคำถามสำหรับคุณ:",
    chatAck:["รับทราบแล้ว ขอบคุณ! 👍","บันทึกแล้ว ขอบคุณที่แบ่งปัน","ขอบคุณที่บอก! 😊","เข้าใจแล้ว ขอบคุณ","เป็นประโยชน์มาก ขอบคุณ!"],
    chatOutro:(n)=>`ขอบคุณที่เช็คอินวันนี้ ${n}! คำตอบของคุณถูกบันทึกให้แพทย์แล้ว ดูแลตัวเองด้วยนะ! 💙`,
  },
  jv: {
    appTagline:"Asisten cek-in kesehatan mental saben dina",
    selectProfile:"Pilih profil sampeyan", selectAccount:"Pilih akun sampeyan",
    choosePrompt:"— Pilih —", signIn:"Mlebu →",
    demoNote:"Mode demo — ora perlu sandi",
    patientTab:"👤 Pasien", doctorTab:"🩺 Dokter", signOut:"Metu",
    hello:(n)=>`Halo, ${n} 👋`,
    healthOverview:"Iki ringkesan kesehatan sampeyan.",
    diagnoses:"Diagnosis", sessions:"Sesi", streak:"Berturut-turut",
    yourConditions:"Kondisi sampeyan", questions:"pitakon",
    checkinDue:"Wektune cek-in saben dina", checkinDueDesc:"Dokter sampeyan ngenteni kabar sampeyan.",
    checkInNow:"Cek-in saiki", allDone:"Rampung kanggo dina iki!", allDoneDesc:"Ketemu sesuk.",
    startCheckin:"Miwiti cek-in dina iki →", anotherSession:"Miwiti sesi liyane",
    dailyCheckin:"Cek-in Saben Dina", backBtn:"← Bali",
    questionOf:(a,b)=>`Pitakon ${a} / ${b}`,
    freeTextHint:"Critakake perasaan sampeyan… (Enter kanggo kirim)",
    micHint:"💬 Teks bebas · 🎙 Klik mikrofon",
    transcribing:"Lagi ntranskripsi…", sessionComplete:"Sesi rampung!",
    sessionSaved:"Jawaban sampeyan wis disimpen kanggo dokter.",
    backHome:"Bali nang omah", responseRecorded:"✓ Jawaban wis direkam",
    scale15:"🎚 Skala 1–5", yesNo:"✅ Iya / Ora", chooseOne:"🔘 Pilih siji",
    notAtAll:"1 — Ora babar pisan", severely:"5 — Banget abot",
    confirmBtn:"Konfirmasi →", yesBtn:"✅ Iya", noBtn:"❌ Ora",
    streakDays:(n)=>n?"1 dina":"0 dina", langLabel:"Basa",
    chatGreeting:(n)=>`Halo ${n}! 😊 Ayo cek-in saben dina — mung sawetara pitakon wae.`,
    chatWidgetIntro:"Iki pitakon kanggo sampeyan:",
    chatAck:["Oke, matur nuwun! 👍","Wis dicatat, matur nuwun wis cerita.","Matur nuwun wis ngabari! 😊","Ngerti, matur nuwun.","Migunani banget, matur nuwun!"],
    chatOutro:(n)=>`Matur nuwun wis cek-in dina iki, ${n}! Jawaban sampeyan wis disimpen kanggo dokter. Jaga kesehatan! 💙`,
  },
};

// ─── QUESTION LABEL TRANSLATIONS (keyed by question id) ──────────────────────
// Doctors write labels in English; these are the patient-facing translations
const Q_LABELS = {
  en: {},  // fallback — uses q.label directly
  zh: {
    focus:       "今天集中精神有多困难？",
    hyperactive: "你有感到坐立不安或过度活跃吗？",
    impulsivity: "你今天冲动行事的频率如何？",
    focus_feel:  "请告诉我更多关于你今天集中力的感受。",
    mood:        "你今天的心情如何？",
    fatigue:     "你今天感到疲惫或精力不足吗？",
    interest:    "你对平时喜欢的事物有多少兴趣？",
    mood_feel:   "用你自己的话，今天情绪上你感觉如何？",
    obsessions:  "侵入性想法对你的困扰程度如何？",
    compulsions: "你今天有进行强迫行为吗？",
    ocd_feel:    "你能描述今天与强迫症想法的相处吗？",
    worry:       "你今天担忧的程度如何？",
    restless:    "你今天感到多烦躁或紧张？",
    panic:       "你今天有恐慌发作吗？",
    anx_feel:    "用你自己的话描述今天的焦虑感受。",
  },
  ms: {
    focus:       "Betapa sukarnya untuk fokus pada tugas hari ini?",
    hyperactive: "Adakah anda berasa gelisah atau hiperaktif?",
    impulsivity: "Seberapa kerap anda bertindak secara impulsif hari ini?",
    focus_feel:  "Ceritakan lebih lanjut tentang bagaimana tumpuan anda hari ini.",
    mood:        "Bagaimana anda menilai mood anda hari ini?",
    fatigue:     "Adakah anda berasa penat atau kurang tenaga?",
    interest:    "Bagaimana minat anda terhadap perkara yang anda suka?",
    mood_feel:   "Dengan kata-kata anda sendiri, bagaimana perasaan emosi anda hari ini?",
    obsessions:  "Sejauh mana fikiran mengganggu menyusahkan anda?",
    compulsions: "Adakah anda melakukan sebarang tingkah laku paksaan hari ini?",
    ocd_feel:    "Boleh anda ceritakan bagaimana hari ini dengan fikiran OCD anda?",
    worry:       "Seberapa banyak anda bimbang hari ini?",
    restless:    "Bagaimana anda berasa gelisah atau tegang hari ini?",
    panic:       "Adakah anda mengalami serangan panik hari ini?",
    anx_feel:    "Bagaimana anda menggambarkan kebimbangan anda hari ini?",
  },
  ta: {
    focus:       "இன்று பணிகளில் கவனம் செலுத்துவது எவ்வளவு கஷ்டமாக இருந்தது?",
    hyperactive: "நீங்கள் அமைதியற்றதாக அல்லது அதிக சுறுசுறுப்பாக உணர்ந்தீர்களா?",
    impulsivity: "இன்று நீங்கள் எவ்வளவு அடிக்கடி தன்னிச்சையாக செயல்பட்டீர்கள்?",
    focus_feel:  "இன்று உங்கள் கவனம் எப்படி இருந்தது என்று கூறுங்கள்.",
    mood:        "இன்று உங்கள் மனநிலை எப்படி இருந்தது?",
    fatigue:     "நீங்கள் சோர்வாக அல்லது குறைந்த ஆற்றலுடன் உணர்ந்தீர்களா?",
    interest:    "நீங்கள் வழக்கமாக விரும்பும் விஷயங்களில் உங்கள் ஆர்வம் எப்படி இருந்தது?",
    mood_feel:   "உங்கள் சொந்த வார்த்தைகளில், இன்று உணர்வு ரீதியாக நீங்கள் எப்படி உணர்கிறீர்கள்?",
    obsessions:  "ஊடுருவும் எண்ணங்கள் உங்களை எவ்வளவு தொந்தரவு செய்தன?",
    compulsions: "இன்று நீங்கள் ஏதேனும் கட்டாய நடத்தைகளை செய்தீர்களா?",
    ocd_feel:    "இன்று OCD எண்ணங்களுடன் எப்படி இருந்தது என்று விவரிக்க முடியுமா?",
    worry:       "இன்று நீங்கள் எவ்வளவு கவலைப்பட்டீர்கள்?",
    restless:    "இன்று நீங்கள் எவ்வளவு அமைதியற்றதாக அல்லது பதட்டமாக உணர்ந்தீர்கள்?",
    panic:       "இன்று உங்களுக்கு பீதி தாக்குதல்கள் ஏதேனும் வந்ததா?",
    anx_feel:    "இன்று உங்கள் கவலையை உங்கள் சொந்த வார்த்தைகளில் விவரியுங்கள்.",
  },
  th: {
    focus:       "วันนี้การจดจ่อกับงานยากแค่ไหน?",
    hyperactive: "คุณรู้สึกกระสับกระส่ายหรือไม่อยู่นิ่งไหม?",
    impulsivity: "วันนี้คุณทำสิ่งต่างๆ โดยไม่คิดบ่อยแค่ไหน?",
    focus_feel:  "เล่าให้ฟังเพิ่มเติมเกี่ยวกับสมาธิของคุณวันนี้",
    mood:        "วันนี้คุณจะให้คะแนนอารมณ์ของตัวเองอย่างไร?",
    fatigue:     "คุณรู้สึกเหนื่อยหรือไม่มีแรงไหม?",
    interest:    "ความสนใจของคุณในสิ่งที่ชอบเป็นอย่างไรบ้าง?",
    mood_feel:   "ในคำพูดของคุณเอง วันนี้คุณรู้สึกอย่างไรทางอารมณ์?",
    obsessions:  "ความคิดที่ไม่ต้องการรบกวนคุณมากแค่ไหน?",
    compulsions: "วันนี้คุณทำพฤติกรรมย้ำคิดย้ำทำไหม?",
    ocd_feel:    "ช่วยเล่าให้ฟังว่าวันนี้เป็นอย่างไรกับความคิด OCD ของคุณ?",
    worry:       "วันนี้คุณวิตกกังวลมากแค่ไหน?",
    restless:    "วันนี้คุณรู้สึกกระวนกระวายหรือตึงเครียดแค่ไหน?",
    panic:       "วันนี้คุณมีอาการแพนิคไหม?",
    anx_feel:    "ในคำพูดของคุณเอง วันนี้ความวิตกกังวลของคุณเป็นอย่างไร?",
  },
  jv: {
    focus:       "Pira angel-e fokus marang tugas dina iki?",
    hyperactive: "Apa sampeyan krasa ora bisa meneng utawa hiperaktif?",
    impulsivity: "Kepiye kerep sampeyan tumindak impulsif dina iki?",
    focus_feel:  "Critakake luwih akeh babagan konsentrasi sampeyan dina iki.",
    mood:        "Kepiye sampeyan menehi nilai swasana hati dina iki?",
    fatigue:     "Apa sampeyan krasa kesel utawa kurang tenaga?",
    interest:    "Kepiye minat sampeyan marang barang sing biasane diseneng?",
    mood_feel:   "Nganggo tembung sampeyan dhewe, kepiye perasaan emosi sampeyan dina iki?",
    obsessions:  "Pira pikiran mengganggu kang ngrepoti sampeyan?",
    compulsions: "Apa sampeyan nindakake perilaku kompulsif dina iki?",
    ocd_feel:    "Apa sampeyan bisa nggambarake dina iki karo pikiran OCD sampeyan?",
    worry:       "Pira sampeyan kuwatir dina iki?",
    restless:    "Kepiye sampeyan krasa gelisah utawa tegang dina iki?",
    panic:       "Apa sampeyan ngalami serangan panik dina iki?",
    anx_feel:    "Kepiye sampeyan nggambarake rasa kuatir sampeyan dina iki?",
  },
};

// Get translated label for a question — falls back to English q.label
function getLabel(q, lang) {
  if (lang === "en") return q.label;
  return Q_LABELS[lang]?.[q.id] || q.label;
}


function toScore(answer, type, radioOptions) {
  if (type === "slider") return Math.max(1, Math.min(5, Math.round(Number(answer))));
  if (type === "yesno")  return answer === "yes" ? 5 : 1;
  if (type === "radio") {
    const opts = radioOptions?.length ? radioOptions : DEFAULT_RADIO_OPTIONS;
    const idx  = opts.indexOf(answer);
    if (idx === -1) return 1;
    return Math.round(1 + (idx / (opts.length - 1)) * 4);
  }
  return 1;
}

function randAck(t) {
  return t.chatAck[Math.floor(Math.random() * t.chatAck.length)];
}

async function sealion(messages, system, maxTokens = 120) {
  try {
    const res = await fetch(`${BACKEND}/sealion-chat`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ messages: messages.slice(-4), system, max_tokens: maxTokens })
    });
    const data = await res.json();
    return data?.text?.trim() || null;
  } catch { return null; }
}

// Only used for freetext scoring — returns JSON {score, ack}
// ack is written in the target language using hardcoded fallback if parsing fails
async function scoreText(patientName, questionLabel, answer, lang) {
  const langName = LANGUAGES.find(l => l.code === lang)?.sealionLang || "English";
  const t = T[lang] || T.en;
  const system = `You are a clinical scoring assistant. Return ONLY valid JSON with no markdown: {"score":3,"ack":"One warm sentence in ${langName}."} Score 1=minimal/positive to 5=severe/negative.`;
  const prompt = `Patient: ${patientName}\nQuestion: "${questionLabel}"\nAnswer: "${answer}"\nJSON only:`;
  const raw = await sealion([{ role:"user", content: prompt }], system, 100);
  try {
    const obj = JSON.parse((raw||"").replace(/```json|```/g,"").trim());
    return { score: Math.max(1, Math.min(5, Math.round(Number(obj.score)))), ack: obj.ack || randAck(t) };
  } catch {
    return { score: 3, ack: randAck(t) };
  }
}

const G = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Fraunces:ital,wght@0,300;0,600;1,300&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body,#root{background:#f0ede8;min-height:100vh;font-family:'Outfit',sans-serif;color:#1a1a1a;}
    ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:transparent;} ::-webkit-scrollbar-thumb{background:#c9c4bb;border-radius:2px;}
    .card{background:#fff;border-radius:20px;border:1px solid #e8e3dd;box-shadow:0 2px 12px rgba(0,0,0,0.04);}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:12px;padding:10px 20px;font-weight:600;cursor:pointer;font-size:14px;font-family:'Outfit',sans-serif;transition:all 0.18s;}
    .btn-primary{background:#1a1a1a;color:#fff;} .btn-primary:hover{background:#333;transform:translateY(-1px);}
    .btn-secondary{background:#f0ede8;color:#1a1a1a;border:1px solid #ddd8d2;} .btn-secondary:hover{background:#e8e3dd;}
    .btn-accent{background:linear-gradient(135deg,#5ee7df,#b490ca);color:#fff;} .btn-accent:hover{opacity:0.88;transform:translateY(-1px);}
    .btn-danger{background:#fee2e2;color:#991b1b;} .btn-danger:hover{background:#fecaca;}
    .btn:disabled{opacity:0.5;cursor:not-allowed;transform:none!important;}
    input,textarea,select{background:#f8f6f3;border:1px solid #e0dbd4;color:#1a1a1a;border-radius:10px;padding:10px 14px;font-family:'Outfit',sans-serif;font-size:14px;outline:none;transition:border 0.18s;width:100%;}
    input:focus,textarea:focus,select:focus{border-color:#b490ca;background:#fff;}
    .tag{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.04em;}
    .fade-in{animation:fadeIn 0.35s ease;}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    @keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-5px)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    @keyframes record-pulse{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}}
    .radio-opt{padding:10px 18px;border-radius:10px;border:1.5px solid #e0dbd4;cursor:pointer;font-size:14px;font-weight:500;transition:all 0.15s;background:#f8f6f3;user-select:none;display:block;width:100%;text-align:left;font-family:'Outfit',sans-serif;}
    .radio-opt:hover{border-color:#b490ca;background:#f5f0ff;}
    .radio-opt.selected{background:#f5f0ff;border-color:#b490ca;color:#7c3aed;}
    .yesno-btn{flex:1;padding:12px 0;border-radius:12px;border:1.5px solid #e0dbd4;cursor:pointer;font-size:15px;font-weight:600;transition:all 0.15s;background:#f8f6f3;font-family:'Outfit',sans-serif;}
    .yesno-btn:hover{border-color:#b490ca;}
    .yesno-btn.yes.selected{background:#dcfce7;border-color:#22c55e;color:#166534;}
    .yesno-btn.no.selected{background:#fee2e2;border-color:#ef4444;color:#991b1b;}
    input[type=range]{-webkit-appearance:none;background:transparent;width:100%;padding:0;}
    input[type=range]::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(90deg,#5ee7df,#b490ca);}
    input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:2.5px solid #b490ca;margin-top:-8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.12);}
    .lang-btn{border:none;background:none;cursor:pointer;padding:6px 10px;border-radius:10px;font-size:13px;font-family:'Outfit',sans-serif;transition:all 0.15s;display:flex;align-items:center;gap:6px;width:100%;text-align:left;}
    .lang-btn:hover{background:#f0ede8;}
    .lang-btn.active{background:#f5f0ff;color:#7c3aed;font-weight:700;}
    .lang-panel{position:absolute;top:calc(100% + 8px);right:0;background:#fff;border:1px solid #e8e3dd;border-radius:14px;padding:6px;box-shadow:0 8px 28px rgba(0,0,0,0.12);z-index:200;min-width:170px;}
  `}</style>
);

function LangPicker({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const cur = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} style={{position:"relative"}}>
      <button onClick={() => setOpen(o => !o)} style={{display:"flex",alignItems:"center",gap:7,padding:"8px 13px",border:"1px solid #e0dbd4",borderRadius:10,background:"#f8f6f3",cursor:"pointer",fontFamily:"'Outfit',sans-serif",fontSize:13,fontWeight:600}}>
        <span style={{fontSize:18}}>{cur.flag}</span>
        <span>🌐</span>
        <span style={{fontSize:11,color:"#8a8178"}}>▾</span>
      </button>
      {open && (
        <div className="lang-panel fade-in">
          <div style={{fontSize:11,fontWeight:700,color:"#b0a89e",padding:"4px 10px 6px",textTransform:"uppercase",letterSpacing:"0.08em"}}>Language</div>
          {LANGUAGES.map(l => (
            <button key={l.code} className={`lang-btn ${lang===l.code?"active":""}`}
              onClick={() => { setLang(l.code); setOpen(false); }}>
              <span style={{fontSize:18}}>{l.flag}</span>
              <span style={{fontSize:14}}>{l.label}</span>
              {lang===l.code && <span style={{marginLeft:"auto",fontSize:12}}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [patients, setPatients]        = useState([]);
  const [doctors, setDoctors]          = useState([]);
  const [loading, setLoading]          = useState(true);
  const [user, setUser]                = useState(null);
  const [view, setView]                = useState("login");
  const [lang, setLang]                = useState("en");
  const [selectedPatient, setSelected] = useState(null);
  const [activeDisease, setActiveDx]   = useState(null);

  // Fetch patients and doctors from backend on load
  useEffect(() => {
    Promise.all([
      fetch(`${BACKEND}/patients`).then(r => r.json()),
      fetch(`${BACKEND}/doctors`).then(r => r.json())
    ]).then(([p, d]) => {
      setPatients(p);
      setDoctors(d);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load data:", err);
      setLoading(false);
    });
  }, []);

  const currentPatient = patients.find(p => p.id === user?.id);
  const logout = () => { setUser(null); setView("login"); setSelected(null); setActiveDx(null); };
  const updatePatient = (id, updater) => {
    setPatients(prev => prev.map(p => p.id === id ? updater(p) : p));
    if (selectedPatient?.id === id) setSelected(prev => updater(prev));
  };

  if (loading) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0ede8",flexDirection:"column",gap:16}}>
      <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧠</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:600}}>Momenta</div>
      <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><span key={i} style={{width:8,height:8,borderRadius:"50%",background:"#b490ca",display:"inline-block",animation:`bounce 1s ${i*0.2}s infinite`}}/>)}</div>
    </div>
  );

  return (
    <>
      <G />
      {view==="login" && <Login patients={patients} doctors={doctors} lang={lang} setLang={setLang} onLogin={u=>{setUser(u);setView(u.role==="doctor"?"doctor":"patient");}}/>}
      {view==="patient" && user && currentPatient && <PatientView patient={currentPatient} patients={patients} setPatients={setPatients} lang={lang} setLang={setLang} onLogout={logout}/>}
      {view==="doctor" && user && <DoctorView user={user} patients={patients} updatePatient={updatePatient} selected={selectedPatient} setSelected={setSelected} activeDisease={activeDisease} setActiveDisease={setActiveDx} onLogout={logout}/>}
    </>
  );
}

function Login({ patients, doctors, lang, setLang, onLogin }) {
  const [role, setRole]        = useState("patient");
  const [selectedId, setSelId] = useState("");
  const allUsers = role==="patient" ? patients : doctors;
  const t = role==="doctor" ? T.en : (T[lang]||T.en);

  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
      <div style={{position:"absolute",inset:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",top:"-10%",right:"-5%",width:500,height:500,borderRadius:"50%",background:"radial-gradient(circle,rgba(180,144,202,0.12) 0%,transparent 70%)"}}/>
        <div style={{position:"absolute",bottom:"-10%",left:"-5%",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,rgba(94,231,223,0.1) 0%,transparent 70%)"}}/>
      </div>
      <div className="card fade-in" style={{width:"100%",maxWidth:420,padding:40,position:"relative"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🧠</div>
            <div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:600}}>Momenta</div>
              <div style={{fontSize:12,color:"#8a8178"}}>{t.appTagline}</div>
            </div>
          </div>
          <LangPicker lang={lang} setLang={setLang}/>
        </div>
        <div style={{display:"flex",background:"#f0ede8",borderRadius:12,padding:4,marginBottom:24}}>
          {["patient","doctor"].map(r=>(
            <button key={r} onClick={()=>{setRole(r);setSelId("");}} className="btn" style={{flex:1,padding:"8px 0",fontSize:13,borderRadius:9,background:role===r?"#fff":"transparent",color:role===r?"#1a1a1a":"#8a8178",boxShadow:role===r?"0 1px 4px rgba(0,0,0,0.08)":"none"}}>
              {r==="patient"?t.patientTab:T.en.doctorTab}
            </button>
          ))}
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:13,fontWeight:600,color:"#6b6259",display:"block",marginBottom:8}}>{role==="patient"?t.selectProfile:T.en.selectAccount}</label>
          <select value={selectedId} onChange={e=>setSelId(e.target.value)}>
            <option value="">{t.choosePrompt}</option>
            {allUsers.map(u=><option key={u.id} value={u.id}>{u.name}{u.age?`, age ${u.age}`:""}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" style={{width:"100%",padding:"13px 0",fontSize:15}} disabled={!selectedId}
          onClick={()=>{const u=allUsers.find(x=>x.id===selectedId);if(u)onLogin({...u,role});}}>
          {t.signIn}
        </button>
        <p style={{textAlign:"center",fontSize:12,color:"#b0a89e",marginTop:20}}>{t.demoNote}</p>
        <div style={{textAlign:"center",marginTop:12,fontSize:12,color:"#b0a89e"}}>
          🌐 {LANGUAGES.find(l=>l.code===lang)?.label} — {(T[lang]||T.en).langLabel}
        </div>
      </div>
    </div>
  );
}

function PatientView({ patient, patients, setPatients, lang, setLang, onLogout }) {
  const [screen, setScreen] = useState("home");
  const t = T[lang]||T.en;
  const checkedInToday = patient.lastCheckin === today();
  return (
    <div style={{minHeight:"100vh",background:"#f0ede8"}}>
      <div style={{background:"#fff",borderBottom:"1px solid #e8e3dd",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🧠</div>
          <span style={{fontFamily:"'Fraunces',serif",fontWeight:600,fontSize:17}}>Momenta</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <LangPicker lang={lang} setLang={setLang}/>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:12}}>{patient.avatar}</div>
          <span style={{fontSize:13,fontWeight:500}}>{patient.name}</span>
          <button className="btn btn-secondary" onClick={onLogout} style={{fontSize:12,padding:"6px 12px"}}>{t.signOut}</button>
        </div>
      </div>
      {screen==="home" && <PatientHome patient={patient} checkedInToday={checkedInToday} onStart={()=>setScreen("chat")} lang={lang}/>}
      {screen==="chat" && <HybridChat patient={patient} patients={patients} setPatients={setPatients} onBack={()=>setScreen("home")} lang={lang}/>}
    </div>
  );
}

function PatientHome({ patient, checkedInToday, onStart, lang }) {
  const t = T[lang]||T.en;
  const diseases = Object.keys(patient.diagnoses);
  return (
    <div style={{maxWidth:640,margin:"0 auto",padding:32}} className="fade-in">
      {!checkedInToday && (
        <div style={{background:"linear-gradient(135deg,#fff7ed,#fef3c7)",border:"1px solid #fcd34d",borderRadius:16,padding:"16px 20px",marginBottom:24,display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:22}}>🔔</span>
            <div>
              <div style={{fontWeight:600,fontSize:14,color:"#92400e"}}>{t.checkinDue}</div>
              <div style={{fontSize:13,color:"#b45309",marginTop:2}}>{t.checkinDueDesc}</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={onStart} style={{flexShrink:0,fontSize:13}}>{t.checkInNow}</button>
        </div>
      )}
      {checkedInToday && (
        <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"1px solid #86efac",borderRadius:16,padding:"16px 20px",marginBottom:24,display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:22}}>✅</span>
          <div>
            <div style={{fontWeight:600,fontSize:14,color:"#166534"}}>{t.allDone}</div>
            <div style={{fontSize:13,color:"#15803d",marginTop:2}}>{t.allDoneDesc}</div>
          </div>
        </div>
      )}
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,fontWeight:600,marginBottom:6}}>{t.hello(patient.name.split(" ")[0])}</h1>
      <p style={{color:"#8a8178",fontSize:15,marginBottom:28}}>{t.healthOverview}</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:28}}>
        {[{label:t.diagnoses,value:diseases.length,icon:"🏥"},{label:t.sessions,value:patient.diagnoses[diseases[0]]?.history?.length||0,icon:"📋"},{label:t.streak,value:t.streakDays(checkedInToday),icon:"🔥"}].map(s=>(
          <div key={s.label} className="card" style={{padding:"18px 16px",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:6}}>{s.icon}</div>
            <div style={{fontWeight:700,fontSize:20,marginBottom:2}}>{s.value}</div>
            <div style={{fontSize:12,color:"#8a8178"}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card" style={{padding:24,marginBottom:20}}>
        <div style={{fontWeight:600,marginBottom:16,fontSize:15}}>{t.yourConditions}</div>
        {diseases.map((d,i)=>(
          <div key={d} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",background:"#f8f6f3",borderRadius:12,marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/>
              <span style={{fontWeight:600,fontSize:14}}>{d}</span>
            </div>
            <span style={{fontSize:12,color:"#8a8178"}}>{patient.diagnoses[d].questions.length} {t.questions}</span>
          </div>
        ))}
      </div>
      <button className="btn btn-accent" onClick={onStart} style={{width:"100%",padding:"14px 0",fontSize:15}}>
        {checkedInToday?t.anotherSession:t.startCheckin}
      </button>
    </div>
  );
}

// ── HYBRID CHAT ── No LLM for wrapping text — all hardcoded translations
// SEA-LION only used for freetext scoring (JSON response, language-agnostic)
function HybridChat({ patient, patients, setPatients, onBack, lang }) {
  const t = T[lang]||T.en;
  const allQuestions = [];
  Object.entries(patient.diagnoses).forEach(([disease,dx])=>{
    dx.questions.forEach(q=>allQuestions.push({...q,disease}));
  });

  const [messages, setMessages]     = useState([]);
  const [stepIdx, setStepIdx]       = useState(0);
  const [loading, setLoading]       = useState(false);
  const [input, setInput]           = useState("");
  const [done, setDone]             = useState(false);
  const [recording, setRecording]   = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRef  = useRef(null);
  const bottomRef = useRef(null);
  const scoresRef = useRef({});

  const firstName = patient.name.split(" ")[0];
  const addMsg  = msg => setMessages(prev=>[...prev,msg]);
  const markAnswered = idx => setMessages(prev=>prev.map((m,i)=>i===idx?{...m,widgetAnswered:true}:m));

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,loading]);

  // Boot — instant, no LLM call
  useEffect(()=>{
    addMsg({role:"assistant", content: t.chatGreeting(firstName)});
    showQuestion(0);
  },[]);

  function showQuestion(idx) {
    if (idx >= allQuestions.length) { finishUp(); return; }
    setStepIdx(idx);
    const q = allQuestions[idx];
    if (q.type === "freetext") {
      addMsg({role:"assistant", content: getLabel(q, lang)});
    } else {
      addMsg({role:"assistant", content: t.chatWidgetIntro, widget:q, widgetAnswered:false});
    }
  }

  async function handleWidgetAnswer(q, rawAnswer, msgIdx) {
    markAnswered(msgIdx);
    // Convert translated answer back to English for consistent scoring
    const englishAnswer = q.type === "radio" ? getEnglishOption(rawAnswer, q, lang) : rawAnswer;
    const score = toScore(englishAnswer, q.type, q.radioOptions);
    scoresRef.current = {...scoresRef.current, [q.id]: score};

    const displayVal = q.type==="yesno"?(rawAnswer==="yes"?t.yesBtn:t.noBtn)
                     : q.type==="slider"?`${rawAnswer} / 5`
                     : rawAnswer;
    addMsg({role:"user", content: displayVal});
    // Hardcoded ack — instant, no LLM
    addMsg({role:"assistant", content: randAck(t)});
    showQuestion(stepIdx+1);
  }

  async function handleFreeText() {
    const text = input.trim();
    if (!text||loading||done) return;
    setInput("");
    const q = allQuestions[stepIdx];
    addMsg({role:"user", content: text});

    setLoading(true);
    // Only SEA-LION call remaining — for scoring freetext. Ack comes from translation table on failure.
    const {score, ack} = await scoreText(patient.name, q.label, text, lang);
    scoresRef.current = {...scoresRef.current, [q.id]: score};
    addMsg({role:"assistant", content: ack});
    setLoading(false);
    showQuestion(stepIdx+1);
  }

  async function finishUp() {
    const dateStr = new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"});
    const scoresByDisease = {};
    allQuestions.forEach(q=>{
      if (!scoresByDisease[q.disease]) scoresByDisease[q.disease]={};
      scoresByDisease[q.disease][q.id] = scoresRef.current[q.id]??3;
    });

    // Save session to backend/database
    try {
      await fetch(`${BACKEND}/sessions`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({
          patient_id: patient.id,
          date: dateStr,
          scores_by_diagnosis: scoresByDisease
        })
      });
    } catch(e) { console.error("Failed to save session:", e); }

    // Update local state so UI reflects immediately
    setPatients(prev=>prev.map(p=>{
      if (p.id!==patient.id) return p;
      const newDx={...p.diagnoses};
      Object.entries(scoresByDisease).forEach(([disease,sc])=>{
        if (newDx[disease]) newDx[disease]={...newDx[disease],history:[...newDx[disease].history,{date:dateStr,...sc}]};
      });
      return {...p,diagnoses:newDx,lastCheckin:today()};
    }));
    addMsg({role:"assistant", content: t.chatOutro(firstName)});
    setDone(true);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true});
      const mr = new MediaRecorder(stream);
      const chunks=[];
      mr.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data);};
      mr.onstop=async()=>{
        stream.getTracks().forEach(t=>t.stop());
        const blob=new Blob(chunks,{type:"audio/wav"});
        setTranscribing(true);
        try {
          const urlRes=await fetch(`${BACKEND}/upload-url`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({filename:"recording.wav",contentType:"audio/wav",fileSize:blob.size})});
          const urlData=await urlRes.json();
          const s3Url=urlData?.response?.url; const fileKey=urlData?.response?.key;
          if(s3Url&&fileKey){
            await fetch(`${BACKEND}/upload-s3?url=${encodeURIComponent(s3Url)}`,{method:"PUT",headers:{"Content-Type":"audio/wav"},body:blob});
            const txRes=await fetch(`${BACKEND}/transcribe`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:fileKey})});
            const txData=await txRes.json();
            const text=txData?.response?.text||txData?.response;
            if(text) setInput(text);
          }
        } catch(e){console.error(e);}
        setTranscribing(false);
      };
      mr.start(); mediaRef.current=mr; setRecording(true);
    } catch { alert("Microphone access denied."); }
  }
  function stopRecording(){mediaRef.current?.stop();setRecording(false);}

  const currentQ     = stepIdx>=0&&stepIdx<allQuestions.length?allQuestions[stepIdx]:null;
  const awaitingText = currentQ?.type==="freetext"&&!loading&&!done;
  const progress     = Math.round((stepIdx/allQuestions.length)*100);

  return (
    <div style={{maxWidth:700,margin:"0 auto",padding:"24px 16px",display:"flex",flexDirection:"column",height:"calc(100vh - 65px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button className="btn btn-secondary" onClick={onBack} style={{padding:"8px 14px",fontSize:13}}>{t.backBtn}</button>
        <div style={{flex:1}}>
          <div style={{fontWeight:600,fontSize:15}}>{t.dailyCheckin}</div>
          <div style={{fontSize:12,color:"#8a8178"}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          {Object.keys(patient.diagnoses).map((d,i)=>(
            <span key={d} className="tag" style={{background:COLORS[i%COLORS.length]+"22",color:COLORS[i%COLORS.length],border:`1px solid ${COLORS[i%COLORS.length]}44`}}>{d}</span>
          ))}
        </div>
      </div>

      <div style={{marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#8a8178",marginBottom:5}}>
          <span>{t.questionOf(Math.min(stepIdx+1,allQuestions.length),allQuestions.length)}</span>
          <span>{progress}%</span>
        </div>
        <div style={{height:5,background:"#e8e3dd",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg,#5ee7df,#b490ca)",borderRadius:3,transition:"width 0.4s ease"}}/>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,paddingBottom:12}}>
        {messages.map((m,msgIdx)=>(
          <div key={msgIdx} className="fade-in">
            <div style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:8}}>
              {m.role==="assistant"&&<div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>🧠</div>}
              <div style={{maxWidth:"78%",padding:"12px 16px",borderRadius:m.role==="user"?"18px 18px 4px 18px":"18px 18px 18px 4px",background:m.role==="user"?"#1a1a1a":"#fff",color:m.role==="user"?"#fff":"#1a1a1a",fontSize:14,lineHeight:1.65,border:m.role==="user"?"none":"1px solid #e8e3dd",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>{m.content}</div>
            </div>
            {m.widget&&!m.widgetAnswered&&(
              <div style={{marginLeft:42,marginTop:8}}>
                <QuestionWidget q={m.widget} t={t} lang={lang} onAnswer={ans=>handleWidgetAnswer(m.widget,ans,msgIdx)}/>
              </div>
            )}
            {m.widget&&m.widgetAnswered&&(
              <div style={{marginLeft:42,marginTop:4}}><span style={{fontSize:12,color:"#b0a89e",fontStyle:"italic"}}>{t.responseRecorded}</span></div>
            )}
          </div>
        ))}
        {loading&&(
          <div style={{display:"flex",alignItems:"flex-end",gap:8}}>
            <div style={{width:30,height:30,borderRadius:9,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🧠</div>
            <div style={{background:"#fff",border:"1px solid #e8e3dd",borderRadius:"18px 18px 18px 4px",padding:"12px 16px"}}>
              <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:"#b490ca",display:"inline-block",animation:`bounce 1s ${i*0.2}s infinite`}}/>)}</div>
            </div>
          </div>
        )}
        {done&&(
          <div className="fade-in card" style={{padding:20,textAlign:"center",border:"1px solid #86efac",background:"#f0fdf4"}}>
            <div style={{fontSize:28,marginBottom:8}}>✅</div>
            <div style={{fontWeight:600,color:"#166534",marginBottom:4}}>{t.sessionComplete}</div>
            <div style={{fontSize:13,color:"#15803d"}}>{t.sessionSaved}</div>
            <button className="btn btn-secondary" onClick={onBack} style={{marginTop:14,fontSize:13}}>{t.backHome}</button>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {awaitingText&&(
        <div style={{borderTop:"1px solid #e8e3dd",paddingTop:14,display:"flex",flexDirection:"column",gap:8}}>
          {transcribing&&(
            <div style={{textAlign:"center",fontSize:13,color:"#8a8178",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:"#b490ca",display:"inline-block",animation:"pulse 1s infinite"}}/>
              {t.transcribing}
            </div>
          )}
          <div style={{display:"flex",gap:10,alignItems:"flex-end"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleFreeText();}}}
              placeholder={t.freeTextHint} disabled={loading||transcribing}
              style={{flex:1,resize:"none",height:44,padding:"11px 14px",lineHeight:1.4}} rows={1}/>
            <button className="btn" onClick={recording?stopRecording:startRecording} disabled={loading||transcribing}
              style={{padding:"11px 14px",flexShrink:0,fontSize:18,background:recording?"#fee2e2":"#f0ede8",color:recording?"#ef4444":"#6b6259",border:recording?"1px solid #fca5a5":"1px solid #e0dbd4",animation:recording?"record-pulse 1.5s infinite":""}}>
              {recording?"⏹":"🎙"}
            </button>
            <button className="btn btn-primary" onClick={handleFreeText} disabled={loading||!input.trim()||transcribing} style={{flexShrink:0,padding:"11px 18px"}}>Send</button>
          </div>
          <div style={{fontSize:11,color:"#b0a89e",textAlign:"center"}}>{t.micHint}</div>
        </div>
      )}
    </div>
  );
}

function QuestionWidget({ q, t, lang, onAnswer }) {
  const [val, setVal] = useState(q.type==="slider"?3:null);
  const opts = getRadioOptions(q, lang);
  return (
    <div className="card fade-in" style={{padding:20,maxWidth:400,border:"1px solid #e0d4f7",background:"#faf8ff"}}>
      <div style={{marginBottom:12}}>
        <span className="tag" style={{background:"#f5f0ff",color:"#7c3aed",border:"1px solid #ddd4f7"}}>
          {q.type==="slider"?t.scale15:q.type==="yesno"?t.yesNo:t.chooseOne}
        </span>
      </div>
      <p style={{fontSize:14,fontWeight:500,color:"#1a1a1a",marginBottom:16,lineHeight:1.5}}>{getLabel(q, lang)}</p>

      {q.type==="slider"&&(
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#8a8178",marginBottom:6}}><span>{t.notAtAll}</span><span>{t.severely}</span></div>
          <input type="range" min={1} max={5} step={1} value={val} onChange={e=>setVal(Number(e.target.value))}/>
          <div style={{textAlign:"center",margin:"10px 0 16px"}}>
            <span style={{fontSize:32,fontWeight:700,fontFamily:"'Fraunces',serif",color:"#b490ca"}}>{val}</span>
            <span style={{fontSize:13,color:"#8a8178"}}> / 5</span>
          </div>
          <button className="btn btn-accent" style={{width:"100%",padding:"11px 0"}} onClick={()=>onAnswer(val)}>{t.confirmBtn}</button>
        </div>
      )}
      {q.type==="yesno"&&(
        <div style={{display:"flex",gap:10}}>
          {["yes","no"].map(opt=>(
            <button key={opt} className={`yesno-btn ${opt} ${val===opt?"selected":""}`} onClick={()=>{setVal(opt);setTimeout(()=>onAnswer(opt),180);}}>
              {opt==="yes"?t.yesBtn:t.noBtn}
            </button>
          ))}
        </div>
      )}
      {q.type==="radio"&&(
        <div>
          <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:14}}>
            {opts.map(opt=><button key={opt} className={`radio-opt ${val===opt?"selected":""}`} onClick={()=>setVal(opt)}>{opt}</button>)}
          </div>
          <button className="btn btn-accent" style={{width:"100%",padding:"11px 0"}} disabled={!val} onClick={()=>onAnswer(val)}>{t.confirmBtn}</button>
        </div>
      )}
    </div>
  );
}

function DoctorView({ user, patients, updatePatient, selected, setSelected, activeDisease, setActiveDisease, onLogout }) {
  return (
    <div style={{minHeight:"100vh",background:"#f0ede8",display:"flex",flexDirection:"column"}}>
      <div style={{background:"#fff",borderBottom:"1px solid #e8e3dd",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>🧠</div>
          <span style={{fontFamily:"'Fraunces',serif",fontWeight:600,fontSize:17}}>Momenta</span>
          <span style={{fontSize:12,color:"#8a8178",marginLeft:4}}>Doctor portal</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:13,fontWeight:500}}>{user.name}</span>
          <button className="btn btn-secondary" onClick={onLogout} style={{fontSize:12,padding:"6px 12px"}}>Sign out</button>
        </div>
      </div>
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        <div style={{width:260,background:"#fff",borderRight:"1px solid #e8e3dd",padding:20,display:"flex",flexDirection:"column",gap:4,overflowY:"auto"}}>
          <div style={{fontSize:11,fontWeight:700,color:"#b0a89e",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10,marginLeft:6}}>Patients</div>
          {patients.map(p=>{
            const ok=p.lastCheckin===today();
            return (
              <div key={p.id} onClick={()=>{setSelected(p);setActiveDisease(null);}} style={{padding:"12px 14px",borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:selected?.id===p.id?"#f5f0ff":"transparent",border:selected?.id===p.id?"1px solid #e0d4f7":"1px solid transparent"}}>
                <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:13,flexShrink:0}}>{p.avatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                  <div style={{fontSize:11,color:"#8a8178"}}>{Object.keys(p.diagnoses).join(", ")}</div>
                </div>
                <div style={{width:8,height:8,borderRadius:"50%",background:ok?"#22c55e":"#e5e7eb",flexShrink:0}}/>
              </div>
            );
          })}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:28}}>
          {!selected
            ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",flexDirection:"column",gap:12,color:"#8a8178"}}><div style={{fontSize:48}}>👈</div><div style={{fontWeight:500}}>Select a patient</div><div style={{fontSize:13}}>🟢 = checked in today · ⚪ = not yet</div></div>
            :<PatientDetail patient={selected} updatePatient={updatePatient} activeDisease={activeDisease} setActiveDisease={setActiveDisease}/>
          }
        </div>
      </div>
    </div>
  );
}

function PatientDetail({ patient, updatePatient, activeDisease, setActiveDisease }) {
  const [editMode,setEditMode]=useState(false);
  const [newDisease,setNewDx]=useState("");
  const [newQLabel,setNewQLabel]=useState("");
  const [newQType,setNewQType]=useState("slider");
  const [newQRadio,setNewQRadio]=useState("");
  const [newMed,setNewMed]=useState("");

  const diseases=Object.keys(patient.diagnoses);
  const activeDx=activeDisease?patient.diagnoses[activeDisease]:null;
  const checkedToday=patient.lastCheckin===today();

  const addDisease=()=>{
    if(!newDisease.trim())return;
    updatePatient(patient.id,p=>({...p,diagnoses:{...p.diagnoses,[newDisease.trim()]:{questions:[],medications:[],history:[]}}}));
    setNewDx("");
  };
  const removeDisease=d=>{
    if(!window.confirm(`Remove ${d}?`))return;
    updatePatient(patient.id,p=>{const{[d]:_,...rest}=p.diagnoses;return{...p,diagnoses:rest};});
    if(activeDisease===d)setActiveDisease(null);
  };
  const addQuestion=()=>{
    if(!newQLabel.trim()||!activeDisease)return;
    const q={id:"q_"+Date.now(),label:newQLabel.trim(),type:newQType};
    if(newQType==="radio"&&newQRadio.trim())q.radioOptions=newQRadio.split(",").map(s=>s.trim()).filter(Boolean);
    updatePatient(patient.id,p=>({...p,diagnoses:{...p.diagnoses,[activeDisease]:{...p.diagnoses[activeDisease],questions:[...p.diagnoses[activeDisease].questions,q]}}}));
    setNewQLabel("");setNewQRadio("");
  };
  const removeQuestion=qid=>updatePatient(patient.id,p=>({...p,diagnoses:{...p.diagnoses,[activeDisease]:{...p.diagnoses[activeDisease],questions:p.diagnoses[activeDisease].questions.filter(q=>q.id!==qid)}}}));
  const addMed=()=>{
    if(!newMed.trim()||!activeDisease)return;
    updatePatient(patient.id,p=>({...p,diagnoses:{...p.diagnoses,[activeDisease]:{...p.diagnoses[activeDisease],medications:[...p.diagnoses[activeDisease].medications,newMed.trim()]}}}));
    setNewMed("");
  };
  const removeMed=m=>updatePatient(patient.id,p=>({...p,diagnoses:{...p.diagnoses,[activeDisease]:{...p.diagnoses[activeDisease],medications:p.diagnoses[activeDisease].medications.filter(x=>x!==m)}}}));
  const typeLabel=t=>t==="slider"?"🎚 Slider":t==="yesno"?"✅ Yes/No":t==="freetext"?"💬 Free text":"🔘 Radio";

  return (
    <div className="fade-in">
      <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:28}}>
        <div style={{width:52,height:52,borderRadius:14,background:"linear-gradient(135deg,#5ee7df,#b490ca)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:20}}>{patient.avatar}</div>
        <div>
          <h2 style={{fontFamily:"'Fraunces',serif",fontWeight:600,fontSize:22}}>{patient.name}</h2>
          <div style={{color:"#8a8178",fontSize:13,display:"flex",alignItems:"center",gap:8}}>
            <span>ID: {patient.id} · Age {patient.age}</span>
            <span style={{display:"inline-flex",alignItems:"center",gap:4}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:checkedToday?"#22c55e":"#e5e7eb"}}/>
              {checkedToday?"Checked in today":"Not checked in yet"}
            </span>
          </div>
        </div>
        <div style={{marginLeft:"auto"}}>
          <button className={`btn ${editMode?"btn-accent":"btn-secondary"}`} onClick={()=>setEditMode(!editMode)} style={{fontSize:13}}>
            {editMode?"✓ Done":"✏️ Edit"}
          </button>
        </div>
      </div>

      <div style={{marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,color:"#b0a89e",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:10}}>Diagnoses</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          {diseases.map((d,i)=>(
            <div key={d} style={{display:"flex",alignItems:"center",gap:6}}>
              <div onClick={()=>setActiveDisease(activeDisease===d?null:d)} style={{padding:"10px 18px",borderRadius:12,cursor:"pointer",fontWeight:600,fontSize:14,background:activeDisease===d?COLORS[i%COLORS.length]+"22":"#f8f6f3",color:activeDisease===d?COLORS[i%COLORS.length]:"#1a1a1a",border:`1.5px solid ${activeDisease===d?COLORS[i%COLORS.length]:"#e8e3dd"}`,transition:"all 0.18s"}}>{d}</div>
              {editMode&&<button className="btn btn-danger" onClick={()=>removeDisease(d)} style={{padding:"6px 10px",fontSize:12}}>✕</button>}
            </div>
          ))}
          {editMode&&(
            <div style={{display:"flex",gap:6}}>
              <input value={newDisease} onChange={e=>setNewDx(e.target.value)} placeholder="New diagnosis…" style={{width:160,fontSize:13}} onKeyDown={e=>e.key==="Enter"&&addDisease()}/>
              <button className="btn btn-primary" onClick={addDisease} style={{padding:"10px 14px",fontSize:13}}>Add</button>
            </div>
          )}
        </div>
      </div>

      {activeDisease&&activeDx&&(
        <div className="card fade-in" style={{padding:24,marginBottom:24}}>
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Fraunces',serif",fontWeight:600,fontSize:18}}>{activeDisease} — Symptom Trends</div>
            <div style={{fontSize:13,color:"#8a8178",marginTop:2}}>All scores 1–5 · free-text scored by SEA-LION</div>
          </div>
          {activeDx.history.length===0
            ?<div style={{textAlign:"center",padding:40,color:"#8a8178",fontSize:14}}>No sessions yet.</div>
            :(
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={activeDx.history} margin={{top:5,right:20,left:-20,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8"/>
                  <XAxis dataKey="date" tick={{fontSize:11,fill:"#8a8178"}} tickLine={false}/>
                  <YAxis domain={[0,5]} tick={{fontSize:11,fill:"#8a8178"}} tickLine={false} axisLine={false}/>
                  <Tooltip contentStyle={{background:"#fff",border:"1px solid #e8e3dd",borderRadius:10,fontSize:13}} formatter={(val,name)=>{const q=activeDx.questions.find(q=>q.id===name);return[val,q?q.label:name];}}/>
                  <Legend wrapperStyle={{fontSize:11,paddingTop:12}} formatter={name=>{const q=activeDx.questions.find(q=>q.id===name);return q?q.label:name;}}/>
                  {activeDx.questions.map((q,i)=>(
                    <Line key={q.id} type="monotone" dataKey={q.id} name={q.id} stroke={COLORS[i%COLORS.length]} strokeWidth={2} dot={{r:3}} activeDot={{r:5}} connectNulls/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )
          }
          {editMode&&(
            <div style={{marginTop:24,paddingTop:20,borderTop:"1px solid #f0ede8"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24}}>
                <div>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Check-in questions</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
                    {activeDx.questions.map((q,i)=>(
                      <div key={q.id} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",padding:"8px 10px",background:"#f8f6f3",borderRadius:8,gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{q.label}</div>
                          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                            <span className="tag" style={{background:COLORS[i%COLORS.length]+"22",color:COLORS[i%COLORS.length]}}>{typeLabel(q.type)}</span>
                            {q.type==="radio"&&<span style={{fontSize:11,color:"#8a8178"}}>{(q.radioOptions||DEFAULT_RADIO_OPTIONS).join(" · ")}</span>}
                          </div>
                        </div>
                        <button onClick={()=>removeQuestion(q.id)} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:14,padding:0,flexShrink:0}}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{background:"#f8f6f3",borderRadius:12,padding:14,display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{fontSize:12,fontWeight:600,color:"#6b6259"}}>Add question</div>
                    <input value={newQLabel} onChange={e=>setNewQLabel(e.target.value)} placeholder="Question text…" style={{fontSize:13}}/>
                    <select value={newQType} onChange={e=>setNewQType(e.target.value)} style={{fontSize:13}}>
                      <option value="slider">🎚 Slider (1–5)</option>
                      <option value="yesno">✅ Yes / No</option>
                      <option value="radio">🔘 Radio buttons</option>
                      <option value="freetext">💬 Free text (LLM scored)</option>
                    </select>
                    {newQType==="radio"&&<input value={newQRadio} onChange={e=>setNewQRadio(e.target.value)} placeholder="Options comma-separated (blank = defaults)" style={{fontSize:13}}/>}
                    <button className="btn btn-primary" onClick={addQuestion} disabled={!newQLabel.trim()} style={{fontSize:13,padding:"8px 0"}}>+ Add</button>
                  </div>
                </div>
                <div>
                  <div style={{fontWeight:600,fontSize:13,marginBottom:10}}>Medications</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:8}}>
                    {activeDx.medications.map(m=>(
                      <div key={m} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 10px",background:"#f8f6f3",borderRadius:8,fontSize:13}}>
                        <span>{m}</span>
                        <button onClick={()=>removeMed(m)} style={{background:"none",border:"none",cursor:"pointer",color:"#ef4444",fontSize:14,padding:0}}>✕</button>
                      </div>
                    ))}
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <input value={newMed} onChange={e=>setNewMed(e.target.value)} placeholder="Add medication…" style={{fontSize:13}} onKeyDown={e=>e.key==="Enter"&&addMed()}/>
                    <button className="btn btn-primary" onClick={addMed} style={{padding:"8px 12px",fontSize:13,flexShrink:0}}>+</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!activeDisease&&(
        <div className="card" style={{padding:24}}>
          <div style={{fontWeight:600,fontSize:15,marginBottom:16}}>Recent sessions</div>
          {diseases.map((d,i)=>{
            const hist=patient.diagnoses[d].history;
            const last=hist[hist.length-1];
            return (
              <div key={d} onClick={()=>setActiveDisease(d)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:12,cursor:"pointer",marginBottom:8,background:"#f8f6f3",transition:"background 0.15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#f0ede8"}
                onMouseLeave={e=>e.currentTarget.style.background="#f8f6f3"}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/>
                  <div>
                    <div style={{fontWeight:600,fontSize:14}}>{d}</div>
                    <div style={{fontSize:12,color:"#8a8178"}}>{patient.diagnoses[d].questions.length} questions · {hist.length} sessions</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  {last&&<div style={{fontSize:12,color:"#8a8178"}}>Last: {last.date}</div>}
                  <div style={{fontSize:12,color:"#b490ca",marginTop:2}}>View chart →</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
