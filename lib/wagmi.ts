
/* eslint-disable @typescript-eslint/no-unused-vars */
import { mainnet, polygonAmoy, polygon } from 'wagmi/chains'
import { createConfig } from 'wagmi'
import { http } from 'viem'
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID_HERE'

export const config = getDefaultConfig({
  appName: 'Arkham Flash Loan Platform',
  projectId: projectId,
  chains: [polygon, polygonAmoy, mainnet],
  ssr: true,
});

export const Rainbowconfig = config;
