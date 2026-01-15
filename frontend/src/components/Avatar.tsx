import { useState } from 'react';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Avatar({ src, alt, size = 'md', className = '' }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-xl',
  };

  const sizeClass = sizes[size];

  // 如果沒有圖片 URL 或圖片載入失敗，顯示字母頭像
  if (!src || imageError) {
    return (
      <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold ${className}`}>
        {alt?.charAt(0).toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`${sizeClass} rounded-full bg-gray-200 animate-pulse ${className}`}></div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${sizeClass} rounded-full ${isLoading ? 'hidden' : ''} ${className}`}
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          console.log('[Avatar] Failed to load:', src);
          setImageError(true);
          setIsLoading(false);
        }}
      />
    </>
  );
}

