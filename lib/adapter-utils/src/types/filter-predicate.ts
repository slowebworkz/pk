/**
 * Determines whether a prop should be stripped before forwarding to the
 * rendered element.
 *
 * Returning `true` excludes the prop from the output; returning `false`
 * keeps it. This is the inverse polarity of `shouldForwardProp`-style
 * predicates (Emotion/styled-components), where `true` means include.
 *
 * @param key - The prop name being evaluated.
 * @param variantKeys - The set of configured variant prop names.
 * @returns `true` to strip the prop; `false` to forward it.
 */
export type FilterPredicate = (key: string, variantKeys: ReadonlySet<string>) => boolean
