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
  return (
    <img
      alt={alt}
      decoding={decoding}
      fetchPriority={fetchPriority}
      loading={loading}
      {...props}
    />
  );
}
