import type * as App from '../types'

import { Schema as S } from 'effect'
import { Effect as E, Layer, pipe } from 'effect'
import { urlWithDefault } from '../util/url'
import * as C from './common'

export const DEFAULT_ENDPOINT_URL = 'https://api.blockchain.info/mempool/fees'

export const defaultUrl = () =>
  urlWithDefault(import.meta.env.VITE_URL_BLOCKCHAIN, DEFAULT_ENDPOINT_URL)

const FeesSchema = S.Struct({
  regular: S.Number,
  priority: S.Number,
  limits: S.Struct({
    min: S.Number,
  }),
})

type Fees = S.Schema.Type<typeof FeesSchema>

const toFees = (fees: Fees): E.Effect<App.Fees, never> =>
  E.succeed({
    fast: fees.priority,
    medium: fees.regular,
    slow: fees.limits.min,
  })

export const FeesServiceLayer = Layer.succeed(
  C.FeesService,
  C.FeesService.of({
    getFees: (url: URL) =>
      pipe(
        url,
        C.fetchFees,
        E.flatMap(C.getJson),
        E.flatMap(S.decodeUnknown(FeesSchema)),
        E.flatMap(toFees)
      ),
  })
)
