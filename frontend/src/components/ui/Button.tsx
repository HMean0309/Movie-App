import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    children: ReactNode;
    icon?: ReactNode;
}

export default function Button({
    variant = 'primary',
    size = 'md',
    children,
    icon,
    className = '',
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background group';

    const variants = {
        primary: 'bg-red-600 hover:bg-red-800 text-white focus:ring-brand shadow-[0_4px_15px_rgba(220,38,38,0.4)] hover:shadow-[0_6px_20px_rgba(220,38,38,0.6)] hover:-translate-y-0.5',
        secondary: 'bg-white/20 hover:bg-white/30 text-white focus:ring-white backdrop-blur-sm hover:-translate-y-0.5',
        outline: 'border border-gray-600 hover:border-white hover:bg-white/10 text-white focus:ring-white hover:-translate-y-0.5',
        ghost: 'hover:bg-white/10 text-gray-300 hover:text-white focus:ring-white',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm gap-1.5',
        md: 'px-5 py-2 text-base gap-2',
        lg: 'px-8 py-3 text-lg gap-3',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {icon && <span className="shrink-0">{icon}</span>}
            {children}
        </button>
    );
}
