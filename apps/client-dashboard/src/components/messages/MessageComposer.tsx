import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageTemplate } from "@/types/messages";
import { Send, FileText, X, Type, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MessageComposerProps {
  templates?: MessageTemplate[];
  onSendMessage: (content: string, templateId?: string) => void;
  onClose?: () => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showTemplates?: boolean;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  templates = [],
  onSendMessage,
  onClose,
  placeholder = "Type your message...",
  disabled = false,
  maxLength = 1000,
  showTemplates = false,
}) => {
  const [content, setContent] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const canSend = content.trim().length > 0 && !isOverLimit && !disabled;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const handleSend = () => {
    if (!canSend) return;

    onSendMessage(content.trim(), selectedTemplate || undefined);
    setContent("");
    setSelectedTemplate("");
    setShowTemplateSelector(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setContent(template.content);
      setSelectedTemplate(templateId);
    }
    setShowTemplateSelector(false);
  };

  const clearTemplate = () => {
    setSelectedTemplate("");
    setContent("");
  };

  return (
    <Card className="bg-surface border-surface-2">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Template Selection */}
          <AnimatePresence>
            {showTemplateSelector && templates.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-3 bg-surface-2 rounded-md border border-surface-3">
                  <Label className="text-xs font-medium text-text mb-2 block">
                    Choose a template
                  </Label>
                  <Select onValueChange={handleTemplateSelect}>
                    <SelectTrigger className="w-full bg-surface border-surface-3">
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-surface-2 z-50">
                      {templates.map((template) => (
                        <SelectItem
                          key={template.id}
                          value={template.id}
                          className="cursor-pointer hover:bg-surface-2"
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-body-sm">
                              {template.name}
                            </span>
                            <span className="text-xs text-text-muted capitalize">
                              {template.category}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Template Indicator */}
          {selectedTemplate && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                Template:{" "}
                {templates.find((t) => t.id === selectedTemplate)?.name}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTemplate}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          )}

          {/* Message Input */}
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={disabled}
              className={`min-h-[80px] resize-none pr-12 ${
                isOverLimit ? "border-danger focus-visible:ring-danger" : ""
              }`}
              aria-label="Message content"
            />

            {/* Character Count */}
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <span
                className={`text-xs font-tabular ${
                  isOverLimit ? "text-danger" : "text-text-muted"
                }`}
              >
                {characterCount}/{maxLength}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Template Toggle */}
              {showTemplates && templates.length > 0 && (
                <Button
                  variant={showTemplateSelector ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowTemplateSelector(!showTemplateSelector)}
                  className="text-xs"
                >
                  <FileText className="h-3 w-3 mr-1" />
                  Templates
                </Button>
              )}

              {/* Schedule Toggle */}
              <Button
                variant={isScheduled ? "default" : "outline"}
                size="sm"
                onClick={() => setIsScheduled(!isScheduled)}
                className="text-xs"
              >
                <Clock className="h-3 w-3 mr-1" />
                Schedule
              </Button>

              {/* Message Type */}
              <Badge variant="outline" className="text-xs">
                <Type className="h-3 w-3 mr-1" />
                Text
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {onClose && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="text-xs"
                >
                  Cancel
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleSend}
                disabled={!canSend}
                className="text-xs"
              >
                <Send className="h-3 w-3 mr-1" />
                Send
              </Button>
            </div>
          </div>

          {/* Validation Messages */}
          {isOverLimit && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-danger"
            >
              Message exceeds maximum length by {characterCount - maxLength}{" "}
              characters
            </motion.p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
