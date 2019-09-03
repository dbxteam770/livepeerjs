/** @jsx jsx */
import { jsx } from 'theme-ui'
import Link from 'next/link'

export default ({ tabs, variant = 'primary', ...props }) => {
  return (
    <div
      sx={{
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        position: 'relative',
        borderBottom: '1px solid',
        borderColor: 'border',
      }}
    >
      {tabs.map((tab: any, i: number) => {
        return (
          <Link key={i} href={tab.href} as={tab.as} passHref>
            <a
              sx={{
                color: tab.isActive ? 'white' : 'muted',
                mr: 3,
                pb: '10px',
                fontSize: 1,
                fontWeight: 500,
                borderBottom: '1px solid',
                borderColor: tab.isActive ? 'primary' : 'transparent',
              }}
            >
              {tab.name}
            </a>
          </Link>
        )
      })}
    </div>
  )
}
