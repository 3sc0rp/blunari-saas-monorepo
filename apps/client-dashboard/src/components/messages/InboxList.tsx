import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Conversation } from "@/types/messages";
import { format, isToday, isYesterday } from "date-fns";
import { Search, Filter, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface InboxListProps {
  conversations: Conversation[];
  selectedConversation?: string;
  onSelectConversation: (id: string) => void;
  onArchiveConversation: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const InboxList: React.FC<InboxListProps> = ({
  conversations,
  selectedConversation,
  onSelectConversation,
  onArchiveConversation,
  searchQuery,
  onSearchChange,
}) => {
  const [filterStatus, setFilterStatus] = useState<
    "all" | "unread" | "archived"
  >("all");

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return "Yesterday";
    } else {
      return format(date, "MMM dd");
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

  const filteredConversations = conversations.filter((conversation) => {
    const matchesSearch =
      conversation.customer_name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      conversation.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.last_message
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "unread" && conversation.unread_count > 0) ||
      (filterStatus === "archived" && conversation.status === "archived");

    return matchesSearch && matchesFilter && conversation.status !== "archived";
  });

  return (
    <Card className="h-full bg-surface border-surface-2">
      <CardContent className="p-0">
        {/* Search and Filter Header */}
        <div className="p-4 border-b border-surface-2 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 bg-surface-2 border-surface-3"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
              className="text-xs"
            >
              All
            </Button>
            <Button
              variant={filterStatus === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("unread")}
              className="text-xs"
            >
              Unread
            </Button>
            <Button variant="outline" size="sm" className="text-xs ml-auto">
              <Filter className="h-3 w-3 mr-1" />
              Filter
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="divide-y divide-surface-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 cursor-pointer transition-colors hover:bg-surface-2 ${
                  selectedConversation === conversation.id
                    ? "bg-brand/5 border-r-2 border-r-brand"
                    : ""
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.customer_avatar} />
                      <AvatarFallback className="bg-brand/10 text-brand text-xs">
                        {getInitials(conversation.customer_name)}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.unread_count > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand rounded-full flex items-center justify-center">
                        <span className="text-xs text-brand-foreground font-medium">
                          {conversation.unread_count > 9
                            ? "9+"
                            : conversation.unread_count}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4
                        className={`text-body-sm font-medium text-text truncate ${
                          conversation.unread_count > 0 ? "font-semibold" : ""
                        }`}
                      >
                        {conversation.customer_name}
                      </h4>
                      <span className="text-xs text-text-muted flex-shrink-0 ml-2">
                        {formatMessageTime(conversation.last_message_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <p
                        className={`text-xs truncate ${
                          conversation.unread_count > 0
                            ? "text-text font-medium"
                            : "text-text-muted"
                        }`}
                      >
                        {conversation.subject}
                      </p>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-40 bg-surface border-surface-2 z-50">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveConversation(conversation.id);
                            }}
                            className="text-xs"
                          >
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs">
                            Mark as Read
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-xs text-danger">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <p
                      className={`text-xs truncate ${
                        conversation.unread_count > 0
                          ? "text-text"
                          : "text-text-muted"
                      }`}
                    >
                      {conversation.last_message}
                    </p>

                    {conversation.status === "draft" && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredConversations.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-text-muted text-body-sm">
                  No conversations found
                </p>
                {searchQuery && (
                  <p className="text-xs text-text-subtle mt-1">
                    Try adjusting your search terms
                  </p>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
