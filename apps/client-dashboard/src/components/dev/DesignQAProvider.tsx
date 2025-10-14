import React, { useState, useEffect } from "react";
import { DesignQAOverlay } from "./DesignQAOverlay";

// Global QA provider component
export const DesignQAProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isQAOpen, setIsQAOpen] = useState(false);

  useEffect(() => {
    // Only enable in development
      if (process.env.NODE_ENV !== "development") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Toggle with Ctrl+Shift+Q (or Cmd+Shift+Q on Mac)
      if (
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key === "Q"
      ) {
        event.preventDefault();
        setIsQAOpen((prev) => !prev);
      }

      // Quick tools with shortcuts
      if (isQAOpen) {
        switch (event.key) {
          case "g":
            if (event.shiftKey) {
              event.preventDefault();
              // Toggle grid
            }
            break;
          case "b":
            if (event.shiftKey) {
              event.preventDefault();
              // Toggle baseline
            }
            break;
          case "c":
            if (event.shiftKey) {
              event.preventDefault();
              // Toggle contrast
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isQAOpen]);

  // Show floating indicator in dev mode
      const QAIndicator = () => {
    if (process.env.NODE_ENV !== "development" || isQAOpen) return null;

    return (
      <div
        className="fixed bottom-4 right-4 z-[9999] opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
        onClick={() => setIsQAOpen(true)}
        title="Design QA Tools (Ctrl+Shift+Q)"
      >
        <div className="bg-brand text-brand-foreground rounded-full p-2 shadow-lg">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path
              fillRule="evenodd"
              d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3a2 2 0 012 2v6.5A1.5 1.5 0 009.5 13h1A1.5 1.5 0 0012 11.5V5a2 2 0 012 2v1a1 1 0 102 0V7a2 2 0 00-2-2V4a2 2 0 00-2-2H6a2 2 0 00-2 2v1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  };

  return (
    <>
      {children}
      {process.env.NODE_ENV === "development" && (
        <>
          <QAIndicator />
          <DesignQAOverlay
            isOpen={isQAOpen}
            onToggle={() => setIsQAOpen(!isQAOpen)}
          />
        </>
      )}
    </>
  );
};

