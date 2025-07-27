import React from 'react'
import clsx from 'clsx'
import { CardProps } from '../../types'

const Card: React.FC<CardProps> = ({
  children,
  className,
  hover = false,
  padding = 'md',
  ...props
}) => {
  const baseClasses = 'bg-white rounded-xl border border-gray-100'
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  const classes = clsx(
    baseClasses,
    paddingClasses[padding],
    {
      'shadow-soft': !hover,
      'shadow-soft hover:shadow-medium transition-shadow duration-200 cursor-pointer': hover,
    },
    className
  )
  
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}

export default Card