import React, { useState, useRef } from "react";
import { useIntersectionObserver } from "./performance-wrapper";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallback?: string;
  placeholder?: React.ReactNode;
  className?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  fallback = "/placeholder.svg",
  placeholder,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isInView = useIntersectionObserver(imgRef, { rootMargin: "50px" });

  React.useEffect(() => {
    if (isInView && !imageSrc) {
      setImageSrc(src);
    }
  }, [isInView, src, imageSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setImageSrc(fallback);
  };

  return (
    <div ref={imgRef} className={cn("relative overflow-hidden", className)}>
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-2 animate-pulse motion-reduce:animate-none">
          {placeholder}
        </div>
      )}

      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            "transition-opacity duration-300 motion-reduce:transition-none",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
          loading="lazy"
          decoding="async"
          {...props}
        />
      )}

      {!isInView && (
        <div
          className={cn(
            "bg-surface-2 animate-pulse motion-reduce:animate-none",
            className,
          )}
        />
      )}
    </div>
  );
};
