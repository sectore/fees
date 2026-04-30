import { afterEach, describe, expect, test, vi } from 'vitest'
import { Effect, pipe } from 'effect'
import { FeesService } from './common'
import * as SatoshiApi from './satoshi-api'

describe('Satoshi API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('maps native fee recommendations into app fee buckets', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          data: {
            recommendation:
              'Fees are low. 1 sat/vB should confirm within a day.',
            estimates: {
              '1': 12.5,
              '3': 8,
              '6': 4,
              '25': 2,
              '144': 1,
            },
          },
          meta: {
            chain: 'main',
          },
        })
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await pipe(
      FeesService,
      Effect.flatMap((service) =>
        service.getFees(new URL(SatoshiApi.DEFAULT_ENDPOINT_URL))
      ),
      Effect.provide(SatoshiApi.FeesServiceLayer),
      Effect.runPromise
    )

    expect(result).toEqual({
      fast: 12.5,
      medium: 8,
      slow: 4,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(SatoshiApi.DEFAULT_ENDPOINT_URL)
    )
  })
})
