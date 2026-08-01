// @vitest-environment jsdom
/**
 * Proves the `onElement` compound mechanism end-to-end in Svelte: the real DOM element
 * reaches the hook once per mount, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on unmount. Uses a native `<dialog>`
 * element as the motivating case — showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/svelte'
import Polymorphic from './Polymorphic.svelte'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

describe('onElement (event-handler wiring spike)', () => {
  it('receives the real element and can call native imperative methods on it', () => {
    let received: Element | undefined
    const bundle = createContractComponent({
      tag: 'dialog',
      name: 'Dialog',
      onElement: (el) => {
        received = el
      },
    })

    const { container } = render(Polymorphic, { bundle })
    expect(received).toBeInstanceOf(HTMLDialogElement)
    expect(received).toBe(container.querySelector('dialog'))
  })

  it('getProps() reflects current props without re-registering the listener', async () => {
    let listenerAttachCount = 0
    const bundle = createContractComponent({
      tag: 'dialog',
      name: 'Dialog',
      onElement: (el, getProps) => {
        const handleClose = () => (getProps() as { onDialogClose?: () => void }).onDialogClose?.()
        el.addEventListener('close', handleClose)
        listenerAttachCount++
        return () => el.removeEventListener('close', handleClose)
      },
    })

    const firstOnClose = vi.fn()
    const { container, rerender } = render(Polymorphic, {
      bundle,
      onDialogClose: firstOnClose,
    })
    const dialogEl = container.querySelector('dialog')!
    dialogEl.dispatchEvent(new Event('close'))
    expect(firstOnClose).toHaveBeenCalledTimes(1)

    const onDialogClose = vi.fn()
    await rerender({ bundle, onDialogClose })
    expect(listenerAttachCount).toBe(1)
    dialogEl.dispatchEvent(new Event('close'))
    expect(onDialogClose).toHaveBeenCalledTimes(1)
    expect(firstOnClose).toHaveBeenCalledTimes(1)
  })

  it('runs the returned cleanup on unmount', () => {
    const cleanupFn = vi.fn()
    const bundle = createContractComponent({
      tag: 'dialog',
      name: 'Dialog',
      onElement: () => cleanupFn,
    })

    const { unmount } = render(Polymorphic, { bundle })
    expect(cleanupFn).not.toHaveBeenCalled()
    unmount()
    expect(cleanupFn).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', () => {
    const bundle = createContractComponent({ tag: 'div', name: 'Plain' })
    expect(() => render(Polymorphic, { bundle })).not.toThrow()
  })
})
