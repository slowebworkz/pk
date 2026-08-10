import { RuleCreator } from '@typescript-eslint/utils/eslint-utils'
import type { TSESTree } from '@typescript-eslint/utils'
import {
  HTML_CONTENT_MODELS,
  TAG_CATEGORIES,
  getContentModelDefinition,
  getTagCategorySet,
} from '../utils/html-nesting'
import { iterate } from '@praxis-kit/primitive'
import type { StringMap } from '@praxis-kit/primitive'
import { EslintDiagnosticTemplates } from '../diagnostics'
import type { ContentModelDefinition } from '../types'

const createRule = RuleCreator((name) => `https://praxis-kit.dev/eslint-rules/${name}`)

function describeAllowed(definition: ContentModelDefinition): string {
  const { model } = definition
  switch (model.kind) {
    case 'specific':
      return [...model.allowed].join(', ')
    case 'category':
      return [...model.allowed].map((c) => `${c} content`).join(', ')
    // `transparent`/`nothing`/`structured` aren't evaluated yet (see `isAllowed` below) — no
    // entry in HTML_CONTENT_MODELS currently uses them, so this stays unreachable in practice.
    case 'transparent':
    case 'nothing':
    case 'structured':
      return ''
  }
}

const ALLOWED_TEXT: StringMap<string> = Object.fromEntries(
  Object.entries(HTML_CONTENT_MODELS)
    .filter((entry): entry is [string, ContentModelDefinition] => entry[1] !== undefined)
    .map(([tag, definition]) => [tag, describeAllowed(definition)]),
)

export type Options = []

export type MessageIds = 'invalidChild'

function getIntrinsicTag(name: TSESTree.JSXTagNameExpression): string | undefined {
  if (name.type !== 'JSXIdentifier') return undefined
  return /^[a-z]/.test(name.name) ? name.name : undefined
}

/**
 * Evaluates a `ContentModelDefinition` against a candidate child tag.
 *
 * Only `specific` (explicit tag allowlist) and `category` (content-category membership) are
 * evaluated today — the same two kinds every entry in `HTML_CONTENT_MODELS` currently uses.
 * `transparent`/`nothing`/`structured` are real HTML content-model concepts (see their own doc
 * comments in `types/content-model.ts`) that this validator doesn't check yet: `transparent`
 * needs the parent's own rendering context, `nothing` needs a void-element check this rule
 * doesn't perform, and `structured` needs an order-aware grammar evaluator, not a flat
 * membership test. Each passes through (no violation reported) rather than being treated as
 * disallowing everything, so introducing one of these kinds to a future table entry doesn't
 * silently start flagging valid markup the validator can't actually reason about yet.
 */
function isAllowed(childTag: string, definition: ContentModelDefinition): boolean {
  const { model } = definition
  switch (model.kind) {
    case 'specific':
      return model.allowed.has(childTag)
    case 'category': {
      const cats = getTagCategorySet(TAG_CATEGORIES, childTag)
      if (!cats) return true // unknown child tag — don't flag
      return [...model.allowed].some((c) => cats.has(c))
    }
    case 'transparent':
    case 'nothing':
    case 'structured':
      return true
  }
}

export const noInvalidHtmlNesting = createRule<Options, MessageIds>({
  name: 'no-invalid-html-nesting',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow HTML children that violate the HTML5 content model for their parent element.',
    },
    messages: {
      invalidChild: EslintDiagnosticTemplates.invalidChild,
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      JSXElement(node) {
        const parentTag = getIntrinsicTag(node.openingElement.name)
        if (!parentTag) return

        const definition = getContentModelDefinition(HTML_CONTENT_MODELS, parentTag)
        if (!definition) return

        iterate.forEach(node.children, (child) => {
          // JSXText, JSXExpressionContainer, JSXSpreadChild, JSXFragment — skip.
          // Text nodes are whitespace; expressions are dynamic (can't statically analyze).
          if (child.type !== 'JSXElement') return

          const childTag = getIntrinsicTag(child.openingElement.name)
          if (childTag === undefined) return
          if (isAllowed(childTag, definition)) return

          context.report({
            node: child,
            messageId: 'invalidChild',
            data: {
              child: childTag,
              parent: parentTag,
              allowed: ALLOWED_TEXT[parentTag] ?? '',
            },
          })
        })
      },
    }
  },
})
