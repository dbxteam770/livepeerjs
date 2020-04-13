import { Flex } from 'theme-ui'
import { Box } from 'theme-ui'

export default ({ title, startTime, estimate }) => {
  return (
    <Box sx={{ px: 2, pb: 2, pt: '18px' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: 4,
          background:
            'linear-gradient(260.35deg, #F1BC00 0.25%, #E926BE 47.02%, #9326E9 97.86%)',
        }}
      />
      <Flex sx={{ alignItems: 'center' }}>
        <Flex
          sx={{
            mr: 2,
            borderRadius: '100%',
            bg: 'background',
            color: 'white',
            width: 42,
            height: 42,
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 0,
            fontWeight: 'bold',
          }}
        >
          50%
        </Flex>
        <Box>
          <Box
            sx={{
              mb: '4px',
              color: 'white',
              fontSize: 1,
              fontWeight: 'bold',
            }}
          >
            {title}
          </Box>
          <Box sx={{ fontSize: 0, color: 'muted' }}>~{estimate} remaining</Box>
        </Box>
      </Flex>
    </Box>
  )
}
