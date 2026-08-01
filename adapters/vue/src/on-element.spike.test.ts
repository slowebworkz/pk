/**
 * Proves the `onElement` compound mechanism end-to-end in Vue: the real DOM element
 * reaches the hook once per mount, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on unmount. Uses a native `<dialog>`
 * element as the motivating case — showModal()/close() and the dialog's own native
 * close/cancel events require the real node, not a props-based synthetic handler.
 */
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createContractComponent } from './create-contract-component'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function box(comp: unknown): any {
  return comp
}

describe('onElement (event-handler wiring spike)', () => {
  it('receives the real element and can call native imperative methods on it', () => {
    let received: Element | undefined
    const Dialog = createContractComponent({
      tag: 'dialog',
      name: 'Dialog',
      onElement: (el) => {
        received = el
      },
    })

    const wrapper = mount(box(Dialog))
    expect(received).toBeInstanceOf(HTMLDialogElement)
    expect(received).toBe(wrapper.element.querySelector('dialog') ?? wrapper.element)
  })

  it('getProps() reflects current props without re-registering the listener', async () => {
    let listenerAttachCount = 0
    const Dialog = createContractComponent({
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
    const wrapper = mount(box(Dialog), { props: { onDialogClose: firstOnClose } })
    const dialogEl = wrapper.element as HTMLDialogElement
    dialogEl.dispatchEvent(new Event('close'))
    expect(firstOnClose).toHaveBeenCalledTimes(1)

    const onDialogClose = vi.fn()
    await wrapper.setProps({ onDialogClose })
    expect(listenerAttachCount).toBe(1)
    dialogEl.dispatchEvent(new Event('close'))
    expect(onDialogClose).toHaveBeenCalledTimes(1)
    expect(firstOnClose).toHaveBeenCalledTimes(1)
  })

  it('runs the returned cleanup on unmount', () => {
    const cleanup = vi.fn()
    const Dialog = createContractComponent({
      tag: 'dialog',
      name: 'Dialog',
      onElement: () => cleanup,
    })

    const wrapper = mount(box(Dialog))
    expect(cleanup).not.toHaveBeenCalled()
    wrapper.unmount()
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', () => {
    const Plain = createContractComponent({ tag: 'div', name: 'Plain' })
    expect(() => mount(box(Plain))).not.toThrow()
  })
})
