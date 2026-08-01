// @vitest-environment jsdom
/**
 * Proves the `onElement` compound mechanism end-to-end in Preact: the real DOM element
 * reaches the hook once per mount, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on unmount. Uses a native `<dialog>`
 * element as the motivating case — showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { h, render } from 'preact'
import type { ComponentType } from 'preact'
import type { UnknownProps } from './types'
import { createContractComponent } from './create-contract-component'

function box(comp: { displayName?: string }): ComponentType<UnknownProps> {
  return comp as unknown as ComponentType<UnknownProps>
}

let container: HTMLElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  render(null, container)
  document.body.removeChild(container)
})

describe('onElement (event-handler wiring spike)', () => {
  it('receives the real element and can call native imperative methods on it', () => {
    let received: Element | undefined
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: (el) => {
        received = el
      },
    })

    render(h(box(Dialog), null), container)
    expect(received).toBeInstanceOf(HTMLDialogElement)
    expect(received).toBe(container.querySelector('dialog'))
  })

  it('getProps() reflects current props without re-registering the listener', () => {
    let listenerAttachCount = 0
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: (el, getProps) => {
        const handleClose = () => (getProps() as { onDialogClose?: () => void }).onDialogClose?.()
        el.addEventListener('close', handleClose)
        listenerAttachCount++
        return () => el.removeEventListener('close', handleClose)
      },
    })

    const firstOnClose = vi.fn()
    render(h(box(Dialog), { onDialogClose: firstOnClose }), container)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(firstOnClose).toHaveBeenCalledTimes(1)

    const onDialogClose = vi.fn()
    render(h(box(Dialog), { onDialogClose }), container)
    expect(listenerAttachCount).toBe(1)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(onDialogClose).toHaveBeenCalledTimes(1)
    expect(firstOnClose).toHaveBeenCalledTimes(1)
  })

  it('runs the returned cleanup on unmount', () => {
    const cleanup = vi.fn()
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: () => cleanup,
    })

    render(h(box(Dialog), null), container)
    expect(cleanup).not.toHaveBeenCalled()
    render(null, container)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    expect(() => render(h(box(Plain), null), container)).not.toThrow()
  })
})
