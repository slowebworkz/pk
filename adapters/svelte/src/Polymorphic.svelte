<script module lang="ts">
  declare const process: { env: { NODE_ENV: string } }
</script>

<script lang="ts">
  import { enforceAllowedAs, isKnownAriaRole } from '@praxis-kit/core'
  import type { ElementType, IntrinsicProps } from '@praxis-kit/core'
  import { isObject, isString } from '@praxis-kit/primitive'
  import { applyFilter } from '@praxis-kit/adapter-utils'
  import type { Snippet } from 'svelte'
  import type {
    PolymorphicComponentProps,
    ResolvedAttributes,
    StyleObject,
    UnknownProps,
  } from './types'

  let {
    bundle,
    as: asProp,
    asChild,
    class: cls,
    recipe,
    children,
    ...rest
  }: PolymorphicComponentProps = $props()
  let hostEl: Element | undefined = $state()

  // Svelte 5 event delegation requires lowercase handler names (onclick, onfocus…).
  // Normalize React-style camelCase handlers so spreads on <svelte:element> work.
  const EVENT_RE = /^on[A-Z]/
  function normalizeEventKeys(props: UnknownProps): UnknownProps {
    const out: ResolvedAttributes = {}
    for (const k in props) {
      out[EVENT_RE.test(k) ? k.toLowerCase() : k] = (props as ResolvedAttributes)[k]
    }
    return out as UnknownProps
  }

  function serializeStyle(style: StyleObject): string {
    let result = ''
    for (const key in style) {
      const value = style[key]
      if (value == null) continue
      if (result) result += ';'
      result += `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}:${value}`
    }
    return result
  }

  function buildDomProps(
    props: UnknownProps,
    classStr: string | undefined,
    tag: ElementType,
  ): ResolvedAttributes {
    const { role, style, ...r } = normalizeEventKeys(props)
    const styleStr = isObject(style, true)
      ? serializeStyle(style as StyleObject)
      : (style as string | undefined)
    const ep: IntrinsicProps = {
      ...(r as IntrinsicProps),
      class: classStr,
      ...(styleStr !== undefined && { style: styleStr }),
    }
    if (isKnownAriaRole(role)) ep.role = role
    if (!isString(tag)) return ep as ResolvedAttributes
    return bundle.runtime.resolveAria(tag, ep).props as ResolvedAttributes
  }

  function buildSlotProps(props: UnknownProps, classStr: string | undefined): UnknownProps {
    const { role, ...r } = props
    return {
      ...r,
      class: classStr,
      ...(isKnownAriaRole(role) && { role }),
    }
  }

  const tag = $derived(bundle.runtime.resolveTag(asProp as ElementType | undefined))
  const mergedProps = $derived(bundle.runtime.resolveProps(rest as UnknownProps))
  const normalizedProps = $derived.by(() => {
    const { runtime: { options } } = bundle
    // Folded into this derived (rather than a standalone one) so it's guaranteed to run on
    // both SSR and DOM — $derived is lazy in Svelte 5 and only evaluates when read; this one
    // is read downstream by resolvedClass/filteredProps/domProps, which the template renders.
    if (options.allowedAs !== undefined) {
      enforceAllowedAs(
        tag,
        options.allowedAs,
        options.diagnostics,
        options.displayName,
      )
    }
    const base =
      typeof options.normalizeFn === 'function' ? options.normalizeFn(mergedProps) : mergedProps

    const htmlNormalizers = options.htmlPropNormalizersFn?.(tag)

    if (!htmlNormalizers?.length) {
      return base
    }

    return htmlNormalizers.reduce((acc, fn) => ({ ...acc, ...fn(acc) }), base)
  })
  const resolvedClass = $derived(
    bundle.runtime.resolveClasses(tag, normalizedProps, cls as string | undefined, recipe),
  )
  const filteredProps = $derived(
    applyFilter(normalizedProps, bundle.filterProps, bundle.runtime.options.variantKeys),
  )
  const domProps = $derived(buildDomProps(filteredProps, resolvedClass, tag))

  // Resolves whether to render as child slot; also enforces as+asChild mutual exclusion.
  const useAsChild = $derived.by(() => {
    if (!asChild) return false
    if (asProp !== undefined) {
      bundle.slotValidator.assertExclusive()
      return false
    }
    return true
  })

  // DOM-only (like Lit skipping htmlChildrenEvaluatorFn for its SSR renderToString). Merely
  // *registering* $effect during svelte/server's render() throws ("effect_orphan") — it's not
  // enough to no-op inside the callback, the rune call itself must never happen during SSR.
  // Reads real child nodes off the mounted host, same approach as Lit's Array.from(this.childNodes).
  // Not reachable in the asChild branch — no host element there.
  if (typeof document !== 'undefined') {
    $effect(() => {
      if (process.env.NODE_ENV === 'production' || !hostEl) return
      const childArray = Array.from(hostEl.childNodes)
      bundle.childrenEvaluator?.evaluate(childArray, { tag, props: normalizedProps })
      bundle.runtime.options.htmlChildrenEvaluatorFn
        ?.(tag)
        ?.evaluate(childArray, { tag, props: normalizedProps })
    })
  }
</script>

{#if useAsChild}
  {#if children}
    {@render (children as Snippet<[UnknownProps]>)(buildSlotProps(filteredProps, resolvedClass))}
  {/if}
{:else}
  <svelte:element this={tag as string} bind:this={hostEl} {...domProps}>
    {@render (children as Snippet | undefined)?.()}
  </svelte:element>
{/if}
