import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  compareLeftVersionLessThanRightVersions,
  padUrlHttps,
  log,
  sleep,
  createTab,
} from '@/logic/util'

describe('compareLeftVersionLessThanRightVersions', () => {
  it('returns true when left is clearly older (major diff)', () => {
    expect(compareLeftVersionLessThanRightVersions('1.0.0', '2.0.0')).toBe(true)
  })

  it('returns false when left is newer (major diff)', () => {
    expect(compareLeftVersionLessThanRightVersions('2.0.0', '1.0.0')).toBe(
      false,
    )
  })

  it('returns false for equal versions', () => {
    expect(compareLeftVersionLessThanRightVersions('1.0.0', '1.0.0')).toBe(
      false,
    )
  })

  it('handles patch version difference', () => {
    expect(compareLeftVersionLessThanRightVersions('1.2.3', '1.2.4')).toBe(true)
  })

  it('handles minor version difference', () => {
    expect(compareLeftVersionLessThanRightVersions('1.27.0', '2.0.0')).toBe(
      true,
    )
  })

  it('handles real migration versions (2.2.0 vs 2.2.2)', () => {
    expect(compareLeftVersionLessThanRightVersions('2.2.0', '2.2.2')).toBe(true)
    expect(compareLeftVersionLessThanRightVersions('2.2.2', '2.2.0')).toBe(
      false,
    )
  })

  it('pads shorter version with zeros (1.0 vs 1.0.0)', () => {
    expect(compareLeftVersionLessThanRightVersions('1.0', '1.0.0')).toBe(false)
  })

  it('pads shorter version with zeros (1 vs 1.0.0)', () => {
    expect(compareLeftVersionLessThanRightVersions('1', '1.0.0')).toBe(false)
  })

  it('handles 0.x.x versions', () => {
    expect(compareLeftVersionLessThanRightVersions('0.9.9', '1.0.0')).toBe(true)
    expect(compareLeftVersionLessThanRightVersions('0.0.1', '0.0.2')).toBe(true)
  })

  it('handles two-segment versions', () => {
    expect(compareLeftVersionLessThanRightVersions('1.27', '1.28')).toBe(true)
    expect(compareLeftVersionLessThanRightVersions('2.2', '2.2')).toBe(false)
  })
})

describe('padUrlHttps', () => {
  it('adds https:// to bare domain', () => {
    expect(padUrlHttps('example.com')).toBe('https://example.com')
  })

  it('keeps https:// URLs unchanged', () => {
    expect(padUrlHttps('https://example.com')).toBe('https://example.com')
  })

  it('keeps http:// URLs unchanged', () => {
    expect(padUrlHttps('http://example.com')).toBe('http://example.com')
  })

  it('handles URLs with path (no protocol)', () => {
    expect(padUrlHttps('example.com/path')).toBe('https://example.com/path')
  })
})

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('calls console.log with styled message', () => {
    log('test message')
    expect(console.log).toHaveBeenCalled()
    const callArgs = (console.log as any).mock.calls[0]
    expect(callArgs[0]).toContain('test message')
  })

  it('uses red background for error messages', () => {
    log('error: something failed')
    const callArgs = (console.log as any).mock.calls[0]
    // 样式在第二个参数中
    expect(callArgs[1]).toContain('#ff4757')
  })

  it('uses blue background for normal messages', () => {
    log('normal message')
    const callArgs = (console.log as any).mock.calls[0]
    expect(callArgs[1]).toContain('#1475B2')
  })

  it('passes additional args to console.log', () => {
    log('message with args', { foo: 'bar' }, 42)
    expect(console.log).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { foo: 'bar' },
      42,
    )
  })
})

describe('sleep', () => {
  it('resolves after the specified time', async () => {
    vi.useFakeTimers()
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await promise
    vi.useRealTimers()
  })

  it('returns null on resolve', async () => {
    vi.useFakeTimers()
    const promise = sleep(50)
    vi.advanceTimersByTime(50)
    const result = await promise
    expect(result).toBeNull()
    vi.useRealTimers()
  })
})

describe('createTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls chrome.tabs.create with url and active=true by default', () => {
    createTab('https://example.com')
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      active: true,
    })
  })

  it('calls chrome.tabs.create with active=false when specified', () => {
    createTab('https://example.com', false)
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      active: false,
    })
  })

  it('does nothing for empty url', () => {
    createTab('')
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })
})
