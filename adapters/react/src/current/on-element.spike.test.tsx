// @vitest-environment jsdom
/**
 * Proves the `onElement` compound mechanism end-to-end in React: the real DOM element
 * reaches the hook once per mount, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on unmount. Uses a native `<dialog>`
 * element as the motivating case — showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi } from 'vitest'
import { createElement } from 'react'
import { box, useReactDom } from '../shared/test-utils'
import { createContractComponent } from './create-contract-component'

describe('onElement (event-handler wiring spike)', () => {
  const dom = useReactDom()

  it('receives the real element and can call native imperative methods on it', () => {
    let received: Element | undefined
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: (el) => {
        received = el
      },
    })

    dom.mount(createElement(box(Dialog)))
    expect(received).toBeInstanceOf(HTMLDialogElement)
    expect(received).toBe(dom.container.querySelector('dialog'))
  })

  it('getProps() reflects current props without re-registering the listener', () => {
    // Deliberately not named `onClose` — React 19 already wires that prop to the dialog's
    // native `close` event itself, which would double-fire alongside onElement's own listener
    // and muddy what's actually being tested here.
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
    dom.mount(createElement(box(Dialog), { onDialogClose: firstOnClose }))
    dom.container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(firstOnClose).toHaveBeenCalledTimes(1)

    // Re-render with a new handler — same element, so onElement must not re-fire.
    const onDialogClose = vi.fn()
    dom.mount(createElement(box(Dialog), { onDialogClose }))
    expect(listenerAttachCount).toBe(1)
    dom.container.querySelector('dialog')!.dispatchEvent(new Event('close'))
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

    dom.mount(createElement(box(Dialog)))
    expect(cleanup).not.toHaveBeenCalled()
    dom.mount(createElement('div'))
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    expect(() => dom.mount(createElement(box(Plain)))).not.toThrow()
  })
})
