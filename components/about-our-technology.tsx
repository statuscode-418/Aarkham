"use client"

import React, { useId } from "react"

export default function FeaturesSectionDemo() {
	return (
		<div className="py-20 lg:py-40">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
          Our Technology Stack
        </h2>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Powered by cutting-edge blockchain technologies and developer tools
        </p>
      </div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 md:gap-2 max-w-7xl mx-auto">
				{grid.map((feature) => (
					<div
						key={feature.title}
						className="relative bg-[#23232a] bg-opacity-80 p-6 rounded-3xl overflow-hidden border border-neutral-700"
					>
						<Grid size={20} />
						<p className="text-base font-bold text-white relative z-20">
							{feature.title}
						</p>
						<p className="text-neutral-300 mt-4 text-base font-normal relative z-20">
							{feature.description}
						</p>
					</div>
				))}
			</div>
		</div>
	)
}

const grid = [
	{
		title: "NextJS",
		description:
			"A modern React framework for building fast, SEO-friendly web applications.",
	},
	{
		title: "SP1",
		description:
			"A powerful zero-knowledge proving system enabling efficient and scalable zk-based computations.",
	},
	{
		title: "Uniswap V4",
		description:
			"The latest evolution of the leading decentralized exchange protocol with enhanced customization and efficiency.",
	},
	{
		title: "Rust",
		description:
			"A fast, memory-safe language ideal for building secure blockchain and smart contract systems.",
	},
	{
		title: "Solidity",
		description:
			"The core smart contract language for the Ethereum ecosystem.",
	},
	{
		title: "Chainlink",
		description:
			"A decentralized oracle network bringing real-world data to smart contracts.",
	},
	{
		title: "Aave",
		description:
			"A decentralized liquidity protocol for earning interest and borrowing assets securely.",
	},
	{
		title: "Metamask",
		description:
			"A popular crypto wallet and gateway to Web3, enabling users to interact with dApps directly from their browser.",
	},

]

export const Grid = ({
	pattern,
	size,
}: {
	pattern?: number[][]
	size?: number
}) => {
	const p = pattern ?? [
		[Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
		[Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
		[Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
		[Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
		[Math.floor(Math.random() * 4) + 7, Math.floor(Math.random() * 6) + 1],
	]
	return (
		<div className="pointer-events-none absolute left-1/2 top-0  -ml-20 -mt-2 h-full w-full [mask-image:linear-gradient(white,transparent)]">
            <div className="absolute inset-0 bg-gradient-to-r  [mask-image:radial-gradient(farthest-side_at_top,white,transparent)] dark:from-zinc-900/30 from-zinc-100/30 to-zinc-300/30 dark:to-zinc-900/30 opacity-100">
                <GridPattern
                  width={size ?? 20}
                  height={size ?? 20}
                  x="-12"
                  y="4"
                  squares={p}
                  className="absolute inset-0 h-full w-full mix-blend-overlay fill-white/10 stroke-white/30 dark:fill-white/10 dark:stroke-white/40"
                />
            </div>
        </div>
	)
}

export function GridPattern({
	width,
	height,
	x,
	y,
	squares,
	...props
}: any) {
	const patternId = useId()

	return (
		<svg aria-hidden="true" {...props}>
			<defs>
				<pattern
					id={patternId}
					width={width}
					height={height}
					patternUnits="userSpaceOnUse"
					x={x}
					y={y}
				>
					<path d={`M.5 ${height}V.5H${width}`} fill="none" />
				</pattern>
			</defs>
			<rect
				width="100%"
				height="100%"
				strokeWidth={0}
				fill={`url(#${patternId})`}
			/>
			{squares && (
				<svg x={x} y={y} className="overflow-visible">
					{squares.map(([x, y]: any, index: number) => (
						<rect
							strokeWidth="0"
							key={`rect-${index}-${x}-${y}`}
							width={width + 1}
							height={height + 1}
							x={x * width}
							y={y * height}
						/>
					))}
				</svg>
			)}
		</svg>
	)
}
