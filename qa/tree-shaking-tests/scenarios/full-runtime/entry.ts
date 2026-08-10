/**
 * Claim: a component with styling variants and full enforcement retains all
 * feature modules — primitive, styling, and full contract runtime.
 * Comparing this bundle against minimal-polymorphic shows the full cost of
 * the styling + enforcement subsystems.
 */
import { isValidElement } from 'react'
import type { ReactElement } from 'react'
import { warnDiagnostics } from '@praxis-kit/diagnostics'
import { createContractComponent } from '@praxis-kit/react'
import type { AriaRule } from '@praxis-kit/core/contract'
import type { StringMap } from '@praxis-kit/primitive'

const requireLabel: AriaRule = ({ props }) =>
  'aria-label' in props || 'aria-labelledby' in props
    ? [{ valid: true }]
    : [{ valid: false, severity: 'warning', fixable: false, message: 'Missing accessible label' }]

const variants = {
  intent: {
    primary: 'bg-blue-600 text-white',
    secondary: 'bg-gray-100 text-gray-800',
  },
  size: {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  },
} as const

const Item = createContractComponent({ tag: 'li', name: 'Item' })

export const Button = createContractComponent<'button', StringMap<never>, typeof variants>({
  tag: 'button',
  name: 'Button',
  styling: {
    base: 'inline-flex items-center justify-center rounded font-medium',
    variants,
    defaults: { intent: 'primary', size: 'md' },
  },
  enforcement: {
    diagnostics: warnDiagnostics,
    aria: [requireLabel],
    children: [
      {
        name: 'Item',
        match: (child: unknown): child is ReactElement =>
          isValidElement(child) && child.type === (Item as unknown),
        cardinality: { min: 1, max: 10 },
      },
    ],
  },
})
