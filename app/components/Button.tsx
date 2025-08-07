import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'blue' | 'gray' | 'red' | 'green' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  // ARIA and accessibility props
  loading?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  iconOnly?: boolean;
  ariaLabel?: string;
}

export default function Button({ 
  children, 
  variant = 'blue', 
  size = 'md', 
  className = '',
  loading = false,
  pressed,
  expanded,
  iconOnly = false,
  ariaLabel,
  disabled,
  ...props 
}: ButtonProps) {
  const baseClasses = 'font-medium rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    blue: 'bg-teal-600 hover:bg-teal-700 text-white focus:ring-teal-500',
    gray: 'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500',
    red: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    green: 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500',
    ghost: 'text-teal-600 hover:text-teal-700 hover:bg-teal-50 focus:ring-teal-500',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const isDisabled = disabled || loading;
  const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : '';
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${disabledClasses} ${className}`;

  // Generate ARIA attributes
  const ariaAttributes: Record<string, string | boolean> = {};

  // Handle loading state
  if (loading) {
    ariaAttributes['aria-busy'] = true;
    ariaAttributes['aria-live'] = 'polite';
  }

  // Handle toggle button state
  if (pressed !== undefined) {
    ariaAttributes['aria-pressed'] = pressed;
  }

  // Handle expandable button state
  if (expanded !== undefined) {
    ariaAttributes['aria-expanded'] = expanded;
  }

  // Handle icon-only buttons
  if (iconOnly) {
    // If no explicit aria-label is provided, try to extract text from children
    if (!ariaLabel) {
      const textContent = typeof children === 'string' 
        ? children 
        : React.Children.toArray(children)
            .filter(child => typeof child === 'string')
            .join(' ');
      
      if (textContent.trim()) {
        ariaAttributes['aria-label'] = textContent.trim();
      }
    } else {
      ariaAttributes['aria-label'] = ariaLabel;
    }
  }

  // If explicit aria-label is provided, use it
  if (ariaLabel) {
    ariaAttributes['aria-label'] = ariaLabel;
  }

  return (
    <button 
      className={classes} 
      disabled={isDisabled}
      {...ariaAttributes}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" aria-hidden="true"></div>
          <span>Loading...</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
} 