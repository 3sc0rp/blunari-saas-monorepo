import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageComposer } from "./MessageComposer";
import { MessageTemplate } from "@/types/messages";
import { Search, Users, Plus } from "lucide-react";
import { motion } from "framer-motion";

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templates?: MessageTemplate[];
  onCreateConversation: (data: {
    to: string;
    subject: string;
    content: string;
    templateId?: string;
  }) => void;
}

export const NewConversationDialog: React.FC<NewConversationDialogProps> = ({
  open,
  onOpenChange,
  templates = [],
  onCreateConversation,
}) => {
  const [formData, setFormData] = useState({
    to: "",
    subject: "",
    content: "",
    templateId: "",
  });
  const [recipientType, setRecipientType] = useState<
    "customer" | "email" | "phone"
  >("customer");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; name: string; email?: string; phone?: string }>
  >([]);

  const handleSendMessage = (content: string, templateId?: string) => {
    const data = {
      ...formData,
      content,
      templateId,
    };

    onCreateConversation(data);
    setFormData({ to: "", subject: "", content: "", templateId: "" });
    onOpenChange(false);
  };

  const handleRecipientSearch = (query: string) => {
    setFormData((prev) => ({ ...prev, to: query }));
    // Search customers - integrate with real customer API
      if (query.length > 2) {
      setSearchResults([
        {
          id: "1",
          name: "John Smith",
          email: "john@example.com",
          phone: "+1234567890",
        },
        {
          id: "2",
          name: "Jane Doe",
          email: "jane@example.com",
          phone: "+1234567891",
        },
      ]);
    } else {
      setSearchResults([]);
    }
  };

  const canSend = formData.to.trim() && formData.subject.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface border-surface-2">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-h3">
            <Plus className="h-5 w-5 text-brand" />
            New Conversation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient Type Selection */}
          <div>
            <Label className="text-body-sm font-medium text-text">
              Send to
            </Label>
            <div className="flex gap-2 mt-2">
              <Button
                variant={recipientType === "customer" ? "default" : "outline"}
                size="sm"
                onClick={() => setRecipientType("customer")}
                className="text-xs"
              >
                <Users className="h-3 w-3 mr-1" />
                Customer
              </Button>
              <Button
                variant={recipientType === "email" ? "default" : "outline"}
                size="sm"
                onClick={() => setRecipientType("email")}
                className="text-xs"
              >
                Email
              </Button>
              <Button
                variant={recipientType === "phone" ? "default" : "outline"}
                size="sm"
                onClick={() => setRecipientType("phone")}
                className="text-xs"
              >
                Phone
              </Button>
            </div>
          </div>

          {/* Recipient Input */}
          <div>
            <Label
              htmlFor="recipient"
              className="text-body-sm font-medium text-text"
            >
              {recipientType === "customer"
                ? "Customer"
                : recipientType === "email"
                  ? "Email Address"
                  : "Phone Number"}
            </Label>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
              <Input
                id="recipient"
                value={formData.to}
                onChange={(e) => handleRecipientSearch(e.target.value)}
                placeholder={
                  recipientType === "customer"
                    ? "Search customers..."
                    : recipientType === "email"
                      ? "Enter email address..."
                      : "Enter phone number..."
                }
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 bg-surface-2 border border-surface-3 rounded-md max-h-40 overflow-y-auto"
              >
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 hover:bg-surface-3 cursor-pointer border-b border-surface-3 last:border-b-0"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        to:
                          recipientType === "email"
                            ? result.email
                            : recipientType === "phone"
                              ? result.phone
                              : result.name,
                      }));
                      setSearchResults([]);
                    }}
                  >
                    <div className="text-body-sm font-medium text-text">
                      {result.name}
                    </div>
                    <div className="text-xs text-text-muted">
                      {result.email}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Subject */}
          <div>
            <Label
              htmlFor="subject"
              className="text-body-sm font-medium text-text"
            >
              Subject
            </Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subject: e.target.value }))
              }
              placeholder="Enter message subject..."
              className="mt-2"
            />
          </div>

          {/* Message Composer */}
          <div>
            <Label className="text-body-sm font-medium text-text">
              Message
            </Label>
            <div className="mt-2">
              <MessageComposer
                templates={templates}
                onSendMessage={handleSendMessage}
                placeholder="Type your message..."
                showTemplates={templates.length > 0}
                maxLength={1000}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t border-surface-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={() =>
                handleSendMessage(formData.content, formData.templateId)
              }
              disabled={!canSend}
              className="text-xs"
            >
              Create Conversation
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

