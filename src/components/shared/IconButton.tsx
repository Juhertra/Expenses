import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface IconButtonProps {
  icon: LucideIcon;
  label: string; // Always required for accessibility
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  showTextAt?: 'sm' | 'md' | 'lg' | 'never';
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible icon button with optional text label that shows at specified breakpoints
 * Always includes aria-label for screen readers
 */
export function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'secondary',
  showTextAt = 'sm',
  disabled = false,
  className = '',
}: IconButtonProps) {
  // Determine text visibility class
  const textClass =
    showTextAt === 'never'
      ? 'sr-only' // Screen reader only
      : showTextAt === 'sm'
      ? 'hidden sm:inline'
      : showTextAt === 'md'
      ? 'hidden md:inline'
      : 'hidden lg:inline';

  // Variant styles
  const variantStyles = {
    primary: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg 
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${className}
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <span className={textClass}>{label}</span>
    </button>
  );
}

