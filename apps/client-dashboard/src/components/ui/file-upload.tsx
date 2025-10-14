import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Image, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  maxSize?: number;
  label: string;
  description?: string;
  preview?: boolean;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  label,
  description,
  preview = true,
  className,
}) => {
  const { tenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file || !tenant?.id) return;

    // Validate file size
      if (file.size > maxSize) {
      setError(
        `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      );
      return;
    }

    setError("");
    setUploading(true);

    try {
      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${tenant.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from("tenant-assets")
        .upload(fileName, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("tenant-assets").getPublicUrl(fileName);

      onChange(publicUrl);

      toast({
        title: "Upload Successful",
        description: `${label} has been uploaded successfully.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      setError("Upload failed. Please try again.");
      toast({
        title: "Upload Failed",
        description: `Failed to upload ${label}. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    setError("");
    toast({
      title: "File Removed",
      description: `${label} has been removed.`,
    });
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("space-y-3", className)}>
      <Label className="text-sm font-medium">{label}</Label>

      {value && preview ? (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={value}
              alt={label}
              className="max-h-20 max-w-32 rounded border object-contain"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-muted-foreground">
              File uploaded successfully
            </span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClick}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            Change {label}
          </Button>
        </div>
      ) : (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer",
            error && "border-destructive",
            uploading && "pointer-events-none opacity-60",
          )}
          onClick={handleClick}
        >
          <CardContent className="flex flex-col items-center justify-center p-6 text-center">
            {uploading ? (
              <div className="space-y-3">
                <div className="animate-spin">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div className="text-sm font-medium">Uploading...</div>
              </div>
            ) : (
              <>
                <div className="mb-3">
                  {error ? (
                    <AlertCircle className="h-8 w-8 text-destructive" />
                  ) : (
                    <Image className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    Upload {label.toLowerCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {description || `Click to select ${label.toLowerCase()}`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Max size: {Math.round(maxSize / 1024 / 1024)}MB
                  </div>
                </div>

                {error && (
                  <Badge variant="destructive" className="mt-2">
                    {error}
                  </Badge>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
    </div>
  );
};

