import type { ESLintConfig } from '../../configs/types'

import base from '../../configs/base'
import ts from '../../configs/typescript'
import architecture from '../../configs/architecture'
import praxisPlugin from '../../configs/praxis-plugin'

const config = [...praxisPlugin, ...base, ...ts, ...architecture] satisfies ESLintConfig

export default config
