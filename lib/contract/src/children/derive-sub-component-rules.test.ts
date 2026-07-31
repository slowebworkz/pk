// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { deriveSubComponentRules } from './derive-sub-component-rules'

describe('deriveSubComponentRules', () => {
  it('matches vnode-style children by child.type identity and sets `type` for the O(1) dispatch index', () => {
    const Header = () => null
    const [rule] = deriveSubComponentRules({ Header })

    expect(rule!.name).toBe('Header')
    expect(rule!.type).toBe(Header)
    expect(rule!.match({ type: Header })).toBe(true)
    expect(rule!.match({ type: () => null })).toBe(false)
    expect(rule!.match('text')).toBe(false)
  })

  it('matches custom-element children by instanceof and omits `type` so they reach the linear match() path', () => {
    class Header extends HTMLElement {}
    class Other extends HTMLElement {}
    customElements.define('spike-header', Header)
    customElements.define('spike-other', Other)

    const [rule] = deriveSubComponentRules({ Header })

    expect(rule!.name).toBe('Header')
    expect(rule!.type).toBeUndefined()
    expect(rule!.match(new Header())).toBe(true)
    expect(rule!.match(new Other())).toBe(false)
    expect(rule!.match(document.createElement('div'))).toBe(false)
    expect(rule!.match('text')).toBe(false)
  })
})
