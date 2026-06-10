import type { ImgHTMLAttributes } from "react";

type OptimizedImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

export function OptimizedImage({
  alt = "",
  priority = false,
  loading,
  decoding,
  fetchPriority,
  ...props
}: OptimizedImageProps) {
  return (
    <img
      alt={alt}
      decoding={decoding ?? "async"}
      fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
      loading={loading ?? (priority ? "eager" : "lazy")}
      {...props}
    />
  );
}
