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
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const resolvedLoading = loading ?? (priority ? "eager" : "lazy");
  const resolvedDecoding = decoding ?? (priority ? "sync" : "async");
  const resolvedFetchPriority = fetchPriority ?? (priority ? "high" : undefined);

  return (
    <img
      alt={alt}
      decoding={resolvedDecoding}
      fetchPriority={resolvedFetchPriority}
      height={height}
      loading={resolvedLoading}
      width={width}
      {...props}
    />
  );
}
