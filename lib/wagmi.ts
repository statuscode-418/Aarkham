
/* eslint-disable @typescript-eslint/no-unused-vars */
import { mainnet, polygonAmoy } from 'wagmi/chains'
import { createConfig } from 'wagmi'
import { http } from 'viem'
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE'

export const config = createConfig({
  chains: [polygonAmoy, mainnet],
  ssr: true,
  transports: {
    [polygonAmoy.id]: http(),
    [mainnet.id]: http(),
  },
})

export const Rainbowconfig = getDefaultConfig({
  appName: 'RainbowKit demo',
  projectId: projectId,

  chains: [
    polygonAmoy,
  ],
  ssr: true,
});
