import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

import { chatWithMedAssist } from "./lib.api";
import { localize, repairText, UI_TEXT } from "./i18n";

const QUICK_PROMPTS = {
  en: [
    "What exercises are safe for me?",
    "What should I eat this week?",
    "What does my risk score mean?",
    "How can I sleep better?",
    "Which symptoms should I not ignore?",
    "What habits are hurting me most?",
  ],
  hi: [
    "\u092e\u0947\u0930\u0947 \u0932\u093f\u090f \u0915\u094c\u0928-\u0938\u0940 \u090f\u0915\u094d\u0938\u0930\u0938\u093e\u0907\u091c\u093c \u0938\u0939\u0940 \u0930\u0939\u0947\u0902\u0917\u0940?",
    "\u0907\u0938 \u0939\u092b\u094d\u0924\u0947 \u092e\u0941\u091d\u0947 \u0915\u094d\u092f\u093e \u0916\u093e\u0928\u093e \u091a\u093e\u0939\u093f\u090f?",
    "\u092e\u0947\u0930\u093e \u091c\u094b\u0916\u093f\u092e \u0938\u094d\u0915\u094b\u0930 \u0915\u094d\u092f\u093e \u092c\u0924\u093e\u0924\u093e \u0939\u0948?",
    "\u0928\u0940\u0902\u0926 \u0915\u0948\u0938\u0947 \u0938\u0941\u0927\u093e\u0930\u0942\u0901?",
    "\u0915\u094c\u0928-\u0938\u0947 \u0932\u0915\u094d\u0937\u0923 \u0928\u091c\u093c\u0930\u0905\u0902\u0926\u093e\u091c\u093c \u0928\u0939\u0940\u0902 \u0915\u0930\u0928\u0947 \u091a\u093e\u0939\u093f\u090f?",
    "\u0924\u0928\u093e\u0935 \u0915\u092e \u0915\u0948\u0938\u0947 \u0915\u0930\u0942\u0901?",
  ],
  hinglish: [
    "Mere liye kaunsi exercises safe hain?",
    "Is week mujhe kya khana chahiye?",
    "Mera risk score exactly kya batata hai?",
    "Better sleep ke liye kya karun?",
    "Kaunse symptoms ignore nahin karne chahiye?",
    "Stress kam karne ke liye kya karun?",
  ],
};

function greeting(result, language) {
  if (language === "hi") {
    return result
      ? `\u0928\u092e\u0938\u094d\u0924\u0947\u0964 \u0906\u092a\u0915\u093e \u0935\u0930\u094d\u0924\u092e\u093e\u0928 \u091c\u094b\u0916\u093f\u092e-\u0938\u094d\u0924\u0930 ${result.risk_level} \u0939\u0948 \u0914\u0930 \u0938\u094d\u0915\u094b\u0930 ${result.risk_score}/100 \u0939\u0948\u0964 \u0906\u092a \u092e\u0941\u091d\u0938\u0947 \u0915\u0941\u091b \u092d\u0940 \u092a\u0942\u091b \u0938\u0915\u0924\u0947 \u0939\u0948\u0902 \u2014 \u0906\u0939\u093e\u0930, \u0935\u094d\u092f\u093e\u092f\u093e\u092e, \u0928\u0940\u0902\u0926, \u0924\u0928\u093e\u0935, \u092f\u093e \u0915\u094b\u0908 \u092d\u0940 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0938\u0902\u092c\u0902\u0927\u0940 \u092a\u094d\u0930\u0936\u094d\u0928\u0964`
      : "\u0928\u092e\u0938\u094d\u0924\u0947\u0964 \u092e\u0948\u0902 \u0906\u092a\u0915\u0940 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u0930\u093f\u092a\u094b\u0930\u094d\u091f \u0938\u092e\u091d\u093e\u0928\u0947 \u0914\u0930 \u0915\u093f\u0938\u0940 \u092d\u0940 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f \u092a\u094d\u0930\u0936\u094d\u0928 \u0915\u093e \u0909\u0924\u094d\u0924\u0930 \u0926\u0947\u0928\u0947 \u0915\u0947 \u0932\u093f\u090f \u092f\u0939\u093e\u0901 \u0939\u0942\u0901\u0964";
  }
  if (language === "hinglish") {
    return result
      ? `Namaste! Aapka risk level ${result.risk_level} hai aur score ${result.risk_score}/100 hai. Mujhse kuch bhi poochho \u2014 kya khana chahiye, kaunsi exercise karni chahiye, neend kaise improve karein, ya report mein kuch samajhna ho.`
      : "Namaste! Main aapki health report samjhane aur kisi bhi health question ka jawab dene ke liye yahan hoon.";
  }
  return result
    ? `Hi! Your assessment shows ${result.risk_level} risk with a score of ${result.risk_score}/100. Ask me anything \u2014 what to eat, which exercises are safe for you, how to improve sleep, manage stress, or understand any part of your report.`
    : "Hi! I can help you understand your health assessment and answer any health-related questions you have.";
}

export default function ChatBot({ result, form, language }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ id: Date.now(), role: "assistant", content: greeting(result, language) }]);
    }
  }, [isOpen, messages.length, result, language]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const sendMessage = async (preset) => {
    const text = (preset ?? input).trim();
    if (!text || isLoading) return;

    const userMessage = { id: Date.now(), role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatWithMedAssist({
        messages: nextMessages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        result,
        form,
        language,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: repairText(response.reply),
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            className="chatbot-fab"
            onClick={() => setIsOpen(true)}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            title={localize(UI_TEXT.medAssistTitle, language)}
          >
            <span className="chatbot-fab-icon">AI</span>
            <span className="chatbot-fab-label">MedAssist</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-panel"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
          >
            <div className="chatbot-header">
              <div className="chatbot-header-info">
                <div className="chatbot-avatar">AI</div>
                <div>
                  <h4>{localize(UI_TEXT.medAssistTitle, language)}</h4>
                  <span>{localize(UI_TEXT.medAssistSubtitle, language)}</span>
                </div>
              </div>
              <button className="chatbot-icon-btn" onClick={() => setIsOpen(false)}>x</button>
            </div>

            <div className="chatbot-messages">
              {messages.map((message) => (
                <div key={message.id} className={`chatbot-msg ${message.role}`}>
                  <div className="chatbot-msg-bubble">{message.content}</div>
                </div>
              ))}

              {isLoading && (
                <div className="chatbot-msg assistant">
                  <div className="chatbot-msg-bubble chatbot-typing">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}

              {error && <div className="chatbot-error">{error}</div>}
              <div ref={endRef} />
            </div>

            {messages.length <= 1 && (
              <div className="chatbot-quick-prompts">
                {(QUICK_PROMPTS[language] || QUICK_PROMPTS.en).map((prompt) => (
                  <button key={prompt} className="chatbot-quick-btn" onClick={() => sendMessage(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            )}

            <div className="chatbot-input-row">
              <textarea
                className="chatbot-input"
                placeholder={localize(UI_TEXT.chatbotPlaceholder, language)}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                disabled={isLoading}
              />
              <button className="chatbot-send-btn" onClick={() => sendMessage()} disabled={!input.trim() || isLoading}>
                ^
              </button>
            </div>

            <p className="chatbot-disclaimer">{localize(UI_TEXT.chatbotDisclaimer, language)}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
