import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Class-variance-authority config for the Button component.
 *
 * cva generates a type-safe variant system: the base classes always apply,
 * and variant/size selections merge on top without conflicts.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
  {
    variants: {
      variant: {
        default: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm',
        destructive: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
        outline: 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-700',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        ghost: 'hover:bg-gray-100 text-gray-600',
        link: 'text-brand-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-5 py-2',
        sm: 'h-9 px-3 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When true, renders the button's children as the root element using Radix Slot.
   * Useful for wrapping an <a> tag or React Router <Link> with button styles.
   */
  asChild?: boolean
}

/**
 * Accessible button primitive with configurable variant and size.
 *
 * Uses React.forwardRef so parent components can attach a ref to the DOM button
 * element (e.g. for focus management or third-party animation libraries).
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    // Slot renders the child element directly, merging props -- used for asChild pattern
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = 'Button'

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
