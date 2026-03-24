"use client";

import { useEffect, useRef } from "react";
import { Msg } from "./types";

type AgreementChatPanelProps = {
  messages: Msg[];
  input: string;
  loading: boolean;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  onSend: () => void;
};

export default function AgreementChatPanel({
  messages,
  input,
  loading,
  setInput,
  onSend,
}: AgreementChatPanelProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  return (
    <div
      style={{
        marginTop: 18,
        border: "1px solid var(--border)",
        borderRadius: 18,
        background: "var(--panel)",
        boxShadow: "var(--shadow-strong)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--border)",
          background: "var(--panel-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--muted-strong)",
              marginBottom: 4,
            }}
          >
            Agreement Chat
          </div>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Ask contract-specific questions and review scoped answers.
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "28px 20px 24px",
          minHeight: 460,
          maxHeight: "62vh",
          overflowY: "auto",
          background: "#ffffff",
        }}
      >
        {messages.length === 0 && !loading && (
          <div
            style={{
              maxWidth: 760,
              margin: "20px auto 0",
              padding: "8px 4px",
            }}
          >
            <div
              style={{
                fontSize: 28,
                fontWeight: 750,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: "var(--foreground)",
                marginBottom: 10,
              }}
            >
              Ask about your selected agreements
            </div>

            <div
              style={{
                color: "var(--muted)",
                fontSize: 15,
                lineHeight: 1.7,
                maxWidth: 680,
              }}
            >
              Use the filters above to scope the agreement set, then ask questions
              about language, obligations, timelines, classifications, or
              differences across agreements.
            </div>

            <div
              style={{
                marginTop: 22,
                display: "grid",
                gap: 10,
                maxWidth: 720,
              }}
            >
              {[
                'What does this agreement say about grievance timelines?',
                'Who is responsible for ditch maintenance?',
                'Compare foreman language across the selected agreements.',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setInput(example)}
                  style={{
                    textAlign: "left",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--panel-strong)",
                    color: "var(--foreground)",
                    cursor: "pointer",
                    fontSize: 14,
                    lineHeight: 1.5,
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
          }}
        >
          {messages.map((m, i) => {
            const isUser = m.role === "user";

            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: isUser ? "flex-end" : "flex-start",
                  marginBottom: 22,
                }}
              >
                {isUser ? (
                  <div
                    style={{
                      maxWidth: "72%",
                      padding: "12px 16px",
                      borderRadius: 20,
                      border: "1px solid rgba(23, 49, 79, 0.18)",
                      background: "var(--brand-gradient)",
                      color: "#ffffff",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        opacity: 0.88,
                        marginBottom: 6,
                      }}
                    >
                      You
                    </div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.65,
                        fontSize: 14,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 760,
                      padding: "2px 2px 2px 0",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--muted-strong)",
                        marginBottom: 10,
                      }}
                    >
                      Assistant
                    </div>

                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        color: "var(--foreground)",
                        lineHeight: 1.75,
                        fontSize: 15,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 760,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--muted-strong)",
                    marginBottom: 10,
                  }}
                >
                  Assistant
                </div>

                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid var(--border)",
                    background: "var(--panel-strong)",
                    color: "var(--muted-strong)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  <span>Thinking</span>
                  <span
                    style={{
                      display: "inline-flex",
                      gap: 4,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "currentColor",
                        opacity: 0.45,
                      }}
                    />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "currentColor",
                        opacity: 0.65,
                      }}
                    />
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: "currentColor",
                        opacity: 0.85,
                      }}
                    />
                  </span>
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border)",
          padding: 16,
          background: "var(--panel-strong)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            padding: 10,
            borderRadius: 18,
            border: "1px solid var(--input-border)",
            background: "#ffffff",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
            placeholder="Ask a question about your agreements..."
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              background: "transparent",
              color: "var(--foreground)",
              fontSize: 14,
              lineHeight: 1.5,
              padding: "10px 12px",
              fontFamily: "inherit",
            }}
          />

          <button
            onClick={onSend}
            disabled={loading || !input.trim()}
            style={{
              minWidth: 110,
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid #17314f",
              background:
                loading || !input.trim()
                  ? "linear-gradient(135deg, #7f8ea3 0%, #99a6b8 100%)"
                  : "var(--brand-gradient)",
              color: "#fff",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              fontWeight: 700,
              boxShadow: "var(--shadow-soft)",
              opacity: loading || !input.trim() ? 0.75 : 1,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}