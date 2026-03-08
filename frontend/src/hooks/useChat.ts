import { useState, useRef, useEffect, useCallback } from "react";
import { sendChatMessage } from "../lib/api";

interface ChatMessage {
  role: "user" | "ai";
  text: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const msg = chatInput;
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", text: msg }]);
    setChatLoading(true);

    try {
      const { reply } = await sendChatMessage(msg);
      setMessages(prev => [...prev, { role: "ai", text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, something went wrong. Try again." }]);
    }
    setChatLoading(false);
  }, [chatInput, chatLoading]);

  return { messages, chatInput, setChatInput, chatLoading, sendMessage, messagesEndRef };
}
