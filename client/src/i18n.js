export const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "\u0939\u093f\u0928\u094d\u0926\u0940" },
  { value: "hinglish", label: "Hinglish" },
];

function shouldRepair(text) {
  return typeof text === "string" && /[ÃÂàâð]/.test(text);
}

function repairFromLatin1Utf8(text) {
  try {
    const bytes = Uint8Array.from(Array.from(text, (char) => char.charCodeAt(0) & 0xff));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return text;
  }
}

function repairScore(text) {
  if (!text) return 0;
  let score = 0;
  score += (text.match(/[\u0900-\u097F]/g) || []).length * 4;
  score += (text.match(/[–—₹•…]/g) || []).length * 2;
  score -= (text.match(/[ÃÂàâð]/g) || []).length * 5;
  score -= (text.match(/�/g) || []).length * 8;
  return score;
}

export function repairText(value) {
  if (typeof value !== "string") return value;
  if (!shouldRepair(value)) return value;

  const repaired = repairFromLatin1Utf8(value);
  return repairScore(repaired) > repairScore(value) ? repaired : value;
}

export function localize(value, language = "en") {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return repairText(value);
  if (Array.isArray(value)) return value.map((item) => localize(item, language));
  return repairText(value[language] || value.en || value.hi || value.hinglish || "");
}

export const UI_TEXT = {
  appTitle: { en: "Beatly", hi: "Beatly", hinglish: "Beatly" },
  assessmentLabel: {
    en: "Cardiovascular Assessment",
    hi: "\u0939\u0943\u0926\u092f-\u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928",
    hinglish: "Cardiovascular Assessment",
  },
  knowYourHeart: {
    en: "Know your heart",
    hi: "\u0905\u092a\u0928\u0947 \u0939\u0943\u0926\u092f \u0915\u094b \u0938\u092e\u091d\u093f\u090f",
    hinglish: "Apne heart ko samjho",
  },
  yourNameOptional: {
    en: "Your name (optional)",
    hi: "\u0906\u092a\u0915\u093e \u0928\u093e\u092e (\u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915)",
    hinglish: "Aapka naam (optional)",
  },
  consentLabel: {
    en: "I understand this is an awareness tool, not a diagnosis. I consent to generating a risk estimate.",
    hi: "\u092e\u0948\u0902 \u0938\u092e\u091d\u0924\u093e/\u0938\u092e\u091d\u0924\u0940 \u0939\u0942\u0901 \u0915\u093f \u092f\u0939 \u091c\u093e\u0917\u0930\u0942\u0915\u0924\u093e \u0915\u0947 \u0932\u093f\u090f \u092c\u0928\u093e \u0909\u092a\u0915\u0930\u0923 \u0939\u0948, \u0905\u0902\u0924\u093f\u092e \u0928\u093f\u0926\u093e\u0928 \u0928\u0939\u0940\u0902\u0964 \u092e\u0948\u0902 \u091c\u094b\u0916\u093f\u092e-\u0906\u0915\u0932\u0928 \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0928\u0947 \u0915\u0940 \u0938\u0939\u092e\u0924\u093f \u0926\u0947\u0924\u093e/\u0926\u0947\u0924\u0940 \u0939\u0942\u0901\u0964",
    hinglish: "Main samajhta/samajhti hoon ki yeh awareness tool hai, final diagnosis nahin. Main risk estimate generate karne ki consent deta/deti hoon.",
  },
  beginAssessment: {
    en: "Begin Assessment",
    hi: "\u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928 \u0936\u0941\u0930\u0942 \u0915\u0930\u0947\u0902",
    hinglish: "Assessment shuru karo",
  },
  analyzingData: {
    en: "Analyzing your data",
    hi: "\u0906\u092a\u0915\u0947 \u0921\u0947\u091f\u093e \u0915\u093e \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948",
    hinglish: "Aapke data ka analysis ho raha hai",
  },
  assessmentComplete: {
    en: "Assessment complete.",
    hi: "\u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928 \u092a\u0942\u0930\u093e \u0939\u094b \u0917\u092f\u093e\u0964",
    hinglish: "Assessment complete ho gaya.",
  },
  labValues: {
    en: "Lab Values",
    hi: "\u0932\u0948\u092c \u0935\u0948\u0932\u094d\u092f\u0942",
    hinglish: "Lab values",
  },
  labIntro: {
    en: "If you have a recent blood test report, enter what you can below. This significantly improves accuracy.",
    hi: "\u092f\u0926\u093f \u0906\u092a\u0915\u0947 \u092a\u093e\u0938 \u0939\u093e\u0932 \u0915\u0940 \u0930\u0915\u094d\u0924-\u091c\u093e\u0901\u091a \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0939\u0948, \u0924\u094b \u0928\u0940\u091a\u0947 \u0909\u092a\u0932\u092c\u094d\u0927 \u092e\u093e\u0928 \u092d\u0930\u0947\u0902\u0964 \u0907\u0938\u0938\u0947 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0940 \u0938\u091f\u0940\u0915\u0924\u093e \u0915\u093e\u092b\u0940 \u092c\u0922\u093c\u0924\u0940 \u0939\u0948\u0964",
    hinglish: "Agar recent blood test report hai, to neeche values fill karo. Isse analysis ki accuracy kaafi improve hoti hai.",
  },
  allFieldsOptional: {
    en: "All fields are optional",
    hi: "\u0938\u092d\u0940 \u092b\u093c\u0940\u0932\u094d\u0921 \u0935\u0948\u0915\u0932\u094d\u092a\u093f\u0915 \u0939\u0948\u0902",
    hinglish: "Saare fields optional hain",
  },
  skipLabs: {
    en: "Skip - I don't have lab reports",
    hi: "\u0938\u094d\u0915\u093f\u092a \u0915\u0930\u0947\u0902 - \u092e\u0947\u0930\u0947 \u092a\u093e\u0938 \u0932\u0948\u092c \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0928\u0939\u0940\u0902 \u0939\u0948",
    hinglish: "Skip karo - mere paas lab report nahin hai",
  },
  submitWithLabs: {
    en: "Submit with Lab Data",
    hi: "\u0932\u0948\u092c \u0921\u0947\u091f\u093e \u0915\u0947 \u0938\u093e\u0925 \u0938\u092c\u092e\u093f\u091f \u0915\u0930\u0947\u0902",
    hinglish: "Lab data ke saath submit karo",
  },
  generateAssessment: {
    en: "Generate Assessment",
    hi: "\u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928 \u0924\u0948\u092f\u093e\u0930 \u0915\u0930\u0947\u0902",
    hinglish: "Assessment generate karo",
  },
  confirm: {
    en: "Confirm",
    hi: "\u092a\u0941\u0937\u094d\u091f\u093f \u0915\u0930\u0947\u0902",
    hinglish: "Confirm karo",
  },
  overview: { en: "Overview", hi: "\u0938\u093e\u0930\u093e\u0902\u0936", hinglish: "Overview" },
  patterns: { en: "Patterns", hi: "\u092a\u0948\u091f\u0930\u094d\u0928", hinglish: "Patterns" },
  clinical: { en: "Clinical", hi: "\u0915\u094d\u0932\u093f\u0928\u093f\u0915\u0932", hinglish: "Clinical" },
  actions: { en: "Actions", hi: "\u0915\u093e\u0930\u094d\u092f\u092f\u094b\u091c\u0928\u093e", hinglish: "Actions" },
  doctors: { en: "Doctors", hi: "\u0921\u0949\u0915\u094d\u091f\u0930", hinglish: "Doctors" },
  deeperLook: {
    en: "Doctor Deep Dive",
    hi: "\u0921\u0949\u0915\u094d\u091f\u0930 \u0921\u0940\u092a \u0921\u093e\u0907\u0935",
    hinglish: "Doctor Deep Dive",
  },
  downloadPdf: {
    en: "Download PDF",
    hi: "\u092a\u0940\u0921\u0940\u090f\u092b \u0921\u093e\u0909\u0928\u0932\u094b\u0921 \u0915\u0930\u0947\u0902",
    hinglish: "PDF download karo",
  },
  newAssessment: {
    en: "New Assessment",
    hi: "\u0928\u092f\u093e \u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928",
    hinglish: "Naya assessment",
  },
  voiceSettings: {
    en: "Voice settings",
    hi: "\u0906\u0935\u093e\u091c\u093c \u0938\u0947\u091f\u093f\u0902\u0917",
    hinglish: "Voice settings",
  },
  voiceAuto: {
    en: "Auto voice",
    hi: "\u0938\u094d\u0935\u091a\u093e\u0932\u093f\u0924 \u0906\u0935\u093e\u091c\u093c",
    hinglish: "Auto voice",
  },
  listenSection: { en: "Listen", hi: "\u0938\u0941\u0928\u0947\u0902", hinglish: "Suno" },
  stopAudio: { en: "Stop", hi: "\u0930\u094b\u0915\u0947\u0902", hinglish: "Stop" },
  reportLoading: {
    en: "Building your detailed doctor-style report...",
    hi: "\u0906\u092a\u0915\u0940 \u0935\u093f\u0938\u094d\u0924\u0943\u0924 \u0921\u0949\u0915\u094d\u091f\u0930-\u0936\u0948\u0932\u0940 \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0924\u0948\u092f\u093e\u0930 \u0915\u0940 \u091c\u093e \u0930\u0939\u0940 \u0939\u0948...",
    hinglish: "Aapki detailed doctor-style report tayyar ki ja rahi hai...",
  },
  reportLoadingTitle: {
    en: "Writing your medical narrative",
    hi: "\u0906\u092a\u0915\u0940 \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0932\u093f\u0916\u0940 \u091c\u093e \u0930\u0939\u0940 \u0939\u0948",
    hinglish: "Aapki medical narrative likhi ja rahi hai",
  },
  reportLoadingBody: {
    en: "We are assembling grounded insights, medically useful sections, and confidence-rated explanations from your scored assessment.",
    hi: "\u0939\u092e \u0906\u092a\u0915\u0947 \u0938\u094d\u0915\u094b\u0930 \u0915\u093f\u090f \u0917\u090f \u092e\u0942\u0932\u094d\u092f\u093e\u0902\u0915\u0928 \u0938\u0947 \u0917\u094d\u0930\u093e\u0909\u0902\u0921\u0947\u0921 \u0907\u0928\u094d\u0938\u093e\u0907\u091f, \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u0930\u0942\u092a \u0938\u0947 \u0909\u092a\u092f\u094b\u0917\u0940 \u0938\u0947\u0915\u094d\u0936\u0928 \u0914\u0930 \u0935\u093f\u0936\u094d\u0935\u093e\u0938-\u0938\u094d\u0924\u0930 \u0938\u0939\u093f\u0924 \u0935\u094d\u092f\u093e\u0916\u094d\u092f\u093e \u0924\u0948\u092f\u093e\u0930 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964",
    hinglish: "Scored assessment se grounded insights, medically useful sections aur confidence-rated explanations tayyar ki ja rahi hain.",
  },
  reportUnavailable: {
    en: "Detailed analysis is not available right now.",
    hi: "\u0935\u093f\u0938\u094d\u0924\u0943\u0924 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0905\u092d\u0940 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    hinglish: "Detailed analysis abhi available nahin hai.",
  },
  adaptiveInterview: {
    en: "Adaptive Doctor Interview",
    hi: "\u0905\u0928\u0941\u0915\u0942\u0932\u0940 \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u0938\u093e\u0915\u094d\u0937\u093e\u0924\u094d\u0915\u093e\u0930",
    hinglish: "Adaptive doctor interview",
  },
  adaptiveInterviewSubhead: {
    en: "These follow-up questions reconfirm the patterns found in the assessment and refine the medical picture further.",
    hi: "\u092f\u0947 \u092b\u0949\u0932\u094b-\u0905\u092a \u092a\u094d\u0930\u0936\u094d\u0928 \u0906\u0915\u0932\u0928 \u092e\u0947\u0902 \u0909\u092d\u0930\u0947 \u092a\u0948\u091f\u0930\u094d\u0928 \u0915\u0940 \u092a\u0941\u0928\u0930\u094d\u092a\u0941\u0937\u094d\u091f\u093f \u0915\u0930\u0924\u0947 \u0939\u0948\u0902 \u0914\u0930 \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u091a\u093f\u0924\u094d\u0930 \u0915\u094b \u0914\u0930 \u0938\u094d\u092a\u0937\u094d\u091f \u092c\u0928\u093e\u0924\u0947 \u0939\u0948\u0902\u0964",
    hinglish: "Yeh follow-up questions assessment mein nikle patterns ko reconfirm karte hain aur medical picture ko aur clear banate hain.",
  },
  skipQuestion: {
    en: "Skip for now",
    hi: "\u0905\u092d\u0940 \u091b\u094b\u0921\u093c\u0947\u0902",
    hinglish: "Abhi skip karo",
  },
  updateAnalysis: {
    en: "Update analysis",
    hi: "\u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0905\u092a\u0921\u0947\u091f \u0915\u0930\u0947\u0902",
    hinglish: "Analysis update karo",
  },
  interviewReady: {
    en: "Interview complete. We now have enough context to refine the medical picture.",
    hi: "\u0938\u093e\u0915\u094d\u0937\u093e\u0924\u094d\u0915\u093e\u0930 \u092a\u0942\u0930\u093e \u0939\u094b \u0917\u092f\u093e\u0964 \u0905\u092c \u0939\u092e\u093e\u0930\u0947 \u092a\u093e\u0938 \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u091a\u093f\u0924\u094d\u0930 \u0915\u094b \u0914\u0930 \u0938\u094d\u092a\u0937\u094d\u091f \u0915\u0930\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092a\u0930\u094d\u092f\u093e\u092a\u094d\u0924 \u0938\u0928\u094d\u0926\u0930\u094d\u092d \u0939\u0948\u0964",
    hinglish: "Interview complete ho gaya. Ab medical picture ko refine karne ke liye enough context hai.",
  },
  medAssistTitle: {
    en: "PulseX MedAssist",
    hi: "PulseX MedAssist",
    hinglish: "PulseX MedAssist",
  },
  medAssistSubtitle: {
    en: "Your personal health assistant",
    hi: "\u0906\u092a\u0915\u093e \u0928\u093f\u091c\u0940 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0938\u0939\u093e\u092f\u0915",
    hinglish: "Aapka personal health assistant",
  },
  chatbotPlaceholder: {
    en: "Ask me anything \u2014 diet, exercise, sleep, your report...",
    hi: "\u0915\u0941\u091b \u092d\u0940 \u092a\u0942\u091b\u0947\u0902 \u2014 \u0906\u0939\u093e\u0930, \u0935\u094d\u092f\u093e\u092f\u093e\u092e, \u0928\u0940\u0902\u0926, \u0930\u093f\u092a\u094b\u0930\u094d\u091f...",
    hinglish: "Kuch bhi poochho \u2014 diet, exercise, sleep, report...",
  },
  chatbotDisclaimer: {
    en: "Not a substitute for medical advice. Always consult a doctor for diagnosis and treatment.",
    hi: "\u092f\u0939 \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0915\u0940\u092f \u0938\u0932\u093e\u0939 \u0915\u093e \u0935\u093f\u0915\u0932\u094d\u092a \u0928\u0939\u0940\u0902 \u0939\u0948\u0964 \u0928\u093f\u0926\u093e\u0928 \u0914\u0930 \u0909\u092a\u091a\u093e\u0930 \u0915\u0947 \u0932\u093f\u090f \u0921\u0949\u0915\u094d\u091f\u0930 \u0938\u0947 \u0905\u0935\u0936\u094d\u092f \u092a\u0930\u093e\u092e\u0930\u094d\u0936 \u0915\u0930\u0947\u0902\u0964",
    hinglish: "Yeh medical advice ka replacement nahin hai. Diagnosis aur treatment ke liye doctor se zaroor milo.",
  },
  preAssessmentNote: {
    en: "Doctor-style intake",
    hi: "\u0921\u0949\u0915\u094d\u091f\u0930-\u0936\u0948\u0932\u0940 \u092a\u094d\u0930\u093e\u0930\u092e\u094d\u092d\u093f\u0915 \u092a\u0942\u091b\u0924\u093e\u091b",
    hinglish: "Doctor-style intake",
  },
  questionLoadingEyebrow: {
    en: "Adaptive intake",
    hi: "\u0905\u0928\u0941\u0915\u0942\u0932\u0940 \u092a\u0942\u091b\u0924\u093e\u091b",
    hinglish: "Adaptive intake",
  },
  questionLoadingTitle: {
    en: "Preparing your next medical question",
    hi: "\u0906\u092a\u0915\u093e \u0905\u0917\u0932\u093e \u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u092a\u094d\u0930\u0936\u094d\u0928 \u0924\u0948\u092f\u093e\u0930 \u0915\u093f\u092f\u093e \u091c\u093e \u0930\u0939\u093e \u0939\u0948",
    hinglish: "Aapka next medical question tayyar kiya ja raha hai",
  },
  questionLoadingBody: {
    en: "We are choosing the next question based on what matters most after your last answer.",
    hi: "\u0939\u092e \u0906\u092a\u0915\u0947 \u092a\u093f\u091b\u0932\u0947 \u0909\u0924\u094d\u0924\u0930 \u0915\u0947 \u092c\u093e\u0926 \u0938\u092c\u0938\u0947 \u0905\u0927\u093f\u0915 \u092e\u0939\u0924\u094d\u0924\u094d\u0935\u092a\u0942\u0930\u094d\u0923 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0915\u0947 \u0906\u0927\u093e\u0930 \u092a\u0930 \u0905\u0917\u0932\u093e \u092a\u094d\u0930\u0936\u094d\u0928 \u091a\u0941\u0928 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964",
    hinglish: "Aapke last answer ke baad jo sabse zyada matter karta hai, uske basis par next question choose ho raha hai.",
  },
  questionLoadingHint: {
    en: "No tile will appear until the better version is ready.",
    hi: "\u092c\u0947\u0939\u0924\u0930 \u092a\u094d\u0930\u0936\u094d\u0928 \u0924\u0948\u092f\u093e\u0930 \u0939\u094b\u0928\u0947 \u0938\u0947 \u092a\u0939\u0932\u0947 \u0915\u094b\u0908 \u091f\u093e\u0907\u0932 \u0928\u0939\u0940\u0902 \u0926\u093f\u0916\u093e\u0908 \u091c\u093e\u090f\u0917\u0940\u0964",
    hinglish: "Better question ready hone se pehle koi tile nahin dikhayenge.",
  },
  medicalConfidence: {
    en: "Medical confidence",
    hi: "\u091a\u093f\u0915\u093f\u0924\u094d\u0938\u0940\u092f \u0935\u093f\u0936\u094d\u0935\u093e\u0938-\u0938\u094d\u0924\u0930",
    hinglish: "Medical confidence",
  },
  confidenceHigh: {
    en: "High confidence",
    hi: "\u0909\u091a\u094d\u091a \u0935\u093f\u0936\u094d\u0935\u093e\u0938",
    hinglish: "High confidence",
  },
  confidenceModerate: {
    en: "Moderate confidence",
    hi: "\u092e\u0927\u094d\u092f\u092e \u0935\u093f\u0936\u094d\u0935\u093e\u0938",
    hinglish: "Moderate confidence",
  },
  confidenceWatch: {
    en: "Watch closely",
    hi: "\u0938\u093e\u0935\u0927\u093e\u0928\u0940 \u0938\u0947 \u0926\u0947\u0916\u0947\u0902",
    hinglish: "Watch closely",
  },
  aiBriefing: {
    en: "AI Health Briefing",
    hi: "\u090f\u0906\u0908 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0938\u093e\u0930\u093e\u0902\u0936",
    hinglish: "AI Health Briefing",
  },
  stopBriefing: {
    en: "Stop",
    hi: "\u0930\u094b\u0915\u0947\u0902",
    hinglish: "Stop",
  },
  listenBriefing: {
    en: "Listen",
    hi: "\u0938\u0941\u0928\u0947\u0902",
    hinglish: "Suno",
  },
  generatingBriefing: {
    en: "Generating your personalized health briefing...",
    hi: "\u0906\u092a\u0915\u0940 \u0935\u094d\u092f\u0915\u094d\u0924\u093f\u0917\u0924 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0924\u0948\u092f\u093e\u0930 \u0915\u0940 \u091c\u093e \u0930\u0939\u0940 \u0939\u0948...",
    hinglish: "Aapki personalized health briefing tayyar ki ja rahi hai...",
  },
  insightExercise: {
    en: "Exercise Recommendations",
    hi: "\u0935\u094d\u092f\u093e\u092f\u093e\u092e \u0938\u0941\u091d\u093e\u0935",
    hinglish: "Exercise Recommendations",
  },
  insightSleep: {
    en: "Sleep Guidance",
    hi: "\u0928\u0940\u0902\u0926 \u092e\u093e\u0930\u094d\u0917\u0926\u0930\u094d\u0936\u0928",
    hinglish: "Sleep Guidance",
  },
  insightStress: {
    en: "Stress Management",
    hi: "\u0924\u0928\u093e\u0935 \u092a\u094d\u0930\u092c\u0902\u0927\u0928",
    hinglish: "Stress Management",
  },
  findNearby: {
    en: "Find Nearby",
    hi: "\u0928\u091c\u093c\u0926\u0940\u0915\u0940 \u0916\u094b\u091c\u0947\u0902",
    hinglish: "Nearby dhundho",
  },
  cardiologistsNearYou: {
    en: "Cardiologists Near You",
    hi: "\u0906\u092a\u0915\u0947 \u0928\u091c\u093c\u0926\u0940\u0915 \u0939\u0943\u0926\u092f \u0930\u094b\u0917 \u0935\u093f\u0936\u0947\u0937\u091c\u094d\u091e",
    hinglish: "Aapke nazdeek cardiologists",
  },
  searchCardioSpecialists: {
    en: "Search for cardiovascular specialists near your location.",
    hi: "\u0905\u092a\u0928\u0947 \u0938\u094d\u0925\u093e\u0928 \u0915\u0947 \u0928\u091c\u093c\u0926\u0940\u0915 \u0939\u0943\u0926\u092f \u0930\u094b\u0917 \u0935\u093f\u0936\u0947\u0937\u091c\u094d\u091e\u094b\u0902 \u0915\u0940 \u0916\u094b\u091c \u0915\u0930\u0947\u0902\u0964",
    hinglish: "Apne location ke paas cardiovascular specialists dhundho.",
  },
  useMyLocation: {
    en: "\ud83d\udccd Use My Location for Accurate Results",
    hi: "\ud83d\udccd \u0938\u091f\u0940\u0915 \u092a\u0930\u093f\u0923\u093e\u092e\u094b\u0902 \u0915\u0947 \u0932\u093f\u090f \u092e\u0947\u0930\u0940 \u0932\u094b\u0915\u0947\u0936\u0928 \u0909\u092a\u092f\u094b\u0917 \u0915\u0930\u0947\u0902",
    hinglish: "\ud83d\udccd Sahi results ke liye meri location use karo",
  },
  prepareVisit: {
    en: "Prepare for Your Visit",
    hi: "\u0905\u092a\u0928\u0940 \u092e\u0941\u0932\u093e\u0915\u093e\u0924 \u0915\u0940 \u0924\u0948\u092f\u093e\u0930\u0940",
    hinglish: "Apni visit ki tayyari",
  },
  tipsForAppointment: {
    en: "Tips for your cardiologist appointment",
    hi: "\u0939\u0943\u0926\u092f \u0930\u094b\u0917 \u0935\u093f\u0936\u0947\u0937\u091c\u094d\u091e \u0938\u0947 \u092e\u093f\u0932\u0928\u0947 \u0915\u0947 \u0938\u0941\u091d\u093e\u0935",
    hinglish: "Cardiologist se milne ke tips",
  },
  atYourAppointment: {
    en: "At Your Appointment",
    hi: "\u0906\u092a\u0915\u0940 \u0905\u092a\u0949\u0907\u0902\u091f\u092e\u0947\u0902\u091f \u092a\u0930",
    hinglish: "Appointment par",
  },
  questionsToAsk: {
    en: "Questions to ask your cardiologist",
    hi: "\u0905\u092a\u0928\u0947 \u0939\u0943\u0926\u092f \u0930\u094b\u0917 \u0935\u093f\u0936\u0947\u0937\u091c\u094d\u091e \u0938\u0947 \u092a\u0942\u091b\u0947\u0902 \u092f\u0947 \u092a\u094d\u0930\u0936\u094d\u0928",
    hinglish: "Cardiologist se yeh poochho",
  },
  emergencySymptoms: {
    en: "\ud83d\udea8 Emergency Symptoms \u2014 Act Immediately",
    hi: "\ud83d\udea8 \u0906\u092a\u093e\u0924\u0915\u093e\u0932\u0940\u0928 \u0932\u0915\u094d\u0937\u0923 \u2014 \u0924\u0941\u0930\u0902\u0924 \u0915\u093e\u0930\u094d\u092f\u0935\u093e\u0939\u0940 \u0915\u0930\u0947\u0902",
    hinglish: "\ud83d\udea8 Emergency Symptoms \u2014 Turant action lo",
  },
};
