import * as React from "react"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    colorScheme?: 'orange' | 'blue'
    isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", colorScheme = "orange", isLoading, children, disabled, ...props }, ref) => {

        const variants = {
            default: {
                orange: "bg-gradient-to-r from-red-300 to-orange-300 text-white shadow-lg shadow-orange-200/50 hover:shadow-xl hover:shadow-orange-300/60 border-2 border-white/20",
                blue: "bg-gradient-to-r from-blue-400 to-indigo-400 text-white shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-300/60 border-2 border-white/20"
            },
            destructive: {
                orange: "bg-red-400 text-white hover:bg-red-500 shadow-lg shadow-red-200",
                blue: "bg-red-400 text-white hover:bg-red-500 shadow-lg shadow-red-200"
            },
            outline: {
                orange: "border-2 border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 hover:border-gray-300",
                blue: "border-2 border-blue-100 bg-white hover:bg-blue-50 text-gray-700 hover:text-blue-700 hover:border-blue-200"
            },
            secondary: {
                orange: "bg-white text-gray-800 border-2 border-orange-100 shadow-sm hover:bg-orange-50 hover:border-orange-200",
                blue: "bg-white text-gray-800 border-2 border-blue-100 shadow-sm hover:bg-blue-50 hover:border-blue-200"
            },
            ghost: {
                orange: "hover:bg-orange-50 hover:text-orange-600 text-gray-600",
                blue: "hover:bg-blue-50 hover:text-blue-600 text-gray-600"
            },
            link: {
                orange: "text-orange-500 underline-offset-4 hover:underline",
                blue: "text-blue-500 underline-offset-4 hover:underline"
            }
        }

        const sizes = {
            default: "h-12 px-6 py-2",
            sm: "h-10 rounded-full px-4 text-xs",
            lg: "h-16 rounded-full px-10 text-xl font-bold",
            icon: "h-12 w-12",
        }

        const variantStyles = variants[variant][colorScheme];
        const focusRing = colorScheme === 'orange' ? 'focus-visible:ring-orange-200' : 'focus-visible:ring-blue-200';

        return (
            <button
                className={cn(
                    "inline-flex items-center justify-center rounded-full font-bold transition-all duration-300 hover-bounce active:scale-95 focus-visible:outline-none focus-visible:ring-4 disabled:pointer-events-none disabled:opacity-50",
                    variantStyles,
                    focusRing,
                    sizes[size],
                    className
                )}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                {children}
            </button>
        )
    }
)
Button.displayName = "Button"

export { Button }
