const copy = (en, hi, hinglish) => ({ en, hi, hinglish });

const hasPattern = (result, id) =>
  Array.isArray(result?.detected_patterns) && result.detected_patterns.some((pattern) => pattern.id === id);

const atLeastModerate = (result) => ["Moderate", "High", "Very High"].includes(result?.risk_level);

const INTERVIEW_QUESTIONS = [
  {
    id: "chest_pain_frequency",
    kind: "choice",
    title: copy(
      "After the analysis, when does chest discomfort seem most likely to appear?",
      "विश्लेषण के बाद, छाती की असुविधा सबसे अधिक कब महसूस होती है?",
      "Analysis ke baad, chest discomfort sabse zyada kab feel hoti hai?",
    ),
    why: copy(
      "We are reconfirming whether the symptom is stress-linked, exertional, or present even at rest.",
      "हम यह पुनर्पुष्टि कर रहे हैं कि लक्षण तनाव-सम्बन्धी है, प्रयास-सम्बन्धी है या आराम में भी होता है।",
      "Hum yeh reconfirm kar rahe hain ki symptom stress-linked hai, exertional hai ya rest mein bhi aata hai.",
    ),
    options: [
      { value: "none", label: copy("It does not happen", "ऐसा नहीं होता", "Aisa nahin hota") },
      { value: "stress_only", label: copy("Mostly during stress", "मुख्यतः तनाव के समय", "Mostly stress ke time") },
      { value: "stairs", label: copy("During walking or stairs", "चलने या सीढ़ियाँ चढ़ने पर", "Walking ya stairs par") },
      { value: "rest", label: copy("Sometimes even at rest", "कभी-कभी आराम की अवस्था में भी", "Kabhi rest mein bhi") },
    ],
    when: ({ result, form }) => atLeastModerate(result) || form.exertion_response !== "easy" || hasPattern(result, "vascular_stress"),
  },
  {
    id: "chest_pain_duration",
    kind: "choice",
    title: copy(
      "If it happens, how long does that episode usually last?",
      "यदि ऐसा होता है, तो वह एपिसोड सामान्यतः कितनी देर तक रहता है?",
      "Agar hota hai, to woh episode usually kitni der chalta hai?",
    ),
    why: copy(
      "Duration helps us understand whether the pattern looks brief or clinically more important.",
      "अवधि से समझ आता है कि पैटर्न संक्षिप्त है या चिकित्सीय रूप से अधिक महत्त्वपूर्ण।",
      "Duration se samajh aata hai ki pattern brief hai ya clinically zyada important.",
    ),
    options: [
      { value: "seconds", label: copy("Only a few seconds", "केवल कुछ सेकंड", "Sirf kuch seconds") },
      { value: "few_minutes", label: copy("A few minutes", "कुछ मिनट", "Kuch minute") },
      { value: "ten_plus", label: copy("Ten minutes or more", "दस मिनट या अधिक", "Das minute ya zyada") },
    ],
    when: ({ answers }) => ["stress_only", "stairs", "rest"].includes(answers.chest_pain_frequency),
  },
  {
    id: "breathlessness_pattern",
    kind: "choice",
    title: copy(
      "How much activity is enough to make you unusually breathless?",
      "किस स्तर की गतिविधि पर आपको असामान्य रूप से साँस फूलती है?",
      "Kis level ki activity par aapko unusual saans phoolti hai?",
    ),
    why: copy(
      "This reconfirms the functional limitation suggested by the main assessment.",
      "यह मुख्य मूल्यांकन में दिखी कार्यात्मक सीमा की पुनर्पुष्टि करता है।",
      "Yeh main assessment mein dikhi functional limitation ko reconfirm karta hai.",
    ),
    options: [
      { value: "none", label: copy("Not unusually", "असामान्य रूप से नहीं", "Not unusually") },
      { value: "stairs", label: copy("On stairs or brisk walking", "सीढ़ियों या तेज़ चलने पर", "Stairs ya brisk walk par") },
      { value: "flat_walk", label: copy("Even on a normal walk", "सामान्य चलने पर भी", "Normal walk par bhi") },
      { value: "rest", label: copy("Sometimes at rest", "कभी-कभी आराम में भी", "Kabhi rest mein bhi") },
    ],
    when: ({ result, form }) => atLeastModerate(result) || form.exertion_response !== "easy",
  },
  {
    id: "recovery_after_effort",
    kind: "choice",
    title: copy(
      "After effort, how quickly do you recover now?",
      "प्रयास के बाद अब आप कितनी जल्दी सामान्य होते हैं?",
      "Effort ke baad ab aap kitni jaldi recover karte ho?",
    ),
    why: copy(
      "Recovery time helps us refine how strong the exertional signal really is.",
      "रिकवरी-समय से यह समझ आता है कि प्रयास-सम्बन्धी संकेत वास्तव में कितना प्रबल है।",
      "Recovery time se hum samajhte hain ki exertional signal kitna strong hai.",
    ),
    options: [
      { value: "under_2", label: copy("Within 2 minutes", "2 मिनट के भीतर", "2 minute ke andar") },
      { value: "two_to_ten", label: copy("2 to 10 minutes", "2 से 10 मिनट", "2 se 10 minute") },
      { value: "over_ten", label: copy("More than 10 minutes", "10 मिनट से अधिक", "10 minute se zyada") },
    ],
    when: ({ answers, form }) =>
      form.exertion_response !== "easy" ||
      ["stairs", "flat_walk", "rest"].includes(answers.breathlessness_pattern),
  },
  {
    id: "palpitations_pattern",
    kind: "choice",
    title: copy(
      "How often do racing or skipped beats happen?",
      "धड़कन तेज़ होना या धड़कन छूटना कितनी बार होता है?",
      "Racing ya skipped beats kitni baar hoti hain?",
    ),
    why: copy(
      "We are checking whether rhythm awareness is occasional or clinically more important.",
      "हम देख रहे हैं कि धड़कन-सम्बन्धी शिकायत कभी-कभार है या चिकित्सीय रूप से अधिक महत्त्वपूर्ण।",
      "Hum dekh rahe hain ki rhythm awareness occasional hai ya clinically zyada important.",
    ),
    options: [
      { value: "never", label: copy("Never", "कभी नहीं", "Kabhi nahin") },
      { value: "occasional", label: copy("Occasionally", "कभी-कभी", "Kabhi-kabhi") },
      { value: "weekly", label: copy("At least weekly", "कम-से-कम हर सप्ताह", "Kam-se-kam weekly") },
      { value: "with_dizziness", label: copy("With dizziness or weakness", "चक्कर या कमज़ोरी के साथ", "Dizziness ya weakness ke saath") },
    ],
    when: ({ result, form }) => atLeastModerate(result) || form.stress === "high" || form.sleep_quality === "poor",
  },
  {
    id: "leg_swelling_pattern",
    kind: "choice",
    title: copy(
      "By evening, do your feet or ankles swell?",
      "क्या शाम तक आपके पैर या टखने सूजते हैं?",
      "Kya shaam tak feet ya ankles swell karte hain?",
    ),
    why: copy(
      "We are checking whether fluid retention might be part of the picture.",
      "हम देख रहे हैं कि क्या इस चिकित्सीय चित्र में द्रव-अवरोध भी शामिल हो सकता है।",
      "Hum dekh rahe hain ki fluid retention bhi picture ka part ho sakta hai ya nahin.",
    ),
    options: [
      { value: "never", label: copy("No", "नहीं", "Nahin") },
      { value: "sometimes", label: copy("Sometimes", "कभी-कभी", "Kabhi-kabhi") },
      { value: "most_days", label: copy("Most days", "अधिकतर दिनों में", "Most days") },
    ],
    when: ({ result, form }) => atLeastModerate(result) || form.sitting === "high",
  },
  {
    id: "sleep_hours",
    kind: "number",
    min: 3,
    max: 12,
    placeholder: "7",
    title: copy(
      "Based on what we found, how many hours do you truly sleep on most nights?",
      "जो पैटर्न मिले हैं, उनके आधार पर पूछें तो आप अधिकतर रातों में वास्तव में कितने घंटे सोते हैं?",
      "Jo pattern mile hain, unke basis par poochhen to aap most nights mein kitne ghante sote ho?",
    ),
    why: copy(
      "This helps confirm whether poor recovery is about quality, duration, or both.",
      "यह बताता है कि खराब रिकवरी नींद की गुणवत्ता, अवधि या दोनों से जुड़ी है।",
      "Yeh batata hai ki poor recovery sleep quality, duration ya dono se judi hai.",
    ),
    when: ({ form }) => form.sleep_quality !== "good" || form.stress === "high",
  },
];

export function buildAdaptiveInterview(result, form, answers) {
  return INTERVIEW_QUESTIONS.filter((question) => {
    try {
      return question.when({ result, form, answers });
    } catch {
      return false;
    }
  });
}

export function getNextAdaptiveQuestion(result, form, answers) {
  const path = buildAdaptiveInterview(result, form, answers);
  for (let index = 0; index < path.length; index += 1) {
    const question = path[index];
    const value = answers[question.id];
    if (value === undefined || value === null || value === "") {
      return { question, index, total: path.length };
    }
  }
  return null;
}
