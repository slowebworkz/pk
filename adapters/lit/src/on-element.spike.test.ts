/**
 * Proves the `onElement` compound mechanism end-to-end in Lit: the real DOM element
 * reaches the hook once per connect, getProps() reflects current props without
 * re-registering, and the returned cleanup fires on disconnect. Lit's generated class
 * always registers under a consumer-chosen hyphenated custom-element name (never
 * literally `dialog`), so this uses a plain custom tag rather than native `<dialog>`
 * semantics — the mechanism itself is what's under test here, not showModal()/close().
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createContractComponent } from './create-contract-component'

type LitEl = HTMLElement & { updateComplete: Promise<boolean> }

function define(name: string, ctor: CustomElementConstructor) {
  if (!customElements.get(name)) customElements.define(name, ctor)
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('onElement (event-handler wiring spike)', () => {
  it('receives the real element and it is the custom element instance itself', async () => {
    let received: Element | undefined
    const Widget = createContractComponent({
      tag: 'div',
      name: 'Widget',
      onElement: (el) => {
        received = el
      },
    })
    define('spike-on-element-widget', Widget)

    const el = document.createElement('spike-on-element-widget')
    document.body.appendChild(el)
    await (el as unknown as LitEl).updateComplete

    expect(received).toBe(el)
  })

  it('getProps() reflects current props without re-registering the listener', async () => {
    // getProps() is backed by _buildProps(), which (like Web) reads attributes plus declared
    // reactive properties — never arbitrary function-valued instance properties, since Lit's own
    // prop-collection loop can't distinguish those from unrelated properties a consumer might
    // set. A string attribute is the shape of "current prop" Lit's getProps() actually supports.
    let listenerAttachCount = 0
    const seen: (string | undefined)[] = []
    const Widget = createContractComponent({
      tag: 'div',
      name: 'WidgetProps',
      onElement: (el, getProps) => {
        const handleClose = () => seen.push((getProps() as { label?: string }).label)
        el.addEventListener('close', handleClose)
        listenerAttachCount++
        return () => el.removeEventListener('close', handleClose)
      },
    })
    define('spike-on-element-widget-props', Widget)

    const el = document.createElement('spike-on-element-widget-props')
    el.setAttribute('label', 'first')
    document.body.appendChild(el)
    await (el as unknown as LitEl).updateComplete

    el.dispatchEvent(new Event('close'))
    expect(seen).toEqual(['first'])

    el.setAttribute('label', 'second')
    await (el as unknown as LitEl).updateComplete
    expect(listenerAttachCount).toBe(1)
    el.dispatchEvent(new Event('close'))
    expect(seen).toEqual(['first', 'second'])
  })

  it('runs the returned cleanup on disconnect', async () => {
    const cleanup = vi.fn()
    const Widget = createContractComponent({
      tag: 'div',
      name: 'WidgetCleanup',
      onElement: () => cleanup,
    })
    define('spike-on-element-widget-cleanup', Widget)

    const el = document.createElement('spike-on-element-widget-cleanup')
    document.body.appendChild(el)
    await (el as unknown as LitEl).updateComplete
    expect(cleanup).not.toHaveBeenCalled()

    document.body.removeChild(el)
    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('a plain component with no onElement option is unaffected', async () => {
    const Plain = createContractComponent({ tag: 'div', name: 'PlainOnElement' })
    define('spike-on-element-plain', Plain)

    const el = document.createElement('spike-on-element-plain')
    expect(() => document.body.appendChild(el)).not.toThrow()
    await (el as unknown as LitEl).updateComplete
  })
})
