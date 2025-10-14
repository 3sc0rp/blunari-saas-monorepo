import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Message, Conversation } from "@/types/messages";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { Check, CheckCheck, Clock, AlertCircle } from "lucide-react";

interface ConversationPaneProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
}

export const ConversationPane: React.FC<ConversationPaneProps> = ({
  conversation,
  messages,
  currentUserId,
}) => {
  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, "h:mm a")}`;
    } else {
      return format(date, "MMM dd at h:mm a");
    }
  };

  const formatDateSeparator = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return "Today";
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMMM dd, yyyy");
    }
  };

  const getMessageStatus = (message: Message) => {
    switch (message.status) {
      case "sent":
        return <Clock className="h-3 w-3 text-text-muted" />;
      case "delivered":
        return <Check className="h-3 w-3 text-text-muted" />;
      case "read":
        return <CheckCheck className="h-3 w-3 text-success" />;
      case "failed":
        return <AlertCircle className="h-3 w-3 text-danger" />;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderMessageBubble = (message: Message, isOwn: boolean) => {
    return (
      <div
        key={message.id}
        className={`flex items-end gap-2 mb-4 ${
          isOwn ? "justify-end" : "justify-start"
        }`}
      >
        {!isOwn && (
          <Avatar className="h-8 w-8">
            <AvatarImage src={message.sender_avatar} />
            <AvatarFallback className="bg-brand/10 text-brand text-xs">
              {getInitials(message.sender_name)}
            </AvatarFallback>
          </Avatar>
        )}

        <div
          className={`max-w-[70%] rounded-2xl px-4 py-2 ${
            isOwn
              ? "bg-brand text-brand-foreground rounded-br-sm"
              : "bg-surface-2 text-text rounded-bl-sm"
          }`}
        >
          {!isOwn && (
            <div className="text-xs text-text-muted mb-1 font-medium">
              {message.sender_name}
            </div>
          )}

          <div className="text-body-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>

          <div
            className={`flex items-center gap-1 mt-2 justify-end ${
              isOwn ? "text-brand-foreground/70" : "text-text-muted"
            }`}
          >
            <span className="text-xs">
              {formatMessageTime(message.created_at)}
            </span>
            {isOwn && getMessageStatus(message)}
          </div>
        </div>

        {isOwn && (
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-accent/10 text-accent text-xs">
              You
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    );
  };

  // Group messages by date
      const groupedMessages = messages.reduce(
    (groups, message) => {
      const date = format(new Date(message.created_at), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    },
    {} as Record<string, Message[]>,
  );

  return (
    <Card className="h-full bg-surface border-surface-2">
      {/* Conversation Header */}
      <CardHeader className="pb-3 border-b border-surface-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={conversation.customer_avatar} />
            <AvatarFallback className="bg-brand/10 text-brand">
              {getInitials(conversation.customer_name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <h3 className="text-h4 font-semibold text-text truncate">
              {conversation.customer_name}
            </h3>
            <p className="text-body-sm text-text-muted truncate">
              {conversation.customer_email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {conversation.status === "draft" && (
              <Badge variant="outline" className="text-xs">
                Draft
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {conversation.participants.length} participants
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-[calc(100vh-300px)] px-4">
          <div className="py-4">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex items-center justify-center my-4">
                  <div className="bg-surface-2 px-3 py-1 rounded-full">
                    <span className="text-xs text-text-muted font-medium">
                      {formatDateSeparator(dayMessages[0].created_at)}
                    </span>
                  </div>
                </div>

                {/* Messages for this date */}
                {dayMessages.map((message) => {
                  const isOwn =
                    message.sender_type === "staff" &&
                    message.sender_id === currentUserId;
                  return renderMessageBubble(message, isOwn);
                })}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-text-muted text-body-sm">
                  No messages yet. Start the conversation!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

