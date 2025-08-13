import type {Config} from 'jest'

const config: Config = {
  verbose: true,
  transform: {
    '^.+.tsx?$': ['ts-jest',{}],
    '^.+.ts?$': ['ts-jest',{}]
  }
}

export default config