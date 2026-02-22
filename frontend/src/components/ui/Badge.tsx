import type { ReactNode } from 'react';

interface BadgeProps {
    children: ReactNode;
    variant?: 'solid' | 'outline';
    className?: string;
}

export default function Badge({ children, variant = 'solid', className = '' }: BadgeProps) {
    const baseStyles = 'inline-flex items-center px-1.5 py-0.5 text-xs font-semibold rounded-sm uppercase tracking-wider';

    const variants = {
        solid: 'bg-gray-800 text-gray-300',
        outline: 'border border-gray-600 text-gray-400',
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
