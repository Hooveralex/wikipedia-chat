'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Send, Loader2, BookOpen } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolUse?: { name: string; input: any };
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let currentToolUse: { name: string; input: any } | undefined;

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'text') {
                assistantMessage += parsed.content;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];

                  if (lastMessage?.role === 'assistant') {
                    lastMessage.content = assistantMessage;
                  } else {
                    newMessages.push({
                      role: 'assistant',
                      content: assistantMessage,
                    });
                  }

                  return newMessages;
                });
              } else if (parsed.type === 'tool_use') {
                currentToolUse = { name: parsed.name, input: parsed.input };
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];

                  if (lastMessage?.role === 'assistant') {
                    lastMessage.toolUse = currentToolUse;
                  } else {
                    newMessages.push({
                      role: 'assistant',
                      content: assistantMessage,
                      toolUse: currentToolUse,
                    });
                  }

                  return newMessages;
                });
              } else if (parsed.type === 'error') {
                setMessages((prev) => [
                  ...prev,
                  {
                    role: 'assistant',
                    content: `Error: ${parsed.content}`,
                  },
                ]);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, an error occurred while processing your request.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50">
      <div className="flex-1 overflow-y-auto w-full pb-32" ref={scrollRef}>
        <div className="max-w-[800px] mx-auto px-4 py-8 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-zinc-500 mt-8">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-zinc-300" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm mt-2">
                Try asking: "What is quantum computing?" or "Tell me about the history of the Internet"
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <Card
                className={`max-w-[80%] p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 text-zinc-900'
                }`}
              >
                <div className="whitespace-pre-wrap break-words">
                  {message.content}
                </div>
                {message.toolUse && (
                  <div className="mt-2 pt-2 border-t border-zinc-300 text-xs opacity-75">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-3 w-3" />
                      <span>
                        Searched Wikipedia: {message.toolUse.input.query || message.toolUse.input.title || 'article'}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="bg-zinc-100 p-4">
                <div className="flex items-center gap-2 text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-200">
        <div className="max-w-[800px] mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={isLoading || !input.trim()}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
