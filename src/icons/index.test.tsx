import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import * as Icons from './index.tsx'
import type { IconProps } from './index.tsx'

type IconComponent = (props?: IconProps) => ReactElement

// Every runtime export is an icon component (IconProps is a type, erased).
const iconEntries = Object.entries(Icons).filter(
  (entry): entry is [string, IconComponent] => typeof entry[1] === 'function',
)

describe('icons', () => {
  it('renders every icon export as an <svg> (default + custom props)', () => {
    // Guard against the file being emptied / mis-exported.
    expect(iconEntries.length).toBeGreaterThan(12)
    for (const [name, Icon] of iconEntries) {
      const { container, unmount } = render(<Icon size={28} color="#123456" />)
      expect(
        container.querySelector('svg'),
        `${name} should render an <svg>`,
      ).not.toBeNull()
      unmount()
    }
  })
})
