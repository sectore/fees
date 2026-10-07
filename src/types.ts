import type { ParseResult } from 'effect'
import { Schema as S } from 'effect'
import type { AsyncData } from './util/async'
import { UrlSchema } from './util/url'

export const ThemeSchema = S.parseJson(S.Literal('dark', 'light'))

export type Theme = S.Schema.Type<typeof ThemeSchema>

const ENDPOINTS = [
  'mempool',
  'esplora',
  'rpc-explorer',
  'bitgo',
  'blockcypher',
  'blockchain',
] as const

export const EndpointSchema = S.Literal(...ENDPOINTS)

export type Endpoint = S.Schema.Type<typeof EndpointSchema>

export const EndpointMapSchema = S.parseJson(
  S.Record({ key: EndpointSchema, value: UrlSchema })
)

export type EndpointMap = S.Schema.Type<typeof EndpointMapSchema>

// type guard
export const isEndpoint = (value: string): value is Endpoint =>
  ENDPOINTS.map(
    // Endpoint -> string
    (e) => e.toString()
  ).includes(value)

export const Fees = S.Struct({
  fast: S.Number,
  medium: S.Number,
  slow: S.Number,
})

export type Fees = S.Schema.Type<typeof Fees>

export type GetFeeError = Error | ParseResult.ParseError

export type FeesAsync = AsyncData<GetFeeError, Fees>

// Utility to get typed entries from an Object
// Error when iterating over an object in a Svelte component
// https://stackoverflow.com/a/75404225
export const entries = <K extends string, V>(o: Record<K, V>) =>
  Object.entries(o) as [K, V][]
