// @vitest-environment jsdom
/**
 * Proves the `onElement` compound mechanism end-to-end in Solid: the real DOM element
 * reaches the hook once per mount, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on unmount. Uses a native `<dialog>`
 * element as the motivating case — showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render as solidRender, cleanup } from '@solidjs/testing-library'
import { createSignal } from 'solid-js'
import { createContractComponent } from './create-contract-component'

afterEach(cleanup)

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

    const { container } = solidRender(() => <Dialog />)
    expect(received).toBeInstanceOf(HTMLDialogElement)
    expect(received).toBe(container.querySelector('dialog'))
  })

  it('getProps() reflects current props without re-registering the listener', () => {
    let listenerAttachCount = 0
    const Dialog = createContractComponent<'dialog', { onDialogClose?: () => void }>({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: (el, getProps) => {
        const handleClose = () => getProps().onDialogClose?.()
        el.addEventListener('close', handleClose)
        listenerAttachCount++
        return () => el.removeEventListener('close', handleClose)
      },
    })

    // A signal holding a function value is ambiguous in Solid (createSignal treats a function
    // argument as a lazy initializer, not a value to store as-is). Sidestep that entirely: the
    // JSX-passed prop is one stable closure that indirects through a reactive id, so calling it
    // always dispatches to whichever handler is currently selected — proving getProps() sees the
    // live prop value without onElement ever re-registering its listener.
    const firstOnClose = vi.fn()
    const secondOnClose = vi.fn()
    const handlers = [firstOnClose, secondOnClose]
    const [activeIndex, setActiveIndex] = createSignal(0)
    const onDialogClose = () => handlers[activeIndex()]!()

    const { container } = solidRender(() => <Dialog onDialogClose={onDialogClose} />)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(firstOnClose).toHaveBeenCalledTimes(1)
    expect(secondOnClose).not.toHaveBeenCalled()

    setActiveIndex(1)
    expect(listenerAttachCount).toBe(1)
    container.querySelector('dialog')!.dispatchEvent(new Event('close'))
    expect(secondOnClose).toHaveBeenCalledTimes(1)
    expect(firstOnClose).toHaveBeenCalledTimes(1)
  })

  it('runs the returned cleanup on unmount', () => {
    const cleanupFn = vi.fn()
    const Dialog = createContractComponent({
      tag: 'dialog' as const,
      name: 'Dialog',
      onElement: () => cleanupFn,
    })

    const { unmount } = solidRender(() => <Dialog />)
    expect(cleanupFn).not.toHaveBeenCalled()
    unmount()
    expect(cleanupFn).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', () => {
    const Plain = createContractComponent({ tag: 'div' as const, name: 'Plain' })
    expect(() => solidRender(() => <Plain />)).not.toThrow()
  })
})
