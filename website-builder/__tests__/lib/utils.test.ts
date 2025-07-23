import { cn } from '@/lib/utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2', 'class3')
      expect(result).toBe('class1 class2 class3')
    })

    it('should handle conditional classes', () => {
      const isActive = true
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class active-class')
    })

    it('should handle false conditional classes', () => {
      const isActive = false
      const result = cn('base-class', isActive && 'active-class')
      expect(result).toBe('base-class')
    })

    it('should handle object syntax', () => {
      const result = cn('base-class', {
        'active-class': true,
        'inactive-class': false,
      })
      expect(result).toBe('base-class active-class')
    })

    it('should handle array syntax', () => {
      const result = cn('base-class', ['class1', 'class2'])
      expect(result).toBe('base-class class1 class2')
    })

    it('should handle mixed input types', () => {
      const isActive = true
      const result = cn(
        'base-class',
        isActive && 'active-class',
        ['array-class1', 'array-class2'],
        { 'object-class': true, 'object-class-false': false }
      )
      expect(result).toBe('base-class active-class array-class1 array-class2 object-class')
    })

    it('should handle empty inputs', () => {
      const result = cn('', null, undefined, false)
      expect(result).toBe('')
    })

    it('should handle Tailwind class conflicts', () => {
      const result = cn('text-red-500', 'text-blue-500')
      expect(result).toBe('text-blue-500')
    })
  })
}) 