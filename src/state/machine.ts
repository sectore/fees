import { assign, fromCallback, fromPromise, setup } from 'xstate'

import { Effect, Option as O, pipe } from 'effect'

import type { Endpoint, FeesAsync } from '../types'
import {
  fail,
  initial,
  isSuccess,
  loading,
  success,
  value,
} from '../util/async'
import { getMempoolFees } from '../api'

const MAX_RETRIES = 2
const INTERVAL_MS = 1000
const MAX_TICK_MS = 3000

export const machine = setup({
  types: {} as {
    events:
      | { type: 'fees.load' }
      | { type: 'fees.tick' }
      | { type: 'endpoint.change'; endpoint: Endpoint }
    context: {
      endpoint: Endpoint
      ticks: number
      fees: FeesAsync
      retries: number
    }
  },
  actors: {
    fetchFeesActor: fromPromise(
      async ({ input }: { input: { endpoint: Endpoint } }) => {
        console.log('ACTOR fetchFees:', input.endpoint)
        await new Promise((resolve) => setTimeout(resolve, 2000))
        return Effect.runPromise(getMempoolFees)
      }
    ),
    tickActor: fromCallback<
      { type: 'fees.tick' } | { type: 'fees.load' },
      { interval: number }
    >(({ sendBack, input }) => {
      const id = setInterval(() => {
        sendBack({ type: 'fees.tick' })
      }, input.interval)
      return () => clearInterval(id)
    }),
  },
  delays: {
    RETRY_DELAY: ({ context }) => context.retries * 1000,
  },
  guards: {
    checkRetry: ({ context }) => context.retries < MAX_RETRIES,
    checkLastRetry: ({ context }) => context.retries >= MAX_RETRIES,
    hasFeesLoaded: ({ context }) => isSuccess(context.fees),
    checkTick: ({ context }) => {
      const check = context.ticks * INTERVAL_MS < MAX_TICK_MS
      console.log('checkTick', check)
      return check
    },
    checkMaxTick: ({ context }) => {
      const check = context.ticks * INTERVAL_MS >= MAX_TICK_MS
      console.log('checkMaxTick', check)
      return check
    },
  },
  actions: {},
}).createMachine({
  id: 'app',
  context: {
    endpoint: 'mempool',
    fees: initial(O.none()),
    ticks: 0,
    retries: 0,
  },

  initial: 'idle',
  states: {
    idle: {},
    ticker: {
      invoke: {
        src: 'tickActor',
        input: () => ({
          interval: INTERVAL_MS,
        }),
      },
    },
    loading: {
      invoke: {
        src: 'fetchFeesActor',
        input: ({ context }) => ({ endpoint: context.endpoint }),
        onDone: {
          target: 'ticker',
          actions: assign(({ event }) => ({
            fees: success(event.output),
            retries: 0,
          })),
        },
        onError: [
          {
            guard: 'checkRetry',
            target: 'retry',
            actions: assign(({ context }) => ({
              retries: context.retries + 1,
            })),
          },
          {
            guard: 'checkLastRetry',
            target: 'idle',
            actions: assign(({ event }) => ({
              fees: fail(event.error),
            })),
          },
        ],
      },
    },
    retry: {
      after: {
        RETRY_DELAY: {
          target: 'loading',
        },
      },
    },
  },
  // TODO: Loading fees in 'idle' state only?
  on: {
    'fees.load': {
      target: '.loading',
      actions: assign(({ context }) => ({
        fees: pipe(context.fees, value, loading),
        retries: 0,
        ticks: 0,
      })),
    },
    'fees.tick': [
      {
        guard: 'checkMaxTick',
        target: '.loading',
        actions: [
          () => console.log('max tick'),
          assign(({ context }) => ({
            fees: pipe(context.fees, value, loading),
            ticks: 0,
          })),
        ],
      },
      {
        guard: 'checkTick',
        actions: [
          () => console.log('next tick'),
          assign({
            ticks: ({ context }) => context.ticks + 1,
          }),
        ],
      },
    ],
  },
})
