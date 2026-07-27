import { describe, expect, it, vi } from 'vitest'

import type { AriaContext, EnforcementOptions } from '../types'
import { ChildrenEvaluator, diagnoseChildren } from '../children'
import { throwDiagnostics } from '@praxis-kit/diagnostics'
import { getHtmlChildrenEvaluator } from './evaluators'
import {
  anchorContract,
  audioContract,
  buttonContract,
  colgroupContract,
  datalistContract,
  detailsContract,
  dlContract,
  fieldsetContract,
  figureContract,
  gridContract,
  headContract,
  htmlContract,
  htmlContracts,
  labelContract,
  landmarkContract,
  listboxContract,
  listContract,
  menubarContract,
  menuContract,
  objectContract,
  optgroupContract,
  pContract,
  pictureContract,
  radiogroupContract,
  selectContract,
  tableBodyContract,
  tableContract,
  tableRowContract,
  tablistContract,
  treeContract,
  videoContract,
  voidContract,
  widgetContracts,
} from './contracts'
import { landmarkAccessibleNameRule } from './aria-rules'
import { iterate, COMPONENT_DEFAULT_TAG } from '@praxis-kit/primitive'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function el(tag: string) {
  return { type: tag }
}

function elWithProps(tag: string, props: Record<string, unknown>) {
  return { type: tag, props }
}

function componentEl() {
  return { type: () => null }
}

// A praxis-kit-wrapped component resolving to a given semantic tag, e.g. the
// `Figure.Caption` sub-component resolving to `figcaption`.
function taggedComponentEl(defaultTag: string) {
  function Component() {}
  Object.assign(Component, { [COMPONENT_DEFAULT_TAG]: defaultTag })
  return { type: Component, props: {} }
}

function check(
  contract: EnforcementOptions,
  children: unknown[],
  props: Record<string, unknown> = {},
) {
  return diagnoseChildren(
    contract.children!,
    children,
    'Component',
    {
      exclusiveChildren: contract.exclusiveChildren,
      allowText: contract.allowText,
    },
    { tag: 'Component', props },
  )
}

// ─── listContract ─────────────────────────────────────────────────────────────

describe('listContract', () => {
  it('accepts li', () => {
    expect(check(listContract, [el('li')])).toEqual([])
  })

  it('accepts script and template', () => {
    expect(check(listContract, [el('li'), el('script'), el('template')])).toEqual([])
  })

  it('rejects div', () => {
    expect(check(listContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── tableContract ────────────────────────────────────────────────────────────

describe('tableContract', () => {
  it('accepts all valid direct children', () => {
    expect(
      check(tableContract, [
        el('caption'),
        el('colgroup'),
        el('thead'),
        el('tbody'),
        el('tfoot'),
        el('tr'),
        el('script'),
      ]),
    ).toEqual([])
  })

  it('rejects div', () => {
    expect(check(tableContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })

  it('enforces caption must be first', () => {
    const v = check(tableContract, [el('tbody'), el('caption')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'caption' })]),
    )
  })

  it('allows caption when it is the only child', () => {
    expect(check(tableContract, [el('caption')])).toEqual([])
  })

  it('rejects two thead elements', () => {
    const v = check(tableContract, [el('thead'), el('thead')])
    expect(v).toMatchObject([{ kind: 'cardinality-max', ruleName: 'thead' }])
  })

  it('rejects two tfoot elements', () => {
    const v = check(tableContract, [el('tfoot'), el('tfoot')])
    expect(v).toMatchObject([{ kind: 'cardinality-max', ruleName: 'tfoot' }])
  })
})

// ─── tableBodyContract ────────────────────────────────────────────────────────

describe('tableBodyContract', () => {
  it('accepts tr and metadata', () => {
    expect(check(tableBodyContract, [el('tr'), el('script'), el('template')])).toEqual([])
  })

  it('rejects td', () => {
    expect(check(tableBodyContract, [el('td')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── tableRowContract ─────────────────────────────────────────────────────────

describe('tableRowContract', () => {
  it('accepts td, th, and metadata', () => {
    expect(check(tableRowContract, [el('td'), el('th'), el('script'), el('template')])).toEqual([])
  })

  it('rejects tr', () => {
    expect(check(tableRowContract, [el('tr')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── colgroupContract ─────────────────────────────────────────────────────────

describe('colgroupContract', () => {
  it('accepts col and template', () => {
    expect(check(colgroupContract, [el('col'), el('template')])).toEqual([])
  })

  it('rejects script (not in colgroup content model)', () => {
    expect(check(colgroupContract, [el('script')])).toMatchObject([{ kind: 'unexpected' }])
  })

  it('rejects div', () => {
    expect(check(colgroupContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── dlContract ───────────────────────────────────────────────────────────────

describe('dlContract', () => {
  it('accepts dt, dd, div, and metadata', () => {
    expect(
      check(dlContract, [el('dt'), el('dd'), el('div'), el('script'), el('template')]),
    ).toEqual([])
  })

  it('rejects li', () => {
    expect(check(dlContract, [el('li')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── selectContract ───────────────────────────────────────────────────────────

describe('selectContract', () => {
  it('accepts option, optgroup, hr, and metadata', () => {
    expect(
      check(selectContract, [el('option'), el('optgroup'), el('hr'), el('script'), el('template')]),
    ).toEqual([])
  })

  it('rejects div', () => {
    expect(check(selectContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── optgroupContract ─────────────────────────────────────────────────────────

describe('optgroupContract', () => {
  it('accepts option, script, and template', () => {
    expect(check(optgroupContract, [el('option'), el('script'), el('template')])).toEqual([])
  })

  it('rejects nested optgroup', () => {
    expect(check(optgroupContract, [el('optgroup')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── datalistContract ─────────────────────────────────────────────────────────

describe('datalistContract', () => {
  it('accepts option and metadata', () => {
    expect(check(datalistContract, [el('option'), el('script'), el('template')])).toEqual([])
  })

  it('rejects div', () => {
    expect(check(datalistContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── pictureContract ──────────────────────────────────────────────────────────

describe('pictureContract', () => {
  it('accepts source elements before img', () => {
    expect(check(pictureContract, [el('source'), el('img')])).toEqual([])
  })

  it('accepts metadata before img', () => {
    expect(check(pictureContract, [el('script'), el('img')])).toEqual([])
  })

  it('accepts img as the only child', () => {
    expect(check(pictureContract, [el('img')])).toEqual([])
  })

  it('requires exactly one img', () => {
    const v = check(pictureContract, [el('source')])
    expect(v).toMatchObject([{ kind: 'cardinality-min', ruleName: 'image' }])
  })

  it('rejects two img elements', () => {
    const v = check(pictureContract, [el('img'), el('img')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'image' }),
      ]),
    )
  })

  it('rejects img that is not last', () => {
    const v = check(pictureContract, [el('img'), el('source')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'image' })]),
    )
  })
})

// ─── figureContract ───────────────────────────────────────────────────────────

describe('figureContract', () => {
  it('accepts figcaption first followed by flow content', () => {
    expect(check(figureContract, [el('figcaption'), el('img')])).toEqual([])
  })

  it('accepts figcaption last', () => {
    expect(check(figureContract, [el('img'), el('figcaption')])).toEqual([])
  })

  it('accepts flow content with no figcaption', () => {
    expect(check(figureContract, [el('img'), el('p')])).toEqual([])
  })

  it('accepts a component element as content', () => {
    expect(check(figureContract, [componentEl()])).toEqual([])
  })

  it('rejects more than one figcaption', () => {
    const v = check(figureContract, [el('figcaption'), el('figcaption')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'caption' }),
      ]),
    )
  })

  // Regression: isOpenContent previously matched any component child regardless of
  // its resolved tag, so a Figure.Caption-style wrapper matched both the 'caption'
  // and 'content' rules simultaneously, producing a spurious ambiguous-child result.
  describe('regressions', () => {
    it('resolves a component wrapping figcaption as the caption only, not ambiguous content', () => {
      expect(check(figureContract, [taggedComponentEl('figcaption'), el('img')])).toEqual([])
    })
  })
})

// ─── detailsContract ──────────────────────────────────────────────────────────

describe('detailsContract', () => {
  it('accepts summary first followed by flow content', () => {
    expect(check(detailsContract, [el('summary'), el('p')])).toEqual([])
  })

  it('accepts flow content with no summary', () => {
    expect(check(detailsContract, [el('p')])).toEqual([])
  })

  it('rejects summary that is not first', () => {
    const v = check(detailsContract, [el('p'), el('summary')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'summary' })]),
    )
  })

  it('rejects more than one summary', () => {
    const v = check(detailsContract, [el('summary'), el('summary')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'summary' }),
      ]),
    )
  })
})

// ─── fieldsetContract ─────────────────────────────────────────────────────────

describe('fieldsetContract', () => {
  it('accepts legend first followed by form controls', () => {
    expect(check(fieldsetContract, [el('legend'), el('input')])).toEqual([])
  })

  it('accepts form controls with no legend', () => {
    expect(check(fieldsetContract, [el('input')])).toEqual([])
  })

  it('rejects legend that is not first', () => {
    const v = check(fieldsetContract, [el('input'), el('legend')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'legend' })]),
    )
  })

  it('rejects more than one legend', () => {
    const v = check(fieldsetContract, [el('legend'), el('legend')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'legend' }),
      ]),
    )
  })
})

// ─── objectContract ───────────────────────────────────────────────────────────

describe('objectContract', () => {
  it('accepts params followed by flow content', () => {
    expect(check(objectContract, [el('param'), el('param'), el('img')])).toEqual([])
  })

  it('accepts flow content with no params', () => {
    expect(check(objectContract, [el('img')])).toEqual([])
  })

  it('accepts a component element as content', () => {
    expect(check(objectContract, [componentEl()])).toEqual([])
  })
})

// ─── buttonContract / anchorContract ──────────────────────────────────────────

describe('buttonContract', () => {
  it('accepts non-interactive content', () => {
    expect(check(buttonContract, [el('span'), el('img')])).toEqual([])
  })

  it('accepts a component element as content', () => {
    expect(check(buttonContract, [componentEl()])).toEqual([])
  })

  it.each(['a', 'button', 'input', 'select', 'textarea', 'label'])(
    'rejects nested interactive content: %s',
    (tag) => {
      expect(check(buttonContract, [el(tag)])).toMatchObject([{ kind: 'unexpected' }])
    },
  )
})

describe('anchorContract', () => {
  it('accepts non-interactive content', () => {
    expect(check(anchorContract, [el('span'), el('img')])).toEqual([])
  })

  it.each(['a', 'button', 'input', 'select', 'textarea', 'label'])(
    'rejects nested interactive content: %s',
    (tag) => {
      expect(check(anchorContract, [el(tag)])).toMatchObject([{ kind: 'unexpected' }])
    },
  )
})

// ─── labelContract ────────────────────────────────────────────────────────────

describe('labelContract', () => {
  it('accepts a single labelable control alongside text', () => {
    expect(check(labelContract, ['Email', el('input')])).toEqual([])
  })

  it('accepts no control at all', () => {
    expect(check(labelContract, [el('span')], { 'aria-label': 'Email' })).toEqual([])
  })

  it.each(['button', 'input', 'meter', 'output', 'progress', 'select', 'textarea'])(
    'accepts %s as the labelable control',
    (tag) => {
      expect(check(labelContract, [el(tag)], { 'aria-label': 'Email' })).toEqual([])
    },
  )

  it('rejects more than one labelable control', () => {
    const v = check(labelContract, [el('input'), el('select')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'control' }),
      ]),
    )
  })

  it('does not count input[type="hidden"] as a labelable control', () => {
    expect(
      check(labelContract, [elWithProps('input', { type: 'hidden' })], { 'aria-label': 'Email' }),
    ).toEqual([])
  })

  it('still counts a visible input alongside a hidden one as more than one control', () => {
    const v = check(
      labelContract,
      [elWithProps('input', { type: 'hidden' }), elWithProps('input', { type: 'text' })],
      { 'aria-label': 'Email' },
    )
    expect(v).toEqual([])
  })

  it('rejects two labelable controls even when one is hidden and one is not', () => {
    const v = check(labelContract, [
      elWithProps('input', { type: 'text' }),
      el('select'),
      elWithProps('input', { type: 'hidden' }),
    ])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'control' }),
      ]),
    )
  })

  it('rejects a nested label', () => {
    const v = check(labelContract, [el('label')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'nested-label' }),
      ]),
    )
  })

  it('rejects a nested label alongside a valid control', () => {
    const v = check(labelContract, [el('input'), el('label')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'nested-label' }),
      ]),
    )
  })

  it.each(['a', 'details', 'embed', 'iframe'])('rejects other interactive content: %s', (tag) => {
    const v = check(labelContract, [el(tag)])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'other-interactive-content' }),
      ]),
    )
  })

  it('rejects other interactive content alongside a valid control', () => {
    const v = check(labelContract, [el('input'), el('a')], { 'aria-label': 'Email' })
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'other-interactive-content' }),
      ]),
    )
  })

  describe('accessible name', () => {
    it('rejects a fully empty label', () => {
      const v = check(labelContract, [])
      expect(v).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'cardinality-min', ruleName: 'accessible-name' }),
        ]),
      )
    })

    it('rejects a label with only a control and no visible text or aria-label', () => {
      const v = check(labelContract, [el('input')])
      expect(v).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'cardinality-min', ruleName: 'accessible-name' }),
        ]),
      )
    })

    it('rejects whitespace-only text as an accessible name', () => {
      const v = check(labelContract, ['  \n  '])
      expect(v).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'cardinality-min', ruleName: 'accessible-name' }),
        ]),
      )
    })

    it('accepts visible text as the accessible name, with no aria-label needed', () => {
      expect(check(labelContract, ['Email', el('input')])).toEqual([])
    })

    it('accepts a numeric text child as the accessible name', () => {
      expect(check(labelContract, [0, el('input')])).toEqual([])
    })

    it('accepts aria-label with no visible text', () => {
      expect(check(labelContract, [el('input')], { 'aria-label': 'Email' })).toEqual([])
    })

    it('accepts aria-labelledby with no visible text', () => {
      expect(check(labelContract, [el('input')], { 'aria-labelledby': 'email-heading' })).toEqual(
        [],
      )
    })
  })
})

// ─── pContract ─────────────────────────────────────────────────────────────────

describe('pContract', () => {
  it('accepts phrasing content', () => {
    expect(check(pContract, [el('span'), el('a'), el('img')])).toEqual([])
  })

  it('accepts a component element as content', () => {
    expect(check(pContract, [componentEl()])).toEqual([])
  })

  it.each(['div', 'ul', 'ol', 'table', 'blockquote', 'section', 'h1', 'p', 'hr', 'form'])(
    'rejects block-level content: %s',
    (tag) => {
      expect(check(pContract, [el(tag)])).toMatchObject([{ kind: 'unexpected' }])
    },
  )
})

// ─── mediaContract (audio/video) ──────────────────────────────────────────────

describe('audioContract / videoContract', () => {
  it('accepts source, track, metadata, and fallback content in any combination', () => {
    expect(check(audioContract, [el('source'), el('track'), el('script'), el('div')])).toEqual([])
  })

  it('accepts a component element as fallback content', () => {
    expect(check(audioContract, [componentEl()])).toEqual([])
  })

  it('source does not also match the content rule (no ambiguity)', () => {
    expect(check(audioContract, [el('source')])).toEqual([])
  })

  it('audioContract and videoContract are the same object', () => {
    expect(audioContract).toBe(videoContract)
  })

  // Regression: isOpenContent previously matched any component child regardless of
  // its resolved tag, so an Audio.Source/Video.Source-style wrapper matched both the
  // 'source' and 'content' rules simultaneously, producing a spurious ambiguous-child result.
  describe('regressions', () => {
    it('resolves a component wrapping source as the source only, not ambiguous content', () => {
      expect(check(audioContract, [taggedComponentEl('source')])).toEqual([])
    })

    it('resolves a component wrapping track as the track only, not ambiguous content', () => {
      expect(check(audioContract, [taggedComponentEl('track')])).toEqual([])
    })
  })
})

// ─── headContract ─────────────────────────────────────────────────────────────

describe('headContract', () => {
  it('accepts all metadata content elements', () => {
    const tags = ['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']
    expect(check(headContract, tags.map(el))).toEqual([])
  })

  it('rejects div', () => {
    expect(check(headContract, [el('div')])).toMatchObject([{ kind: 'unexpected' }])
  })
})

// ─── htmlContract ─────────────────────────────────────────────────────────────

describe('htmlContract', () => {
  it('accepts exactly one head followed by one body', () => {
    expect(check(htmlContract, [el('head'), el('body')])).toEqual([])
  })

  it('requires head', () => {
    const v = check(htmlContract, [el('body')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-min', ruleName: 'head' }),
      ]),
    )
  })

  it('requires body', () => {
    const v = check(htmlContract, [el('head')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-min', ruleName: 'body' }),
      ]),
    )
  })

  it('enforces head must be first', () => {
    const v = check(htmlContract, [el('body'), el('head')])
    expect(v).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'position', ruleName: 'head' })]),
    )
  })

  it('rejects two head elements', () => {
    const v = check(htmlContract, [el('head'), el('head'), el('body')])
    expect(v).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'cardinality-max', ruleName: 'head' }),
      ]),
    )
  })
})

// ─── voidContract ─────────────────────────────────────────────────────────────

describe('voidContract', () => {
  it('has no child rules', () => {
    expect(voidContract.children).toEqual([])
  })

  it('closes the set and disallows text', () => {
    expect(voidContract.exclusiveChildren).toBe(true)
    expect(voidContract.allowText).toBe(false)
  })

  it('rejects any child via ChildrenEvaluator', () => {
    // diagnoseChildren short-circuits when rules is empty; ChildrenEvaluator enforces correctly.
    const ev = new ChildrenEvaluator(voidContract.children!, throwDiagnostics, 'VoidElement', {
      exclusiveChildren: voidContract.exclusiveChildren,
      allowText: voidContract.allowText,
    })
    expect(() => ev.evaluate([el('span')])).toThrow()
    expect(() => ev.evaluate(['stray text'])).toThrow()
  })
})

// ─── getHtmlChildrenEvaluator — regression: void tags must be live-enforced ───

describe('getHtmlChildrenEvaluator', () => {
  // getHtmlChildrenEvaluator wires htmlDiagnostics = warnDiagnostics (contracts default to
  // warn, not throw — see the htmlContracts doc comment), so violations report via
  // console.warn rather than throwing; assert on the report, not on evaluate() throwing.
  it('returns a defined evaluator for a void tag and rejects a child through it', () => {
    // Previously, buildEvaluatorMap() gated construction on children?.length, so an
    // empty-rule contract like voidContract never actually built a live evaluator here
    // — void-element rejection was only exercised by directly constructing
    // ChildrenEvaluator in a unit test, never through this real runtime lookup path.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ev = getHtmlChildrenEvaluator('img')
    expect(ev).toBeDefined()
    ev!.evaluate([el('span')])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('returns a defined evaluator for a text-only tag and allows text but rejects elements', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const ev = getHtmlChildrenEvaluator('title')
    expect(ev).toBeDefined()
    ev!.evaluate(['hello'])
    expect(warn).not.toHaveBeenCalled()
    ev!.evaluate([el('span')])
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

// ─── landmarkContract ─────────────────────────────────────────────────────────

describe('landmarkContract', () => {
  const rule = landmarkContract.aria![0]!

  function ctx(
    tag: string,
    props: Record<string, unknown>,
    implicitRole: string | undefined,
  ): AriaContext {
    return { tag, props, implicitRole, effectiveRole: implicitRole } as unknown as AriaContext
  }

  it('returns no results for a non-landmark tag', () => {
    expect(rule(ctx('div', { role: 'banner' }, undefined))).toEqual([])
  })

  it('returns no results when no role prop is set', () => {
    expect(rule(ctx('nav', {}, 'navigation'))).toEqual([])
  })

  it('returns no results when role matches the implicit role', () => {
    // Redundant-role case is handled by the built-in engine, not this rule.
    expect(rule(ctx('nav', { role: 'navigation' }, 'navigation'))).toEqual([])
  })

  it('returns an error when role overrides the landmark role', () => {
    const results = rule(ctx('nav', { role: 'presentation' }, 'navigation'))
    expect(results).toMatchObject([{ valid: false, severity: 'error', fixable: true }])
  })

  it('error message names the tag and both roles', () => {
    const [result] = rule(ctx('nav', { role: 'presentation' }, 'navigation'))
    expect(result!.valid).toBe(false)
    if (!result!.valid) {
      expect(result!.diagnostic?.message).toMatch(/nav/)
      expect(result!.diagnostic?.message).toMatch(/navigation/)
      expect(result!.diagnostic?.message).toMatch(/presentation/)
    }
  })

  it('fix removes role without affecting other props', () => {
    const props = { role: 'presentation', 'aria-label': 'primary nav' }
    const results = rule(ctx('nav', props, 'navigation'))
    const result = results[0]!
    if (!result.valid && result.fixable) {
      const fixed = result.fix.apply(ctx('nav', props, 'navigation'))
      expect(fixed.applied).toBe(true)
      expect(fixed.next).not.toHaveProperty('role')
      expect(fixed.next).toHaveProperty('aria-label', 'primary nav')
    }
  })
})

// ─── htmlContracts map ────────────────────────────────────────────────────────

describe('htmlContracts', () => {
  it('maps list elements to listContract', () => {
    iterate.forEach(['ul', 'ol', 'menu'], (tag) => {
      expect(htmlContracts[tag]).toBe(listContract)
    })
  })

  it('maps table section elements to tableBodyContract', () => {
    iterate.forEach(['thead', 'tbody', 'tfoot'], (tag) => {
      expect(htmlContracts[tag]).toBe(tableBodyContract)
    })
  })

  it('maps void elements to voidContract', () => {
    iterate.forEach(
      ['area', 'br', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track'],
      (tag) => {
        expect(htmlContracts[tag]).toBe(voidContract)
      },
    )
  })

  it('maps landmark elements to landmarkContract', () => {
    iterate.forEach(['article', 'aside', 'footer', 'header', 'main', 'nav'], (tag) => {
      expect(htmlContracts[tag]).toBe(landmarkContract)
    })
  })

  it('maps audio and video to the same media contract', () => {
    expect(htmlContracts['audio']).toBe(htmlContracts['video'])
  })

  it('contains structural contracts by tag', () => {
    expect(htmlContracts['table']).toBe(tableContract)
    expect(htmlContracts['tr']).toBe(tableRowContract)
    expect(htmlContracts['colgroup']).toBe(colgroupContract)
    expect(htmlContracts['picture']).toBe(pictureContract)
    expect(htmlContracts['dl']).toBe(dlContract)
    expect(htmlContracts['select']).toBe(selectContract)
    expect(htmlContracts['optgroup']).toBe(optgroupContract)
    expect(htmlContracts['datalist']).toBe(datalistContract)
    expect(htmlContracts['figure']).toBe(figureContract)
    expect(htmlContracts['details']).toBe(detailsContract)
    expect(htmlContracts['fieldset']).toBe(fieldsetContract)
    expect(htmlContracts['object']).toBe(objectContract)
    expect(htmlContracts['button']).toBe(buttonContract)
    expect(htmlContracts['a']).toBe(anchorContract)
    expect(htmlContracts['label']).toBe(labelContract)
    expect(htmlContracts['p']).toBe(pContract)
    expect(htmlContracts['head']).toBe(headContract)
    expect(htmlContracts['html']).toBe(htmlContract)
  })
})

// ─── landmarkAccessibleNameRule ─────────────────────────────────────────────────────

describe('landmarkAccessibleNameRule', () => {
  function ctx(
    tag: string,
    props: Record<string, unknown>,
    implicitRole: string | undefined,
  ): AriaContext {
    return { tag, props, implicitRole, effectiveRole: implicitRole } as unknown as AriaContext
  }

  it('warns on <nav> without accessible name', () => {
    const results = landmarkAccessibleNameRule(ctx('nav', {}, 'navigation'))
    expect(results).toMatchObject([{ valid: false, severity: 'warning' }])
  })

  it('warns on <aside> without accessible name', () => {
    const results = landmarkAccessibleNameRule(ctx('aside', {}, 'complementary'))
    expect(results).toMatchObject([{ valid: false, severity: 'warning' }])
  })

  it('returns empty when nav has aria-label', () => {
    expect(landmarkAccessibleNameRule(ctx('nav', { 'aria-label': 'Main' }, 'navigation'))).toEqual(
      [],
    )
  })

  it('returns empty when aside has aria-labelledby', () => {
    expect(
      landmarkAccessibleNameRule(ctx('aside', { 'aria-labelledby': 'id-x' }, 'complementary')),
    ).toEqual([])
  })

  it('does not fire for <main> (single instance per page)', () => {
    expect(landmarkAccessibleNameRule(ctx('main', {}, 'main'))).toEqual([])
  })

  it('does not fire for <header> without a name', () => {
    expect(landmarkAccessibleNameRule(ctx('header', {}, 'banner'))).toEqual([])
  })

  it('does not fire for <footer> without a name', () => {
    expect(landmarkAccessibleNameRule(ctx('footer', {}, 'contentinfo'))).toEqual([])
  })

  it('does not fire when implicitRole is undefined', () => {
    // nav without an implicit role (e.g. engine short-circuit scenario)
    expect(landmarkAccessibleNameRule(ctx('nav', {}, undefined))).toEqual([])
  })

  it('landmarkContract exposes landmarkAccessibleNameRule as second aria rule', () => {
    expect(landmarkContract.aria![1]).toBe(landmarkAccessibleNameRule)
  })
})

// ─── Widget contracts ─────────────────────────────────────────────────────────

describe('widget contracts', () => {
  function ctx(tag: string, props: Record<string, unknown>): AriaContext {
    return {
      tag,
      props,
      implicitRole: undefined,
      effectiveRole: undefined,
    } as unknown as AriaContext
  }

  it.each([
    ['menuContract', menuContract],
    ['menubarContract', menubarContract],
    ['treeContract', treeContract],
    ['gridContract', gridContract],
    ['listboxContract', listboxContract],
    ['tablistContract', tablistContract],
    ['radiogroupContract', radiogroupContract],
  ] as const)('%s has a single aria rule (requireAccessibleName)', (_name, contract) => {
    expect(contract.aria).toHaveLength(1)
  })

  it.each([
    ['menu', menuContract],
    ['menubar', menubarContract],
    ['tree', treeContract],
    ['grid', gridContract],
    ['listbox', listboxContract],
    ['tablist', tablistContract],
    ['radiogroup', radiogroupContract],
  ])('widgetContracts[%s] is the correct contract', (role, expected) => {
    expect(widgetContracts[role]).toBe(expected)
  })

  it('requireAccessibleName fires via menuContract when aria-label is absent', () => {
    const rule = menuContract.aria![0]!
    const results = rule(ctx('ul', {}))
    expect(results).toMatchObject([{ valid: false, severity: 'warning' }])
  })

  it('requireAccessibleName passes via menuContract when aria-label is present', () => {
    const rule = menuContract.aria![0]!
    const results = rule(ctx('ul', { 'aria-label': 'File' }))
    expect(results).toEqual([])
  })

  it('widgetContracts contains exactly the expected roles', () => {
    expect(Object.keys(widgetContracts).sort()).toEqual(
      ['grid', 'listbox', 'menu', 'menubar', 'radiogroup', 'tablist', 'tree'].sort(),
    )
  })
})
