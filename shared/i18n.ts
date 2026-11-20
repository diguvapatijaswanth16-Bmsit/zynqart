export const LANGUAGES = [
  { code: "en", label: "English", native: "English", speech: "en-IN", llm: "English" },
  { code: "te", label: "Telugu", native: "తెలుగు", speech: "te-IN", llm: "Telugu (తెలుగు script)" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speech: "hi-IN", llm: "Hindi (Devanagari script)" },
  { code: "ta", label: "Tamil", native: "தமிழ்", speech: "ta-IN", llm: "Tamil (தமிழ் script)" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", speech: "kn-IN", llm: "Kannada (ಕನ್ನಡ script)" },
  { code: "ml", label: "Malayalam", native: "മലയാളം", speech: "ml-IN", llm: "Malayalam (മലയാളം script)" },
  { code: "bn", label: "Bengali", native: "বাংলা", speech: "bn-IN", llm: "Bengali (বাংলা script)" },
  { code: "mr", label: "Marathi", native: "मराठी", speech: "mr-IN", llm: "Marathi (Devanagari script)" },
] as const;

export type LangCode = (typeof LANGUAGES)[number]["code"];

export function languageOf(code: string) {
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

interface Copy {
  assistantTagline: string;
  placeholder: string;
  clarify: string;
  noMatch: string;
  fallbackNote: string;
  budgetNote: string;
  why: string;
  listen: string;
  stopListening: string;
  suggestions: [string, string, string];
}

export const COPY: Record<LangCode, Copy> = {
  en: {
    assistantTagline: "Describe what you need in your own words.",
    placeholder: "e.g. lightweight laptop for coding around 60k, good battery",
    clarify: "One quick question so I don't guess:",
    noMatch: "I couldn't find something that fits all of that. Here is the closest I have — tell me what you can flex (budget or features).",
    fallbackNote: "Answered with Zynqart's rule-based matcher (category · tags · budget · rating).",
    budgetNote: "closest to your budget",
    why: "Why this?",
    listen: "Tap to speak",
    stopListening: "Listening… tap to stop",
    suggestions: [
      "Lightweight laptop for coding around ₹60,000 with good battery",
      "Best camera phone under ₹30,000 for travel photos",
      "Formal outfit for an interview under ₹5,000",
    ],
  },
  te: {
    assistantTagline: "మీకు ఏం కావాలో మీ మాటల్లోనే చెప్పండి.",
    placeholder: "ఉదా: కోడింగ్ కోసం 60 వేల లోపు తేలికైన ల్యాప్‌టాప్, మంచి బ్యాటరీ",
    clarify: "ఊహించకుండా ఒక చిన్న ప్రశ్న:",
    noMatch: "మీ అవసరాలన్నీ కలిపి ఉన్న ప్రొడక్ట్ దొరకలేదు. దగ్గరగా ఉన్నవి ఇక్కడ ఉన్నాయి — బడ్జెట్ లేదా ఫీచర్‌లలో ఏది మార్చుకోగలరో చెప్పండి.",
    fallbackNote: "Zynqart నియమాల ఆధారంగా (కేటగిరీ · ట్యాగ్‌లు · బడ్జెట్ · రేటింగ్) సమాధానం.",
    budgetNote: "మీ బడ్జెట్‌కు దగ్గరగా",
    why: "ఎందుకు ఇది?",
    listen: "మాట్లాడటానికి నొక్కండి",
    stopListening: "వింటున్నాను… ఆపడానికి నొక్కండి",
    suggestions: [
      "కోడింగ్ కోసం ₹60,000 లోపు తేలికైన ల్యాప్‌టాప్, మంచి బ్యాటరీ కావాలి",
      "₹30,000 లోపు మంచి కెమెరా ఫోన్ కావాలి",
      "ఇంటర్వ్యూ కోసం ₹5,000 లోపు ఫార్మల్ డ్రెస్",
    ],
  },
  hi: {
    assistantTagline: "आपको क्या चाहिए, अपने शब्दों में बताइए।",
    placeholder: "जैसे: कोडिंग के लिए 60 हज़ार के अंदर हल्का लैपटॉप, अच्छी बैटरी",
    clarify: "अंदाज़ा लगाने से पहले एक छोटा सवाल:",
    noMatch: "आपकी सभी ज़रूरतें एक साथ पूरी करने वाला प्रोडक्ट नहीं मिला। सबसे नज़दीकी विकल्प नीचे हैं — बजट या फीचर में क्या बदल सकते हैं बताइए।",
    fallbackNote: "Zynqart के नियम-आधारित मैचर (श्रेणी · टैग · बजट · रेटिंग) से उत्तर।",
    budgetNote: "आपके बजट के सबसे करीब",
    why: "यह क्यों?",
    listen: "बोलने के लिए दबाएँ",
    stopListening: "सुन रहा हूँ… रोकने के लिए दबाएँ",
    suggestions: [
      "कोडिंग के लिए ₹60,000 के अंदर हल्का लैपटॉप, अच्छी बैटरी",
      "₹30,000 के अंदर सबसे अच्छा कैमरा फोन",
      "इंटरव्यू के लिए ₹5,000 के अंदर फॉर्मल कपड़े",
    ],
  },
  ta: {
    assistantTagline: "உங்களுக்கு என்ன வேண்டும் என்று உங்கள் வார்த்தைகளில் சொல்லுங்கள்.",
    placeholder: "உதா: கோடிங்கிற்கு ₹60,000க்குள் இலகுவான லேப்டாப், நல்ல பேட்டரி",
    clarify: "ஊகிக்காமல் ஒரு சிறு கேள்வி:",
    noMatch: "உங்கள் தேவைகள் அனைத்தையும் பூர்த்தி செய்யும் பொருள் கிடைக்கவில்லை. அருகிலுள்ளவை கீழே உள்ளன — பட்ஜெட் அல்லது அம்சத்தில் எதை மாற்றலாம் என்று சொல்லுங்கள்.",
    fallbackNote: "Zynqart விதி அடிப்படையிலான பொருத்தம் (வகை · குறிச்சொல் · பட்ஜெட் · மதிப்பீடு).",
    budgetNote: "உங்கள் பட்ஜெட்டுக்கு மிக அருகில்",
    why: "ஏன் இது?",
    listen: "பேச தட்டவும்",
    stopListening: "கேட்கிறேன்… நிறுத்த தட்டவும்",
    suggestions: [
      "கோடிங்கிற்கு ₹60,000க்குள் இலகுவான லேப்டாப், நல்ல பேட்டரி",
      "₹30,000க்குள் சிறந்த கேமரா போன்",
      "நேர்காணலுக்கு ₹5,000க்குள் முறையான உடை",
    ],
  },
  kn: {
    assistantTagline: "ನಿಮಗೆ ಏನು ಬೇಕು ಎಂದು ನಿಮ್ಮ ಮಾತಿನಲ್ಲಿ ಹೇಳಿ.",
    placeholder: "ಉದಾ: ಕೋಡಿಂಗ್‌ಗಾಗಿ ₹60,000 ಒಳಗೆ ಹಗುರ ಲ್ಯಾಪ್‌ಟಾಪ್, ಉತ್ತಮ ಬ್ಯಾಟರಿ",
    clarify: "ಊಹಿಸದಿರಲು ಒಂದು ಸಣ್ಣ ಪ್ರಶ್ನೆ:",
    noMatch: "ನಿಮ್ಮ ಎಲ್ಲಾ ಅಗತ್ಯಗಳಿಗೆ ಹೊಂದುವ ಉತ್ಪನ್ನ ಸಿಗಲಿಲ್ಲ. ಹತ್ತಿರದ ಆಯ್ಕೆಗಳು ಕೆಳಗಿವೆ — ಬಜೆಟ್ ಅಥವಾ ವೈಶಿಷ್ಟ್ಯ ಯಾವುದನ್ನು ಬದಲಿಸಬಹುದು ಹೇಳಿ.",
    fallbackNote: "Zynqart ನಿಯಮ ಆಧಾರಿತ ಹೊಂದಾಣಿಕೆ (ವರ್ಗ · ಟ್ಯಾಗ್ · ಬಜೆಟ್ · ರೇಟಿಂಗ್).",
    budgetNote: "ನಿಮ್ಮ ಬಜೆಟ್‌ಗೆ ಹತ್ತಿರ",
    why: "ಇದು ಏಕೆ?",
    listen: "ಮಾತನಾಡಲು ಒತ್ತಿ",
    stopListening: "ಕೇಳುತ್ತಿದ್ದೇನೆ… ನಿಲ್ಲಿಸಲು ಒತ್ತಿ",
    suggestions: [
      "ಕೋಡಿಂಗ್‌ಗಾಗಿ ₹60,000 ಒಳಗೆ ಹಗುರ ಲ್ಯಾಪ್‌ಟಾಪ್, ಉತ್ತಮ ಬ್ಯಾಟರಿ",
      "₹30,000 ಒಳಗೆ ಉತ್ತಮ ಕ್ಯಾಮೆರಾ ಫೋನ್",
      "ಸಂದರ್ಶನಕ್ಕೆ ₹5,000 ಒಳಗೆ ಔಪಚಾರಿಕ ಉಡುಪು",
    ],
  },
  ml: {
    assistantTagline: "നിങ്ങൾക്ക് എന്ത് വേണമെന്ന് സ്വന്തം വാക്കുകളിൽ പറയൂ.",
    placeholder: "ഉദാ: കോഡിംഗിനായി ₹60,000നുള്ളിൽ ഭാരം കുറഞ്ഞ ലാപ്‌ടോപ്പ്, നല്ല ബാറ്ററി",
    clarify: "ഊഹിക്കാതിരിക്കാൻ ഒരു ചെറിയ ചോദ്യം:",
    noMatch: "നിങ്ങളുടെ എല്ലാ ആവശ്യങ്ങളും ഒത്തുപോകുന്ന ഉൽപ്പന്നം കണ്ടെത്തിയില്ല. അടുത്ത ഓപ്ഷനുകൾ താഴെയുണ്ട് — ബജറ്റോ സവിശേഷതയോ ഏത് മാറ്റാമെന്ന് പറയൂ.",
    fallbackNote: "Zynqart നിയമാധിഷ്ഠിത മാച്ചർ (വിഭാഗം · ടാഗ് · ബജറ്റ് · റേറ്റിംഗ്).",
    budgetNote: "നിങ്ങളുടെ ബജറ്റിനോട് ഏറ്റവും അടുത്ത്",
    why: "എന്തുകൊണ്ട് ഇത്?",
    listen: "സംസാരിക്കാൻ ടാപ്പ് ചെയ്യൂ",
    stopListening: "കേൾക്കുന്നു… നിർത്താൻ ടാപ്പ് ചെയ്യൂ",
    suggestions: [
      "കോഡിംഗിനായി ₹60,000നുള്ളിൽ ഭാരം കുറഞ്ഞ ലാപ്‌ടോപ്പ്, നല്ല ബാറ്ററി",
      "₹30,000നുള്ളിൽ മികച്ച ക്യാമറ ഫോൺ",
      "ഇന്റർവ്യൂവിനായി ₹5,000നുള്ളിൽ ഫോർമൽ വസ്ത്രം",
    ],
  },
  bn: {
    assistantTagline: "আপনার কী দরকার, নিজের ভাষায় বলুন।",
    placeholder: "যেমন: কোডিংয়ের জন্য ₹৬০,০০০-এর মধ্যে হালকা ল্যাপটপ, ভালো ব্যাটারি",
    clarify: "অনুমান না করার জন্য একটি ছোট প্রশ্ন:",
    noMatch: "আপনার সব চাহিদা একসাথে মেটায় এমন পণ্য পাইনি। নিকটতম বিকল্পগুলো নিচে আছে — বাজেট না ফিচার বদলাতে পারেন বলুন।",
    fallbackNote: "Zynqart-এর নিয়মভিত্তিক ম্যাচার (বিভাগ · ট্যাগ · বাজেট · রেটিং)।",
    budgetNote: "আপনার বাজেটের সবচেয়ে কাছাকাছি",
    why: "কেন এটি?",
    listen: "বলতে ট্যাপ করুন",
    stopListening: "শুনছি… থামাতে ট্যাপ করুন",
    suggestions: [
      "কোডিংয়ের জন্য ₹60,000-এর মধ্যে হালকা ল্যাপটপ, ভালো ব্যাটারি",
      "₹30,000-এর মধ্যে সেরা ক্যামেরা ফোন",
      "ইন্টারভিউয়ের জন্য ₹5,000-এর মধ্যে ফর্মাল পোশাক",
    ],
  },
  mr: {
    assistantTagline: "तुम्हाला काय हवे ते तुमच्या शब्दांत सांगा.",
    placeholder: "उदा: कोडिंगसाठी ₹६०,००० च्या आत हलका लॅपटॉप, चांगली बॅटरी",
    clarify: "अंदाज न लावण्यासाठी एक छोटा प्रश्न:",
    noMatch: "तुमच्या सर्व गरजा पूर्ण करणारे उत्पादन सापडले नाही. जवळचे पर्याय खाली आहेत — बजेट की फीचर बदलू शकता ते सांगा.",
    fallbackNote: "Zynqart च्या नियम-आधारित मॅचरने (श्रेणी · टॅग · बजेट · रेटिंग) उत्तर.",
    budgetNote: "तुमच्या बजेटच्या सर्वात जवळ",
    why: "हे का?",
    listen: "बोलण्यासाठी टॅप करा",
    stopListening: "ऐकत आहे… थांबवण्यासाठी टॅप करा",
    suggestions: [
      "कोडिंगसाठी ₹60,000 च्या आत हलका लॅपटॉप, चांगली बॅटरी",
      "₹30,000 च्या आत सर्वोत्तम कॅमेरा फोन",
      "इंटरव्ह्यूसाठी ₹5,000 च्या आत फॉर्मल कपडे",
    ],
  },
};

export function copyFor(code: string): Copy {
  return COPY[(code as LangCode) in COPY ? (code as LangCode) : "en"];
}

/** Headings used by the offline rule-based matcher so it still answers in-language. */
export const RULES_COPY: Record<LangCode, { heading: string; from: string; note: string }> = {
  en: { heading: "Best matches for you", from: "from the catalogue", note: "Rule-based match" },
  te: { heading: "మీకు సరిపోయే ఉత్తమ ఎంపికలు", from: "కేటలాగ్ నుండి", note: "నియమాల ఆధారిత సమాధానం" },
  hi: { heading: "आपके लिए सबसे अच्छे विकल्प", from: "कैटलॉग से", note: "नियम-आधारित उत्तर" },
  ta: { heading: "உங்களுக்கு சிறந்த தேர்வுகள்", from: "பட்டியலில் இருந்து", note: "விதி அடிப்படையிலான பதில்" },
  kn: { heading: "ನಿಮಗೆ ಉತ್ತಮ ಆಯ್ಕೆಗಳು", from: "ಪಟ್ಟಿಯಿಂದ", note: "ನಿಯಮ ಆಧಾರಿತ ಉತ್ತರ" },
  ml: { heading: "നിങ്ങൾക്ക് അനുയോജ്യമായ തിരഞ്ഞെടുപ്പുകൾ", from: "കാറ്റലോഗിൽ നിന്ന്", note: "നിയമാധിഷ്ഠിത ഉത്തരം" },
  bn: { heading: "আপনার জন্য সেরা পছন্দ", from: "ক্যাটালগ থেকে", note: "নিয়মভিত্তিক উত্তর" },
  mr: { heading: "तुमच्यासाठी सर्वोत्तम पर्याय", from: "कॅटलॉगमधून", note: "नियम-आधारित उत्तर" },
};
