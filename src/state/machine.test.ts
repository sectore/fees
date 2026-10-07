import { afterEach, describe, expect, test, vi } from 'vitest'
import { createActor } from 'xstate'
// `machine` and `store` import each other, `store` has to be loaded first
import './store'
import { machine } from './machine'
import { mockEndpointMap } from '../test/mocks'

const createTestActor = () =>
  createActor(machine, {
    input: { endpoints: mockEndpointMap(), selectedEndpoint: 'bitgo' },
  }).start()

describe('Machine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('endpoint.update of another endpoint keeps selection and fees', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const actor = createTestActor()
    const before = actor.getSnapshot().context.fees
    const url = new URL('http://localhost:8787/mempool/high.json')

    actor.send({ type: 'endpoint.update', data: { endpoint: 'mempool', url } })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('idle')
    expect(snapshot.context.selectedEndpoint).toBe('bitgo')
    expect(snapshot.context.fees).toBe(before)
    expect(snapshot.context.endpoints.mempool).toBe(url)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('endpoint.update of the selected endpoint reloads fees', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {}))
    )
    const actor = createTestActor()
    const url = new URL('http://localhost:8787/bitgo/data.json')

    actor.send({ type: 'endpoint.update', data: { endpoint: 'bitgo', url } })

    const snapshot = actor.getSnapshot()
    expect(snapshot.value).toBe('loading')
    expect(snapshot.context.selectedEndpoint).toBe('bitgo')
    expect(snapshot.context.endpoints.bitgo).toBe(url)
  })
})
